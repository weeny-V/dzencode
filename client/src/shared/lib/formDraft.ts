export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const VERSION = 1;
export const draftStorageKey = (key: string) => 'inventory:draft:v1:' + key;
export function decodeDraft<T extends Record<string, unknown>>(
  raw: string | null,
  defaults: T,
  now = Date.now(),
  optionalFields: readonly (keyof T)[] = [],
): T | undefined {
  if (!raw) return undefined;
  try {
    const record: unknown = JSON.parse(raw);
    if (!record || typeof record !== 'object') return undefined;
    const { version, updatedAt, values } = record as Record<string, unknown>;
    if (
      version !== VERSION ||
      typeof updatedAt !== 'number' ||
      !Number.isFinite(updatedAt) ||
      updatedAt > now ||
      now - updatedAt >= DRAFT_TTL ||
      !values ||
      typeof values !== 'object'
    )
      return undefined;
    const fields = values as Record<string, unknown>;
    if (
      !Object.keys(defaults).every(
        (key) =>
          (fields[key] === undefined && optionalFields.includes(key)) ||
          typeof fields[key] === typeof defaults[key],
      )
    )
      return undefined;
    return Object.fromEntries(
      Object.keys(defaults).map((key) => [
        key,
        fields[key] === undefined ? defaults[key] : fields[key],
      ]),
    ) as T;
  } catch {
    return undefined;
  }
}
export const encodeDraft = (values: unknown) =>
  JSON.stringify({
    version: VERSION,
    updatedAt: Date.now(),
    revision: `${Date.now()}:${Math.random()}`,
    values,
  });
