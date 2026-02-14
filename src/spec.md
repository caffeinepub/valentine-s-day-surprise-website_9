# Specification

## Summary
**Goal:** Rebuild the Save flow so Valentine progress is persisted on the Motoko backend and can be restored cross-device via a shareable link, while keeping existing local persistence as a fallback.

**Planned changes:**
- Add backend API in the single Motoko actor to create, update (with write token), and fetch saved snapshots by unguessable saveId, including savedAt timestamp and size-limit validation with clear errors.
- Store a server-side snapshot containing Page 1 message, Page 2 three video titles, Page 2 selected videos, and Page 3 final message.
- Update the frontend Save button to create a remote save when no saveId is in the URL, then update the URL via the History API (no full reload) to include the saveId; if saveId exists, update the same remote save.
- Implement link-based restore on app load: when a saveId is present, fetch and hydrate state (including playable video slots) before rendering/editing or show a loading indicator; on remote restore failure, show a non-blocking English error and fall back to existing local restore behavior when possible.
- Add browser-safe payload limit handling for videos on both frontend (pre-check + user-facing English message) and backend (validation + structured error), and ensure restore shows progress/feedback and doesn’t block indefinitely.
- Preserve and continue updating local persistence (localStorage + IndexedDB) as offline/quick-reload fallback, while prioritizing server persistence whenever a shareable saveId exists or is created.

**User-visible outcome:** Users can click Save to generate a shareable link that opens on any browser/device to restore the exact saved messages and videos; subsequent saves update the same link, with clear saving status/error text and local fallback when remote restore/save isn’t available.
