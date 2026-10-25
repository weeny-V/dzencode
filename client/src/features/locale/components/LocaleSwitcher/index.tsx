'use client';
import './LocaleSwitcher.scss';

import { useTranslations } from 'next-intl';

import { LOCALES } from '@/shared/i18n/config';

import { useLocaleSwitcher } from './useLocaleSwitcher';
export function LocaleSwitcher() {
  const t = useTranslations('LocaleSwitcher');
  const { locale, pending, failed, change } = useLocaleSwitcher();
  return (
    <div className="locale-switcher">
      <div
        className="locale-switcher__group"
        role="group"
        aria-label={t('label')}
        aria-busy={pending}
      >
        {LOCALES.map((value) => (
          <button
            className="locale-switcher__button"
            key={value}
            type="button"
            lang={value}
            aria-pressed={value === locale}
            disabled={pending}
            onClick={() => change(value)}
          >
            {value.toUpperCase()}
          </button>
        ))}
      </div>
      {failed && (
        <span className="locale-switcher__error" role="alert">
          {t('failure')}
        </span>
      )}
    </div>
  );
}
