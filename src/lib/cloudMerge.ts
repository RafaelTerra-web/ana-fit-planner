import { jsonValuesAreEqual } from '../utils/json';

type RecordValue = Record<string, unknown>;
export type ConflictChoice = 'local' | 'remote';

function isRecord(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keyedArray(value: unknown): value is Array<RecordValue & { id: string }> {
  return Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string') &&
    new Set(value.map((item) => item.id)).size === value.length;
}

/** Three-way merge: only overlapping edits conflict; deletions and stable IDs are preserved. */
export function mergeCloudData(base: unknown, local: unknown, remote: unknown, choice?: ConflictChoice) {
  const conflicts: string[] = [];
  const merge = (before: unknown, device: unknown, cloud: unknown, path: string): unknown => {
    if (jsonValuesAreEqual(device, cloud)) return device;
    if (jsonValuesAreEqual(device, before)) return cloud;
    if (jsonValuesAreEqual(cloud, before)) return device;

    if (isRecord(device) && isRecord(cloud) && (isRecord(before) || before === undefined)) {
      const original = isRecord(before) ? before : {};
      const result: RecordValue = {};
      for (const key of new Set([...Object.keys(original), ...Object.keys(device), ...Object.keys(cloud)])) {
        const value = merge(original[key], device[key], cloud[key], path ? `${path}.${key}` : key);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    if (keyedArray(device) && keyedArray(cloud) && (keyedArray(before) || before === undefined)) {
      const original = new Map((Array.isArray(before) ? before : []).map((item) => [item.id, item]));
      const deviceItems = new Map(device.map((item) => [item.id, item]));
      const cloudItems = new Map(cloud.map((item) => [item.id, item]));
      // Preserve the chosen ordering while retaining independently added items.
      const preferred = choice === 'remote' ? cloud : device;
      const other = choice === 'remote' ? device : cloud;
      const ids = [...new Set([...preferred.map((item) => item.id), ...other.map((item) => item.id), ...original.keys()])];
      return ids.map((id) => merge(original.get(id), deviceItems.get(id), cloudItems.get(id), `${path}.${id}`))
        .filter((item) => item !== undefined);
    }
    conflicts.push(path);
    return choice === 'remote' ? cloud : device;
  };

  return { data: merge(base, local, remote, ''), conflicts };
}

export function withCloudNutrition(data: unknown, remote: unknown) {
  if (!isRecord(data) || !isRecord(remote) || !isRecord(remote.assignedNutritionPlan)) return data;
  const profile = isRecord(data.profile) ? data.profile : {};
  const remoteProfile = isRecord(remote.profile) ? remote.profile : {};
  return { ...data, assignedNutritionPlan: remote.assignedNutritionPlan, goals: remote.goals, meals: remote.meals,
    profile: { ...profile, preferredFoods: remoteProfile.preferredFoods, avoidedFoods: remoteProfile.avoidedFoods } };
}
