import { describe, expect, it } from 'vitest';

import { renderToStaticMarkup } from '@/testing/i18n';

import { CheckboxField, FormField } from './index';

const render = (props: { error?: string; hint?: string; required?: boolean; wide?: boolean }) =>
  renderToStaticMarkup(
    <FormField label="Название" {...props}>
      {(control) => <input {...control} />}
    </FormField>,
  );

describe('FormField', () => {
  it('ties the label to the control', () => {
    const html = render({});
    const id = /for="([^"]+)"/.exec(html)?.[1];

    expect(id).toBeDefined();
    expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('aria-invalid');
    expect(html).not.toContain('role="alert"');
  });

  it('marks the control invalid and announces the error, linked to the control', () => {
    const html = render({ error: 'Введите название' });
    const messageId = /aria-describedby="([^"]+)"/.exec(html)?.[1];

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Введите название');
    expect(html).toContain(`id="${messageId}"`);
  });

  it('shows the hint while there is no error, and the error instead of it otherwise', () => {
    expect(render({ hint: 'Подсказка' })).toContain('Подсказка');

    const withBoth = render({ hint: 'Подсказка', error: 'Ошибка' });
    expect(withBoth).toContain('Ошибка');
    expect(withBoth).not.toContain('Подсказка');
  });

  it('marks a required field and takes the whole row when wide', () => {
    expect(render({ required: true })).toContain('field__required');
    expect(render({})).not.toContain('field__required');
    expect(render({ wide: true })).toContain('field--wide');
    expect(render({})).not.toContain('field--wide');
  });
});

describe('CheckboxField', () => {
  it('ties the label to the checkbox', () => {
    const html = renderToStaticMarkup(
      <CheckboxField label="Новый">
        {(control) => <input type="checkbox" {...control} />}
      </CheckboxField>,
    );
    const id = /for="([^"]+)"/.exec(html)?.[1];

    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('type="checkbox"');
  });
});
