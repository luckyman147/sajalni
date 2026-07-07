# Sajalni 🎬

**Automated demo recorder for AI agents.**  
Sajalni generates Playwright scripts that walk through any web project, records the browser session, and exports as WebM/MP4 video.

Works with **any framework**: Vite, Next.js, React, Vue, Angular, Svelte, static HTML, etc.

Built for Claude, opencode, Cursor, Gemini, and other AI coding agents — or use directly via CLI.

---

## 🚀 Quick Start

```bash
npx sajalni --url http://localhost:5173 --flow "homepage, add task, mark complete"
```

Sajalni installs Playwright, launches Chromium, walks through your app, and saves the video.

---

## 📦 Installation

### AI Agents (Claude Code / opencode)

```bash
claude plugin install luckyman147/sajalni
```

Or clone to your skills directory:

```bash
mkdir -p ~/.claude/skills/
git clone https://github.com/luckyman147/sajalni.git ~/.claude/skills/sajalni
```

Then tell your agent:  
> *"Sajalni — record a demo of this project"*

### CLI (any agent / direct use)

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
| `--email` | `-e` | Email for auth (cookie/token-based) | ❌ |
| `--password` | `-p` | Password for auth | ❌ |
| `--output` | `-o` | Output directory (default: `./recordings`) | ❌ |
| `--viewport` | | Viewport dimensions (default: `1280x720`) | ❌ |
| `--help` | `-h` | Show help | ❌ |

### Examples

```bash
# Basic — any web project
npx sajalni --url http://localhost:5173 --flow "homepage, sign up, create first project"

# With auth credentials (injected as cookies/token)
npx sajalni --url http://localhost:3000 \
  --flow "sign in, view dashboard, create form, publish" \
  --email user@example.com --password "pass123"

# Custom output
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

1. **Analyzes** your project (reads `package.json`, routes, UI components, auth mechanism)
2. **Asks** about the specific flow you want to record
3. **Generates** a resilient Playwright script with `soft()` error handling
4. **Launches** headed Chromium and records the session
5. **Saves** the video to `./recordings/demo-*.webm`

### Auth support (framework-agnostic)

The agent detects your project's auth mechanism and injects tokens accordingly:

| Strategy | When used |
|----------|-----------|
| **Form login** | Standard email/password forms — fills and submits |
| **Cookie injection** | Auth tokens stored in cookies (any framework) |
| **localStorage** | SPAs with JWT tokens (React, Vue, Angular) |
| **API token header** | Projects using `Authorization: Bearer` |
| **No auth** | Public sites — skip entirely |

---

## 🏗 Project Structure

```
sajalni/
├── plugin.json                 # Claude Code plugin manifest
├── SKILL.md                    # Claude skill definition
├── bin/
│   └── sajalni.js              # CLI entry (npx sajalni)
├── src/
│   └── generate-script.js      # Playwright script generator
├── template/
│   └── demo-script.js          # Base Playwright template
├── references/
│   └── advanced-recording.md
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

## 🏪 Claude Marketplace

### Claude Code (Plugin)

Install directly:

```bash
claude plugin install luckyman147/sajalni
```

To submit to the **official Claude Code community marketplace**, open a PR at:  
`github.com/anthropics/claude-code-plugins`

### Claude.ai (Skill)

1. Go to [claude.ai/customize/skills](https://claude.ai/customize/skills)
2. Click **Upload skill**
3. Select this repo's `SKILL.md` (or zip the whole folder)

---

## ✅ Requirements

- **Node.js 18+**
- **Chromium** (installed automatically: `npx playwright install chromium`)
- **FFmpeg** (optional — for MP4 conversion)

---

## 📄 License

MIT © luckyman147
