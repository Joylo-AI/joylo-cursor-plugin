---
name: joylo-new
description: Build a new Joylo app from the brief in the arguments and return the preview link.
---

# New Joylo app

Follow the `build-joylo-app` skill with the brief in the arguments.

1. If the brief is empty or too thin to build from, ask what the app is for and who uses it before calling anything.
2. Ask whether it is a web or phone app only if the brief leaves it unclear.
3. Tell the user building uses credits, then call `create_project` with the brief in their words and a new `idempotency_key`.
4. Follow the build with `wait_for_build`, passing any questions to the user and only their answers to `answer_questions`.
5. Check the code with `list_files` / `read_file`, then reply with the `get_preview` link and one line on what was built.
