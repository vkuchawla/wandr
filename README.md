# Wandr

AI-powered travel itinerary planner. Type a city, pick your vibes, get a real day-by-day itinerary with specific places, transit times, and insider tips — then edit it live with AI.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React 19 + Vite)            │
│   HomeScreen → CityPage → MoodBoard → ItineraryView     │
│             ↕ Supabase client (auth + DB)               │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (VITE_BACKEND)
┌──────────────────────▼──────────────────────────────────┐
│                   Backend (Express on :3001)             │
│    /itinerary/day  /chat-edit  /place  /autocomplete    │
└──────┬──────────────┬────────────────┬───────────────────┘
       │              │                │
  Anthropic      Google Places    Foursquare
  Claude Haiku   (details,        (photos)
  (generation,    autocomplete,
   edits)         hours)
```

**Deployed:** Frontend on Vercel · Backend on Render (`https://wandr-62i6.onrender.com`) · DB on Supabase

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, inline CSS (no framework) |
| Backend | Express 5, Node.js |
| Database | Supabase (Postgres + Auth) |
| AI | Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) |
| Place Data | Google Places API (v1 + legacy), Foursquare Places v3 |
| Auth | Supabase magic link (email OTP, no passwords) |

---

## Running Locally

```bash
# Frontend
npm install
npm run dev          # http://localhost:5180

# Backend
cd backend
node server.js       # http://localhost:3001
```

**Required env files:**

`backend/.env`
```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
FSQ_API_KEY=...
PORT=3001
```

`.env.development` (frontend — Vite picks this up automatically in dev)
```
VITE_BACKEND=http://localhost:3001
```

`.env.production`
```
VITE_BACKEND=https://wandr-62i6.onrender.com
```

---

## Frontend

### Screen Flow

```
OnboardingSplash → AuthScreen → ProfileScreen (onboarding quiz)
                                      ↓
                               HomeScreen (hub)
                             ↙    ↓      ↓    ↘
                       Explore  City   Saved  Social
                                 ↓
                            MoodBoard
                                 ↓
                          ItineraryView
```

### Screens & Components

| File | Role |
|------|------|
| `App.jsx` | Root router, global state (city, dates, moodContext, savedTrips), auth listener, Supabase sync |
| `HomeScreen.jsx` | City search + calendar + quick-plan sheet + community feed |
| `CityPage.jsx` | City detail, friend trips, date picker, hotel input, fast-lane CTA |
| `MoodBoard.jsx` | Per-day vibe selection (18 options across 4 categories), builds mood context string |
| `ItineraryView.jsx` | Core experience: sequential day generation, story/plan view modes, AI chat editing, ratings, place details |
| `ExploreScreen.jsx` | 16 featured cities, one-tap instant itinerary |
| `SavedTripsScreen.jsx` | Saved trip cards, search, delete, open, remix |
| `Social.jsx` | Follow friends, community ratings feed, user search, trip remix |
| `ProfileScreen.jsx` | 3-question onboarding quiz, travel DNA display, trip history |
| `Auth.jsx` | `AuthScreen` (full onboarding page), `AuthGateModal` (inline gate for save/social actions), `SignInPrompt` (profile tab) |
| `MomentCards.jsx` | Swipeable story-mode cards with photo backgrounds, transit display, check-in/rating flow |
| `PlaceSheet.jsx` | Bottom sheet: Google Places photos, rating, hours, reviews, maps link |
| `RatingSheet.jsx` | 1–5 star rating input with optional text note |
| `ShareCard.jsx` | Trip share modal with emoji customization |
| `NavBar.jsx` | Bottom nav — 5 tabs: Home, Explore, Itinerary, Saved, Profile |
| `constants.jsx` | Design tokens (T), CITY_PHOTOS, VIBES, EXPLORE_CITIES, GLOBAL_CSS, animation keyframes |
| `utils.jsx` | `parseTripDays()`, `countDays()` |

### Design System (`constants.jsx`)

**Color tokens (T):**
```js
cream:    "#fdf6ed"  // primary background (warm, golden)
paper:    "#f5ede0"  // secondary background
ink:      "#1c1612"  // primary text
inkLight: "#5c4f3d"  // secondary text
inkFaint: "#a89880"  // tertiary / placeholder
accent:   "#c84b2f"  // CTA (orange-red)
gold:     "#c49a3c"  // accent gold
sage:     "#4a7c59"  // green accent
dust:     "#e8dcd0"  // borders / dividers
```

**Typography:**
- Headings: `Playfair Display` (serif, 400/700/900)
- Body: `DM Sans` (sans-serif, 300–800)

**Key constants:**
- `NAV_H = 72` — bottom nav height; used as `paddingBottom` on all full-height screens so content is never hidden behind the nav
- `GLOBAL_CSS` — Google Fonts import + CSS reset + all keyframe animations (`fadeUp`, `shimmer`, `slideUp`, `pulse`, `spin`, `marquee`)

---

## Backend (`backend/server.js`)

### API Endpoints

#### Itinerary Generation

**`POST /itinerary/day`** — Generate one day of an itinerary
```
Input:  { city, dates, dayNum, dayVibe, totalDays, travelProfile, usedPlaces[], homeBase }
Output: { day, theme, slots[] }
```
- Calls Claude Haiku with a structured prompt (vibe guide, hours rules, transit logic, used-places dedup)
- Races a Foursquare photo fetch with a 4.5s timeout — photos attached if available before cutoff
- Post-processes: auto-corrects `transit_mode`/`transit_from_prev` mismatches, fixes obvious timing violations

**`POST /chat-edit`** — Live AI edit to an existing day
```
Input:  { city, dates, message, currentDay, allDays[], dayDate, profile, history[] }
Output: { updatedDay, message }
```
- Makes two Claude calls in parallel: one for the updated JSON, one for a short confirmation message (≤12 words)
- Enriches any new slots with Foursquare photos after generation

**`POST /validate-time`** — Check if a slot can move to a new time
```
Input:  { slot, newTime, allSlots[] }
Output: { feasible, message, newTime?, newEndTime? }
```

#### Place Data

**`POST /place`** — Full place details for the PlaceSheet modal
```
Input:  { name, city, category }
Output: { name, address, neighborhood, rating, totalRatings, price, website,
          phone, hours, isOpenNow, description, photos[], tips[], mapsUrl }
```
Tries Google Places v1 (`searchText`) first, falls back to legacy Places API.

**`POST /enrich`** — Async enrichment after itinerary slots load
```
Input:  { slot, city }
Output: { confidence, photo?, opening_hours, hours_warning }
```
Checks whether a slot's planned time conflicts with real Google opening hours; returns a warning if so.

#### Autocomplete

**`GET /autocomplete?q=`** — City/destination suggestions
Types filtered: `locality`, `administrative_area_level_1`, `country`, `tourist_attraction`

**`GET /hotel-autocomplete?q=&city=`** — Hotel/lodging suggestions
Type filtered to `lodging` only; `city` passed as context for geographic bias

#### Utility

**`GET /health`** — Returns `{ ok: true }` — used as a keep-alive ping

---

## AI Integration

**Model:** `claude-haiku-4-5-20251001`

**Itinerary prompt anatomy:**

1. **Persona** — "expert local travel curator, a well-traveled friend who lives in {city}"
2. **Vibe guide** — 18 labeled vibes (Slow Morning, Street Food, Cultural, Nightlife, Splurge Dinner, Local & Weird, etc.) with specific behavior descriptions
3. **Opening hours rules** — type-specific constraints (cafés 7am–3pm, museums 10am–6pm, dinner 6–11pm, bars 8pm–2am)
4. **Transit selection logic** — walk if <10 min, subway for metro cities at 10–20 min, taxi/uber for longer
5. **Travel profile** — pace (slow/balanced/fast), food preferences, budget, companions, sleep time
6. **Home base** — "optimize route from {hotel}, start first stop nearby"
7. **Used-places dedup** — exhaustive list of places already in previous days: "DO NOT REPEAT ANY OF THESE"
8. **Strict JSON output** — schema-validated, no prose

**Itinerary slot schema:**
```json
{
  "time": "9:00 AM",
  "end_time": "10:30 AM",
  "name": "Exact Real Place Name",
  "category": "cafe | restaurant | museum | park | bar | ...",
  "neighborhood": "Specific Neighborhood",
  "activity": "One cinematic sentence describing the actual experience.",
  "transit_from_prev": "8 min subway",
  "transit_mode": "walk | subway | taxi | bus | tram | ferry | bike | ...",
  "price": "$ | $$ | $$$ | $$$$",
  "must_know": "One genuinely useful insider tip.",
  "is_meal": true,
  "highlight": false,
  "photo": "https://... (optional, from Foursquare)",
  "confidence": "unverified | found | verified"
}
```

**Token budgets:**

| Endpoint | Max tokens |
|----------|-----------|
| `/itinerary/day` | 3000 |
| `/chat-edit` (JSON) | 2000 |
| `/chat-edit` (confirmation) | 150 |
| `/validate-time` | 300 |

**Retry logic:** 3 attempts with exponential backoff on `overloaded_error`.

---

## Database (Supabase)

### Tables

**`profiles`**
```
id          uuid  PK (= auth.users.id)
name        text
answers     jsonb  { pace, food, vibe, companions, budget, wake_time }
travel_dna  text   "slow savourer" | "hyper planner" | "food explorer" | "off-path" | ...
```

**`trips`**
```
id            uuid  PK
user_id       uuid  FK → profiles
city          text
dates         text   e.g. "Mar 18 – Mar 21, 2026"
mood_context  text   "Day 1: Slow Morning, Street Food\nDay 2: Cultural"
days          jsonb  [ { day, theme, slots[] } ]
emoji         text
saved_at      timestamptz
is_public     bool
```

**`place_ratings`**
```
id          uuid  PK
user_id     uuid  FK → profiles
trip_id     uuid  FK → trips
place_name  text
city        text
stars       int    1–5
note        text
is_public   bool
rated_at    timestamptz
```

**`follows`**
```
follower_id   uuid  FK → profiles
following_id  uuid  FK → profiles
created_at    timestamptz
```

### Auth Flow

1. User enters email → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin } })`
2. Supabase emails a magic link
3. User clicks → redirected back with session token in URL fragment
4. `onAuthStateChange` fires → app loads profile or routes to onboarding quiz
5. Quiz answers saved to `profiles` via `upsert`
6. Local trips saved while logged out sync to Supabase on sign-in

---

## Data Flow: Search → Saved Trip

```
1. SEARCH
   User types "Paris" →
   GET /autocomplete?q=Paris →
   Google Places Autocomplete (localities only) →
   City suggestions dropdown

2. CITY PAGE
   Select city + date range →
   Supabase: SELECT trips WHERE city ILIKE '%Paris%' (friend trips shown)
   Optional hotel: GET /hotel-autocomplete?q=marriott&city=Paris

3. MOOD BOARD
   Select vibes per day →
   Builds: "Day 1: Slow Morning, Street Food\nDay 2: Nightlife, Splurge Dinner"

4. GENERATION (sequential, one day at a time)
   Day 1:
     POST /itinerary/day { city, dayNum:1, dayVibe, usedPlaces:[], homeBase }
     → Claude Haiku → 5–7 slot JSON
     → Race: Foursquare photo search (4.5s cutoff)
     → Render to UI immediately
   Day 2:
     usedPlaces = all place names from day 1
     POST /itinerary/day { ..., dayNum:2, usedPlaces }
     → No repeats guaranteed across days

   Async after each day renders:
     POST /enrich for each slot → Google opening hours → hours_warning if conflict

5. EDITING
   Tap slot time → POST /validate-time → Claude assesses feasibility, suggests alternative
   Chat: "Add a rooftop bar" → POST /chat-edit → Claude returns updated day JSON
   Undo: previous day JSON stored in undoStack[]

6. RATING
   Check in → check out → RatingSheet (1–5 stars + optional note)
   Supabase: INSERT place_ratings { stars, note, trip_id, place_name }
   Also persisted to localStorage (wandr-ratings-{city}-{dates}) for offline resilience

7. SAVE
   Logged out:  AuthGateModal shown (magic link prompt)
   Logged in:   Supabase INSERT/UPSERT trips { user_id, city, dates, mood_context, days }
                Trip appears in Saved screen

8. COMMUNITY
   Trips with is_public=true appear in other users' community feeds
   Friends can remix (copy mood context to start their own version)
   Place ratings aggregate into a city-level feed in the Social tab
```

---

## External APIs

| API | Purpose | Auth |
|-----|---------|------|
| Anthropic Claude | Itinerary generation, chat edits, time validation | `x-api-key` header |
| Google Places v1 | Autocomplete, place details, photos, opening hours | `X-Goog-Api-Key` header |
| Google Places legacy | Fallback text search + photos | `key` query param |
| Foursquare Places v3 | Higher-quality venue photos | `Authorization` header |
| Supabase | Auth (magic link OTP), Postgres DB | Anon public key (client-side safe) |

---

## Key Design Decisions

**Sequential day generation, not parallel** — Each day passes its place list as `usedPlaces` to the next, so Claude cannot repeat a restaurant or landmark across a multi-day trip. Parallel generation would break this guarantee.

**Foursquare + Google photo race** — Foursquare tends to have better venue photography than Google. The backend races a Foursquare lookup with a 4.5s hard cutoff; if it resolves in time, that photo is attached. Otherwise the frontend falls back to a category-matched Unsplash image.

**Claude Haiku over Sonnet/Opus** — Generation is called once per day and the user is watching a loading screen. Haiku delivers quality results at the latency and cost appropriate for a consumer travel app where every city search triggers a real API call.

**No CSS framework** — Every component uses inline styles referencing the `T` token object. This keeps the bundle small and makes the warm, editorial aesthetic (cream/ink/gold palette, Playfair Display headings) fully intentional rather than fighting framework defaults.

**Magic link auth only** — No passwords to store or reset. The target user opens the app occasionally while planning a trip — magic links match this low-frequency, high-trust use case and eliminate an entire class of auth complexity.

**Ratings persisted to localStorage + Supabase** — Ratings written to `localStorage` immediately (key: `wandr-ratings-{city}-{dates}`) so they survive page reloads without a network round-trip. When logged in, they also write to Supabase for cross-device persistence and the community feed.
