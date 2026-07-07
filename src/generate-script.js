/**
 * Generates a Playwright demo script from user-provided flow description.
 */

export function generateScript({ url, flow, outputDir, email, password }) {
  const hasAuth = !!(email && password);

  const authComment = hasAuth ? `
  // Auth credentials provided: ${email}
  // The agent picks the right strategy for the project:
  //
  //   Form login:
  //     await page.fill('input[name="email"]', '${email}');
  //     await page.fill('input[name="password"]', '${password}');
  //     await page.click('button[type="submit"]');
  //     await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  //
  //   Cookie injection (navigate to origin first):
  //     await page.evaluate(() => { document.cookie = 'token=...; path=/; max-age=36000'; });
  //
  //   localStorage / JWT:
  //     await page.evaluate(() => { localStorage.setItem('access_token', '...'); });
` : '';

  return `
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const DIR = path.resolve('${outputDir || './recordings'}');
fs.mkdirSync(DIR, { recursive: true });
const BASE_URL = '${url}';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function soft(page, action) {
  try { await action(); } catch {}
}

async function findClick(page, ...selectors) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      try { await el.click(); return true; } catch { return false; }
    }
  }
  return false;
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
    const devCmd = pkg.scripts?.dev || 'next dev --port 3000';
    const server = spawn('npx', devCmd.split(' '), { stdio: 'pipe', shell: true });
    let resolved = false;
    const onData = (d) => {
      const t = d.toString().replace(/\\x1B\\[[0-9;]*[a-zA-Z]/g, '');
      const m = t.match(/Local:\\s+(https?:\\\/\\\/[^\\s]+)/) || t.match(/(http:\\\/\\\/localhost:\\d+)/);
      if (m && !resolved) { resolved = true; setTimeout(() => resolve({ server, baseUrl: m[1].replace(/\\/$/, '') }), 2000); }
    };
    server.stdout.on('data', onData); server.stderr.on('data', onData);
    setTimeout(() => { if (!resolved) reject(new Error('Server failed to start')); }, 120000);
  });
}

async function main() {
  const { server, baseUrl } = await startDevServer();
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  try {
    await page.evaluate(() => document.fonts.ready);
${authComment}
    // ── Walkthrough: ${flow} ──
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(2000);

    // TODO: add your steps using soft() and findClick()

  } finally {
    await ctx.close(); await browser.close(); server.kill();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webm'));
    for (const f of files) console.log('Exported:', path.join(DIR, f));
    process.exit(0);
  }
}
main().catch(() => process.exit(1));
`;
}
