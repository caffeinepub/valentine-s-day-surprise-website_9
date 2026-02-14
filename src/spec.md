# Specification

## Summary
**Goal:** Fix remote video “Save failed” issues by aligning the frontend remote-save client with the deployed Motoko snapshot APIs, ensuring video blobs persist reliably, and enabling cross-browser/user restore via shareable save links.

**Planned changes:**
- Verify and correct frontend↔backend compatibility for the Valentine snapshot API surface used by `frontend/src/lib/valentineRemoteProgress.ts`, covering both create and update (saveId present) flows including video blob payloads.
- Ensure backend persistence and restore correctly reconstruct the landing/final messages, three video headings, and playable videos from stored snapshot blob data (not from uploader-session `blob:` URLs), including empty-slot handling.
- Harden backend write security: require Internet Identity authentication for write operations; enforce per-save write capability on updates; return clear English authorization/version-conflict errors that the existing frontend error normalization can surface.
- Add frontend and backend safeguards for oversized payloads and storage/connectivity failures so the UI shows actionable English errors (size limit, backend unavailable, upload/storage failure) instead of a generic “save failed”.
- Add a concise repo-local markdown technical specification documenting the remote video save architecture, API surface, error handling, security model, and a step-by-step cross-user restore test plan.

**User-visible outcome:** Signed-in users can save and re-save (update) videos without “save failed”; shareable links reliably restore messages/headings and playable videos on a different browser/device, with clear English error messages when saves can’t proceed.
