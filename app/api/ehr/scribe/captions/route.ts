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
  let operation = '';
  let stopping = false;
  try {
    if (!isAllowedTelehealthOrigin(request, process.env.NODE_ENV === 'production')) throw new ApiError(403, 'Cross-site caption requests are not allowed.');
    const actor = await requireEhrActor(request);
    requireRole(actor, ['owner', 'provider']);
    const body = await request.json();
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    await requireClientAccess(actor, clientId);
    if (body.action === 'stop') {
      stopping = true;
      operation = 'DynamoDB:GetCaptionSession';
      const record = await getClinicalRecord(actor.practiceId, clientId, 'microphone-captions', String(body.sessionId || ''));
      if (!record || record.payload?.owner !== actor.sub) throw new ApiError(403, 'Caption session does not belong to this provider.');
      operation = 'Chime:DeleteMeeting';
      try { await chime.send(new DeleteMeetingCommand({ MeetingId: record.payload.meetingId })); }
      catch (error: any) { if (error.name !== 'NotFoundException') throw error; }
      return NextResponse.json({ stopped: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (body.action !== 'start' || body.telehealthConsent !== true || body.recordingConsent !== true) throw new ApiError(400, 'Both consents are required to start microphone captions.');
    const sessionId = randomUUID();
    operation = 'Chime:CreateMeeting';
    const { Meeting } = await chime.send(new CreateMeetingCommand({ ClientRequestToken: sessionId, ExternalMeetingId: sessionId, MediaRegion: region }));
    if (!Meeting?.MeetingId) throw new Error('AWS did not create the caption session.');
    try {
      operation = 'Chime:CreateAttendee';
      const { Attendee } = await chime.send(new CreateAttendeeCommand({ MeetingId: Meeting.MeetingId, ExternalUserId: sessionId }));
      operation = 'DynamoDB:SaveCaptionSession';
      await putClinicalRecord(actor, { clientId, recordType: 'microphone-captions', recordId: sessionId, status: 'active', payload: { owner: actor.sub, meetingId: Meeting.MeetingId } });
      operation = 'Chime:StartMeetingTranscription';
      await chime.send(new StartMeetingTranscriptionCommand({ MeetingId: Meeting.MeetingId, TranscriptionConfiguration: { EngineTranscribeSettings: { LanguageCode: 'en-US', Region: 'us-east-1', EnablePartialResultsStabilization: true, PartialResultsStability: 'medium' } } }));
      operation = 'DynamoDB:AppendCaptionAudit';
      await appendAuditEvent(actor, { action: 'Started consented local microphone captions', category: 'Telehealth', clientId, entityType: 'microphone-captions', entityId: sessionId, summary: 'English captions requested; no transcript text stored in this event.' });
      return NextResponse.json({ sessionId, meeting: Meeting, attendee: Attendee }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      await chime.send(new DeleteMeetingCommand({ MeetingId: Meeting.MeetingId })).catch(() => {});
      throw error;
    }
  } catch (error: any) {
    // Preserve authorization/consent responses. Only report fixed operation labels
    // and known error types: never expose AWS messages, credentials or chart data.
    if (operation && !(error instanceof ApiError)) {
      const knownErrors = ['AccessDeniedException', 'ForbiddenException', 'UnauthorizedClientException', 'BadRequestException', 'NotFoundException', 'ResourceNotFoundException', 'ThrottledClientException', 'ThrottlingException', 'LimitExceededException', 'ServiceFailureException', 'ServiceUnavailableException', 'UnrecognizedClientException', 'CredentialsProviderError', 'ValidationException', 'ProvisionedThroughputExceededException', 'InternalServerError', 'TimeoutError'];
      const errorType = knownErrors.includes(error?.name) ? error.name : 'UnexpectedError';
      return NextResponse.json({
        error: `AWS live captions could not ${stopping ? 'stop' : 'start'}: ${operation} failed (${errorType}). Diagnostic: caption-aws-v1.`,
        diagnostic: { operation, errorType, version: 'caption-aws-v1' },
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    return apiErrorResponse(error);
  }
}
