import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { navigation } from '@/testing/navigation';

import { RetryButton } from './index';

vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
describe('RetryButton', () => {
  it('asks Next to retry the current server-rendered page', () => {
    navigation.refresh.mockClear();
    render(<RetryButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(navigation.refresh).toHaveBeenCalledOnce();
  });
});
