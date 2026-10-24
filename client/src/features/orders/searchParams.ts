/** `?order=2` opens the panel of order 2. Anything that is not a positive integer (or is repeated) is ignored. */
export const parseOrderId = (value: string | string[] | undefined): number | undefined => {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value)) return undefined;
  return Number(value);
};
