// Decides whether a finished in-room recording must be dropped instead of uploaded.
// The flag is captured at the moment consent is withdrawn, so a parent that clears
// consent state when the call ends cannot cause a legitimate recording to be lost.
export function shouldDiscardRecording(provider: boolean, withdrawnDuringRecording: boolean): boolean {
  return provider && withdrawnDuringRecording;
}

// A poll response is stale when it was requested before the latest join completed.
export function isStalePoll(requestedAt: number, joinedAt: number): boolean {
  return requestedAt < joinedAt;
}
