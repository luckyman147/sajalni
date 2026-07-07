---
name: sajalni
description: Record WebM demo videos of any web project by generating and running Playwright scripts. Framework-agnostic (Vite, Next.js, React, Vue, Angular, static HTML, etc.). Use when user says "Sajalni", "record a demo", "make a video walkthrough", "screen recording", or "record this project".
---

# Sajalni — Automated Demo Recorder

## Overview
Generates a Playwright script that walks through a project's UI and captures the browser session as WebM. Works with any framework: Vite, Next.js, React, Vue, Angular, Svelte, static HTML, etc.

## Hard Rule — Error Resilience
Every step must be wrapped in try/catch. A missing button, slow load, or timeout must NEVER crash the script. Use `soft()` helper, `.or()` selectors, and `catch(() => {})` everywhere.

## Hard Rule — Supabase + Next.js Auth
Next.js server actions for auth often silently fail. Use REST API bypass:
1. Navigate to origin first (so `document.cookie` is writable)
2. POST to `{SUPABASE_URL}/auth/v1/token?grant_type=password`
3. Set `sb-access-token` + `sb-refresh-token` cookies via `document.cookie`
4. Navigate to protected page

## Workflow

### Step 1: Understand the Project
1. Read `package.json` / `README` / source files to determine:
   - Framework and dev server command
   - Port number (default 3000 or 5173)
   - Routes and UI structure
   - If Supabase: extract project URL and anon key from source
2. Ask the user to describe the exact flow (pages, actions, pauses).

### Step 2: Generate the Playwright Script
1. Create `sajalni-demo.js` (ESM) in the project root.
2. Use the template below — includes resilient helpers and Supabase auth.

```js
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
    const cmd = getDevCommand();
    const server = spawn('npx', cmd.split(' ').slice(1), { stdio: 'pipe', shell: true });
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

function getDevCommand() {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  if (pkg.scripts?.dev) return `npx ${pkg.scripts.dev}`;
  return 'npx next dev --port 3000';
}

async function supabaseAuth(page, baseUrl, supabaseUrl, supabaseKey, email, password) {
  await soft(page, () => page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }));
  const result = await page.evaluate(async ({ url, key, email, password }) => {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify({ email, password }),
    });
    const d = await res.json();
    return { ok: res.ok, token: d.access_token, refresh: d.refresh_token };
  }, { url: supabaseUrl, key: supabaseKey, email, password });
  if (!result.ok) throw new Error('Supabase auth failed');
  await page.evaluate(({ t, r }) => {
    document.cookie = `sb-access-token=${t}; path=/; max-age=36000`;
    document.cookie = `sb-refresh-token=${r}; path=/; max-age=36000`;
  }, { t: result.token, r: result.refresh });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);
}

async function main() {
  const { server, baseUrl } = await startDevServer();
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ recordVideo: { dir: DIR, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  try {
    await page.evaluate(() => document.fonts.ready);

    // ── walkthrough steps (wrap each in soft) ──
    // await soft(page, () => page.goto(...));
    // await soft(page, () => findClick(page, 'button', 'a.btn'));

  } finally {
    await ctx.close(); await browser.close(); server.kill();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webm'));
    for (const f of files) console.log('Exported:', path.join(DIR, f));
    process.exit(0);
  }
}
main().catch(() => process.exit(1));
```

### Step 3: Install
```bash
npm install playwright
npx playwright install chromium
```

### Step 4: Run
```bash
node sajalni-demo.js
```

### Step 5: Deliver
Report output WebM path(s). Delete `sajalni-demo.js` after use.

## Tips
- Use `soft()` for every click/fill/navigation — never let a missing element crash.
- Use `findClick(page, 'btn1', 'btn2', 'btn3')` to try multiple selectors.
- Navigate to origin BEFORE setting `document.cookie` (avoids "Access is denied").
- Use `page.waitForURL()` for redirects instead of fixed sleep.
- For separate videos per scene, create a NEW browser context per scene.
- Merge WebM files: `ffmpeg -f concat -safe 0 -i files.txt -c copy merged.webm`.

## Detection by Framework

| Framework | Dev command | Default port |
|-----------|-------------|-------------|
| Vite | `npx vite --port 3000 --strictPort` | 5173 |
| Next.js | `npx next dev --port 3000` | 3000 |
| Create React App | `npx react-scripts start` | 3000 |
| Angular | `npx ng serve --port 3000` | 4200 |
| Vue CLI | `npx vue-cli-service serve --port 3000` | 8080 |
| Nuxt | `npx nuxt dev --port 3000` | 3000 |
| Static HTML | `npx serve . -p 3000` | 3000 |
