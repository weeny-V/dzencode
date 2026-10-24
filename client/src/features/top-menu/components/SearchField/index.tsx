'use client';

import './SearchField.scss';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, startTransition, useEffect, useId, useRef, useState } from 'react';

import { withParam } from '@/shared/lib/searchParams';
import { CloseIcon } from '@/shared/ui/icons';

const DEBOUNCE_MS = 250;

/** A disabled copy of the field, shown while the real one waits for the address (and on pages without a search). */
export function SearchFieldPlaceholder({ title = 'Поиск' }: { title?: string }) {
  return (
    <div className="search-field">
      <input
        type="search"
        className="search-field__input"
        placeholder="Поиск"
        aria-label="Поиск"
        disabled
        title={title}
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
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const urlValue = useSearchParams().get('q') ?? '';

  const [value, setValue] = useState(urlValue);
  const [seenUrlValue, setSeenUrlValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The address changed from outside (a "reset the search" link, the back button): show it in the field.
  // While the visitor types, the address follows the field, so nothing is overwritten.
  if (urlValue !== seenUrlValue) {
    setSeenUrlValue(urlValue);
    if (urlValue !== value.trim()) setValue(urlValue);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (text: string) => {
    // Read the address now, not when the timer was set: other parameters may have changed meanwhile.
    const query = withParam(new URLSearchParams(window.location.search), 'q', text.trim());
    startTransition(() => router.replace(`${pathname}${query}`, { scroll: false }));
  };

  const change = (text: string) => {
    setValue(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(text), DEBOUNCE_MS);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setValue('');
    apply('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    clearTimeout(timer.current);
    apply(value);
  };

  return (
    <form className="search-field" role="search" onSubmit={submit}>
      <label className="visually-hidden" htmlFor={id}>
        Поиск
      </label>
      <input
        id={id}
        type="search"
        className="search-field__input"
        placeholder="Поиск"
        value={value}
        disabled={!enabled}
        title={enabled ? undefined : 'Поиск работает на страницах «Приход» и «Продукты»'}
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
          aria-label="Очистить поиск"
        >
          <CloseIcon />
        </button>
      )}
    </form>
  );
}
