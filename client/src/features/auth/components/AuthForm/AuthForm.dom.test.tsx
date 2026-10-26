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
  it.each(['login', 'register'] as const)(
    'does not trigger blur validation before a click on the %s switch link',
    async (mode) => {
      show(mode);
      const user = userEvent.setup();
      const email = screen.getByLabelText(en.emailLabel, { exact: false });
      const link = screen.getByRole('link', {
        name: mode === 'login' ? en.registerLink : en.loginLink,
      });
      const activate = vi.fn((event: MouseEvent) => event.preventDefault());
      link.addEventListener('click', activate);
      await user.type(email, 'invalid');
      await user.click(link);
      expect(activate).toHaveBeenCalledOnce();
      expect(link).toHaveAttribute(
        'href',
        `${mode === 'login' ? '/register' : '/login'}?returnTo=%2Fusers`,
      );
      expect(screen.queryByText(en.email)).not.toBeInTheDocument();
      expect(state.submitCredentials).not.toHaveBeenCalled();
      // Ordinary blur still validates; only leaving through the link skips it.
      fireEvent.blur(email);
      expect(await screen.findByText(en.email)).toBeVisible();
    },
  );
  it.each(['login', 'register'] as const)(
    'shows no password requirements on the %s form',
    async (mode) => {
      show(mode);
      const user = userEvent.setup();
      const password = screen.getByLabelText(/^Password/, { selector: 'input' });
      await user.hover(password);
      await user.click(password);
      expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument();
      expect(password).not.toHaveAccessibleDescription();
      expect(state.submitCredentials).not.toHaveBeenCalled();
    },
  );
  it('keeps the validation error associated with the password input', async () => {
    show('register');
    const user = userEvent.setup();
    const password = screen.getByLabelText(/^Password/, { selector: 'input' });
    await user.click(password);
    fireEvent.change(password, { target: { value: 'short' } });
    await user.tab();
    expect(await screen.findByText(en.passwordTooShort)).toBeVisible();
    expect(password).toHaveAccessibleDescription(new RegExp(en.passwordTooShort));
    expect(state.submitCredentials).not.toHaveBeenCalled();
  });
  it.each([
    { mode: 'login', locale: 'en' },
    { mode: 'login', locale: 'ru' },
    { mode: 'register', locale: 'en' },
    { mode: 'register', locale: 'ru' },
  ] as const)(
    'toggles the $mode password by keyboard in $locale without changing or submitting it',
    async ({ mode, locale }) => {
      const t = locale === 'en' ? en : ru;
      show(mode, locale);
      const user = userEvent.setup();
      const password = screen.getByLabelText(t.passwordLabel, {
        exact: false,
        selector: 'input[name="password"]',
      });
      fireEvent.change(password, { target: { value: 'example password' } });
      expect(password).toHaveAttribute('type', 'password');
      await user.click(password);
      await user.tab();
      const toggle = screen.getByRole('button', { name: t.showPassword });
      expect(toggle).toHaveFocus();
      expect(toggle).toHaveAttribute('aria-controls', password.id);
      await user.keyboard(' ');
      expect(password).toHaveAttribute('type', 'text');
      expect(password).toHaveValue('example password');
      expect(screen.getByRole('button', { name: t.hidePassword })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(password).toHaveAttribute('type', 'password');
      expect(password).toHaveValue('example password');
      expect(state.submitCredentials).not.toHaveBeenCalled();
    },
  );
  it('toggles password confirmation independently of the password', async () => {
    show('register');
    const user = userEvent.setup();
    const password = screen.getByLabelText(/^Password/, { selector: 'input' });
    const confirmation = screen.getByLabelText(/Confirm password/, { selector: 'input' });
    fireEvent.change(confirmation, { target: { value: 'matching password' } });
    await user.click(screen.getByRole('button', { name: en.showPasswordConfirmation }));
    expect(confirmation).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveValue('matching password');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: en.hidePasswordConfirmation }));
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(state.submitCredentials).not.toHaveBeenCalled();
  });
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
    fireEvent.change(screen.getByLabelText(/^Password/, { selector: 'input' }), {
      target: { value: 'private password' },
    });
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
  it.each([
    { locale: 'en', value: 'short', key: 'passwordTooShort' },
    { locale: 'ru', value: 'short', key: 'passwordTooShort' },
    { locale: 'en', value: '🔒'.repeat(257), key: 'passwordTooLong' },
    { locale: 'ru', value: '🔒'.repeat(257), key: 'passwordTooLong' },
  ] as const)('explains $key in $locale on registration', async ({ locale, value, key }) => {
    const t = locale === 'en' ? en : ru;
    show('register', locale);
    const password = screen.getByLabelText(t.passwordLabel, {
      exact: false,
      selector: 'input[name="password"]',
    });
    fireEvent.change(password, { target: { value } });
    fireEvent.blur(password);
    expect(await screen.findByText(t[key])).toBeVisible();
    expect(password).toHaveAttribute('aria-invalid', 'true');
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
      await user.type(
        screen.getByLabelText(t.passwordLabel, { exact: false, selector: 'input' }),
        'private password',
      );
      await user.click(screen.getByRole('button', { name: t.login }));
      expect(await screen.findByRole('alert')).toHaveTextContent(t.invalidCredentials);
      expect(
        screen.getByLabelText(t.passwordLabel, { exact: false, selector: 'input' }),
      ).toHaveValue('');
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
