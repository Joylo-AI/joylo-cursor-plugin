# Joylo for Cursor

Build, change, and publish [Joylo](https://joylo.ai) apps from Cursor. You describe an app, Joylo builds it, and you get a live preview. It goes live only after you agree to the quoted cost.

One skill, `joylo`, walks the agent through a build, a change, or a publish.

## Try asking

- "Build me a Joylo app where my team logs weekly goals."
- "Add a Reset button to my Joylo app Budget Tracker."
- "How does sign-in work in that app?"
- "What would it cost to publish it?"

## Sign-in

The plugin connects to `https://api.joylo.ai/mcp` over Streamable HTTP. The first tool call opens a browser. Joylo's authorization server is `https://auth.joylo.ai` (OAuth with PKCE and dynamic client registration). There is no API key in this plugin.

The scope is `joylo:agent`. You can review or revoke that access in Joylo under **Settings → Security → Agent access**.

## Credits

`create_project`, `send_followup`, and `ask_question` spend credits as soon as they run. `ask_question` has no confirm step. `publish_app` starts a recurring charge: show the quote from `get_publish_quote` and wait for a yes before passing that figure as `confirm_credits`. Reading files, listing projects, and fetching the quote spend nothing. See [How credits work](https://joylo.ai/help/articles/how-credits-work).

## Privacy and support

- [Privacy policy](https://joylo.ai/privacy) — privacy@joylo.ai
- [Terms of service](https://joylo.ai/terms-of-service)
- [Security](https://joylo.ai/secure)
- [Help center](https://joylo.ai/help)
- [Contact](https://joylo.ai/contact) — hello@joylo.ai

## License

This package is [MIT](LICENSE). The license covers these files, not Joylo's hosted service.
