import { describe, expect, it } from 'vitest';

import { connectionChanged, countReceived, sessionsReducer } from './sessionsSlice';

const start = sessionsReducer(undefined, { type: 'init' });

describe('sessions slice', () => {
  it('starts connecting, without a number', () => {
    expect(start).toEqual({ connection: 'connecting', count: undefined });
  });

  it('goes online and keeps the number the server sends', () => {
    const online = sessionsReducer(start, connectionChanged(true));
    const counted = sessionsReducer(online, countReceived(3));

    expect(counted).toEqual({ connection: 'online', count: 3 });
  });

  it('takes a newer number over an older one', () => {
    const state = [countReceived(2), countReceived(1)].reduce(sessionsReducer, start);

    expect(state.count).toBe(1);
  });

  it('forgets the number when the connection breaks, and goes on after it returns', () => {
    const online = [connectionChanged(true), countReceived(4)].reduce(sessionsReducer, start);

    const offline = sessionsReducer(online, connectionChanged(false));
    expect(offline).toEqual({ connection: 'offline', count: undefined });

    const back = [connectionChanged(true), countReceived(5)].reduce(sessionsReducer, offline);
    expect(back).toEqual({ connection: 'online', count: 5 });
  });
});
