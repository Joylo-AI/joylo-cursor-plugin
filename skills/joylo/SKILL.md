---
name: joylo
description: Build, change, or publish a Joylo app. Use when someone wants a new Joylo app, a change or question about an existing one, or to put it live.
---

# Joylo

Joylo's builder plans, asks, and writes the app. You are not editing those files locally. Send the request, then read back what was built.

Get a yes before `create_project`, `send_followup`, or `ask_question` — each spends credits immediately and has no confirm step — and before `publish_app` (call `get_publish_quote` first, then pass that `credits_required` as `confirm_credits`). Never invent answers to Joylo's questions: show them and send only the user's answers with `answer_questions`.

## Build

Write `intent` in the user's words. Set `app_type` to `mobile` only when they ask for a phone app; otherwise `web`. Call `create_project` with a new `idempotency_key` and reuse it on retry. Follow with `wait_for_build`. On `needs_input`, stop and ask the user. On `building`, pass on `activity` and wait again. Then check `list_files` and `read_file`, and share the `get_preview` link (`wake_project` first if it is asleep).

## Change or ask

Find the project with `list_projects` and `get_project`. Read with `list_files` and `read_file` before spending anything. `ask_question` does not change the app; if the reply is not back yet, call `get_latest_reply`. `send_followup` changes it, then follow the build the same way. Both run only when nothing is building.

## Publish

After a yes to the quote, call `publish_app` and share `get_app_url`. Ask before `update_published_app` or `stop_published_app`.
