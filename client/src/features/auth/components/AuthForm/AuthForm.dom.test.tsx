import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthForm } from '.';
import en from './messages/en.json';
import ru from './messages/ru.json';

const state = vi.hoisted(() => ({
  submitCredentials: vi.fn(),
  navigateAfterAuth: vi.fn(),
  reloadAfterAuth: vi.fn(),
}));
vi.mock('../../actions', () => ({ submitCredentials: state.submitCredentials }));
vi.mock('../../api/coordination', () => ({
  serializeAuthMutation: async <T,>(operation: () => Promise<T>) => await operation(),
}));
vi.mock('@/shared/lib/authNavigation', () => state);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
const show = (mode: 'login' | 'register', locale: 'en' | 'ru' = 'en') =>
  render(
    <NextIntlClientProvider
      locale={locale}
      messages={{ AuthForm: locale === 'en' ? en : ru }}
      timeZone="UTC"
    >
      <AuthForm mode={mode} returnTo="/users" />
    </NextIntlClientProvider>,
  );
describe('public authentication forms', () => {
  it('allows 100 supplementary Unicode characters in both names and validates the next character', async () => {
    state.submitCredentials.mockResolvedValue({ ok: false, error: 'unavailable' });
    show('register');
    const user = userEvent.setup({ delay: null });
    const name = '𠮷'.repeat(100);
    const first = screen.getByLabelText('First name', { exact: false });
    const last = screen.getByLabelText('Last name', { exact: false });
    await user.click(first);
    await user.paste(name);
    await user.click(last);
    await user.paste(name);
    expect(first).toHaveValue(name);
    expect(last).toHaveValue(name);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'private password' } });
    fireEvent.change(screen.getByLabelText(/Confirm password/), {
      target: { value: 'private password' },
    });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(state.submitCredentials).toHaveBeenCalledWith(
        'register',
        expect.objectContaining({ firstName: name, lastName: name }),
        '/users',
      ),
    );
    await user.type(first, '𠮷');
    await user.tab();
    expect(await screen.findByText(en.nameLength)).toBeVisible();
  });
  it('validates registration and matching confirmation without a request', async () => {
    show('register');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findAllByText('This field is required.')).not.toHaveLength(0);
    expect(state.submitCredentials).not.toHaveBeenCalled();
  });
  it.each(['en', 'ru'] as const)(
    'localizes invalid credentials and does not persist passwords in %s',
    async (locale) => {
      const t = locale === 'en' ? en : ru;
      state.submitCredentials.mockResolvedValue({ ok: false, error: 'invalidCredentials' });
      show('login', locale);
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(t.emailLabel, { exact: false }), 'test@example.com');
      await user.type(screen.getByLabelText(t.passwordLabel, { exact: false }), 'private password');
      await user.click(screen.getByRole('button', { name: t.login }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t.invalidCredentials);
      expect(screen.getByLabelText(t.passwordLabel, { exact: false })).toHaveValue('');
      expect(localStorage.length).toBe(0);
      expect(state.navigateAfterAuth).not.toHaveBeenCalled();
    },
  );
  it('starts a fresh document for successful login and returns to the protected local destination', async () => {
    state.submitCredentials.mockResolvedValue({ ok: true, data: { returnTo: '/users' } });
    show('login');
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'private password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(state.navigateAfterAuth).toHaveBeenCalledWith('/users'));
    expect(localStorage.getItem('inventory:auth:change')).not.toContain('private password');
  });
  it('announces an already-applied cookie after the form unmounts and reloads the current address', async () => {
    let finish!: (result: { ok: true; data: { returnTo: string } }) => void;
    state.submitCredentials.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const view = show('login');
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'private password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(state.submitCredentials).toHaveBeenCalledOnce());
    view.unmount();
    await act(async () => {
      finish({ ok: true, data: { returnTo: '/users' } });
      await Promise.resolve();
    });
    expect(localStorage.getItem('inventory:auth:change')).toBeTruthy();
    expect(state.reloadAfterAuth).toHaveBeenCalledOnce();
    expect(state.navigateAfterAuth).not.toHaveBeenCalled();
  });
});
