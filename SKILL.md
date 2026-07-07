---
name: sajalni
description: Record WebM demo videos of any web project by generating and running Playwright scripts. Framework-agnostic (Vite, Next.js, React, Vue, Angular, static HTML, etc.). Use when user says "Sajalni", "record a demo", "make a video walkthrough", "screen recording", or "record this project".
---

# Sajalni — Automated Demo Recorder

## Overview
Generates a Playwright script that walks through any web project's UI and captures the browser session as WebM. Framework-agnostic: Vite, Next.js, React, Vue, Angular, Svelte, static HTML, or anything that runs a dev server.

## Hard Rule — Error Resilience
Every step must be wrapped in try/catch. A missing button, slow load, or timeout must NEVER crash the script. Use the `soft()` helper, `.or()` selectors, and `catch(() => {})` everywhere.

## Workflow

### Step 1: Understand the Project
1. Read `package.json` / `README` / source files to determine:
   - Framework and dev server command (`npm run dev`, `pnpm dev`, etc.)
   - Default port (3000, 5173, 8080, etc.)
   - Routes and UI structure
   - Auth mechanism (cookies, localStorage, token headers, form-based)
2. Ask the user to describe the exact flow (pages, actions, pauses, credentials).

### Step 2: Generate the Playwright Script
1. Create `sajalni-demo.js` (ESM) in the project root.
2. Use the template below — adapt auth strategy to the project's framework.

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

    // ── walkthrough steps (wrap each in soft) ──
    // Pick auth strategy based on project:
    //
    //   Form login:
    //     await page.fill('input[name="email"]', 'user@example.com');
    //     await page.fill('input[name="password"]', 'pass');
    //     await page.click('button[type="submit"]');
    //     await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
    //
    //   Cookie injection:
    //     await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    //     await page.evaluate(() => { document.cookie = 'token=...; path=/; max-age=36000'; });
    //
    //   localStorage / JWT:
    //     await page.evaluate(() => { localStorage.setItem('access_token', '...'); });
    //
    // await soft(page, () => page.goto(baseUrl, { waitUntil: 'networkidle' }));
    // await soft(page, () => findClick(page, 'a[href="/login"]', 'button:has-text("Sign In")'));

  } finally {
    await ctx.close(); await browser.close(); server.kill();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.webm'));
    for (const f of files) console.log('Exported:', path.join(DIR, f));
    process.exit(0);
  }
}
main().catch(() => process.exit(1));
```

### Step 3: Install Dependencies
```bash
npm install playwright
npx playwright install chromium
```

### Step 4: Run
```bash
node sajalni-demo.js
```

### Step 5: Deliver
Report the output WebM path(s). Delete `sajalni-demo.js` after use.

## Auth Strategies (pick one per project)

| Strategy | When to use | Code |
|----------|-------------|------|
| **Form login** | Standard email/password forms | `page.fill('input[name="email"]', email)` + `page.click('button[type="submit"]')` then `page.waitForURL('**/dashboard')` |
| **Cookie injection** | Auth token stored in cookies | Navigate to origin first, then `page.evaluate(() => document.cookie = 'token=...')` |
| **localStorage** | SPA/JWT tokens (React, Vue, Angular) | `page.evaluate(() => localStorage.setItem('token', '...'))` |
| **API token header** | Projects using `Authorization: Bearer` | Use `page.route()` to inject header or localStorage |
| **No auth** | Public sites / landing pages | Skip auth entirely |

## Tips
- Use `soft()` for every click/fill/navigation — never let a missing element crash.
- Use `findClick(page, 'btn1', 'btn2', 'btn3')` to try multiple selectors for the same action.
- Always navigate to the origin BEFORE setting `document.cookie` — avoids "Access is denied".
- Use `page.waitForURL()` for redirects instead of fixed `sleep()` where possible.
- Pause 1.5-2s between steps for a natural-looking demo.
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
| SvelteKit | `npx vite dev --port 3000` | 5173 |
| Static HTML | `npx serve . -p 3000` | 3000 |
