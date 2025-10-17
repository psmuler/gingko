# Kigo Suggestion Modules

The suggestion system is now composed of two layers:

- `docs/js/kigo-suggestions.js` keeps the detection engine, in-memory cache, and UI helpers for building suggestion buttons. It exports the core API (`initializeKigoSuggestions`, `attachKigoSuggestionToInput`, `getCurrentKigoSelection`, etc.).
- `docs/js/seasonal-suggest.js` acts as a lightweight bridge that simply ensures the shared engine is initialised and forwards attachment requests. It no longer owns a separate Supabase query or rendering flow. Modules can call `attachSeasonalSuggestion` with an input/container pair to opt-in to automatic suggestions.

This removes the duplicate detection logic that previously existed in both `kigo-suggestions.js` and `seasonal-suggest.js`, and guarantees that all suggestion consumers share the same cache and state.
