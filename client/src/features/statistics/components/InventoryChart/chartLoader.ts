/** Keep the heavy dependency outside the initial client graph. */
export const loadChartRuntime = () => import('./chartRuntime');
