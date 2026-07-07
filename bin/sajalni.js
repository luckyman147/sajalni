#!/usr/bin/env node
/**
 * Sajalni CLI — npx sajalni
 *
 * Usage:
 *   npx sajalni --url http://localhost:3000 --flow "sign in, create form, publish"
 *   npx sajalni --url http://localhost:5173 --flow "homepage, add task, complete, delete"
 *
 * Options:
 *   --url, -u      Base URL of the project (required)
 *   --flow, -f     Description of the walkthrough flow (required)
 *   --email, -e    Email for auth (optional)
 *   --password, -p Password for auth (optional)
 *   --supabase-url Supabase project URL (optional)
 *   --supabase-key Supabase anon key (optional)
 *   --output, -o   Output directory (default: ./recordings)
 *   --viewport     Viewport size (default: 1280x720)
 *   --help, -h     Show help
 */

import { chromium } from 'playwright';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, '..');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function soft(page, action) {
  try { await action(); } catch { /* skip failures gracefully */ }
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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u': opts.url = args[++i]; break;
      case '--flow': case '-f': opts.flow = args[++i]; break;
      case '--email': case '-e': opts.email = args[++i]; break;
      case '--password': case '-p': opts.password = args[++i]; break;
      case '--supabase-url': opts.supabaseUrl = args[++i]; break;
      case '--supabase-key': opts.supabaseKey = args[++i]; break;
      case '--output': case '-o': opts.output = args[++i]; break;
      case '--viewport': opts.viewport = args[++i]; break;
      case '--help': case '-h':
        console.log(fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf-8').split('\n').slice(0, 30).join('\n'));
        process.exit(0);
    }
  }
  if (!opts.url || !opts.flow) {
    console.error('Error: --url and --flow are required');
    console.error('Usage: npx sajalni --url <url> --flow "<description>"');
    process.exit(1);
  }
  return opts;
}

function generateScript(opts) {
  const supabaseAuth = (opts.supabaseUrl && opts.supabaseKey && opts.email && opts.password)
    ? `
  // Supabase auth via REST API
  await supabaseAuth(page, baseUrl, '${opts.supabaseUrl}', '${opts.supabaseKey}', '${opts.email}', '${opts.password}');
` : '';

  return `
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const DIR = path.resolve('${opts.output || './recordings'}');
fs.mkdirSync(DIR, { recursive: true });
const BASE_URL = '${opts.url}';
const FLOW = \`${opts.flow}\`;

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

async function supabaseAuth(page, baseUrl, supabaseUrl, supabaseKey, email, password) {
  await soft(page, () => page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }));
  const result = await page.evaluate(async ({ url, key, email, password }) => {
    const res = await fetch(url + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    return { ok: res.ok, token: d.access_token, refresh: d.refresh_token };
  }, { url: supabaseUrl, key: supabaseKey, email, password });
  if (!result.ok) throw new Error('Auth failed');
  await page.evaluate(({ t, r }) => {
    document.cookie = 'sb-access-token=' + t + '; path=/; max-age=36000';
    document.cookie = 'sb-refresh-token=' + r + '; path=/; max-age=36000';
  }, { t: result.token, r: result.refresh });
}

async function main() {
  const viewport = { width: 1280, height: 720 };
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ recordVideo: { dir: DIR, size: viewport }, viewport });
  const page = await ctx.newPage();
  try {
    await page.evaluate(() => document.fonts.ready);
${supabaseAuth}
    // ── Walkthrough: ${opts.flow} ──
    // Steps will be added based on flow description
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await sleep(2000);
    // TODO: Customize your steps here
    // Use soft(page, () => ...) for every action
    // Use findClick(page, 'selector1', 'selector2') for resilient clicking

  } finally {
    await ctx.close();
    await browser.close();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webm'));
    for (const f of files) console.log('Video:', path.join(DIR, f));
    process.exit(0);
  }
}
main().catch(() => process.exit(1));
`;
}

async function main() {
  const opts = parseArgs();
  const outputDir = path.resolve(opts.output || './recordings');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log('🎬 Sajalni — Demo Recorder');
  console.log(`   URL:   ${opts.url}`);
  console.log(`   Flow:  ${opts.flow}`);
  console.log(`   Out:   ${outputDir}`);
  console.log('');

  const scriptContent = generateScript(opts);
  const scriptPath = path.join(outputDir, 'sajalni-demo.js');
  fs.writeFileSync(scriptPath, scriptContent, 'utf-8');
  console.log(`✓ Script generated: ${scriptPath}`);

  // Check playwright
  try {
    execSync('npx playwright --version', { stdio: 'pipe', timeout: 15000 });
  } catch {
    console.log('Installing Playwright...');
    execSync('npm install playwright', { stdio: 'inherit', timeout: 60000 });
    execSync('npx playwright install chromium', { stdio: 'inherit', timeout: 120000 });
  }

  console.log('Running demo...\n');
  execSync(`node "${scriptPath}"`, { stdio: 'inherit', timeout: 600000 });

  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm') && !f.endsWith('-demo.webm'));
  console.log('\n✓ Recording complete!');
  for (const f of files) console.log(`  ${path.join(outputDir, f)}`);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
