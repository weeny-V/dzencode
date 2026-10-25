import { authMetadata, AuthRoute } from '@/features/auth';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

export const generateMetadata = () => authMetadata('login');

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <AuthRoute mode="login" searchParams={searchParams} />
    </PageTransition>
  );
}
