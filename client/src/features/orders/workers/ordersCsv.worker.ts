import { serveCsv } from '@/shared/lib/csvWorker';

import { buildOrdersCsv, type OrdersCsvPayload } from '../exportCsv';

// Builds the orders CSV off the main thread (see `useCsvExport`).
serveCsv<OrdersCsvPayload>(
  self as unknown as Parameters<typeof serveCsv<OrdersCsvPayload>>[0],
  buildOrdersCsv,
);
