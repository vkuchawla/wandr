---
description: Toggle DEV_PREVIEW mock data on/off in HomeScreen — usage /mock on or /mock off
argument-hint: on | off
---

Toggle the `DEV_PREVIEW` mock-data flag in `src/HomeScreen.jsx`.

Argument: $ARGUMENTS

Rules:
- If the argument is `on`: set the line to `const DEV_PREVIEW = !import.meta.env.PROD && true;`
- If the argument is `off`: set the line to `const DEV_PREVIEW = !import.meta.env.PROD && false;`
- If the argument is empty or anything else: read the file, tell the user the current state, and ask which they want.

After editing:
1. Confirm the change by grepping the file for `const DEV_PREVIEW`.
2. Remind the user: mock data only shows on localhost regardless — the `!import.meta.env.PROD` guard blocks it in prod builds.
3. Do NOT commit or deploy. Leave that to the user.
