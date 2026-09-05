import { NextResponse } from 'next/server';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireEhrActor, requireRole, ApiError, apiErrorResponse } from '../../../../../lib/ehr/auth';
import { getDynamoDocumentClient } from '../../../../../lib/ehr/aws-runtime';
import { appendAuditEvent } from '../../../../../lib/ehr/dynamodb-store';
import { rlthAwsFoundation } from '../../../../../lib/rlth-aws-foundation';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ['owner', 'provider']);
    const bucket = process.env.EHR_FAX_BUCKET;
    const region = process.env.EHR_FAX_REGION;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const json = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
    if (!bucket || !region) {
      if (id) throw new ApiError(503, 'Fax storage is awaiting connection.');
      return json({ configured: false, items: [], nextCursor: null });
    }
    const PK = `PRACTICE#${actor.practiceId}`;
    const db = getDynamoDocumentClient();
    const TableName = rlthAwsFoundation.clinicalRecordsTableName;
    if (id) {
      if (!/^[a-f0-9]{64}$/.test(id)) throw new ApiError(400, 'Invalid fax identifier.');
      const { Item } = await db.send(new GetCommand({ TableName, Key: { PK, SK: `FAX#${id}` }, ConsistentRead: true }));
      if (!Item || Item.practiceId !== actor.practiceId || (actor.role !== 'owner' && Item.providerId !== actor.sub)) throw new ApiError(404, 'Fax not found.');
      if (Item.bucket !== bucket || !Item.storageKey?.startsWith(`inbound-faxes/${actor.practiceId}/`) || !Item.storageVersion) throw new ApiError(409, 'Fax storage reference needs review.');
      await appendAuditEvent(actor, { action: 'Authorized incoming fax review', category: 'Fax', entityType: 'incoming-fax', entityId: id, summary: 'Provider requested a five-minute link to the received PDF version.' });
      const downloadUrl = await getSignedUrl(new S3Client({ region }), new GetObjectCommand({
        Bucket: bucket, Key: Item.storageKey, VersionId: Item.storageVersion,
        ResponseContentType: 'application/pdf', ResponseContentDisposition: 'attachment; filename="incoming-fax.pdf"',
      }), { expiresIn: 300 });
      return json({ downloadUrl });
    }
    let cursor: Record<string, string> | undefined;
    const encodedCursor = url.searchParams.get('cursor');
    if (encodedCursor) {
      try { cursor = JSON.parse(Buffer.from(encodedCursor, 'base64url').toString()); }
      catch { throw new ApiError(400, 'Invalid fax page.'); }
      if (cursor?.PK !== PK || !/^FAX#[a-f0-9]{64}$/.test(cursor?.SK || '')) throw new ApiError(400, 'Invalid fax page.');
      cursor = { PK, SK: cursor.SK };
    }
    const result = await db.send(new QueryCommand({ TableName, KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: { ':pk': PK, ':prefix': 'FAX#', ...(actor.role === 'owner' ? {} : { ':provider': actor.sub }) },
      ...(actor.role === 'owner' ? {} : { FilterExpression: 'providerId = :provider' }),
      ExclusiveStartKey: cursor, Limit: 25, ConsistentRead: true,
    }));
    await appendAuditEvent(actor, { action: 'Viewed incoming fax inbox', category: 'Fax', entityType: 'incoming-fax', summary: 'Provider viewed a page of incoming fax metadata.' });
    return json({ configured: true, items: (result.Items || []).map(item => ({ id: item.id, title: item.title, status: item.status, receivedAt: item.receivedAt })),
      nextCursor: result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64url') : null });
  } catch (error) { return apiErrorResponse(error); }
}
