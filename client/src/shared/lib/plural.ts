/**
 * Picks the Russian word form for a number: `pluralize(1, forms)` is the first form, 2-4 the second,
 * 5-20 and the rest the third (21 is like 1, 22 like 2, but 11-14 are always the third form).
 */
export const pluralize = (
  count: number,
  [one, few, many]: readonly [string, string, string],
): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};
