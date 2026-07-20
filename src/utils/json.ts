function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, canonicalizeJson(entryValue)]),
  );
}

export function jsonValuesAreEqual(first: unknown, second: unknown) {
  return JSON.stringify(canonicalizeJson(first)) === JSON.stringify(canonicalizeJson(second));
}
