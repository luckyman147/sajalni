#!/usr/bin/env node
/**
 * Sajalni CLI — npx sajalni
 *
 * Usage:
 *   npx sajalni --url http://localhost:3000 --flow "sign in, create form, publish"
 *
 * Options:
 *   --url, -u      Base URL of the project (required)
 *   --flow, -f     Description of the walkthrough flow (required)
 *   --email, -e    Email for auth (optional)
 *   --password, -p Password for auth (optional)
 *   --output, -o   Output directory (default: ./recordings)
 *   --viewport     Viewport size (default: 1280x720)
 *   --help, -h     Show help
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--url': case '-u': opts.url = args[++i]; break;
      case '--flow': case '-f': opts.flow = args[++i]; break;
      case '--email': case '-e': opts.email = args[++i]; break;
      case '--password': case '-p': opts.password = args[++i]; break;
      case '--output': case '-o': opts.output = args[++i]; break;
      case '--viewport': opts.viewport = args[++i]; break;
      case '--help': case '-h':
        console.log(fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf-8').split('\n').slice(0, 25).join('\n'));
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
  const email = opts.email || '';
  const password = opts.password || '';

  return `
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const DIR = path.resolve('${opts.output || './recordings'}');
fs.mkdirSync(DIR, { recursive: true });
const BASE_URL = '${opts.url}';

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

    // ── Walkthrough: ${opts.flow} ──
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await sleep(2000);

    // Auth (if credentials provided)
    // The agent determines the auth strategy based on the project:
    //
    //   Form login:
    //     await page.fill('input[name="email"]', '${email}');
    //     await page.fill('input[name="password"]', '${password}');
    //     await page.click('button[type="submit"]');
    //     await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
    //
    //   Cookie injection (navigate to origin first):
    //     await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    //     await page.evaluate(() => { document.cookie = 'token=${email ? '...' : ''}; path=/; max-age=36000'; });
    //
    //   localStorage / JWT:
    //     await page.evaluate(() => { localStorage.setItem('token', '${email ? '...' : ''}'); });

    // Add your custom steps here using soft() and findClick()
    // soft(page, () => findClick(page, 'button:has-text("Get Started")', 'a.cta'));

  } finally {
    await ctx.close(); await browser.close(); server.kill();
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
