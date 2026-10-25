import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { draftStorageKey, encodeDraft } from '@/shared/lib/formDraft';
import { deferred } from '@/testing/fixtures';
import { render } from '@/testing/i18n';

import { OrderForm } from './index';

describe('OrderForm', () => {
  it.each([undefined, '999'])(
    'restores a legacy/stale warehouse %s as unassigned while preserving other fields',
    (warehouseId) => {
      localStorage.setItem(
        draftStorageKey('user:1:order'),
        encodeDraft({
          title: 'Recovered order',
          description: 'Preserved description',
          date: '',
          ...(warehouseId === undefined ? {} : { warehouseId }),
        }),
      );
      render(<OrderForm warehouses={[]} onSubmit={vi.fn()} />);
      expect(screen.getByRole('textbox', { name: /Название/ })).toHaveValue('Recovered order');
      expect(screen.getByRole('textbox', { name: 'Описание' })).toHaveValue(
        'Preserved description',
      );
      expect(screen.getByRole('combobox', { name: 'Склад' })).toHaveValue('');
    },
  );
  it('preserves a newer warehouse draft when an older save finishes', async () => {
    const saved = deferred<string | undefined>();
    const submit = vi.fn(() => saved.promise);
    const user = userEvent.setup();
    const warehouses = [
      { id: 2, code: 'DEMO', name: 'Warehouse', address: 'Demo', latitude: 0, longitude: 0 },
    ];
    render(<OrderForm warehouses={warehouses} onSubmit={submit} />);
    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Draft during save');
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    await user.selectOptions(screen.getByRole('combobox', { name: 'Склад' }), '2');
    const latest = localStorage.getItem(draftStorageKey('user:1:order'));
    saved.resolve(undefined);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Создать приход' })).toBeEnabled(),
    );
    expect(localStorage.getItem(draftStorageKey('user:1:order'))).toBe(latest);
    expect(latest).toContain('"warehouseId":"2"');
  });
  it('retains the chosen warehouse and other values after a server failure', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue('Unknown warehouse');
    const warehouses = [
      {
        id: 2,
        code: 'DEMO',
        name: 'Warehouse',
        address: 'Demo address',
        latitude: 0,
        longitude: 0,
      },
    ];
    const view = render(<OrderForm warehouses={warehouses} onSubmit={submit} />);
    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'Preserved');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Склад' }), '2');
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось сохранить. Проверьте данные и повторите попытку.',
    );
    expect(screen.getByRole('combobox')).toHaveValue('2');
    view.rerender(<OrderForm warehouses={[]} onSubmit={submit} />);
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    expect(await screen.findByText('Этот склад больше недоступен. Выберите другой.')).toBeVisible();
    expect(submit).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: /Название/ })).toHaveValue('Preserved');
    await user.selectOptions(screen.getByRole('combobox'), '');
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    await waitFor(() =>
      expect(submit).toHaveBeenLastCalledWith(expect.objectContaining({ warehouseId: null })),
    );
  });
  it('validates before submitting', async () => {
    const submit = vi.fn();
    render(<OrderForm warehouses={[]} onSubmit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Создать приход' }));
    expect(await screen.findByText('Обязательное поле')).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });
  it('submits converted values and displays an API validation failure', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue('Server rejected title');
    render(<OrderForm warehouses={[]} onSubmit={submit} />);
    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'New order');
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New order' })),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось сохранить. Проверьте данные и повторите попытку.',
    );
  });
});
