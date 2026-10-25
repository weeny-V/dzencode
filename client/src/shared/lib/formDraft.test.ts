import { describe, expect, it } from 'vitest';

import { decodeDraft, DRAFT_TTL, encodeDraft } from './formDraft';
describe('form draft records', () => {
  const defaults = { title: '', isNew: true };
  it('round trips raw form fields without treating them as valid API input', () => {
    const values = { title: ' unfinished ', isNew: false };
    expect(decodeDraft(encodeDraft(values), defaults)).toEqual(values);
  });
  it('rejects broken JSON, unsupported versions, missing fields and expired records', () => {
    expect(decodeDraft('{', defaults)).toBeUndefined();
    const record = { version: 1, updatedAt: 1000, values: { title: 'old', isNew: true } };
    expect(decodeDraft(JSON.stringify(record), defaults, 1000 + DRAFT_TTL)).toBeUndefined();
    expect(decodeDraft(JSON.stringify({ ...record, version: 2 }), defaults, 1001)).toBeUndefined();
    expect(
      decodeDraft(JSON.stringify({ ...record, values: { title: 3, isNew: true } }), defaults, 1001),
    ).toBeUndefined();
    expect(decodeDraft(JSON.stringify(record), defaults, 999)).toBeUndefined();
  });
});
