# Joylo Plugin for Cursor / Grok Bot

Build, change, and publish Joylo apps from Cursor / Grok Bot.

You describe an app in plain language, Joylo plans and builds it, and you get a live preview. When you're happy, you can publish it to a public address after agreeing to the quoted cost.

> **Status:** Draft, not yet submitted to the Cursor Marketplace. See [Before submitting](#before-submitting).

---

## What it does

Once installed and signed in, you can ask Cursor / Grok Bot things like:

- "Build me a Joylo app where my team logs weekly goals"
- "Find my Joylo app *Mcp Counter* and add a Reset button"
- "How does sign-in work in my Joylo app *Budget Tracker*?"
- "What would it cost to publish it? ... OK, publish it."

The plugin connects the client to Joylo's hosted **MCP server** (Model Context Protocol, a standard way for AI tools to talk to other services). The server's code is not in this repository.

### Joylo tools the agent can use

| Tool | What it does | Spends credits |
|------|--------------|----------------|
| `whoami` | Shows the signed-in account and its workspaces | No |
| `get_credit_balance` | Credits left in a workspace | No |
| `list_projects` | Lists your projects, with search and paging | No |
| `get_project` | One project, its workspace and build state | No |
| `create_project` | Starts a new web or mobile app from a description | Yes |
| `get_build_status` | How a build is going right now | No |
| `wait_for_build` | Waits until a build finishes, fails, or needs an answer | No |
| `answer_questions` | Sends the user's answers to a paused build | No |
| `stop_build` | Stops a running build, keeping finished work | No |
| `send_followup` | Asks Joylo to change an existing project | Yes |
| `ask_question` | Asks Joylo about a project without changing it | Yes |
| `get_latest_reply` | The last message to Joylo and its reply | No |
| `list_files` | Lists a project's source files | No |
| `read_file` | Reads one source file | No |
| `get_preview` | Link to the working app, and whether it's awake | No |
| `wake_project` | Wakes a sleeping project | No |
| `get_publish_quote` | What publishing would cost | No |
| `publish_app` | Publishes the app (needs the quoted figure as `confirm_credits`) | Yes, recurring |
| `get_app_url` | Public address of the published app | No |
| `update_published_app` | Puts the latest build live at the same address | No |
| `stop_published_app` | Takes the published app offline | No |

### Skills, rule, and commands

| Component | Purpose |
|-----------|---------|
| `skills/build-joylo-app` | `create_project` → `wait_for_build` loop → `answer_questions` with the user's answers only → verify code → `get_preview` |
| `skills/iterate-on-joylo-app` | Find a project, read code for free, `ask_question` or `send_followup`, then verify with `read_file` |
| `skills/publish-joylo-app` | `get_publish_quote` → user agrees → `publish_app` with `confirm_credits` → `get_app_url`; plus `update_published_app` and `stop_published_app` |
| `rules/joylo.mdc` | Guardrails: no spending or publishing without agreement, never invent build answers, verify before claiming done, reuse `idempotency_key` on retries |
| `/joylo-new`, `/joylo-publish` | Shortcut commands for the build and publish flows |

---

## Project layout

```
joylo-cursor-plugin/
├── .cursor-plugin/
│   └── plugin.json          # Plugin manifest: name, version, description, logo
├── mcp.json                 # Where Joylo's MCP server lives (no keys)
├── assets/
│   └── logo.svg             # PLACEHOLDER logo, replace before submitting
├── skills/
│   ├── build-joylo-app/SKILL.md
│   ├── iterate-on-joylo-app/SKILL.md
│   └── publish-joylo-app/SKILL.md
├── rules/
│   └── joylo.mdc
├── commands/
│   ├── joylo-new.md
│   └── joylo-publish.md
├── scripts/
│   └── validate.mjs         # Structure check: node scripts/validate.mjs
├── architecture.md
├── README.md
└── LICENSE
```

Cursor discovers the MCP server from the root `mcp.json`, and skills, rules and commands from their folders.

---

## Sign-in

The plugin connects to `https://api.joylo.org/mcp` over Streamable HTTP. Sign-in uses OAuth: the server answers unauthenticated requests with `401` and a `resource_metadata` link, the client discovers Joylo's authorization server, registers itself (dynamic client registration), and opens a browser sign-in with PKCE. No API keys or custom headers belong in the plugin files.

The access requested is `joylo:agent` (plus `offline_access` so the client can stay signed in). You can revoke it in Joylo under **Settings → Security → Agent access**.

| Environment | MCP URL | Authorization server |
|-------------|---------|----------------------|
| Production (used by this plugin) | `https://api.joylo.org/mcp` | `https://auth.joylo.org` |
| Test | `https://api-test.joylo.org/mcp` | `https://auth-test.joylo.org` |

To try the plugin against test, change the `url` in `mcp.json` to the test URL locally. Don't commit that change.

---

## Getting started in Cursor

### 1. What you need

- [Cursor](https://cursor.com) installed
- A [Joylo](https://joylo.org) account with credits
- Git

### 2. Install the files for local testing

```bash
mkdir -p ~/.cursor/plugins/local
git clone https://github.com/Joylo-AI/joylo-cursor-plugin.git ~/.cursor/plugins/local/joylo
```

Or copy this folder to `~/.cursor/plugins/local/joylo`, including the hidden `.cursor-plugin` folder. Don't symlink it: Cursor skips symlinks to folders outside the local plugins directory.

On Teams and Enterprise, an admin must allow **Local Plugin Imports** under Dashboard → Settings → Security & Identity → Marketplace and Plugins.

### 3. Sign in and test

1. Command Palette (`Cmd+Shift+P`) → **Developer: Reload Window**.
2. Open the **Customize** panel and check that the Joylo plugin, its MCP server (`plugin-joylo-joylo`), skills, rule and commands appear.
3. Sign in to Joylo when prompted and approve the access.
4. In agent chat, try a free call: *"Who am I signed in as on Joylo, and list my Joylo projects."*
5. Optionally try *"Read the main page file of my Joylo project X"*, which also spends nothing.

Reload the window after any edit.

---

## Before submitting

### 1. URLs to change

| File | Field | Draft value | Change to |
|------|-------|-------------|-----------|
| `mcp.json` | `mcpServers.joylo.url` | `https://api.joylo.org/mcp` | Final production MCP URL, once the new MCP code is deployed there |
| `.cursor-plugin/plugin.json` | `homepage` | `https://joylo.org` | Confirm, or a Joylo page about the agent integration |
| `.cursor-plugin/plugin.json` | `repository` | `https://github.com/Joylo-AI/joylo-cursor-plugin` | The real public repo URL |
| `README.md` | Sign-in section and environment table | `https://api.joylo.org/mcp`, `https://auth.joylo.org` | Final production MCP and auth URLs |
| `README.md` | Install command in "Getting started" | `https://github.com/Joylo-AI/joylo-cursor-plugin.git` | The real public repo URL |
| `README.md` | Useful links | `https://joylo.org/connect-ai-agent` | The real help page URL (on dev it's `https://dev.joylo.org/connect-ai-agent`) |
| `architecture.md` | Diagram labels | `api.joylo.org`, `auth.joylo.org` | Final production hosts |

`node scripts/validate.mjs` prints a warning for each of these while they still point anywhere except production.

### 2. Other things to finish

- [ ] Replace `assets/logo.svg` with the official Joylo logo, a square SVG.
- [ ] Optionally add `"email"` to `author` in `plugin.json`, as Lovable does.
- [ ] Deploy the current MCP server (with `ask_question`, `get_latest_reply`, `list_files`, `read_file`, workspaces) to production. The production endpoint already returns a `401` with `resource_metadata`, but it may still be running older code.
- [ ] Fix the preview login redirect: on test, the preview sends users to the production login at `joylo.org/login` instead of `test.joylo.org`. Check production does the right thing.
- [ ] Stop `whoami` echoing the credential id.
- [ ] Optionally add MCP tool annotations (`readOnlyHint`, `destructiveHint`) so clients can tell free reads from spending calls.

### 3. Submission steps

1. Run `node scripts/validate.mjs` and fix any errors.
2. Push this folder to a **public** Git repository, such as `Joylo-AI/joylo-cursor-plugin`. Listed plugins must be open source. This repo holds only the plugin files, not the server code.
3. Test locally from `~/.cursor/plugins/local/joylo` (see above): sign in, plus at least one read-only tool call against production.
4. Submit the repo URL at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Cursor reviews it by hand, so it isn't published right away. Every later update needs a re-index request.
5. Confirm with Cursor that the listing also appears in Grok Bot, and test sign-in plus a read-only call there.

---

## Useful links

- [Cursor plugin docs](https://cursor.com/docs/plugins) and [reference](https://cursor.com/docs/reference/plugins)
- [Cursor MCP docs](https://cursor.com/docs/mcp)
- [Connect an AI agent to Joylo](https://joylo.org/connect-ai-agent)

## License

This plugin package is licensed under the [MIT License](LICENSE). The license covers the files in this repository, not Joylo's hosted service.
