/**
 * Generates a Playwright demo script from user-provided flow description.
 */

export function generateScript({ url, flow, outputDir, supabaseUrl, supabaseKey, email, password }) {
  const hasAuth = !!(supabaseUrl && supabaseKey && email && password);

  const authSection = hasAuth ? `
  // Auth via Supabase REST API
  await soft(page, () => page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }));
  const authResult = await page.evaluate(async ({ url, key, email, password }) => {
    const res = await fetch(url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    return { ok: res.ok, token: d.access_token, refresh: d.refresh_token };
  }, { url: '${supabaseUrl}', key: '${supabaseKey}', email: '${email}', password: '${password}' });
  if (authResult.ok) {
    await page.evaluate(({ t, r }) => {
      document.cookie = 'sb-access-token=' + t + '; path=/; max-age=36000';
      document.cookie = 'sb-refresh-token=' + r + '; path=/; max-age=36000';
    }, { t: authResult.token, r: authResult.refresh });
  }
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
${authSection}
    // ── Walkthrough: ${flow} ──
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(2000);

    // TODO: add your steps using soft() and findClick()
    // await soft(page, () => findClick(page, 'a[href="/login"]', 'button:has-text("Sign In")'));

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
