---
description: Lint, build, deploy to Vercel prod, and print the URL
---

Deploy the current state to Vercel production.

Run these steps in order. If any fails, stop and report the error.

1. Verify `DEV_PREVIEW` is false in `src/HomeScreen.jsx`. Grep for `const DEV_PREVIEW = !import.meta.env.PROD && true` — if found, ABORT and tell the user to flip it to `false` first.
2. Run `npm run build` and confirm it succeeds.
3. Run `npx vercel --prod --yes` from the repo root.
4. Extract the production URL from the output.
5. Report the URL to the user with a one-line summary of what changed since the last commit (use `git log -1 --oneline`).

If `vercel` is not installed, instruct the user to run `npm i -g vercel` first.
