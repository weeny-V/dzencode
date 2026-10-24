import { ButtonLink } from '@/shared/ui/Button';
import { NoticePage } from '@/shared/ui/NoticePage';

export default function NotFound() {
  return (
    <NoticePage
      title="Страница не найдена"
      text="Такого адреса нет. Проверьте ссылку или вернитесь к приходам."
    >
      <ButtonLink href="/orders">К приходам</ButtonLink>
    </NoticePage>
  );
}
