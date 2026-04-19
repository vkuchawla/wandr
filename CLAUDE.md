# WANDR — Claude Code Guide

AI travel-planning app. React + Vite frontend, Express backend on Render, Supabase for auth/data.
Read this file before making changes — it captures context that isn't obvious from the code.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Frontend dev server on :5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `cd backend && node server.js` | Backend on :3001 |

**Preview tools:** use `.claude/launch.json` config `"Wandr Frontend (Vite)"` with `preview_*` tools. Never `npm run dev` via Bash.

---

## Architecture

```
src/
├── App.jsx              Top-level router, auth gate, trip state
├── Auth.jsx             Magic-link login + AuthGateModal
├── HomeScreen.jsx       Landing, search, upcoming/past trips
├── ItineraryView.jsx    Generation + Story + Plan modes (being split)
├── MomentCards.jsx      Swipeable Story card (hero photo + tip + transit)
├── MoodBoard.jsx        Per-day vibe picker before generation
├── ExploreScreen.jsx    City discovery grid
├── SavedTripsScreen.jsx Saved trips list (local + supabase)
├── ProfileScreen.jsx    Profile + travel DNA quiz
├── PlaceSheet.jsx       Google Places detail sheet
├── RatingSheet.jsx      Post-visit rating
├── Social.jsx           Friends + shared trips
├── CityPage.jsx         Public city explore page
├── ShareCard.jsx        Share-to-social preview
├── NavBar.jsx           Bottom 5-tab nav
├── constants.jsx        Design tokens (T), CITY_PHOTOS, VIBES, all static data
└── utils.jsx            Helpers (parseTripDays, countDays)

backend/
└── server.js            All endpoints; DO NOT edit backend/wandr-backend/* (stale duplicate)
```

---

## Backend endpoints

All POST unless noted. Base: `https://wandr-62i6.onrender.com`

| Endpoint | Purpose |
|---|---|
| `GET /health` | Keep-alive ping. Returns `{ok, keySet, keyPrefix}` |
| `POST /itinerary/day` | Generate ONE day. Awaits photo enrichment up to 4.5s before returning. |
| `POST /enrich` | Add Google Places hours/confidence/rating/lat-lng to slots |
| `GET /autocomplete` | City search suggestions |
| `POST /place` | Place details for PlaceSheet |
| `POST /validate-time` | AI-validated time change (feasibility, hours) |
| `POST /chat-edit` | AI-powered itinerary edit via natural language |

**Photo pipeline** (`enrichWithPhotos` in `server.js`):
Google Places v1 → Foursquare fill-gap → Wikipedia landmark fallback. Returns `slot.photos[]` (up to 5), `slot.rating`, `slot.rating_count`, `slot.lat`, `slot.lng`.

---

## Core data model

```js
trip = {
  city, dates,              // "Tokyo", "Apr 23 – Apr 25, 2026"
  moodContext,              // newline-separated vibe ids per day
  homeBase,                 // optional neighborhood anchor
  days: [
    {
      day: 1,
      theme: "Slow Tokyo awakening, hidden corners",
      slots: [
        {
          name, neighborhood, category, time, end_time,
          activity,              // flavor paragraph
          highlight,             // bool — "must-do" gold badge
          confidence,            // "verified" | "unverified"
          hours_warning,         // string if mis-timed
          must_know,             // local tip
          transit_mode,          // walk|subway|taxi|uber|lyft|bus|tram|ferry|bike|drive
          transit_from_prev,     // "12 min walk"
          photos: [url, ...],    // up to 5, ordered — [0] is hero
          rating, rating_count,  // Google data
          lat, lng,              // coords for map + distance
          opening_hours, hours_periods, // Google Places data
          price,                 // "$", "$$", "$$$"
        }
      ]
    }
  ]
}
```

---

## Design system

All tokens in `src/constants.jsx` as `T`.

```
T.cream #fdf6ed  T.paper #f5ede0  T.ink #1c1612
T.inkLight #5c4f3d  T.inkFaint #a89880
T.accent #c84b2f  T.gold #c49a3c  T.sage #4a7c59  T.dust #e8dcd0
```

**Fonts:** Playfair Display (serif headers) + DM Sans (body).
**Nav height:** `NAV_H = 80` — content must clear this.
**Buttons:** `BTN_PRIMARY`, `BTN_SECONDARY` in `constants.jsx`. Use them.

**Voice:** warm, confident, concise — "Airbnb meets a well-traveled friend." See `.claude/agents/copy-editor.md`.

---

## Invariants (things not to break)

- **Secrets** live in env, not source. Supabase anon is exception (safe public key).
- **Photos**: `slot.photos[0]` is hero. Never skip to `[1]` as primary. Error-chain to next on failure.
- **Generation is sequential** per day — backend tracks `usedPlaces` to avoid repeats.
- **`getBucket(slot.time)`** uses `time`, never `end_time`.
- **Vercel deploy** requires `/health` returning 200 — warm Render before pushing (hook enforces).
- **Don't edit `backend/wandr-backend/*`** — stale duplicate.
- **DEV_PREVIEW flag** in `App.jsx`: must be `false` before pushing to production.

---

## Working style

- **Plan before coding** for any multi-file change. Output a plan, get confirmation, then execute.
- **Verify in preview** after every UI change. Use `preview_screenshot` or `preview_eval` — never ask the user to check manually.
- **One commit = one concept.** Don't bundle unrelated changes.
- **Before risky actions** (force push, dependency upgrade, schema change): confirm.

---

## Known tech debt

- `ItineraryView.jsx` is 1300+ lines — being split into `ItineraryView/{index,PlanMode,...}.jsx`
- No tests yet (priority: pure functions first — `getBucket`, `haversineMiles`, `pickFallbackPhoto`)
- No Sentry / PostHog yet
- `constants.jsx` is a grab bag — candidate for split into `tokens.js`, `data/vibes.js`, `data/cities.js`
- Google Places API key hardcoded in `backend/server.js` instead of env

---

## Deploy

- **Frontend:** `git push origin main` → Vercel auto-deploys to `wandr-app-mocha.vercel.app`
- **Backend:** same push → Render auto-builds `wandr-62i6.onrender.com` (free tier, 2–4 min)
- **Hotfix rollback:** `git revert <sha> && git push`
