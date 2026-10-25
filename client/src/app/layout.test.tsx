import { NextIntlClientProvider } from 'next-intl';
import { renderToReadableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import ErrorPage from './error';
import RootLayout from './layout';
const state = vi.hoisted(() => ({ locale: 'en' }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve(state.locale) }));
vi.mock('next/font/google', () => ({ Montserrat: () => ({ variable: 'test-font' }) }));
vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
describe('route error locale scope', () => {
  it.each(['en', 'ru'])(
    'keeps the error dictionary accessible inside the shell for %s',
    async (locale) => {
      state.locale = locale;
      const tree = await RootLayout({
        children: <ErrorPage error={new Error('page failure')} retry={vi.fn()} />,
      });
      const stream = await renderToReadableStream(
        <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC">
          {tree}
        </NextIntlClientProvider>,
      );
      await stream.allReady;
      const html = await new Response(stream).text();
      expect(html).toContain(locale === 'en' ? 'Something went wrong' : 'Что-то пошло не так');
      expect(html).not.toContain('ErrorPage.title');
      expect(html).not.toContain('ErrorPage.text');
    },
  );
});
