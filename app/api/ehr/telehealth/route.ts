import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ChimeSDKMeetingsClient, CreateMeetingCommand, GetMeetingCommand, DeleteMeetingCommand, CreateAttendeeCommand, DeleteAttendeeCommand } from '@aws-sdk/client-chime-sdk-meetings';
import { requireEhrActor, requireRole, ApiError, apiErrorResponse } from '../../../../lib/ehr/auth';
import { requireClientAccess } from '../../../../lib/ehr/authorization';
import { appendAuditEvent } from '../../../../lib/ehr/dynamodb-store';
import { getDynamoDocumentClient } from '../../../../lib/ehr/aws-runtime';
import { rlthAwsFoundation } from '../../../../lib/rlth-aws-foundation';
import { telehealthKey, canManageTelehealth, roomIsActive, safeRoomStatus } from '../../../../lib/ehr/telehealth-policy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const region = process.env.EHR_TELEHEALTH_REGION || 'us-east-1';
const enabled = () => process.env.EHR_NATIVE_TELEHEALTH_ENABLED === 'true';
const chime = new ChimeSDKMeetingsClient({ region });
const table = rlthAwsFoundation.clinicalRecordsTableName;
const json = (body: any, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
async function context(request: Request, clientId: string) {
  const actor = await requireEhrActor(request);
  requireRole(actor, ['owner', 'provider', 'client']);
  if (!clientId) throw new ApiError(400, 'Choose a client.');
  await requireClientAccess(actor, clientId);
  const key = telehealthKey(actor.practiceId, clientId);
  const db = getDynamoDocumentClient();
  const { Item: room } = await db.send(new GetCommand({ TableName: table, Key: key, ConsistentRead: true }));
  return { actor, key, db, room };
}
export async function GET(request: Request) {
  try {
    const { room } = await context(request, new URL(request.url).searchParams.get('clientId') || '');
    return json({ configured: enabled(), ...safeRoomStatus(room), phone: 'not-connected', fax: 'not-connected' });
  } catch (error) { return apiErrorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, 'Cross-site call requests are not allowed.');
    if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415, 'JSON request required.');
    const body = await request.json();
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const { actor, key, db, room } = await context(request, clientId);
    if (!enabled()) throw new ApiError(503, 'In-EHR calling is awaiting AWS activation. No call has started.');
    const action = body.action;
    const manager = canManageTelehealth(actor.role);
    const audit = (action: string) => appendAuditEvent(actor, { action, category: 'Telehealth', clientId, entityType: 'telehealth-room', summary: action });
    const update = async (expression: string, values: Record<string, any>) => db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: expression, ConditionExpression: 'sessionId = :sid', ExpressionAttributeValues: { ...values, ':sid': room?.sessionId || '' } }));
    if (action === 'start') {
      if (!manager) throw new ApiError(403, 'Only a provider can open a room.');
      if (body.telehealthConsent !== true) throw new ApiError(400, 'Confirm telehealth consent before opening a room.');
      if (roomIsActive(room)) {
        try { await chime.send(new GetMeetingCommand({ MeetingId: room.meeting.MeetingId })); return json({ active: true }); }
        catch (e: any) { if (e.name !== 'NotFoundException') throw e; await update('SET expiresAt = :zero', { ':zero': 0 }); }
      }
      const sessionId = randomUUID(); const now = Math.floor(Date.now() / 1000);
      try {
        await db.send(new PutCommand({ TableName: table, Item: { ...key, sessionId, state: 'starting', expiresAt: now + 60, createdBy: actor.sub }, ConditionExpression: 'attribute_not_exists(PK) OR expiresAt <= :now', ExpressionAttributeValues: { ':now': now } }));
      } catch (e: any) { if (e.name === 'ConditionalCheckFailedException') throw new ApiError(409, 'A room is being opened. Wait a moment and retry.'); throw e; }
      let meeting: any;
      try {
        const result = await chime.send(new CreateMeetingCommand({ ClientRequestToken: sessionId, ExternalMeetingId: sessionId, MediaRegion: region }));
        meeting = result.Meeting;
        if (!meeting?.MeetingId) throw new Error('Meeting creation did not return a room.');
        await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET meeting = :meeting, #state = :active, expiresAt = :expiry, recording = :false, clientRecordingConsent = :false', ConditionExpression: 'sessionId = :sid', ExpressionAttributeNames: { '#state': 'state' }, ExpressionAttributeValues: { ':meeting': meeting, ':active': 'active', ':expiry': now + 14400, ':false': false, ':sid': sessionId } }));
        await audit('Opened in-EHR telehealth room');
        return json({ active: true });
      } catch (e) {
        if (meeting?.MeetingId) await chime.send(new DeleteMeetingCommand({ MeetingId: meeting.MeetingId })).catch(() => {});
        await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET expiresAt = :zero', ConditionExpression: 'sessionId = :sid', ExpressionAttributeValues: { ':zero': 0, ':sid': sessionId } })).catch(() => {});
        throw e;
      }
    }
    if (!roomIsActive(room)) throw new ApiError(409, 'The provider has not opened an active room.');
    const memberKey = { PK: key.PK, SK: `TELEHEALTH#ATTENDEE#${hash(actor.sub)}` };
    if (action === 'join') {
      if (body.telehealthConsent !== true) throw new ApiError(400, 'Confirm telehealth consent to join.');
      const old = await db.send(new GetCommand({ TableName: table, Key: memberKey, ConsistentRead: true }));
      if (old.Item?.meetingId === room.meeting.MeetingId && old.Item?.attendeeId) await chime.send(new DeleteAttendeeCommand({ MeetingId: room.meeting.MeetingId, AttendeeId: old.Item.attendeeId })).catch(() => {});
      const result = await chime.send(new CreateAttendeeCommand({ MeetingId: room.meeting.MeetingId, ExternalUserId: hash(actor.sub + randomUUID()) }));
      if (!result.Attendee?.AttendeeId) throw new Error('No attendee returned.');
      try {
        await db.send(new PutCommand({ TableName: table, Item: { ...memberKey, meetingId: room.meeting.MeetingId, attendeeId: result.Attendee.AttendeeId, expiresAt: room.expiresAt } }));
        if (actor.role === 'client') await update('SET clientRecordingConsent = :consent, recording = :false', { ':consent': body.recordingConsent === true, ':false': false });
        await audit('Joined in-EHR telehealth room');
      } catch (e) { await chime.send(new DeleteAttendeeCommand({ MeetingId: room.meeting.MeetingId, AttendeeId: result.Attendee.AttendeeId })).catch(() => {}); throw e; }
      return json({ meeting: room.meeting, attendee: result.Attendee });
    }
    if (action === 'end') {
      if (!manager || (room.createdBy !== actor.sub && actor.role !== 'owner')) throw new ApiError(403, 'Only the host can end this room.');
      await chime.send(new DeleteMeetingCommand({ MeetingId: room.meeting.MeetingId }));
      await update('SET expiresAt = :zero, recording = :false', { ':zero': 0, ':false': false });
      await audit('Ended in-EHR telehealth room'); return json({ active: false });
    }
    if (action === 'leave') {
      const member = await db.send(new GetCommand({ TableName: table, Key: memberKey, ConsistentRead: true }));
      if (member.Item?.meetingId === room.meeting.MeetingId) await chime.send(new DeleteAttendeeCommand({ MeetingId: room.meeting.MeetingId, AttendeeId: member.Item.attendeeId }));
      await update(actor.role === 'client' ? 'SET clientRecordingConsent = :false, recording = :false' : 'SET recording = :false', { ':false': false });
      await audit('Left in-EHR telehealth room'); return json({ left: true });
    }
    if (action === 'consent' && actor.role === 'client') {
      await update('SET clientRecordingConsent = :consent, recording = :false', { ':consent': body.recordingConsent === true, ':false': false });
      await audit(body.recordingConsent === true ? 'Client consented to session recording' : 'Client withdrew session recording consent'); return json({ updated: true });
    }
    if (action === 'recording' && manager) {
      if (body.active === true && (room.clientRecordingConsent !== true || body.recordingConsent !== true)) throw new ApiError(409, 'Client and provider recording consent are required.');
      await db.send(new UpdateCommand({ TableName: table, Key: key, UpdateExpression: 'SET recording = :active', ConditionExpression: body.active === true ? 'sessionId = :sid AND clientRecordingConsent = :yes AND expiresAt > :now' : 'sessionId = :sid', ExpressionAttributeValues: { ':sid': room.sessionId, ':active': body.active === true, ...(body.active === true ? { ':yes': true, ':now': Math.floor(Date.now() / 1000) } : {}) } }));
      await audit(body.active === true ? 'Started consented session recording' : 'Stopped session recording'); return json({ recording: body.active === true });
    }
    throw new ApiError(400, 'Unsupported telehealth action.');
  } catch (error: any) {
    if (['AccessDeniedException', 'UnauthorizedClientException', 'UnrecognizedClientException'].includes(error?.name)) return json({ error: 'AWS calling permissions are not active. The administrator must enable the telehealth runtime policy.' }, 503);
    return apiErrorResponse(error);
  }
}
