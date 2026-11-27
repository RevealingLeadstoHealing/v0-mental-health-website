import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { requireEhrActor, requireRole, ApiError, apiErrorResponse } from '../../../../../lib/ehr/auth';
import { appendAuditEvent } from '../../../../../lib/ehr/dynamodb-store';
import { parseRawEmail, isInboundKey } from '../../../../../lib/ehr/inbound-email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ['owner', 'provider']);

    const bucket = process.env.EHR_INBOUND_EMAIL_BUCKET;
    const region = process.env.EHR_INBOUND_EMAIL_REGION;
    const prefix = process.env.EHR_INBOUND_EMAIL_PREFIX;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const json = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });

    if (!bucket || !region || !prefix) {
      if (id) throw new ApiError(503, 'Email storage is awaiting connection.');
      return json({ configured: false, items: [], nextCursor: null });
    }

    // Email receiving + inbound bucket live in us-east-1; getS3Client() defaults
    // to us-east-2, so this route owns a dedicated regional client.
    const s3 = new S3Client({ region });

    if (id) {
      if (!isInboundKey(prefix, id)) throw new ApiError(400, 'Invalid email identifier.');
      const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: id }));
      const raw = Body ? await (Body as { transformToString: () => Promise<string> }).transformToString() : '';
      const parsed = parseRawEmail(raw);
      await appendAuditEvent(actor, {
        action: 'Opened email message',
        category: 'Email',
        entityType: 'inbound-email',
        entityId: id,
        summary: 'Provider opened a received email message.',
      });
      return json({
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        date: parsed.date,
        text: parsed.text,
        html: parsed.html,
      });
    }

    let continuationToken: string | undefined;
    const encodedCursor = url.searchParams.get('cursor');
    if (encodedCursor) {
      try { continuationToken = Buffer.from(encodedCursor, 'base64url').toString(); }
      catch { throw new ApiError(400, 'Invalid email page.'); }
    }

    const result = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 25,
      ContinuationToken: continuationToken,
    }));

    await appendAuditEvent(actor, {
      action: 'Viewed email inbox',
      category: 'Email',
      entityType: 'inbound-email',
      summary: 'Provider viewed a page of received email metadata.',
    });

    const items = (result.Contents || [])
      .filter((obj) => obj.Key && obj.Key !== prefix)
      .map((obj) => ({
        id: obj.Key as string,
        size: obj.Size ?? 0,
        receivedAt: obj.LastModified ? obj.LastModified.toISOString() : '',
      }));

    return json({
      configured: true,
      items,
      nextCursor: result.NextContinuationToken
        ? Buffer.from(result.NextContinuationToken).toString('base64url')
        : null,
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
