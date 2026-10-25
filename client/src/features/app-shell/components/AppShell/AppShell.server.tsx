import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import { apiStatusMessages } from '@/features/api-status';
import { authMessages, LogoutButton } from '@/features/auth';
import { localeMessages } from '@/features/locale';
import { navigationMenuMessages } from '@/features/navigation-menu';
import { sessionsMessages } from '@/features/sessions';
import { searchMessages, topMenuMessages } from '@/features/top-menu';
import { getDictionary } from '@/shared/i18n/server';
import { dictionary as calendarMessages } from '@/shared/lib/calendar/messages.server';

import { AppShell } from '.';
import { dictionary } from './messages.server';

export async function LocalizedAppShell({ children }: { children: ReactNode }) {
  const [shell, top, search, nav, sessions, api, locale, calendar, auth] = await Promise.all([
    dictionary(),
    getDictionary(topMenuMessages),
    getDictionary(searchMessages),
    getDictionary(navigationMenuMessages),
    getDictionary(sessionsMessages),
    getDictionary(apiStatusMessages),
    getDictionary(localeMessages),
    calendarMessages(),
    getDictionary(authMessages),
  ]);
  return (
    <NextIntlClientProvider
      locale={shell.locale}
      messages={{
        AppShell: shell.messages,
        TopMenu: top.messages,
        SearchField: search.messages,
        NavigationMenu: nav.messages,
        SessionsCounter: sessions.messages,
        ApiStatus: api.messages,
        LocaleSwitcher: locale.messages,
        Calendar: calendar.messages,
        AuthForm: auth.messages,
      }}
    >
      <AppShell authControls={<LogoutButton />}>{children}</AppShell>
    </NextIntlClientProvider>
  );
}
