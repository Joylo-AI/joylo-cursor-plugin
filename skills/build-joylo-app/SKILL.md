---
name: build-joylo-app
description: Create a new Joylo app from the user's description and follow the build to a working preview. Use when someone asks for a new app to be built with Joylo.
---

# Build a Joylo app

## When to use

- Someone wants a new web or mobile app built with Joylo.
- Not for changing an app that already exists; use `iterate-on-joylo-app` for that.

## Before you start

1. Building uses the user's credits. Say so, and check `get_credit_balance` if they want to know what is left (it spends nothing).
2. Decide `app_type`. It is `web` or `mobile` and cannot be changed later. Use `mobile` only when they ask for a phone app (iOS, Android, Expo). A website that should work on phones is `web`. If it is unclear, ask.
3. Do not write your own spec, design or mock-up first. Joylo plans the app and asks its own questions.

## Steps

1. Write `intent` in the user's own words, plus details they gave or agreed to. Joylo cannot see this conversation, so never say "as above". Do not add features, pages, roles or technical choices they did not ask for.
2. Generate one UUID as `idempotency_key`. Call `create_project` with `intent`, `idempotency_key` and `app_type`. If the call fails or times out, retry with the same key so no second project is created.
3. Call `wait_for_build` with the `project_id` (`timeout_seconds` up to 55). Each time it returns:
   - `building`: tell the user what `activity` says, then call it again. Joylo gives no time left; do not promise one.
   - `needs_input`: go to step 4.
   - `completed`: go to step 5.
   - `failed` or `stopped`: report it with Joylo's `message`, and ask what to do next.
   - `unknown`: the status could not be read just now; call `get_build_status` or wait again.
4. Answer questions only with the user's answers. Show Joylo's questions and options from `get_build_status`, wait for the user, then call `answer_questions`:
   - `answers` maps each question id to the chosen option labels.
   - `login_choice` is `password`, `seamless_sso` or `own_keys`, as the user chose.
   - For `input_kind` `phase_plan`, put their reply in `notes`: "yes" approves the plan; anything else asks for changes.
   Never pick an option for them. Then go back to step 3.
5. When it completes, check the code with `list_files` and `read_file` to confirm the main things they asked for are there.
6. Call `get_preview` and share the link. Joylo names the project during the first build (`project_name`). If `status` is `asleep`, call `wake_project` (about a minute) and try again. A mobile app has no web link; pass on how to try it on a phone from the Joylo editor.

## Report back

The project name, the preview link, what you confirmed in the code, and anything Joylo flagged. Publishing is separate and optional; offer `publish-joylo-app` if they want it live.
