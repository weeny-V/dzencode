import type { Metadata } from 'next';

import { ComingSoon } from '@/shared/ui/ComingSoon';
import { PageTransition } from '@/shared/ui/PageTransition';

export const metadata: Metadata = { title: 'Настройки' };

export default function SettingsPage() {
  return (
    <PageTransition>
      <ComingSoon title="Настройки" />
    </PageTransition>
  );
}
