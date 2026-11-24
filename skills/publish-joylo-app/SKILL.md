---
name: publish-joylo-app
description: Publish a Joylo app to a public address after the user agrees to the quoted cost, update a live app, or take it offline. Use when someone wants an app live, refreshed, or stopped.
---

# Publish a Joylo app

## When to use

- A Joylo build is finished and someone wants it at a public address.
- An app is already live and someone wants the latest build put live, or wants it taken offline.

## Before you publish

1. Confirm the project with `get_project` and check that the requested work is in, using `read_file` or the `get_preview` link. A reply saying it is done is not enough.
2. If the project is asleep, call `wake_project` first (about a minute).

## Publish (starts a recurring charge)

1. Call `get_publish_quote`. It spends nothing.
2. Tell the user `credits_required`, how many days it covers (`period_days`), and that hosting includes its own database (`includes_database`). Make clear publishing starts a recurring credit charge. `get_credit_balance` with the project's `workspace_id` shows what that workspace has.
3. Wait for a clear yes to that figure. Without it, stop.
4. Call `publish_app` with `confirm_credits` set to exactly the quoted `credits_required`, a new `idempotency_key` UUID, and `app_name` if the user gave one. If it is refused because the cost changed, get a fresh quote and ask again. If the call fails, retry with the same key.
5. Call `get_app_url` and share the public address.

## Update a live app

Ask the user first. Then call `update_published_app` with a new `idempotency_key` UUID. It costs no extra credits and keeps the same address and hosting size. While it runs, `get_app_url` shows `update_in_progress: true`.

## Take an app offline

Ask the user first. `stop_published_app` takes the public address offline. The project, preview and data are kept, and running-time charges stop, but credits already reserved for this period are not returned. Say that before they decide.
