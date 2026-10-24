import { ButtonLink } from '../Button';
import { NoticePage } from '../NoticePage';

/** The page of a section that is not built yet: a normal page, so the sidebar link works and highlights. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <NoticePage title={title} text="Этот раздел ещё в разработке и появится скоро.">
      <ButtonLink href="/orders">К приходам</ButtonLink>
    </NoticePage>
  );
}
