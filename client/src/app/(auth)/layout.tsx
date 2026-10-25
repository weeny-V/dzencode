import type { ReactNode } from 'react';

import { AuthShell } from '@/features/auth';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
