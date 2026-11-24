# Security

This repository is the Cursor plugin only: a manifest, markdown guidance, and the production MCP address. It ships no binaries and no credentials. Sign-in happens in the browser with Joylo's authorization server (`https://auth.joylo.ai`) using OAuth 2.1, PKCE (`S256`), and dynamic client registration. Tool calls go to `https://api.joylo.ai/mcp`.

Project data and account data stay on Joylo's hosted service. The privacy policy is at <https://joylo.ai/privacy>. A plain-language security overview of that service is at <https://joylo.ai/secure>.

## Reporting a vulnerability

Email **hello@joylo.ai** with a description of the issue, its impact, and steps to reproduce. Please do not open a public GitHub issue for an undisclosed security problem.

Privacy questions go to **privacy@joylo.ai**. Other product questions go to **hello@joylo.ai** or [the contact page](https://joylo.ai/contact).
