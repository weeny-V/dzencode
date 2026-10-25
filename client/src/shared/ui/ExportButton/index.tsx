'use client';

import './ExportButton.scss';

import type { CsvExportStatus } from '@/shared/hooks/useCsvExport';
import { Button } from '@/shared/ui/Button';

export interface ExportLabels {
  /** The idle button: "Export CSV". */
  export: string;
  /** Said while the data is read and the file is built: "Preparing the file…". */
  busy: string;
  cancel: string;
  failed: string;
}

/** Starts an export, shows that it is running, lets the visitor stop it and reports a failure. */
export function ExportButton({
  status,
  labels,
  onStart,
  onCancel,
}: {
  status: CsvExportStatus;
  labels: ExportLabels;
  onStart: () => void;
  onCancel: () => void;
}) {
  const busy = status === 'loading' || status === 'building';
  return (
    <div className="export-button">
      {busy ? (
        <>
          <span className="export-button__status" role="status">
            {labels.busy}
          </span>
          <Button variant="ghost" type="button" onClick={onCancel}>
            {labels.cancel}
          </Button>
        </>
      ) : (
        <Button variant="ghost" type="button" onClick={onStart}>
          {labels.export}
        </Button>
      )}
      {status === 'error' && (
        <span className="export-button__error" role="alert">
          {labels.failed}
        </span>
      )}
    </div>
  );
}
