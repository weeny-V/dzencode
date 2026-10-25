/** Keep the heavy dependency outside the initial client graph. */
export const loadGraphRuntime = () => import('./graphRuntime');
