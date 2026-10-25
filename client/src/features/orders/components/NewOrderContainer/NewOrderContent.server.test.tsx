import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderServer } from '@/testing/i18n';

import { NewOrderContent } from './NewOrderContent.server';

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), getWarehouses: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('ru') }));
vi.mock('@/shared/api/session.server', () => ({ requireSession: mocks.requireSession }));
vi.mock('@/features/warehouses', () => ({ getWarehouses: mocks.getWarehouses }));
vi.mock('@/shared/i18n/FormMessages.server', () => ({
  FormMessages: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('.', () => ({ NewOrderContainer: () => <form>Order form</form> }));
vi.mock('@/shared/ui/RetryButton', () => ({ RetryButton: () => <button>Retry</button> }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue({});
});

describe('protected request-time order options', () => {
  it('authorizes before loading cached options or rendering the form', async () => {
    const redirect = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });
    mocks.requireSession.mockRejectedValue(redirect);
    await expect(NewOrderContent()).rejects.toBe(redirect);
    expect(mocks.getWarehouses).not.toHaveBeenCalled();
  });
  it('keeps an option failure recoverable without mounting an invalid form', async () => {
    mocks.getWarehouses
      .mockRejectedValueOnce(new Error('API unavailable'))
      .mockResolvedValueOnce([]);
    const failed = await renderServer(await NewOrderContent());
    expect(failed).toContain('Не удалось загрузить данные формы.');
    expect(failed).not.toContain('<form');
    expect(await renderServer(await NewOrderContent())).toContain('Order form');
  });
});
