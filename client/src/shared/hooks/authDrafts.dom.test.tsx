import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it } from 'vitest';

import { draftStorageKey, encodeDraft } from '@/shared/lib/formDraft';
import { AuthSessionProvider } from '@/shared/ui/AuthSessionProvider';

import { useFormDraft } from './useFormDraft';

const defaults = { title: '', description: '' };
beforeEach(() => localStorage.clear());
describe('draft ownership across accounts', () => {
  it('never adopts anonymous or another account drafts and restores the owner within the lifetime', () => {
    let identity = { userId: 1, sessionId: 'a'.repeat(64) };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthSessionProvider identity={identity}>{children}</AuthSessionProvider>
    );
    localStorage.setItem(
      draftStorageKey('order'),
      encodeDraft({ ...defaults, title: 'anonymous' }),
    );
    const { result, rerender } = renderHook(
      () => {
        const form = useForm({ defaultValues: defaults });
        const draft = useFormDraft('order', form, defaults);
        return { form, draft };
      },
      { wrapper },
    );
    expect(result.current.form.getValues('title')).toBe('');
    void act(() => result.current.form.setValue('title', 'user A'));
    identity = { userId: 2, sessionId: 'b'.repeat(64) };
    rerender();
    expect(result.current.form.getValues('title')).toBe('');
    void act(() => result.current.form.setValue('title', 'user B'));
    identity = { userId: 1, sessionId: 'c'.repeat(64) };
    rerender();
    expect(result.current.form.getValues('title')).toBe('user A');
    expect(localStorage.getItem(draftStorageKey('user:2:order'))).toContain('user B');
  });
  it('does not remove or stop a new account draft when an old account save finishes', () => {
    let identity = { userId: 1, sessionId: 'a'.repeat(64) };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthSessionProvider identity={identity}>{children}</AuthSessionProvider>
    );
    const { result, rerender } = renderHook(
      () => {
        const form = useForm({ defaultValues: defaults });
        return { form, draft: useFormDraft('order', form, defaults) };
      },
      { wrapper },
    );
    void act(() => result.current.form.setValue('title', 'old user A'));
    const complete = result.current.draft.complete;
    const snapshot = result.current.draft.snapshot();
    identity = { userId: 2, sessionId: 'b'.repeat(64) };
    rerender();
    void act(() => result.current.form.setValue('title', 'new user B'));
    void act(() => complete(snapshot));
    void act(() => result.current.form.setValue('description', 'still editable'));
    expect(localStorage.getItem(draftStorageKey('user:2:order'))).toContain('still editable');
  });
});
