import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const DIR = path.resolve('./recordings');
fs.mkdirSync(DIR, { recursive: true });

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
      const t = d.toString().replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
      const m = t.match(/Local:\s+(https?:\/\/[^\s]+)/) || t.match(/(http:\/\/localhost:\d+)/);
      if (m && !resolved) { resolved = true; setTimeout(() => resolve({ server, baseUrl: m[1].replace(/\/$/, '') }), 2000); }
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

    // ── Customize your walkthrough below ──
    // Each step wrapped in soft() to never crash on missing elements

    await soft(page, () => page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 }));
    await sleep(2000);

    // Example click with fallback selectors:
    // await soft(page, () => findClick(page, 'a[href="/login"]', 'button:has-text("Sign In")'));

    // Example form fill:
    // await soft(page, () => page.fill('input[name="email"]', 'user@example.com'));
    // await soft(page, () => page.fill('input[name="password"]', 'mypassword'));
    // await soft(page, () => page.click('button[type="submit"]'));
    // await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});

    // Example scroll:
    // await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    // await sleep(2000);

  } finally {
    await ctx.close();
    await browser.close();
    server.kill();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webm'));
    for (const f of files) console.log('Exported:', path.join(DIR, f));
    process.exit(0);
  }
}
main().catch(() => process.exit(1));
