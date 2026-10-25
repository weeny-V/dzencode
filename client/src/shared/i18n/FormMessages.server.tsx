import type { AbstractIntlMessages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';

import type { Locale } from '@/shared/i18n/config';
import { dictionary as validation } from '@/shared/lib/formValidation/messages.server';
import { dictionary as layout } from '@/shared/ui/FormLayout/messages.server';
export async function FormMessages({
  children,
  name,
  dictionary,
}: {
  children: ReactNode;
  name: string;
  dictionary: { locale: Locale; messages: AbstractIntlMessages };
}) {
  const [l, v] = await Promise.all([layout(), validation()]);
  return (
    <NextIntlClientProvider
      locale={dictionary.locale}
      messages={{ [name]: dictionary.messages, FormLayout: l.messages, Validation: v.messages }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
