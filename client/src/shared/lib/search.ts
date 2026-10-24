/**
 * Live search: true when the query is empty or any of the texts contains it. The comparison ignores letter case
 * (Cyrillic included) and the query is trimmed, so "  sn-123 " finds "SN-12345671".
 */
export const matchesQuery = (query: string, ...texts: readonly (string | number)[]): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return texts.some((text) => String(text).toLowerCase().includes(needle));
};

/** The serial number as the lists show it: `SN-12345671`. Search matches this text, so users can type it as they see it. */
export const serialLabel = (serialNumber: number): string => `SN-${serialNumber}`;
