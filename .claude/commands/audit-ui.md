---
description: Run the design-critic agent on a specific screen
argument-hint: screen name (home | explore | itinerary | social | saved | profile)
---

Audit a screen's UX/UI against award-winning reference apps.

Argument: $ARGUMENTS

Map the argument to a file:
- `home` → `src/HomeScreen.jsx`
- `explore` → `src/ExploreScreen.jsx`
- `itinerary` → `src/ItineraryView.jsx`
- `social` → `src/Social.jsx`
- `saved` → `src/SavedTripsScreen.jsx`
- `profile` → (check App.jsx for routing)
- (empty) → ask the user which screen

Launch the `design-critic` subagent via the Agent tool with a prompt like:
"Audit `src/<File>.jsx` for UX and visual design issues. Reference Airbnb, Linear, Lasso, Raycast for quality bar. Report: top 3 wins, top 3 issues with fix suggestions (file:line), and one bold idea. Be specific and terse."

Render the agent's report back to the user verbatim.
