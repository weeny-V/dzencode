import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { render } from '@/testing/i18n';
import { navigation } from '@/testing/navigation';

import { TypeFilter } from './index';

vi.mock('next/navigation', async () => (await import('@/testing/navigation')).navigationMock);
describe('TypeFilter navigation', () => {
  it('preserves search and sends the selected type through Next', () => {
    navigation.replace.mockReset();
    navigation.pathname = '/products';
    navigation.search = 'q=monitor';
    render(<TypeFilter types={['Monitors', 'Keyboards']} selected="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Monitors' } });
    expect(navigation.replace).toHaveBeenCalledWith('/products?q=monitor&type=Monitors', {
      scroll: false,
    });
  });
});
