'use client';
import { useEffect, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { decodeDraft, draftStorageKey, encodeDraft } from '@/shared/lib/formDraft';

import { useLatestRef } from './useLatestRef';

/** Browser-only drafts. Restoring happens after hydration and never overwrites an early edit. */
export function useFormDraft<T extends FieldValues>(
  key: string,
  form: UseFormReturn<T>,
  defaults: T,
  normalize?: (values: T) => T,
) {
  const [unavailable, setUnavailable] = useState(false);
  const latest = useLatestRef({ defaults, normalize, dirtyFields: form.formState.dirtyFields });
  const last = useRef<string | null>(null);
  const stopped = useRef(false);
  const storageKey = draftStorageKey(key);
  const activeKey = useRef(storageKey);
  useEffect(() => {
    const changed = activeKey.current !== storageKey;
    activeKey.current = storageKey;
    last.current = null;
    stopped.current = false;
    if (changed) form.reset(latest.current.defaults);
    const fail = () => setUnavailable(true);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = decodeDraft(raw, latest.current.defaults);
      if (saved) {
        form.reset(latest.current.normalize?.(saved) ?? saved, { keepDirtyValues: true });
        last.current = raw;
      } else if (raw) localStorage.removeItem(storageKey);
    } catch {
      fail();
    }
    const subscription = form.watch(() => {
      if (stopped.current) return;
      try {
        const raw = encodeDraft(form.getValues());
        localStorage.setItem(storageKey, raw);
        last.current = raw;
        setUnavailable(false);
      } catch {
        fail();
      }
    });
    return () => subscription.unsubscribe();
  }, [storageKey, form, latest]);
  const removeIfCurrent = (snapshot: string | null) => {
    try {
      if (localStorage.getItem(storageKey) === snapshot) localStorage.removeItem(storageKey);
    } catch {
      setUnavailable(true);
    }
  };
  return {
    unavailable,
    snapshot: () => last.current,
    complete: (snapshot: string | null) => {
      if (activeKey.current === storageKey) stopped.current = true;
      removeIfCurrent(snapshot);
    },
    clear: () => {
      stopped.current = true;
      removeIfCurrent(last.current);
      form.reset(latest.current.defaults);
      last.current = null;
      stopped.current = false;
    },
  };
}
