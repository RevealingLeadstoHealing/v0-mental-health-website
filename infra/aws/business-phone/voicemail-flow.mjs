import { createHash } from 'node:crypto';

// AWS Chime SIP media application callback, not an unauthenticated HTTP webhook.
// store.save must use a conditional write against the previous lastSequence.
export function createVoicemailHandler(config, store) {
  for (const field of ['accountId', 'region', 'applicationId', 'practiceId', 'providerId', 'number', 'bucket']) {
    if (!config[field]) throw new Error(`Missing voicemail configuration: ${field}`);
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(config.practiceId)) throw new Error('Invalid practice identifier');
  return async event => {
    const details = event?.CallDetails;
    if (event?.SchemaVersion !== '1.0' || details?.AwsAccountId !== config.accountId ||
        details?.AwsRegion !== config.region || details?.SipApplicationId !== config.applicationId ||
        typeof details?.TransactionId !== 'string' || !Number.isSafeInteger(event.Sequence) || event.Sequence < 0) {
      throw new Error('Unrecognized voicemail callback');
    }
    const participant = details.Participants?.find(p => p.ParticipantTag === 'LEG-A');
    if (!participant?.CallId || participant.Direction !== 'Inbound' || participant.To !== config.number) {
      throw new Error('Callback does not belong to the configured inbound line');
    }
    const id = createHash('sha256').update(details.TransactionId).digest('hex');
    const prefix = `voicemail/${config.practiceId}/${id}/`;
    const key = { PK: `PRACTICE#${config.practiceId}`, SK: `VOICE_CALL#${id}` };
    const response = Actions => ({ SchemaVersion: '1.0', Actions });
    const hangup = { Type: 'Hangup', Parameters: { CallId: participant.CallId, SipResponseCode: '0' } };
    for (let attempt = 0; attempt < 3; attempt++) {
      const old = await store.get(key);
      if (old?.lastSequence === event.Sequence) return old.response;
      if (old && old.lastSequence > event.Sequence) return response([]);
      const next = { ...old, ...key, id, practiceId: config.practiceId, providerId: config.providerId,
        caller: /^\+[1-9]\d{6,14}$/.test(participant.From || '') ? participant.From : '',
        createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
        lastSequence: event.Sequence };
      let actions = [];
      if (!old && event.InvocationEventType === 'NEW_INBOUND_CALL') {
        next.state = 'greeting';
        actions = [{ Type: 'Speak', Parameters: { CallId: participant.CallId, Engine: 'standard',
          VoiceId: 'Joanna', TextType: 'text',
          Text: 'You have reached Revealing Leads to Healing Wellness Services. This mailbox is not monitored for emergencies. For an emergency, call 911. Your voicemail will be recorded after this greeting. Please leave your name and callback number. Press pound when finished.' } }];
      } else if (old?.state === 'greeting' && event.InvocationEventType === 'ACTION_SUCCESSFUL' && event.ActionData?.Type === 'Speak') {
        next.state = 'recording';
        actions = [{ Type: 'RecordAudio', Parameters: { CallId: participant.CallId,
          DurationInSeconds: 180, SilenceDurationInSeconds: 5, SilenceThreshold: 100,
          RecordingTerminators: ['#'], RecordingDestination: { Type: 'S3', BucketName: config.bucket, Prefix: prefix } } }];
      } else if (old?.state === 'recording' && event.InvocationEventType === 'ACTION_SUCCESSFUL' && event.ActionData?.Type === 'RecordAudio') {
        const destination = event.ActionData.RecordingDestination;
        if (destination?.Type !== 'S3' || destination.BucketName !== config.bucket ||
            typeof destination.Key !== 'string' || !destination.Key.startsWith(prefix) || destination.Key.length <= prefix.length) {
          throw new Error('Recording destination does not belong to this voicemail');
        }
        next.state = 'completed'; next.audioKey = destination.Key; next.bucket = config.bucket;
        actions = [hangup];
      } else if (event.InvocationEventType === 'HANGUP') {
        next.state = old?.state === 'completed' ? 'completed' : 'ended-without-confirmed-recording';
      } else if (old?.state === 'completed') {
        actions = [hangup];
      } else {
        next.state = 'failed'; actions = [hangup];
      }
      next.response = response(actions);
      try { await store.save(next, old?.lastSequence); return next.response; }
      catch (error) { if (error.name !== 'ConditionalCheckFailedException') throw error; }
    }
    throw new Error('Concurrent voicemail update; retry callback');
  };
}
