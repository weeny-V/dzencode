/**
 * `?type=monitors` filters by a product type. The match ignores letter case, like `GET /products?type=` does,
 * and returns the type's own spelling. An unknown or repeated value means "all products" (an empty string),
 * so a hand-edited address never breaks the page.
 */
export const parseType = (
  value: string | string[] | undefined,
  types: readonly string[],
): string => {
  if (typeof value !== 'string') return '';
  const wanted = value.toLowerCase();
  return types.find((type) => type.toLowerCase() === wanted) ?? '';
};
