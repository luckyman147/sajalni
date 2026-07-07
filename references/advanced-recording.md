# Advanced Recording Options

## Custom Viewports
```js
const context = await browser.newContext({
  recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } },
  viewport: { width: 1920, height: 1080 }
});
```

## Multi-Scene (Separate Videos)
Create a new browser context per scene:
```js
const ctx1 = await browser.newContext({ recordVideo: { dir: './recordings', size: { width: 1280, height: 720 } } });
const p1 = await ctx1.newPage();
// ... scene 1 ...
await ctx1.close(); // → saves video 1

const ctx2 = await browser.newContext({ recordVideo: { dir: './recordings', size: { width: 1280, height: 720 } } });
const p2 = await ctx2.newPage();
// ... scene 2 ...
await ctx2.close(); // → saves video 2
```

## Merge WebM to Single File
```bash
# Create files.txt
echo "file 'scene1.webm'" > files.txt
echo "file 'scene2.webm'" >> files.txt

# Concatenate (fast, no re-encode)
ffmpeg -f concat -safe 0 -i files.txt -c copy merged.webm
```

## Supabase Auth (Cookie Injection)
```js
await page.evaluate(({ token }) => {
  document.cookie = `sb-access-token=${token}; path=/; max-age=36000`;
  document.cookie = `sb-refresh-token=${token}; path=/; max-age=36000`;
}, { token: accessToken });
```

## FFmpeg Advanced Conversion
```bash
# Trim, pad, compress to MP4
ffmpeg -i input.webm -ss 00:00:02 -to 00:01:30 \
  -vf "fps=30,scale=1280:720:flags=lanczos,format=yuv420p" \
  -c:v libx264 -crf 23 -preset medium output.mp4

# Add watermark
ffmpeg -i input.webm -i logo.png -filter_complex "overlay=10:10" output.mp4

# GIF preview
ffmpeg -i input.webm -vf "fps=10,scale=640:-1:flags=lanczos" -c:v gif preview.gif
```

## Resilient Selectors (findClick)
```js
// Tries multiple selectors, returns true on first success
async function findClick(page, ...selectors) {
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      try { await el.click(); return true; } catch { return false; }
    }
  }
  return false;
}

// Usage
await findClick(page, 'button:has-text("Submit")', 'input[type="submit"]', '#submit-btn');
```

## Dev Server Auto-Detection
```js
function getDevCommand() {
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  if (pkg.scripts?.dev) return `npx ${pkg.scripts.dev}`;
  return 'npx next dev --port 3000'; // fallback
}
```
