import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ChimeSDKMeetingsClient, CreateMeetingCommand, CreateAttendeeCommand, DeleteMeetingCommand, StartMeetingTranscriptionCommand } from '@aws-sdk/client-chime-sdk-meetings';
import { ApiError, apiErrorResponse, requireEhrActor, requireRole } from '../../../../../lib/ehr/auth';
import { requireClientAccess } from '../../../../../lib/ehr/authorization';
import { appendAuditEvent, getClinicalRecord, putClinicalRecord } from '../../../../../lib/ehr/dynamodb-store';
import { isAllowedTelehealthOrigin } from '../../../../../lib/ehr/telehealth-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const region = process.env.EHR_TELEHEALTH_REGION || 'us-east-1';
const chime = new ChimeSDKMeetingsClient({ region });

// A private, single-attendee caption session; it never changes the patient room.
export async function POST(request: Request) {
  try {
    if (!isAllowedTelehealthOrigin(request, process.env.NODE_ENV === 'production')) throw new ApiError(403, 'Cross-site caption requests are not allowed.');
    const actor = await requireEhrActor(request);
    requireRole(actor, ['owner', 'provider']);
    const body = await request.json();
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    await requireClientAccess(actor, clientId);
    if (body.action === 'stop') {
      const record = await getClinicalRecord(actor.practiceId, clientId, 'microphone-captions', String(body.sessionId || ''));
      if (!record || record.payload?.owner !== actor.sub) throw new ApiError(403, 'Caption session does not belong to this provider.');
      try { await chime.send(new DeleteMeetingCommand({ MeetingId: record.payload.meetingId })); }
      catch (error: any) { if (error.name !== 'NotFoundException') throw error; }
      return NextResponse.json({ stopped: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action !== 'start' || body.telehealthConsent !== true || body.recordingConsent !== true) throw new ApiError(400, 'Both consents are required to start microphone captions.');
    const sessionId = randomUUID();
    const { Meeting } = await chime.send(new CreateMeetingCommand({ ClientRequestToken: sessionId, ExternalMeetingId: sessionId, MediaRegion: region }));
    if (!Meeting?.MeetingId) throw new Error('AWS did not create the caption session.');
    try {
      const { Attendee } = await chime.send(new CreateAttendeeCommand({ MeetingId: Meeting.MeetingId, ExternalUserId: sessionId }));
      await putClinicalRecord(actor, { clientId, recordType: 'microphone-captions', recordId: sessionId, status: 'active', payload: { owner: actor.sub, meetingId: Meeting.MeetingId } });
      await chime.send(new StartMeetingTranscriptionCommand({ MeetingId: Meeting.MeetingId, TranscriptionConfiguration: { EngineTranscribeSettings: { LanguageCode: 'en-US', Region: 'us-east-1', EnablePartialResultsStabilization: true, PartialResultsStability: 'medium' } } }));
      await appendAuditEvent(actor, { action: 'Started consented local microphone captions', category: 'Telehealth', clientId, entityType: 'microphone-captions', entityId: sessionId, summary: 'English captions requested; no transcript text stored in this event.' });
      return NextResponse.json({ sessionId, meeting: Meeting, attendee: Attendee }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await chime.send(new DeleteMeetingCommand({ MeetingId: Meeting.MeetingId })).catch(() => {});
      throw error;
    }
  } catch (error: any) {
    if (['AccessDeniedException', 'ForbiddenException', 'UnauthorizedClientException', 'BadRequestException'].includes(error?.name)) return NextResponse.json({ error: 'AWS live captions could not start. Verify Chime transcription permissions and its transcription service role.' }, { status: 503 });
    return apiErrorResponse(error);
  }
}
