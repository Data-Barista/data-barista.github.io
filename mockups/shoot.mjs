/* Renders every tile image into ../assets at 1200x750 (1.5x, so 1800x1125) in light and dark.
   Run from this folder: npm i && node shoot.mjs [slug ...]
   Local mockups render from the HTML beside this file. Live captures need
   the network (AI Investment Map) or the Spelling Bee build served on :4173
   (from ~/projects/portfolio: python3 -m http.server 4173 --directory spelling-bee/dist). */

import { chromium } from 'playwright-core';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '..', 'assets');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const local = (file) => pathToFileURL(path.join(here, file)).href;

const shots = [
  { slug: 'pre-meeting-brief', url: local('pre-meeting-brief.html') },
  { slug: 'tp-package', url: local('tp-package.html') },
  { slug: 'tp-rules', url: local('tp-rules.html') },
  { slug: 'virtual-pmo', url: local('virtual-pmo.html') },
  { slug: 'pmo-graphs', url: local('pmo-graphs.html') },
  { slug: 'hoteling', url: local('hoteling.html') },
  { slug: 'brief-me-app', url: local('brief-me-app.html'), light: true }, // product screen, same in both themes
  { slug: 'brief-me-findings', url: local('brief-me-findings.html'), light: true },
  { slug: 'patterns-card', url: local('patterns-card.html') },
  { slug: 'patterns-chart', url: local('patterns-chart.html') },
  { slug: 'risk-card', url: local('risk-card.html') },
  { slug: 'risk-model', url: local('risk-model.html') },
  { slug: 'tokenomics-card', url: local('tokenomics-card.html') },
  { slug: 'tokenomics-chart', url: local('tokenomics-chart.html') },
  { slug: 'training-card', url: local('training-card.html') },
  { slug: 'training-app', url: local('training-app.html'), light: true },
  {
    slug: 'ai-investment-map',
    url: 'https://ai-investment-map-mu.vercel.app',
    live: true,
    jpeg: true,
    settle: 4000,
  },
  {
    slug: 'spelling-bee',
    url: 'http://localhost:4173/',
    live: true,
    jpeg: true,
    settle: 800,
    steps: async (page) => {
      await page.getByPlaceholder('Enter your name...').fill('Sam');
      await page.keyboard.press('Enter');
      await page.getByText('Collect all').waitFor({ timeout: 8000 });
    },
  },
];

const only = process.argv.slice(2);
const wanted = only.length ? shots.filter((s) => only.includes(s.slug)) : shots;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const shot of wanted) {
  for (const scheme of (shot.light ? ['light'] : ['light', 'dark'])) {
    /* 1.5x: 1800px wide, more than the widest dialog needs on a 2x display. */
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 750 },
      deviceScaleFactor: 1.5,
      colorScheme: scheme,
    });
    const page = await ctx.newPage();
    const ext = shot.jpeg ? 'jpg' : 'png';
    const file = path.join(out, `mock-${shot.slug}${scheme === 'dark' ? '-dark' : ''}.${ext}`);
    try {
      await page.goto(shot.url, { waitUntil: shot.live ? 'networkidle' : 'load', timeout: 30000 });
      if (shot.steps) await shot.steps(page);
      await page.waitForTimeout(shot.settle ?? 300);
      await page.screenshot(shot.jpeg ? { path: file, type: 'jpeg', quality: 86 } : { path: file, type: 'png' });
      const kb = Math.round(fs.statSync(file).size / 1024);
      console.log(`ok   ${path.basename(file)}  ${kb} KB`);
    } catch (err) {
      console.log(`skip ${path.basename(file)}  ${err.message.split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
