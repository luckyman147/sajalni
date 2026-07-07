# Sajalni 🎬

**Automated demo recorder for AI agents.**  
Generates Playwright scripts that walk through any web project, records the browser session, and exports as WebM video.

Works with **any framework**: Vite, Next.js, React, Vue, Angular, Svelte, static HTML, etc.

---

## Quick Start

```bash
npx sajalni --url http://localhost:5173 --flow "homepage, add task, mark complete"
```

Sajalni installs Playwright, launches Chromium, walks through your app, and saves the video.

---

## Usage

```bash
npx sajalni --url <url> --flow "<description>" [options]
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--url` | `-u` | Base URL of the dev server |
| `--flow` | `-f` | Walkthrough description (plain English) |
| `--email` | `-e` | Email for auth |
| `--password` | `-p` | Password for auth |
| `--output` | `-o` | Output directory (default: `./recordings`) |
| `--viewport` | | Viewport dimensions (default: `1280x720`) |

### Examples

```bash
# Basic
npx sajalni --url http://localhost:5173 --flow "homepage, sign up, create project"

# With auth
npx sajalni --url http://localhost:3000 \
  --flow "sign in, view dashboard, create form" \
  --email user@example.com --password "pass123"

# Custom output
npx sajalni --url http://localhost:3000 --flow "..." --output ./demos
```

---

## For AI Agents

Tell your agent: *"Sajalni — record a demo of this project"*

The agent:
1. Analyzes your project (framework, dev command, routes, auth)
2. Asks about the flow you want to record
3. Generates a Playwright script with error-resilient helpers
4. Launches Chromium and records the session
5. Saves the video to `./recordings/`

### Auth support

| Strategy | When used |
|----------|-----------|
| **Form login** | Standard email/password forms |
| **Cookie injection** | Auth tokens in cookies |
| **localStorage** | SPAs with JWT tokens |
| **No auth** | Public sites |

---

## Requirements

- **Node.js 18+**
- **Chromium** (installed automatically)

---

## License

MIT © luckyman147
