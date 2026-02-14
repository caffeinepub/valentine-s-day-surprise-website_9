// Remote progress client for Valentine's Day snapshots
// Handles conversion, validation, and backend snapshot operations with auth, conflict detection, and polling support

import type { backendInterface, Valentine, ValentineSnapshot } from '../backend';
import { ExternalBlob } from '../backend';

interface VideoSlot {
  heading: string;
  file: File | null;
  url: string | null;
}

// Size limits for video uploads (per video and total)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB per video
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total

export interface RemoteSaveResult {
  success: boolean;
  saveId?: string;
  writeToken?: string;
  version?: bigint;
  savedAt?: number;
  error?: string;
}

export interface RemoteRestoreResult {
  success: boolean;
  landingMessage?: string;
  videoSlots?: VideoSlot[];
  finalMessage?: string;
  version?: bigint;
  savedAt?: number;
  error?: string;
}

export interface SnapshotVersionInfo {
  version: bigint;
  savedAt: number;
}

// Local storage for write tokens (scoped by saveId)
const WRITE_TOKEN_PREFIX = 'valentine_write_token_';

// Encoding markers for video data in text field
const VIDEO_DATA_MARKER = '___VIDEO_DATA___';
const VIDEO_SEPARATOR = '|||';

interface EncodedVideoData {
  heading: string;
  url?: string;
}

function storeWriteToken(saveId: string, writeToken: string): void {
  try {
    localStorage.setItem(`${WRITE_TOKEN_PREFIX}${saveId}`, writeToken);
  } catch (error) {
    console.error('Failed to store write token:', error);
  }
}

function getWriteToken(saveId: string): string | null {
  try {
    return localStorage.getItem(`${WRITE_TOKEN_PREFIX}${saveId}`);
  } catch (error) {
    console.error('Failed to get write token:', error);
    return null;
  }
}

// Normalize backend errors into friendly English messages
function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    
    // Check for specific error patterns
    if (message.includes('not a function')) {
      return 'Backend method not available. Please refresh and try again.';
    }
    if (message.includes('Authentication required') || message.includes('sign in')) {
      return 'Please log in to save your Valentine.';
    }
    if (message.includes('Invalid write token') || message.includes('not authorized')) {
      return 'You are not authorized to update this Valentine. Try re-authenticating or saving a new one.';
    }
    if (message.includes('Version conflict') || message.includes('Merge required')) {
      return 'This content was updated elsewhere. Please reload and try again.';
    }
    if (message.includes('does not exist')) {
      return 'Valentine not found. Please check your save link and try again.';
    }
    if (message.includes('No global latest')) {
      return 'No saved Valentine found yet.';
    }
    
    return message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Validate video sizes before upload
export function validateVideoSizes(videoSlots: VideoSlot[]): { valid: boolean; error?: string } {
  let totalSize = 0;
  
  for (let i = 0; i < videoSlots.length; i++) {
    const file = videoSlots[i].file;
    if (file) {
      if (file.size > MAX_VIDEO_SIZE) {
        return {
          valid: false,
          error: `Video ${i + 1} exceeds the maximum size of 50MB. Please use a smaller video.`,
        };
      }
      totalSize += file.size;
    }
  }
  
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      valid: false,
      error: 'Total video size exceeds 100MB. Please reduce the number or size of videos.',
    };
  }
  
  return { valid: true };
}

// Encode video metadata into text field
function encodeVideoData(videoData: EncodedVideoData[]): string {
  if (videoData.length === 0) return '';
  return VIDEO_DATA_MARKER + JSON.stringify(videoData);
}

// Decode video metadata from text field
function decodeVideoData(text: string): EncodedVideoData[] {
  const markerIndex = text.indexOf(VIDEO_DATA_MARKER);
  if (markerIndex === -1) return [];
  
  try {
    const jsonStr = text.substring(markerIndex + VIDEO_DATA_MARKER.length);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to decode video data:', error);
    return [];
  }
}

// Extract text content without video data
function extractTextContent(text: string): { landingMessage: string; finalMessage: string } {
  const markerIndex = text.indexOf(VIDEO_DATA_MARKER);
  const contentText = markerIndex === -1 ? text : text.substring(0, markerIndex);
  
  const parts = contentText.split('\n\n');
  return {
    landingMessage: parts[0] || "Happy Valentine's Day!",
    finalMessage: parts[1] || "You are the love of my life. Happy Valentine's Day! ❤️",
  };
}

// Convert app state to backend Valentine format
async function convertToValentine(
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<Valentine> {
  const encodedVideos: EncodedVideoData[] = [];
  const videoFiles: File[] = [];
  
  // First pass: collect video files and metadata
  for (const slot of videoSlots) {
    if (slot.file) {
      videoFiles.push(slot.file);
      encodedVideos.push({ heading: slot.heading });
    } else if (slot.url && !slot.url.startsWith('blob:')) {
      // Preserve existing remote video URLs
      encodedVideos.push({ heading: slot.heading, url: slot.url });
    } else {
      // Empty slot - just store heading
      encodedVideos.push({ heading: slot.heading });
    }
  }
  
  // Combine all videos into a single blob if there are any new uploads
  let photoSrc: ExternalBlob | undefined = undefined;
  
  if (videoFiles.length > 0) {
    // Create a combined blob with all videos
    const blobs: Blob[] = [];
    const metadata: { index: number; size: number; type: string }[] = [];
    let offset = 0;
    
    for (let i = 0; i < videoSlots.length; i++) {
      const file = videoSlots[i].file;
      if (file) {
        blobs.push(file);
        metadata.push({ index: i, size: file.size, type: file.type });
        
        // Store the offset for this video in the encoded data
        const videoIndex = encodedVideos.findIndex((v, idx) => {
          return idx === i && !v.url;
        });
        if (videoIndex !== -1) {
          encodedVideos[videoIndex].url = `embedded:${offset}:${file.size}:${file.type}`;
        }
        offset += file.size;
      }
    }
    
    if (blobs.length > 0) {
      // Combine all video blobs
      const combinedBlob = new Blob(blobs);
      const arrayBuffer = await combinedBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Create ExternalBlob with upload progress tracking
      photoSrc = ExternalBlob.fromBytes(uint8Array);
      
      if (onProgress) {
        photoSrc = photoSrc.withUploadProgress((percentage) => {
          onProgress(Math.min(99, percentage));
        });
      }
    }
  }
  
  if (onProgress && videoFiles.length > 0) {
    onProgress(100);
  }
  
  // Encode video metadata into text field
  const videoDataStr = encodeVideoData(encodedVideos);
  const textContent = `${landingMessage}\n\n${finalMessage}${videoDataStr}`;
  
  return {
    color: '#ff1493', // Deep pink
    text: textContent,
    photoSrc,
  };
}

// Convert backend Valentine to app state
async function convertFromValentine(valentine: Valentine): Promise<{
  landingMessage: string;
  finalMessage: string;
  videoSlots: VideoSlot[];
}> {
  const { landingMessage, finalMessage } = extractTextContent(valentine.text);
  const encodedVideos = decodeVideoData(valentine.text);
  
  // Default video slots
  const defaultSlots: VideoSlot[] = [
    { heading: 'Our First Memory', file: null, url: null },
    { heading: 'A Special Moment', file: null, url: null },
    { heading: 'Forever Together', file: null, url: null },
  ];
  
  // If no videos in backend, return defaults
  if (encodedVideos.length === 0) {
    return { landingMessage, finalMessage, videoSlots: defaultSlots };
  }
  
  // Convert encoded videos to video slots
  const videoSlots: VideoSlot[] = [];
  
  for (let i = 0; i < 3; i++) {
    if (i < encodedVideos.length) {
      const videoData = encodedVideos[i];
      
      if (videoData.url) {
        if (videoData.url.startsWith('embedded:')) {
          // Extract embedded video from photoSrc
          if (valentine.photoSrc) {
            const parts = videoData.url.split(':');
            const offset = parseInt(parts[1]);
            const size = parseInt(parts[2]);
            const type = parts[3];
            
            try {
              // Get the combined blob bytes
              const allBytes = await valentine.photoSrc.getBytes();
              
              // Extract this video's bytes
              const videoBytes = allBytes.slice(offset, offset + size);
              
              // Create a blob URL for this video
              const blob = new Blob([videoBytes], { type });
              const url = URL.createObjectURL(blob);
              
              videoSlots.push({
                heading: videoData.heading,
                file: null,
                url,
              });
            } catch (error) {
              console.error('Failed to extract embedded video:', error);
              videoSlots.push({
                heading: videoData.heading,
                file: null,
                url: null,
              });
            }
          } else {
            videoSlots.push({
              heading: videoData.heading,
              file: null,
              url: null,
            });
          }
        } else {
          // Direct URL (from previous saves or external)
          videoSlots.push({
            heading: videoData.heading,
            file: null,
            url: videoData.url,
          });
        }
      } else {
        // Empty slot with heading
        videoSlots.push({
          heading: videoData.heading,
          file: null,
          url: null,
        });
      }
    } else {
      // Fill remaining slots with defaults
      videoSlots.push(defaultSlots[i]);
    }
  }
  
  return { landingMessage, finalMessage, videoSlots };
}

// Create a new remote save
export async function createRemoteSave(
  actor: backendInterface | null,
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<RemoteSaveResult> {
  try {
    if (!actor) {
      return { success: false, error: 'Backend connection not available. Please refresh and try again.' };
    }
    
    // Check if method exists
    if (typeof actor.createValentineSnapshot !== 'function') {
      return { success: false, error: 'Backend method not available. Please refresh and try again.' };
    }
    
    // Validate sizes first
    const validation = validateVideoSizes(videoSlots);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Convert to backend format
    const valentine = await convertToValentine(landingMessage, videoSlots, finalMessage, onProgress);
    
    // Call backend to create snapshot
    const [saveId, writeToken] = await actor.createValentineSnapshot(valentine);
    
    storeWriteToken(saveId, writeToken);
    
    return {
      success: true,
      saveId,
      writeToken,
      version: BigInt(1),
      savedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to create remote save:', error);
    return {
      success: false,
      error: normalizeError(error),
    };
  }
}

// Update an existing remote save
export async function updateRemoteSave(
  actor: backendInterface | null,
  saveId: string,
  expectedVersion: bigint,
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<RemoteSaveResult> {
  try {
    if (!actor) {
      return { success: false, error: 'Backend connection not available. Please refresh and try again.' };
    }
    
    // Check if method exists
    if (typeof actor.updateValentineSnapshot !== 'function') {
      return { success: false, error: 'Backend method not available. Please refresh and try again.' };
    }
    
    // Get write token
    const writeToken = getWriteToken(saveId);
    if (!writeToken) {
      return { success: false, error: 'Write token not found. Cannot update this save.' };
    }
    
    // Validate sizes first
    const validation = validateVideoSizes(videoSlots);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Convert to backend format
    const valentine = await convertToValentine(landingMessage, videoSlots, finalMessage, onProgress);
    
    // Call backend to update snapshot
    const newVersion = await actor.updateValentineSnapshot(
      saveId,
      expectedVersion,
      valentine,
      writeToken
    );
    
    return {
      success: true,
      saveId,
      version: newVersion,
      savedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to update remote save:', error);
    return {
      success: false,
      error: normalizeError(error),
    };
  }
}

// Fetch and restore from remote save
export async function fetchRemoteSave(
  actor: backendInterface | null,
  saveId: string
): Promise<RemoteRestoreResult> {
  try {
    if (!actor) {
      return { success: false, error: 'Backend connection not available. Please refresh and try again.' };
    }
    
    // Check if method exists
    if (typeof actor.getValentineSnapshot !== 'function') {
      return { success: false, error: 'Backend method not available. Please refresh and try again.' };
    }
    
    const snapshot = await actor.getValentineSnapshot(saveId);
    
    if (!snapshot) {
      return { success: false, error: 'Valentine not found. Please check your save link and try again.' };
    }
    
    // Convert from backend format
    const { landingMessage, finalMessage, videoSlots } = await convertFromValentine(snapshot.valentine);
    
    return {
      success: true,
      landingMessage,
      videoSlots,
      finalMessage,
      version: snapshot.version,
      savedAt: Number(snapshot.lastUpdateTimestamp / BigInt(1_000_000)),
    };
  } catch (error) {
    console.error('Failed to fetch remote save:', error);
    return {
      success: false,
      error: normalizeError(error),
    };
  }
}

// Save to global latest (shared-latest mode)
export async function saveGlobalLatest(
  actor: backendInterface | null,
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<RemoteSaveResult> {
  try {
    if (!actor) {
      return { success: false, error: 'Backend connection not available. Please refresh and try again.' };
    }
    
    // Check if method exists
    if (typeof actor.saveGlobalLatest !== 'function') {
      return { success: false, error: 'Backend method not available. Please refresh and try again.' };
    }
    
    // Validate sizes first
    const validation = validateVideoSizes(videoSlots);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Convert to backend format
    const valentine = await convertToValentine(landingMessage, videoSlots, finalMessage, onProgress);
    
    // Call backend to save global latest
    const newVersion = await actor.saveGlobalLatest(valentine);
    
    return {
      success: true,
      saveId: 'global_latest',
      version: newVersion,
      savedAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to save global latest:', error);
    return {
      success: false,
      error: normalizeError(error),
    };
  }
}

// Fetch global latest snapshot
export async function fetchGlobalLatest(
  actor: backendInterface | null
): Promise<RemoteRestoreResult> {
  try {
    if (!actor) {
      return { success: false, error: 'Backend connection not available. Please refresh and try again.' };
    }
    
    // Check if method exists
    if (typeof actor.getGlobalLatest !== 'function') {
      return { success: false, error: 'Backend method not available. Please refresh and try again.' };
    }
    
    const snapshot = await actor.getGlobalLatest();
    
    if (!snapshot) {
      return { success: false, error: 'No saved Valentine found yet.' };
    }
    
    // Convert from backend format
    const { landingMessage, finalMessage, videoSlots } = await convertFromValentine(snapshot.valentine);
    
    return {
      success: true,
      landingMessage,
      videoSlots,
      finalMessage,
      version: snapshot.version,
      savedAt: Number(snapshot.lastUpdateTimestamp / BigInt(1_000_000)),
    };
  } catch (error) {
    console.error('Failed to fetch global latest:', error);
    return {
      success: false,
      error: normalizeError(error),
    };
  }
}

// Get version info for polling (saveId-based)
export async function getSnapshotVersion(
  actor: backendInterface | null,
  saveId: string
): Promise<SnapshotVersionInfo | null> {
  try {
    if (!actor || typeof actor.getValentineSnapshotVersion !== 'function') {
      return null;
    }
    
    const version = await actor.getValentineSnapshotVersion(saveId);
    return {
      version,
      savedAt: Date.now(), // Backend doesn't expose savedAt in version query
    };
  } catch (error) {
    console.error('Failed to get snapshot version:', error);
    return null;
  }
}

// Get version info for polling (global latest)
export async function getGlobalLatestVersion(
  actor: backendInterface | null
): Promise<SnapshotVersionInfo | null> {
  try {
    if (!actor || typeof actor.getGlobalLatestVersion !== 'function') {
      return null;
    }
    
    const version = await actor.getGlobalLatestVersion();
    return {
      version,
      savedAt: Date.now(), // Backend doesn't expose savedAt in version query
    };
  } catch (error) {
    console.error('Failed to get global latest version:', error);
    return null;
  }
}
