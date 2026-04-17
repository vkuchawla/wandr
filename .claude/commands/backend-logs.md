---
description: Ping Render backend health and show recent activity
---

Check the WANDR backend health on Render.

1. Curl `https://wandr-62i6.onrender.com/health` and report latency + response.
2. If the response is slow (>2s), note that the service may be cold-starting.
3. If it fails, tell the user the service appears to be down and suggest checking the Render dashboard: https://dashboard.render.com
4. Show the last backend commit on main that touched `backend/server.js`: `git log -1 --oneline -- backend/server.js`.

Do not tail logs — Render CLI isn't wired up. If the user needs live logs, point them to the Render dashboard.
