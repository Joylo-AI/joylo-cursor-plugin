# Changelog

## 0.1.0

First release prepared for Cursor Marketplace review.

- MCP connection to `https://api.joylo.ai/mcp` over Streamable HTTP. Sign-in is OAuth 2.1 against `https://auth.joylo.ai` (dynamic client registration and PKCE). No API keys in the plugin.
- Skills: build a project, iterate on an existing one, and publish only after a quoted cost is accepted.
- Commands: `/joylo-new`, `/joylo-publish`.
- A rule that blocks credit spending and publishing without an explicit yes, and that forbids inventing answers to Joylo's build questions.
- `ask_question` is called out in the skills and the rule: it spends credits immediately and has no `confirm_credits` gate.
