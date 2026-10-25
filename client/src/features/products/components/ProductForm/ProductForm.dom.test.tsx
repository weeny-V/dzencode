import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '@/testing/i18n';

import { ProductForm } from './index';

const orders = [
  { id: 7, title: 'Order seven' },
  { id: 8, title: 'Order eight' },
];
describe('ProductForm', () => {
  it('preselects an order without overwriting a visitor choice when props change', () => {
    const props = { types: ['Monitors'], orders, cancelHref: '/orders', onSubmit: vi.fn() };
    const { rerender } = render(<ProductForm {...props} initialOrder={7} />);
    const select = screen.getByRole('combobox', { name: /Приход/ });
    expect(select).toHaveValue('7');
    fireEvent.change(select, { target: { value: '8' } });
    rerender(<ProductForm {...props} initialOrder={8} />);
    expect(select).toHaveValue('8');
  });
  it('validates fields and submits the selected parent, dates and both currencies', async () => {
    const submit = vi.fn().mockResolvedValue('Product refused');
    render(
      <ProductForm
        types={['Monitors']}
        orders={orders}
        initialOrder={7}
        cancelHref="/orders"
        onSubmit={submit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Создать продукт' }));
    await screen.findAllByText('Обязательное поле');
    expect(submit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: /Название/ }), {
      target: { value: 'Monitor' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Серийный номер/ }), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: /Тип/ }), {
      target: { value: 'Monitors' },
    });
    fireEvent.change(screen.getByLabelText(/Гарантия с/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/Гарантия по/), { target: { value: '2027-10-01' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Цена, \$/ }), {
      target: { value: '20,50' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /Цена, UAH/ }), {
      target: { value: '850' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать продукт' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Monitor',
          serialNumber: 123,
          order: 7,
          type: 'Monitors',
          price: [
            { value: 20.5, symbol: 'USD', isDefault: false },
            { value: 850, symbol: 'UAH', isDefault: true },
          ],
        }),
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось сохранить. Проверьте данные и повторите попытку.',
    );
  });
});
