// Local-only front-end measurement for stage 7c. Lighthouse is not a project dependency: point LIGHTHOUSE_DIR at a
// separate installation (`npm install lighthouse` in an empty folder). Run it against the isolated loopback stack.
//   LIGHTHOUSE_DIR=... STAGE7C_LH_ALLOW_WRITES=1 STAGE7C_LH_OUT=before.json node scripts/stage7c-lighthouse.mjs
// It registers one demo account through the API (that is the only write) and measures each page several times.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const base = process.env.STAGE7C_LH_BASE_URL ?? 'http://localhost:3064';
const api = process.env.STAGE7C_LH_API_URL ?? 'http://localhost:4064';
const runs = Number(process.env.STAGE7C_LH_RUNS ?? 3);
const out = process.env.STAGE7C_LH_OUT ?? 'lighthouse.json';
const browserPath =
  process.env.CHROME_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
assert.equal(
  process.env.STAGE7C_LH_ALLOW_WRITES,
  '1',
  'Explicit isolated test-data authorization required.',
);
assert.ok(
  process.env.LIGHTHOUSE_DIR,
  'Set LIGHTHOUSE_DIR to a folder where lighthouse is installed.',
);
for (const url of [base, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname));

const require = createRequire(process.env.LIGHTHOUSE_DIR + '/');
const lighthouse = (await import(pathToFileURL(require.resolve('lighthouse')).href)).default;
const chromeLauncher = await import(pathToFileURL(require.resolve('chrome-launcher')).href);

const password = 'stage 7c measurement password';
const account = {
  firstName: 'Stage7c',
  lastName: 'Lighthouse',
  email: `stage7c-lh-${Date.now()}@example.com`,
  password,
  passwordConfirmation: password,
};
const registered = await fetch(api + '/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(account),
});
assert.equal(registered.status, 201);
const { token } = await registered.json();

const pages = [
  { name: 'login', path: '/login', authenticated: false },
  { name: 'orders', path: '/orders', authenticated: true },
  { name: 'groups', path: '/groups', authenticated: true },
];
const metrics = {
  fcp: 'first-contentful-paint',
  lcp: 'largest-contentful-paint',
  tbt: 'total-blocking-time',
  cls: 'cumulative-layout-shift',
  speedIndex: 'speed-index',
  bytes: 'total-byte-weight',
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

const chrome = await chromeLauncher.launch({
  chromePath: browserPath,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
});
const result = {};
try {
  for (const page of pages) {
    const samples = [];
    for (let run = 0; run < runs; run += 1) {
      const flags = {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        extraHeaders: page.authenticated ? { Cookie: `dzencode_auth=${token}` } : undefined,
      };
      const { lhr } = await lighthouse(base + page.path, flags);
      const sample = {
        performance: Math.round((lhr.categories.performance.score ?? 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility.score ?? 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices'].score ?? 0) * 100),
        finalUrl: lhr.finalDisplayedUrl,
      };
      for (const [key, id] of Object.entries(metrics))
        sample[key] = lhr.audits[id]?.numericValue ?? null;
      const requests = lhr.audits['network-requests']?.details?.items ?? [];
      sample.requests = requests.length;
      sample.scriptBytes = requests
        .filter((item) => item.resourceType === 'Script')
        .reduce((total, item) => total + (item.transferSize ?? 0), 0);
      sample.styleBytes = requests
        .filter((item) => item.resourceType === 'Stylesheet')
        .reduce((total, item) => total + (item.transferSize ?? 0), 0);
      sample.fontBytes = requests
        .filter((item) => item.resourceType === 'Font')
        .reduce((total, item) => total + (item.transferSize ?? 0), 0);
      samples.push(sample);
    }
    assert.ok(
      samples.every((sample) => new URL(sample.finalUrl).pathname === page.path),
      `${page.name} must not redirect during measurement`,
    );
    result[page.name] = { path: page.path, runs: samples.length };
    for (const key of Object.keys(samples[0])) {
      if (typeof samples[0][key] === 'number')
        result[page.name][key] =
          Math.round(median(samples.map((sample) => sample[key])) * 100) / 100;
    }
    console.info(page.name, JSON.stringify(result[page.name]));
  }
} finally {
  await chrome.kill();
}
await writeFile(
  out,
  JSON.stringify({ base, runs, measuredAt: new Date().toISOString(), result }, null, 2),
);
console.info('Saved', out);
