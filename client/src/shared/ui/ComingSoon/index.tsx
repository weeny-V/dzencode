import { ButtonLink } from '../Button';
import { NoticePage } from '../NoticePage';
import { text } from './messages.server';

/** The page of a section that is not built yet: a normal page, so the sidebar link works and highlights. */
export async function ComingSoon({ title }: { title: string }) {
  const t = await text();
  return (
    <NoticePage title={title} text={t('text')}>
      <ButtonLink href="/orders">{t('back')}</ButtonLink>
    </NoticePage>
  );
}
