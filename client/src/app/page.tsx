import { redirect } from 'next/navigation';

// The app opens on the orders page.
export default function Home() {
  redirect('/orders');
}
