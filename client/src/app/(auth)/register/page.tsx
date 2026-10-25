import { authMetadata, AuthRoute } from '@/features/auth';
import type { SearchParams } from '@/shared/lib/searchParams';
import { PageTransition } from '@/shared/ui/PageTransition';

export const generateMetadata = () => authMetadata('register');

export default function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PageTransition>
      <AuthRoute mode="register" searchParams={searchParams} />
    </PageTransition>
  );
}
