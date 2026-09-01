export async function flushModuleSaves(
  queues: Map<string, Promise<unknown>>,
  failures: Map<string, unknown>,
  clientId: string,
) {
  const belongsToClient = (key: string) => key.startsWith(`${clientId}:`);
  // A save may enqueue another save while the current batch is settling.
  while ([...queues.keys()].some(belongsToClient)) {
    await Promise.all([...queues].filter(([key]) => belongsToClient(key)).map(([, pending]) => pending));
  }
  const failure = [...failures].find(([key]) => belongsToClient(key));
  if (failure) throw new Error("An earlier chart save failed. Retry the unsaved changes before submitting this assessment.");
}
