const MAX_TYPE_LENGTH = 100;

/**
 * `?type=Monitors` as the page reads it before the type names are known: a single string, trimmed. A missing,
 * repeated or over-long value means "all products" (an empty string).
 */
export const parseTypeParam = (value: string | string[] | undefined): string => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  return text.length > MAX_TYPE_LENGTH ? '' : text;
};

/**
 * Checks the type from the address against the known names. The match ignores letter case, like
 * `GET /products?type=` does, and returns the type's own spelling. An unknown value means "all products"
 * (an empty string), so a hand-edited address never breaks the page.
 */
export const parseType = (value: string, types: readonly string[]): string => {
  const wanted = value.toLowerCase();
  return types.find((type) => type.toLowerCase() === wanted) ?? '';
};
