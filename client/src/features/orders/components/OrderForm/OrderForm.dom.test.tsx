import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderForm } from './index';

describe('OrderForm', () => {
  it('validates before submitting', async () => {
    const submit = vi.fn();
    render(<OrderForm onSubmit={submit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Создать приход' }));
    expect(await screen.findByText('Введите название прихода')).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });
  it('submits converted values and displays an API validation failure', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue('Server rejected title');
    render(<OrderForm onSubmit={submit} />);
    await user.type(screen.getByRole('textbox', { name: /Название/ }), 'New order');
    await user.click(screen.getByRole('button', { name: 'Создать приход' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ title: 'New order' })),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Server rejected title');
  });
});
