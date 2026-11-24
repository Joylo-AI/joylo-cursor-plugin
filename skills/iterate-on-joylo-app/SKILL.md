---
name: iterate-on-joylo-app
description: Change, fix, or ask about an existing Joylo app, then verify the result in its code. Use for any edit, bug fix, or question about a project that already exists.
---

# Iterate on a Joylo app

## When to use

- A Joylo project already exists and someone wants it changed or fixed.
- Someone wants to know how part of the app works without changing it.

## Find the project

1. Use `list_projects` with `search` to find it by name. It returns up to 50 per page; when `next_offset` is set, pass it as `offset` for the next page. `workspace_id` (from `whoami`) limits it to one workspace.
2. Confirm with `get_project`. It shows the workspace and whether a build is running.

## Read before you spend

`list_files` and `read_file` are free and work while the project is asleep. Use them first to understand the code, so the request you send is specific. They show the code as last saved (up to a minute behind a running build), and skip secrets such as `.env`.

## Ask without changing

Use `ask_question` for questions like "how does sign-in work?" or "what would payments take?". It uses credits and never changes code. Write the question in full, pass an `idempotency_key` UUID and reuse it on retry. It waits about 50 seconds; if the answer is not back, call `get_latest_reply`.

## Make a change

1. Changes use credits; say so before the first one.
2. Make sure nothing is building (`get_build_status`). `send_followup` and `ask_question` only work when the project is idle.
3. Call `send_followup` with the change written out in full in the user's words, without extras. Pass an `idempotency_key` UUID and reuse it on retry.
4. Follow the build with `wait_for_build` exactly as in `build-joylo-app`, including passing any `needs_input` questions to the user and sending only their answers through `answer_questions`.
5. Verify. Use `read_file` on the files that should have changed and confirm the change is really there. A `completed` state is not proof.
6. Share the `get_preview` link. If the app is published, the live version does not change until `update_published_app`; ask before calling it.

## Writing requests that land

- One change per message.
- Name the place: "the Reset button on the counter screen", not "the button".
- Describe the end state, not the steps.
- If the request could mean two things, ask before sending.
