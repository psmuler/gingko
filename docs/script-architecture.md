# script.js Orchestration Layout

`docs/js/script.js` now acts as an orchestrator that wires together specialised modules instead of holding application logic itself. Responsibilities are split into the following directories:

- `docs/js/core/app-state.js` — shared state (Leaflet map, marker layer, loading flags, tile layer index).
- `docs/js/ui/` — presentation helpers:
  - `modal.js` for modal overlays.
  - `menu.js` for navigation drawer, About/Fav links, stats modal, and seasonal test entry points.
  - `messages.js` for loading overlays and toast notifications.
  - `form-controller.js` for the standalone haiku submission form.
- `docs/js/map/` — Leaflet integration:
  - `map-service.js` builds the map, handles geolocation, and owns refresh routines.
  - `tile-manager.js` switches between tile servers and fallbacks.
  - `markers.js` renders haiku/tanka pins and exposes marker utilities (`loadHaikuData`, `editHaiku`, etc.).
- `docs/js/data/stats.js` — generates HTML for the statistics modal (used by the menu module).

`script.js` re-exports the public API (`initializeMapWithLocation`, `showErrorMessage`, `toggleMenu`, etc.), provides a `getMap()` helper plus a proxy `map` export for legacy imports, and binds the required functions back onto `window` so existing inline handlers keep working.
