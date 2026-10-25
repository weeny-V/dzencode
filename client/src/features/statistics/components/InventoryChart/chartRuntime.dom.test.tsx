import { Chart } from 'chart.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountBarChart } from './chartRuntime';

afterEach(() => vi.restoreAllMocks());

describe('bar-chart canvas failure', () => {
  it('exposes a recoverable failure and destroys the partial Chart.js instance when 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const canvas = document.createElement('canvas');
    expect(() => mountBarChart(canvas, ['Monitors'], [2], '')).toThrow('2D context');
    expect(Chart.getChart(canvas)).toBeUndefined();
  });
});
