import { describe, expect, it, vi } from 'vitest';

import { testSession } from '@/testing/auth';
import { renderServer } from '@/testing/i18n';

import { UsersRoute } from './UsersRoute.server';

vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/shared/api/session.server', async () => {
  const { testSession } = await import('@/testing/auth');
  return { requireSession: () => Promise.resolve(testSession) };
});
vi.mock('../../api/users', () => ({
  getParticipants: () =>
    Promise.resolve([
      {
        id: 2,
        firstName: 'Other',
        lastName: 'Participant',
        registeredAt: '2026-02-03T00:00:00Z',
        email: 'must-not-render@example.com',
        passwordHash: 'must-not-render-hash',
      },
    ]),
}));
describe('users page privacy', () => {
  it('renders current-user email and only public participant fields', async () => {
    const html = await renderServer(await UsersRoute());
    expect(html).toContain(testSession.user.email);
    expect(html).toContain('Other Participant');
    expect(html).toContain('03 / 02 / 2026');
    expect(html).not.toContain('must-not-render');
  });
});
