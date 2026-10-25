'use client';

import './InventorySync.scss';

import { useTranslations } from 'next-intl';

import { Button } from '@/shared/ui/Button';

import { useInventorySync } from './useInventorySync';

/** Renders nothing while the inventory is current; a short notice when an open order was deleted elsewhere. */
export function InventorySync() {
  const t = useTranslations('InventorySync');
  const { notice, dismiss } = useInventorySync();
  return (
    <div className="inventory-sync" role="status">
      {notice && (
        <div className="inventory-sync__notice">
          <span>{t('orderDeleted')}</span>
          <Button variant="ghost" type="button" onClick={dismiss}>
            {t('dismiss')}
          </Button>
        </div>
      )}
    </div>
  );
}
