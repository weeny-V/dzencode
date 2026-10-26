import { describe, expect, it, vi } from 'vitest';

import { renderToStaticMarkup } from '@/testing/i18n';

import { FormLayout } from './index';

const render = (props: { submitting?: boolean; error?: string }) =>
  renderToStaticMarkup(
    <FormLayout
      title="Новый приход"
      onSubmit={vi.fn()}
      submitting={false}
      submitLabel="Создать приход"
      cancelHref="/orders"
      {...props}
    >
      <input name="title" />
    </FormLayout>,
  );

describe('FormLayout', () => {
  it('shows the title, the fields and both buttons, with the browser validation off', () => {
    const html = render({});

    expect(html).toContain('Новый приход');
    expect(html).toContain('name="title"');
    expect(html).toContain('href="/orders"');
    expect(html).toContain('Создать приход');
    expect(html).toContain('noValidate');
  });

  it('locks the submit button while the form is being sent, so it cannot go twice', () => {
    const html = render({ submitting: true });

    expect(html).toContain('Сохранение…');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Сохранение…/);
    expect(html).not.toContain('Создать приход');
  });

  it('keeps server-rendered fields and submission disabled until hydration and avoids a native GET', () => {
    const html = render({});
    expect(html).toContain('method="post"');
    expect(html).toMatch(/<fieldset[^>]*disabled/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Создать приход/);
  });

  it('announces why the whole form was refused', () => {
    const html = render({ error: 'Unknown order: 9' });

    expect(html).toContain('role="alert"');
    expect(html).toContain('Не удалось сохранить. Проверьте данные и повторите попытку.');
  });
});
