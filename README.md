# Joylo for Cursor

Build, change, and publish [Joylo](https://joylo.ai) apps from Cursor. You describe an app in plain language, Joylo plans and builds it, and you get a live preview. Publishing to a public address happens only after you agree to the quoted cost.

The same package is the intended Joylo plugin for Grok Bot.

## What you can ask

- "Build me a Joylo app where my team logs weekly goals."
- "Find my Joylo app *Budget Tracker* and add a Reset button."
- "How does sign-in work in my Joylo app *Budget Tracker*?"
- "What would it cost to publish it?"

Building, changing an app, and asking Joylo a question about the code all spend credits. The skills in this plugin tell the agent to say so and wait for a yes before those calls. Reading files, listing projects, and fetching a publish quote do not spend credits.

## What you get

- **MCP connection** to `https://api.joylo.ai/mcp`. The first tool call opens a browser so you can sign in. There is no API key to paste.
- **Skills** the agent reaches for on its own:
  - `build-joylo-app` — start a web or mobile app and follow the build to a preview
  - `iterate-on-joylo-app` — read the code, ask a question, or send a change, then check the files
  - `publish-joylo-app` — quote a publish, wait for a yes, then return the public address
- **Commands** you can run directly: `/joylo-new`, `/joylo-publish`.
- **A rule** that keeps spending, publishing, and build answers tied to what you actually said.

## Sign-in

The plugin connects to `https://api.joylo.ai/mcp` over Streamable HTTP. An unauthenticated request gets `401` and a `resource_metadata` link. The client discovers Joylo's authorization server (`https://auth.joylo.ai`), registers itself (dynamic client registration), and opens a browser sign-in with PKCE (`S256`). No API keys, headers, or client secrets belong in the plugin files.

The protected resource advertises the scope `joylo:agent`. The authorization server also supports `offline_access`, so the client can stay signed in. You can review or revoke that access in Joylo under **Settings → Security → Agent access**.

## Credits and safety

Credits are Joylo's unit of AI compute. How they are billed is described in [How credits work](https://joylo.ai/help/articles/how-credits-work). This plugin does not set prices.

| Action | Spends credits | What the agent must do first |
|--------|----------------|------------------------------|
| `create_project`, `send_followup` | Yes, when the call is made | Tell you, then wait for a yes |
| `ask_question` | Yes, immediately. There is no `confirm_credits` parameter | Warn you that it spends credits and does not change the app, then wait for a yes |
| `publish_app` | Yes, and it starts a recurring charge | Show `credits_required` and `period_days` from `get_publish_quote`, then wait for a yes to that figure. The call must pass that figure as `confirm_credits` |
| `update_published_app`, `stop_published_app` | No extra credits | Ask you first. Stopping a published app does not return credits already reserved for the period |
| Reads and status (`whoami`, `get_credit_balance`, `list_projects`, `get_project`, `get_build_status`, `wait_for_build`, `answer_questions`, `get_latest_reply`, `list_files`, `read_file`, `get_preview`, `wake_project`, `stop_build`, `get_publish_quote`, `get_app_url`) | No | Nothing. These are safe to try while signed in |

The agent is also told to:

- Write each request out in your words. Joylo cannot see this chat, and extra features you did not ask for change the plan and the cost.
- Show you Joylo's build questions and send only your answers. It must not pick an option for you.
- Treat a finished build as unverified until it has checked the code with `list_files` and `read_file` and shared the preview link.
- Reuse the same `idempotency_key` on a retry, so a retry does not create a second project, build, or publish.
- Not create throwaway projects. There is no delete tool.

## Joylo tools

| Tool | What it does | Spends credits |
|------|--------------|----------------|
| `whoami` | Signed-in account and its workspaces | No |
| `get_credit_balance` | Credits left in a workspace | No |
| `list_projects` | Your projects, with search and paging | No |
| `get_project` | One project, its workspace, and build state | No |
| `get_build_status` | How a build is going right now | No |
| `create_project` | Starts a new web or mobile app from a description | Yes |
| `wait_for_build` | Waits until a build finishes, fails, or needs an answer | No |
| `answer_questions` | Sends your answers to a paused build | No |
| `send_followup` | Asks Joylo to change an existing project | Yes |
| `get_preview` | Link to the working app, and whether it is awake | No |
| `wake_project` | Wakes a sleeping project | No |
| `stop_build` | Stops a running build and keeps finished work | No |
| `get_publish_quote` | What publishing would cost | No |
| `get_app_url` | Public address of the published app | No |
| `publish_app` | Publishes the app. Requires the quoted figure as `confirm_credits` | Yes, recurring |
| `update_published_app` | Puts the latest build live at the same address | No |
| `stop_published_app` | Takes the published app offline | No |
| `ask_question` | Asks Joylo about a project without changing it | Yes, immediately |
| `get_latest_reply` | The last message to Joylo and its reply | No |
| `list_files` | Lists a project's source files | No |
| `read_file` | Reads one source file | No |

## Install

Install **Joylo** from the [Cursor Marketplace](https://cursor.com/marketplace). In Cursor, open **Customize** and install the Joylo plugin. The first Joylo tool call opens a browser so you can sign in and approve access.

You need a [Joylo](https://joylo.ai) account. Credits are required only for the actions in the table above.

### Try it

1. "Who am I signed in as on Joylo, and list my Joylo projects." (`whoami` and `list_projects` spend nothing.)
2. "Read the main page file of my Joylo project X." (`list_files` and `read_file` spend nothing.)
3. When you want something built, say so. The agent should tell you it will spend credits and wait for a yes before `create_project`.

## Privacy and support

This repository does not collect accounts, prompts, or project data. Those stay on Joylo's service, under Joylo's privacy policy and terms.

- [Privacy policy](https://joylo.ai/privacy) — privacy questions: privacy@joylo.ai
- [Terms of service](https://joylo.ai/terms-of-service)
- [Security overview](https://joylo.ai/secure)
- [Help center](https://joylo.ai/help)
- [How credits work](https://joylo.ai/help/articles/how-credits-work)
- [Contact](https://joylo.ai/contact) — hello@joylo.ai
- Security reports for this plugin: [SECURITY.md](SECURITY.md)

## Project layout

```
joylo-cursor-plugin/
├── .cursor-plugin/
│   └── plugin.json          # Manifest: name, version, description, logo
├── mcp.json                 # Production MCP URL (no keys)
├── assets/
│   └── logo.svg             # Joylo logo
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
│   └── validate.mjs
├── architecture.md
├── CHANGELOG.md
├── SECURITY.md
├── README.md
└── LICENSE
```

Cursor discovers the MCP server from the root `mcp.json`, and skills, rules, and commands from their folders. In approval prompts the server appears as `plugin-joylo-joylo`.

## Maintainers

Local install, for testing before or beside the marketplace listing:

```bash
mkdir -p ~/.cursor/plugins/local
git clone https://github.com/Joylo-AI/joylo-cursor-plugin.git ~/.cursor/plugins/local/joylo
```

Or copy this folder to `~/.cursor/plugins/local/joylo`, including the hidden `.cursor-plugin` folder. Do not symlink it: Cursor skips symlinks to folders outside the local plugins directory.

On Teams and Enterprise, an admin must allow **Local Plugin Imports** under Dashboard → Settings → Security & Identity → Marketplace and Plugins.

Then reload the window (**Developer: Reload Window**), confirm the plugin, MCP server, skills, rule, and commands in **Customize**, sign in, and run the free `whoami` / `list_projects` prompt above.

- Run `node scripts/validate.mjs` from the repo root before every release. It checks the manifest against Cursor's plugin fields, `mcp.json`, component frontmatter, that skills only mention real Joylo tools, that credit-spending steps require a yes, and that Joylo links in the docs are on the verified list.
- Bump `version` in `.cursor-plugin/plugin.json` and ask Cursor to re-index after each update. Submit and re-index at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
- To point a local copy at another Joylo server, change the `url` in `mcp.json` and do not commit it.

## Links

- [Cursor plugin docs](https://cursor.com/docs/plugins) and [reference](https://cursor.com/docs/reference/plugins)
- [Cursor MCP docs](https://cursor.com/docs/mcp)
- [Joylo](https://joylo.ai)

## License

This plugin package is licensed under the [MIT License](LICENSE). The license covers the files in this repository, not Joylo's hosted service.
