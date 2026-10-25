import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { useHydrated } from './useHydrated';

function Probe() {
  return <p>{useHydrated() ? 'hydrated' : 'server'}</p>;
}

describe('useHydrated', () => {
  it('is false in the server HTML and true once the browser has rendered it', () => {
    expect(renderToString(<Probe />)).toContain('server');
    render(<Probe />);
    expect(screen.getByText('hydrated')).toBeInTheDocument();
  });
});
