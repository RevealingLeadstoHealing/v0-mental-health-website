export const MODULE_SNAPSHOT_TYPE = "ehr-module-snapshot";
export const MODULE_SNAPSHOT_SK_PREFIX = `RECORD#${MODULE_SNAPSHOT_TYPE}#`;
export const LATEST_MODULE_ID_PREFIX = "module_";
export const HISTORY_RECORD_ID_PREFIX = "record_";
export const MODULE_INDEX_SK = "MODULE_SNAPSHOT_INDEX";

const MODULE_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidModuleKey(moduleKey: unknown): moduleKey is string {
  return typeof moduleKey === "string" && MODULE_KEY_PATTERN.test(moduleKey);
}

export function latestModuleRecordId(moduleKey: string) {
  if (!isValidModuleKey(moduleKey)) throw new Error("Invalid module key.");
  return `${LATEST_MODULE_ID_PREFIX}${moduleKey}`;
}

// Non-snapshot record types sort before and after the snapshot SK prefix; these
// bounds let a key-condition query skip the (potentially very long) snapshot history.
export const NON_SNAPSHOT_SK_RANGES: Array<[string, string]> = [
  ["RECORD#", `RECORD#${MODULE_SNAPSHOT_TYPE}`],
  [`RECORD#${MODULE_SNAPSHOT_TYPE}$`, "RECORD$"],
];

type SnapshotHeader = { recordId?: unknown; createdAt?: unknown; payload?: { moduleKey?: unknown } };

export function newestSnapshotPerModule<T extends SnapshotHeader>(items: T[]) {
  const newest = new Map<string, T>();
  for (const item of items) {
    const moduleKey = item?.payload?.moduleKey;
    if (!isValidModuleKey(moduleKey)) continue;
    const current = newest.get(moduleKey);
    if (!current || snapshotOrder(item) > snapshotOrder(current)) newest.set(moduleKey, item);
  }
  return newest;
}

function snapshotOrder(item: SnapshotHeader) {
  return `${String(item.createdAt || "")}|${String(item.recordId || "")}`;
}
