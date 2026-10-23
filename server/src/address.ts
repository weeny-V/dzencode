import type { AddressInfo } from 'node:net';

/** Human-readable "host:port" for what the server is actually bound to. */
export const formatAddress = (address: AddressInfo | string | null): string => {
  if (address === null) return 'unknown address';
  if (typeof address === 'string') return address;
  const host = address.family === 'IPv6' ? `[${address.address}]` : address.address;
  return `${host}:${address.port}`;
};
