import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

import { DEFAULT_LOCALE, type Locale } from '@/shared/i18n/config';
import { formatAmount } from '@/shared/lib/money';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

export const mountBarChart = (
  canvas: HTMLCanvasElement,
  labels: string[],
  values: number[],
  unit: string,
  locale: Locale = DEFAULT_LOCALE,
) => {
  const styles = getComputedStyle(canvas);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: styles.getPropertyValue('--chart-bar').trim() }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      animation: false,
      color: styles.getPropertyValue('--chart-text').trim(),
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0, callback: (value) => formatAmount(Number(value), locale) },
        },
        y: {
          ticks: {
            autoSkip: false,
            callback(value) {
              const label = this.getLabelForValue(Number(value));
              return label.length > 28 ? `${label.slice(0, 27)}…` : label;
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `${formatAmount(context.parsed.x ?? 0, locale)} ${unit}`,
          },
        },
      },
    },
  });
  if (!chart.ctx) {
    chart.destroy();
    throw new Error('A canvas 2D context is unavailable');
  }
  return () => chart.destroy();
};
