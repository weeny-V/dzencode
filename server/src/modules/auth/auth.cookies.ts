/** Shared name with Next's server-only cookie adapter; credentials never go into socket auth payloads. */
export const AUTH_COOKIE_NAME = 'dzencode_auth';

export const readAuthCookie = (header: string | undefined): string | undefined => {
  if (!header || header.length > 16384) return undefined;
  const matches = header
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (matches.length !== 1) return undefined;
  try {
    return decodeURIComponent(matches[0]!.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return undefined;
  }
};
