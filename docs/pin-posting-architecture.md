# Pin Posting Module Structure

The pin posting feature has been modularised to keep responsibilities small and composable. The new layout lives under `docs/js/pin/` and is organised as follows:

- `state.js` – shared mutable state for the workflow. Exposes the `pinState` singleton plus small helpers for resetting slices (form metadata, temporary pin snapshot).
- `cache.js` – data-access helpers that wrap Supabase calls from `api-adapter.js` and manage the in-memory map cache (`refreshHaikuCache`, `updateHaikuInCache`, `checkExistingHaikusAtLocation`).
- `temporary-pin.js` – creation, animation, promotion, and teardown logic for temporary map pins. The module keeps the timeout bookkeeping in sync with `pinState`.
- `form.js` – all inline-form behaviours: DOM creation, edit/new mode toggles, submission/draft flows, swipe gesture wiring, and seasonal metadata handling.

`docs/js/pin-posting.js` now acts as a thin orchestrator. It wires the map click handlers, delegates inline form work to `form.js`, manages swipe-to-detail routing, and exposes the public API on `window` for legacy consumers.

The refactor preserves the existing global function surface (`hideInlineForm`, `showInlineFormForEdit`, `showTemporaryPinFromPinPosting`, etc.), so other scripts continue to work without changes.
