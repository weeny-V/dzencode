// Fixed loopback addresses belong exclusively to the disposable stack in docker-compose.test.yml.
export const baseURL = 'http://localhost:3074';
export const apiURL = process.env.E2E_PROXY === '1' ? `${baseURL}/api` : 'http://localhost:4074';
