import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { draftStorageKey, encodeDraft } from '@/shared/lib/formDraft';

import { useFormDraft } from './useFormDraft';
const defaults = { title: '', description: '' };
function useDraft(key = 'order') {
  const form = useForm({ defaultValues: defaults });
  const draft = useFormDraft(key, form, defaults);
  return { form, draft };
}
describe('form draft lifecycle', () => {
  it('separates reused form contexts and ignores a late completion from the previous context', () => {
    const { result, rerender } = renderHook(({ context }) => useDraft(context), {
      initialProps: { context: 'product:7' },
    });
    void act(() => result.current.form.setValue('title', 'order seven'));
    const oldComplete = result.current.draft.complete;
    const snapshot = result.current.draft.snapshot();
    rerender({ context: 'product:8' });
    expect(result.current.form.getValues()).toEqual(defaults);
    void act(() => result.current.form.setValue('title', 'order eight'));
    void act(() => oldComplete(snapshot));
    void act(() => result.current.form.setValue('description', 'still saving'));
    expect(localStorage.getItem(draftStorageKey('product:8'))).toContain('still saving');
    expect(localStorage.getItem(draftStorageKey('product:7'))).toBeNull();
  });

  it('restores after a remount and keeps unsuccessful submissions', () => {
    const first = renderHook(() => useDraft());
    void act(() => first.result.current.form.setValue('title', 'unfinished'));
    first.unmount();
    const second = renderHook(() => useDraft());
    expect(second.result.current.form.getValues('title')).toBe('unfinished');
  });
  it('does not remove another tab’s more recent draft on late success', () => {
    const { result } = renderHook(() => useDraft());
    void act(() => result.current.form.setValue('title', 'submitted'));
    const snapshot = result.current.draft.snapshot();
    const newer = encodeDraft({ ...defaults, title: 'newer draft' });
    localStorage.setItem(draftStorageKey('order'), newer);
    void act(() => result.current.draft.complete(snapshot));
    expect(localStorage.getItem(draftStorageKey('order'))).toBe(newer);
  });
  it('clears only its own draft on success and does not recreate it on unmount', () => {
    const first = renderHook(() => useDraft());
    void act(() => first.result.current.form.setValue('title', 'saved'));
    void act(() => first.result.current.draft.complete(first.result.current.draft.snapshot()));
    first.unmount();
    expect(localStorage.getItem(draftStorageKey('order'))).toBeNull();
  });
  it('resets fields and supports a new draft after clearing', () => {
    const { result } = renderHook(() => useDraft());
    void act(() => result.current.form.setValue('title', 'old'));
    void act(() => result.current.draft.clear());
    expect(result.current.form.getValues()).toEqual(defaults);
    expect(localStorage.getItem(draftStorageKey('order'))).toBeNull();
    void act(() => result.current.form.setValue('title', 'new'));
    expect(localStorage.getItem(draftStorageKey('order'))).toContain('new');
  });
  it('leaves editing available when browser storage is denied', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });
    const { result } = renderHook(() => useDraft());
    void act(() => result.current.form.setValue('title', 'still editable'));
    expect(result.current.form.getValues('title')).toBe('still editable');
    expect(result.current.draft.unavailable).toBe(true);
  });
});
