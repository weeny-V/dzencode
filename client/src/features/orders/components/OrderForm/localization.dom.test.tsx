import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, TestLocale } from '@/testing/i18n';

import { OrderForm } from '.';
describe('form locale changes', () => {
  it('rewords validation and keeps unsaved fields when the language changes', async () => {
    const form = <OrderForm onSubmit={vi.fn()} />;
    const { rerender } = render(<TestLocale locale="en">{form}</TestLocale>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'unsaved text' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create order' }));
    expect(await screen.findByText('This field is required')).toBeVisible();
    rerender(<TestLocale locale="ru">{form}</TestLocale>);
    expect(screen.getByText('Обязательное поле')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Описание' })).toHaveValue('unsaved text');
  });
});
