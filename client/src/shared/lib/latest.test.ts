import { describe, expect, it } from 'vitest';

import { createLatest } from './latest';

describe('createLatest', () => {
  it('knows only the newest operation as current', () => {
    const latest = createLatest();

    const first = latest.begin();
    expect(latest.isCurrent(first)).toBe(true);

    const second = latest.begin();
    expect(latest.isCurrent(first)).toBe(false);
    expect(latest.isCurrent(second)).toBe(true);
  });

  it('makes a running operation stale on cancel', () => {
    const latest = createLatest();
    const operation = latest.begin();

    latest.cancel();

    expect(latest.isCurrent(operation)).toBe(false);
  });

  it('keeps instances apart', () => {
    const a = createLatest();
    const b = createLatest();
    const operation = a.begin();

    b.begin();

    expect(a.isCurrent(operation)).toBe(true);
  });
});
