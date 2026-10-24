/**
 * A `LIKE` pattern that finds `text` anywhere in a column. `%`, `_` and the escape character `\` in the text
 * are escaped, so a visitor who types `50%` searches for those characters instead of a wildcard.
 * Pass the result as a `?` value; matching is case-insensitive through the column collation.
 */
export const containsPattern = (text: string): string => `%${text.replace(/[\\%_]/g, '\\$&')}%`;
