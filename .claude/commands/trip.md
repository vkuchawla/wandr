---
description: Full end-to-end trip generation smoke test via the backend
argument-hint: city name (e.g. Tokyo, Lisbon)
---

Smoke test the trip generation pipeline against the deployed Render backend.

City: $ARGUMENTS (default to `Tokyo` if empty)

Run these steps:

1. Curl `POST https://wandr-62i6.onrender.com/itinerary/day` with a minimal payload:
   ```json
   {
     "city": "<city>",
     "dayIndex": 0,
     "totalDays": 1,
     "date": "2026-05-01",
     "vibes": ["food", "culture"],
     "usedPlaces": [],
     "budget": "medium",
     "pace": "balanced"
   }
   ```
2. Measure total latency.
3. Parse the response and report:
   - Number of slots generated
   - Which slots have Foursquare photos (vs missing)
   - Any slot with missing `name` or `category`
4. If latency > 15s, flag potential cold start or AI timeout.
5. If the response is not valid JSON, show the first 500 chars raw.

Do NOT save the result or trigger side effects. This is read-only.
