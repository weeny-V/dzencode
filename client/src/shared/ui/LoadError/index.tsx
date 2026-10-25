import './LoadError.scss';

import { NextIntlClientProvider } from 'next-intl';

import { RetryButton } from '../RetryButton';
import { dictionary } from '../RetryButton/messages.server';

interface LoadErrorProps {
  /** What failed, as a sentence: "Не удалось загрузить приходы." */
  title: string;
  /** The reason from the server or the network, shown smaller. */
  message?: string;
}

/** The message that replaces a list or panel whose request failed, with a button to try again. */
export async function LoadError({ title, message }: LoadErrorProps) {
  const { locale, messages } = await dictionary();
  return (
    <div className="load-error" role="alert">
      <p className="load-error__title">{title}</p>
      {message && <p className="load-error__message">{message}</p>}
      <NextIntlClientProvider locale={locale} messages={{ RetryButton: messages }}>
        <RetryButton />
      </NextIntlClientProvider>
    </div>
  );
}
