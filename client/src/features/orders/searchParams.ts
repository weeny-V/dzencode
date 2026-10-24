import { parsePositiveInt } from '@/shared/lib/searchParams';

/** `?order=2` opens the panel of order 2. Anything that is not a positive integer (or is repeated) is ignored. */
export const parseOrderId = parsePositiveInt;
