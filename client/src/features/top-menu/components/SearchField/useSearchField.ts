'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, startTransition, useEffect, useOptimistic, useRef, useState } from 'react';

import { withParam } from '@/shared/lib/searchParams';

const DEBOUNCE_MS = 250;

interface SearchDraft {
  value: string;
  urlValue: string;
  submitted: string[];
  resetVersion: number;
}

/** Keeps the editable draft separate from URLs acknowledged by server navigation. */
export function useSearchField() {
  const pathname = usePathname();
  const router = useRouter();
  const urlValue = useSearchParams().get('q') ?? '';
  const [draft, setDraft] = useState<SearchDraft>({
    value: urlValue,
    urlValue,
    submitted: [],
    resetVersion: 0,
  });
  const [pending, setPending] = useOptimistic(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  if (urlValue !== draft.urlValue) {
    const index = draft.submitted.lastIndexOf(urlValue);
    const external = index === -1;
    // An acknowledgement must not replace newer typing or cancel its debounce.
    // Newer acknowledgements also retire superseded requests.
    setDraft({
      value: external ? urlValue : draft.value,
      urlValue,
      submitted: external ? [] : draft.submitted.slice(index + 1),
      resetVersion: draft.resetVersion + Number(external),
    });
  }

  // External navigation abandons the draft; internal acknowledgements keep its timer alive.
  useEffect(() => () => clearTimeout(timer.current), [draft.resetVersion]);

  useEffect(() => {
    const restoreHistory = () => {
      clearTimeout(timer.current);
      const value = new URLSearchParams(window.location.search).get('q') ?? '';
      // History wins even when its query happens to match an outstanding request.
      setDraft((current) => ({
        ...current,
        value,
        submitted: [],
        resetVersion: current.resetVersion + 1,
      }));
    };
    window.addEventListener('popstate', restoreHistory);
    return () => window.removeEventListener('popstate', restoreHistory);
  }, []);

  const apply = (text: string) => {
    const queryValue = text.trim();
    const query = withParam(new URLSearchParams(window.location.search), 'q', queryValue);
    setDraft((current) => ({
      ...current,
      submitted: [...current.submitted.filter((value) => value !== queryValue), queryValue],
    }));
    startTransition(() => {
      setPending(true);
      router.replace(`${pathname}${query}`, { scroll: false });
    });
  };

  const change = (value: string) => {
    setDraft((current) => ({ ...current, value }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(value), DEBOUNCE_MS);
  };

  const clear = () => {
    clearTimeout(timer.current);
    setDraft((current) => ({ ...current, value: '' }));
    apply('');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    clearTimeout(timer.current);
    apply(draft.value);
  };

  return { value: draft.value, pending, change, clear, submit };
}
