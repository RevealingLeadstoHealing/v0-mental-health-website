import { createHash } from 'node:crypto';

/** Index a completed PDF delivery from the dedicated fax bucket, not a client upload. */
export function createFaxIngestor(config, io) {
  for (const field of ['bucket', 'region', 'practiceId', 'providerId', 'kmsKeyArn']) {
    if (!config[field]) throw new Error(`Missing fax configuration: ${field}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(config.practiceId)) throw new Error('Invalid fax practice');
  const prefix = `inbound-faxes/${config.practiceId}/`;
  return async event => {
    if (!Array.isArray(event?.Records) || !event.Records.length) throw new Error('Expected S3 fax delivery event');
    const results = [];
    for (const record of event.Records) {
      const object = record?.s3?.object;
      const key = decodeURIComponent(String(object?.key || '').replace(/\+/g, ' '));
      if (record.eventSource !== 'aws:s3' || !record.eventName?.startsWith('ObjectCreated:') ||
          record.awsRegion !== config.region || record.s3?.bucket?.name !== config.bucket ||
          !key.startsWith(prefix) || !key.endsWith('.pdf') || !object?.versionId || object.versionId === 'null') {
        throw new Error('Unrecognized or unversioned fax delivery');
      }
      const source = { Bucket: config.bucket, Key: key, VersionId: object.versionId };
      const metadata = await io.head(source);
      if (metadata.ContentType !== 'application/pdf' || !Number.isSafeInteger(metadata.ContentLength) || metadata.ContentLength < 5 ||
          metadata.ContentLength > 40 * 1024 * 1024 || metadata.ServerSideEncryption !== 'aws:kms' ||
          metadata.SSEKMSKeyId !== config.kmsKeyArn) throw new Error('Fax file does not meet storage requirements');
      const faxId = metadata.Metadata?.['fax-id'];
      if (typeof faxId !== 'string' || !/^[a-zA-Z0-9._-]{1,200}$/.test(faxId)) throw new Error('Missing stable fax delivery identifier');
      if (await io.signature(source) !== '%PDF-') throw new Error('Received document is not a PDF');
      const id = createHash('sha256').update(JSON.stringify([config.practiceId, config.providerId, faxId])).digest('hex');
      const item = {
        PK: `PRACTICE#${config.practiceId}`, SK: `FAX#${id}`, id,
        practiceId: config.practiceId, providerId: config.providerId,
        sourceType: 'FAX', status: 'UNASSIGNED', title: 'Incoming fax',
        receivedAt: metadata.LastModified?.toISOString() || new Date().toISOString(),
        bucket: config.bucket, storageKey: key, storageVersion: object.versionId,
        size: metadata.ContentLength,
      };
      // Publish only after the completed object has been validated. No stuck placeholders.
      try { await io.insert(item); results.push({ id, status: 'received' }); }
      catch (error) {
        if (error.name !== 'ConditionalCheckFailedException') throw error;
        results.push({ id, status: 'already-received' });
      }
    }
    return { results };
  };
}
