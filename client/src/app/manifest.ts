import type { MetadataRoute } from 'next';

// The brand colors of shared/styles/_tokens.scss ($color-primary, $color-bg): a manifest cannot import SCSS.
const THEME_COLOR = '#89c049';
const BACKGROUND_COLOR = '#f0f3f5';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inventory',
    short_name: 'Inventory',
    description: 'Orders and the products in them',
    start_url: '/orders',
    scope: '/',
    display: 'standalone',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
