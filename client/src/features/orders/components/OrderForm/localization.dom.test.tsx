import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render, TestLocale } from '@/testing/i18n';

import { OrderForm } from '.';
describe('form locale changes', () => {
  it('rewords validation and keeps unsaved fields when the language changes', async () => {
    const form = (
      <OrderForm
        warehouses={[
          { id: 2, code: 'DEMO', name: 'Demo', address: 'Demo address', latitude: 0, longitude: 0 },
        ]}
        onSubmit={vi.fn()}
      />
    );
    const { rerender } = render(<TestLocale locale="en">{form}</TestLocale>);
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), {
      target: { value: 'unsaved text' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Warehouse' }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create order' }));
    expect(await screen.findByText('This field is required')).toBeVisible();
    rerender(<TestLocale locale="ru">{form}</TestLocale>);
    expect(screen.getByText('Обязательное поле')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Описание' })).toHaveValue('unsaved text');
    expect(screen.getByRole('combobox', { name: 'Склад' })).toHaveValue('2');
  });
});
