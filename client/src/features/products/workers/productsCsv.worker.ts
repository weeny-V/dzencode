import { serveCsv } from '@/shared/lib/csvWorker';

import { buildProductsCsv, type ProductsCsvPayload } from '../exportCsv';

// Builds the products CSV off the main thread (see `useCsvExport`).
serveCsv<ProductsCsvPayload>(
  self as unknown as Parameters<typeof serveCsv<ProductsCsvPayload>>[0],
  buildProductsCsv,
);
