import { describe, expect, it, vi } from 'vitest';

import { renderToStaticMarkup } from '@/testing/i18n';

import { ConfirmDialog } from './index';

const render = (props: { pending?: boolean; error?: string }) =>
  renderToStaticMarkup(
    <ConfirmDialog
      open
      title="Вы уверены?"
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      pending={false}
      {...props}
    >
      Приход 1
    </ConfirmDialog>,
  );

describe('ConfirmDialog', () => {
  it('asks, shows what is deleted and offers both buttons', () => {
    const html = render({});

    expect(html).toContain('Вы уверены?');
    expect(html).toContain('Приход 1');
    expect(html).toContain('Отменить');
    expect(html).toContain('Удалить');
    expect(html).not.toContain('role="alert"');
  });

  it('disables the delete button while the request is on its way', () => {
    const html = render({ pending: true });

    expect(html).toContain('Удаление…');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Удаление…/);
  });

  it('shows why the deletion failed and keeps the buttons usable', () => {
    const html = render({ error: 'Order not found' });

    expect(html).toContain('role="alert"');
    expect(html).toContain('Не удалось удалить.');
    expect(html).not.toMatch(/<button[^>]*disabled/);
  });

  it('copes with a failure that has no reason', () => {
    expect(render({ error: '' })).toContain('Не удалось удалить.');
  });
});
