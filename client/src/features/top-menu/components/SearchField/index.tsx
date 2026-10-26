'use client';

import './SearchField.scss';

import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { CloseIcon } from '@/shared/ui/icons';

import { useSearchField } from './useSearchField';

/** A disabled copy of the field, shown while the real one waits for the address (and on pages without a search). */
export function SearchFieldPlaceholder({ title }: { title?: string }) {
  const t = useTranslations('SearchField');
  return (
    <div className="search-field">
      <input
        type="search"
        className="search-field__input"
        placeholder={t('search')}
        aria-label={t('search')}
        disabled
        title={title ?? t('search')}
      />
    </div>
  );
}

interface SearchFieldProps {
  /** Pages without a list to search in get a disabled field. */
  enabled: boolean;
}

/**
 * The live search of the top menu. The text lives in the address (`?q=...`), so it survives a reload, works with
 * the back button and is read by the page on the server; the other parameters (`order`, `type`) are kept.
 * Typing updates the address after a short pause, through a transition, so the list changes smoothly.
 * Mount it with `key={pathname}`: moving to another page starts with an empty field.
 */
export function SearchField({ enabled }: SearchFieldProps) {
  const field = useSearchField();
  return <SearchFieldView enabled={enabled} {...field} />;
}

function SearchFieldView({
  enabled,
  value,
  pending,
  change,
  clear,
  submit,
}: SearchFieldProps & ReturnType<typeof useSearchField>) {
  const t = useTranslations('SearchField');
  const id = useId();

  return (
    <form
      className="search-field"
      role="search"
      onSubmit={submit}
      data-pending={pending ? '' : undefined}
    >
      <label className="visually-hidden" htmlFor={id}>
        {t('search')}
      </label>
      <input
        id={id}
        type="search"
        className="search-field__input"
        placeholder={t('search')}
        value={value}
        disabled={!enabled}
        title={enabled ? undefined : t('disabled')}
        autoComplete="off"
        maxLength={100}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault();
            clear();
          }
        }}
      />
      {value && enabled && (
        <button
          type="button"
          className="search-field__clear"
          onClick={clear}
          aria-label={t('clear')}
        >
          <CloseIcon />
        </button>
      )}
    </form>
  );
}
