# Specification

## Summary
**Goal:** Update the initial in-memory default Valentine content in `frontend/src/App.tsx` (landing message, video headings, and final message) without affecting existing save/restore, polling, navigation, or UI behavior.

**Planned changes:**
- Update only the default state initializers in `frontend/src/App.tsx`:
  - Set `landingMessage` default to `"Happy Valentine's Day, Apshara!"`.
  - Keep the same three remote MP4 URLs and `file: null` for `videoSlots`, but change headings to: `🤭`, `🤐`, and `"Am I in Love with You? Definitely"` (in order).
  - Set `finalMessage` default exactly to the provided multiline text (including trailing line breaks).
- Add brief inline comments next to the modified initializers clarifying these values are fallback defaults used only when no remote/global/local saved state is available.

**User-visible outcome:** On a fresh load with no saved state to restore, the Landing, Videos, and Final Message pages are pre-filled with the updated default content; if saved state exists, it continues to override these defaults as before.
