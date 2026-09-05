type CaptionStopOperations = {
  stop: () => Promise<unknown>;
  closeRoom: () => Promise<unknown>;
  markStopped: () => Promise<unknown>;
  markRoomClosed: () => Promise<unknown>;
};

// Never report capture stopped merely because a network request failed.
export async function stopLiveCaptionCapture(operations: CaptionStopOperations): Promise<boolean> {
  try { await operations.stop(); }
  catch (error: any) {
    if (error?.name !== 'NotFoundException') {
      await operations.closeRoom();
      await operations.markRoomClosed();
      return true;
    }
  }
  await operations.markStopped();
  return false;
}
