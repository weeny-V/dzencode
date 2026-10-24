import { ApiStatus } from '@/features/api-status';

// Stage 0 placeholder: proves the client builds and can reach the API.
export default function Home() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Inventory</h1>
      <p>Orders &amp; Products — scaffold</p>
      <ApiStatus />
    </main>
  );
}
