# Remote Video Save Technical Specification

## 1. Problem Description

Users were experiencing "save failed" messages when attempting to save their Valentine's Day videos. The root causes were:

- **Backend connectivity issues**: The frontend remote-save client was not properly handling null actors or missing backend methods, resulting in runtime failures ("... is not a function" errors).
- **Video persistence gaps**: Videos were stored as local blob URLs that did not persist across browser sessions or devices, making share links non-functional for video content.
- **Generic error messages**: Users received unhelpful "save failed" messages instead of actionable guidance about authentication requirements, size limits, or connectivity issues.

## 2. Architecture Overview

### System Components

1. **Frontend Remote-Save Client** (`frontend/src/lib/valentineRemoteProgress.ts`)
   - Converts app state (landing message, 3 video slots, final message) to backend Valentine format
   - Encodes video metadata in the `text` field using JSON markers
   - Combines multiple video files into a single ExternalBlob stored in `photoSrc`
   - Handles create, update, fetch operations with progress tracking
   - Normalizes backend errors into user-friendly English messages

2. **Backend Snapshot Actor** (`backend/main.mo`)
   - Stores ValentineSnapshot records with versioning and write-token authorization
   - Provides both saveId-based saves (private, shareable) and global-latest mode (shared)
   - Requires Internet Identity authentication for all write operations
   - Uses blob-storage mixin for large video data persistence

3. **Video Persistence Strategy**
   - **Encoding**: Video metadata (heading, offset, size, type) encoded in `valentine.text` field
   - **Storage**: All video files combined into single blob stored in `valentine.photoSrc` (ExternalBlob)
   - **Restoration**: Videos extracted from combined blob using offset/size metadata and converted to playable blob URLs

### Data Flow

**Save Flow:**
