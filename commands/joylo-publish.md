---
name: joylo-publish
description: Quote, confirm, and publish a Joylo project, then return its public address.
---

# Publish a Joylo app

Follow the `publish-joylo-app` skill.

1. Find the project (from the arguments, or `list_projects`) and confirm the work is in with `read_file` or the preview.
2. Call `get_publish_quote` and show `credits_required` and `period_days`. Publishing starts a recurring charge.
3. Stop and wait for the user's yes. Do not publish without it.
4. Call `publish_app` with `confirm_credits` equal to the quoted `credits_required` and a new `idempotency_key`.
5. Reply with the address from `get_app_url`.
