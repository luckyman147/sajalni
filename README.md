# Sajalni 🎬

**Automated demo recorder for AI agents.**  
Sajalni generates Playwright scripts that walk through any web project, records the browser session, and exports as WebM/MP4 video.

Built for Claude, opencode, Cursor, and other AI coding agents — or use directly via CLI.

---

## 🚀 Quick Start

```bash
npx sajalni --url http://localhost:5173 --flow "homepage, add task, mark complete"
```

That's it. Sajalni will install Playwright, launch Chromium, walk through your app, and save the video.

---

## 📦 Installation

### For AI Agents (recommended)

Add to your agent's skills:

```bash
# Claude / opencode / Cursor
mkdir -p ~/.claude/skills/
git clone https://github.com/anomalyco/sajalni ~/.claude/skills/sajalni
```

Then tell your agent:  
> *"Sajalni — record a demo of this project"*

### For Direct CLI Use

```bash
npx sajalni --url <url> --flow "<description>" [options]
```

Or install globally:

```bash
npm install -g sajalni
sajalni --url http://localhost:3000 --flow "show dashboard, create item, publish"
```

---

## 📋 Usage

### CLI Options

| Option | Short | Description | Required |
|--------|-------|-------------|----------|
| `--url` | `-u` | Base URL of the dev server | ✅ |
| `--flow` | `-f` | Walkthrough description (plain English) | ✅ |
| `--email` | `-e` | Email for auth (Supabase) | ❌ |
| `--password` | `-p` | Password for auth | ❌ |
| `--supabase-url` | | Supabase project URL | ❌ |
| `--supabase-key` | | Supabase anon key | ❌ |
| `--output` | `-o` | Output directory (default: `./recordings`) | ❌ |
| `--viewport` | | Viewport dimensions (default: `1280x720`) | ❌ |
| `--help` | `-h` | Show help | ❌ |

### Examples

```bash
# Basic — any web project
npx sajalni --url http://localhost:5173 --flow "homepage, sign up, create first project"

# With Supabase auth (bypasses broken server actions)
npx sajalni --url http://localhost:3000 \
  --flow "sign in, view dashboard, create form, publish" \
  --email user@example.com --password "pass123" \
  --supabase-url https://xxxxx.supabase.co \
  --supabase-key "sb_publishable_xxxx"

# Custom output directory
npx sajalni --url http://localhost:3000 --flow "..." --output ./demos
```

---

## 🧠 For AI Agents

### Trigger phrases

Say any of these to your AI agent:

- *"Sajalni — record a demo of this project"*
- *"Make a video walkthrough"*
- *"Record this project as a demo"*
- *"Screen recording of the app"*

### What the agent does

1. **Analyzes** your project (reads `package.json`, routes, UI components)
2. **Asks** about the specific flow you want to record
3. **Generates** a resilient Playwright script with `soft()` error handling
4. **Launches** headed Chromium and records the session
5. **Saves** the video to `./recordings/demo-*.webm`

### Auth support

For Supabase projects, the agent uses a REST API bypass:
- POSTs to `{SUPABASE_URL}/auth/v1/token?grant_type=password`
- Injects `sb-access-token` and `sb-refresh-token` cookies
- Works even when Next.js server actions silently fail

---

## 🏗 Project Structure

```
sajalni/
├── bin/
│   └── sajalni.js          # CLI entry (npx sajalni)
├── src/
│   └── generate-script.js   # Playwright script generator
├── template/
│   └── demo-script.js       # Base Playwright template
├── references/
│   └── advanced-recording.md
├── SKILL.md                 # Claude marketplace skill definition
├── package.json
└── README.md
```

---

## 🔧 Advanced

### Custom viewport

```bash
npx sajalni --url http://localhost:3000 --flow "..." --viewport 1920x1080
```

### Multi-scene videos

For separate videos per page, create multiple browser contexts:

```js
// In your generated script:
const ctx1 = await browser.newContext({ recordVideo: { dir: './recordings', size: { width: 1280, height: 720 } } });
// ... scene 1 ...
await ctx1.close();

const ctx2 = await browser.newContext({ recordVideo: { dir: './recordings', size: { width: 1280, height: 720 } } });
// ... scene 2 ...
await ctx2.close();
```

### Merge videos

```bash
ffmpeg -f concat -safe 0 -i files.txt -c copy merged.webm
```

### FFmpeg conversion

```bash
ffmpeg -i input.webm -vf "fps=30,scale=1280:720:flags=lanczos,format=yuv420p" -c:v libx264 -crf 23 output.mp4
```

See [references/advanced-recording.md](references/advanced-recording.md) for more.

---

## 🔗 Claude Marketplace

This skill is available on the [Claude Marketplace](https://claude.ai/marketplace).  
Install in one click, or manually by cloning to `~/.claude/skills/sajalni/`.

---

## ✅ Requirements

- **Node.js 18+**
- **Chromium** (installed automatically: `npx playwright install chromium`)
- **FFmpeg** (optional — for MP4 conversion)

---

## 📄 License

MIT © [Anomalyco](https://github.com/anomalyco)
