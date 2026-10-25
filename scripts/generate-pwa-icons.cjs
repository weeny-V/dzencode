// Renders the app icons (PNG) from the shield logo of the top menu (client/src/shared/ui/icons.tsx, ShieldLogo).
// Playwright is not a project dependency: point PLAYWRIGHT_PACKAGE at a separate installation, as for the smokes.
//   PLAYWRIGHT_PACKAGE=... node scripts/generate-pwa-icons.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE ?? 'playwright');

const out = path.resolve('client/public/icons');
const primary = '#89c049';
const primaryDark = '#7cb342';
const surface = '#ffffff';
const background = '#f0f3f5';

// The logo's own 40x46 drawing; `scale` is the share of the canvas height it fills.
const shield = (size, scale, dx = 0, dy = 0) => {
  const height = size * scale;
  const width = (height * 40) / 46;
  const x = (size - width) / 2 + dx;
  const y = (size - height) / 2 + dy;
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 40 46">
    <path d="M20 1.5 3 7v13c0 11 7.2 21 17 24.5C29.8 41 37 31 37 20V7L20 1.5z" fill="${primary}"/>
    <path d="M20 1.5v43C10.2 41 3 31 3 20V7L20 1.5z" fill="${primaryDark}"/>
    <circle cx="20" cy="17" r="5.5" fill="#fff"/>
    <path d="M9.5 33c1.6-6 5.8-8.5 10.5-8.5S28.9 27 30.5 33C27.6 36.3 24 38.5 20 40c-4-1.5-7.6-3.7-10.5-7z" fill="#fff"/>
  </svg>`;
};
const svg = (size, fill, scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${fill}"/>${shield(size, scale)}</svg>`;

// "any" icons use most of the canvas; the maskable one keeps the logo inside the 80% safe zone.
const files = [
  ['icon-192.png', 192, surface, 0.78],
  ['icon-512.png', 512, surface, 0.78],
  ['icon-maskable-512.png', 512, background, 0.56],
  ['apple-touch-icon.png', 180, surface, 0.74],
];

(async () => {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL ?? 'msedge',
    headless: true,
  });
  try {
    for (const [name, size, fill, scale] of files) {
      const page = await browser.newPage({ viewport: { width: size, height: size } });
      await page.setContent(`<body style="margin:0">${svg(size, fill, scale)}</body>`);
      await page.screenshot({
        path: path.join(out, name),
        clip: { x: 0, y: 0, width: size, height: size },
      });
      await page.close();
      console.info('Wrote', name);
    }
  } finally {
    await browser.close();
  }
})();
