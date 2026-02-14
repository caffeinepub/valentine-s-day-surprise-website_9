// Remote progress client for Valentine's Day snapshots
// Handles video upload and backend snapshot operations

interface VideoSlot {
  heading: string;
  file: File | null;
  url: string | null;
}

// Inline type definitions matching backend interface
interface ValentineSnapshot {
  landingMessage: string;
  videoSlots: Array<{
    heading: string;
    videoUrl: string | null;
  }>;
  finalMessage: string;
  savedAt: bigint;
}

interface CreateSnapshotResult {
  __kind__: "Ok";
  saveId: string;
  writeToken: string;
}

interface CreateSnapshotError {
  __kind__: "Err";
  message: string;
}

type CreateSnapshotResponse = CreateSnapshotResult | CreateSnapshotError;

interface UpdateSnapshotSuccess {
  __kind__: "Ok";
  savedAt: bigint;
}

interface UpdateSnapshotError {
  __kind__: "Err";
  message: string;
}

type UpdateSnapshotResponse = UpdateSnapshotSuccess | UpdateSnapshotError;

interface FetchSnapshotSuccess {
  __kind__: "Ok";
  snapshot: ValentineSnapshot;
}

interface FetchSnapshotError {
  __kind__: "Err";
  message: string;
}

type FetchSnapshotResponse = FetchSnapshotSuccess | FetchSnapshotError;

// Size limits for video uploads (per video and total)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB per video
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total

interface RemoteSaveResult {
  success: boolean;
  saveId?: string;
  writeToken?: string;
  savedAt?: number;
  error?: string;
}

interface RemoteRestoreResult {
  success: boolean;
  landingMessage?: string;
  videoSlots?: VideoSlot[];
  finalMessage?: string;
  savedAt?: number;
  error?: string;
}

// Local storage for write tokens (scoped by saveId)
const WRITE_TOKEN_PREFIX = 'valentine_write_token_';

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

// Convert videos to base64 data URLs for storage
async function convertVideosToDataUrls(
  videoSlots: VideoSlot[],
  onProgress?: (percentage: number) => void
): Promise<Array<{ heading: string; videoUrl: string | null }>> {
  const results: Array<{ heading: string; videoUrl: string | null }> = [];
  let completedCount = 0;
  const totalVideos = videoSlots.filter(s => s.file).length;
  
  for (const slot of videoSlots) {
    if (slot.file) {
      try {
        // Convert File to base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(slot.file!);
        });
        
        results.push({ heading: slot.heading, videoUrl: dataUrl });
        completedCount++;
        
        if (onProgress && totalVideos > 0) {
          const progress = (completedCount / totalVideos) * 100;
          onProgress(Math.round(progress));
        }
      } catch (error) {
        console.error('Failed to convert video:', error);
        results.push({ heading: slot.heading, videoUrl: null });
      }
    } else {
      results.push({ heading: slot.heading, videoUrl: null });
    }
  }
  
  return results;
}

// Create a new remote save
export async function createRemoteSave(
  actor: any,
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<RemoteSaveResult> {
  try {
    // Validate sizes first
    const validation = validateVideoSizes(videoSlots);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Convert videos to data URLs
    const convertedSlots = await convertVideosToDataUrls(videoSlots, onProgress);
    
    // Create snapshot
    const snapshot: ValentineSnapshot = {
      landingMessage,
      videoSlots: convertedSlots,
      finalMessage,
      savedAt: BigInt(Date.now()),
    };
    
    // Call backend to create snapshot
    const response: CreateSnapshotResponse = await actor.createValentineSnapshot(snapshot);
    
    if (response.__kind__ === 'Ok') {
      const { saveId, writeToken } = response;
      storeWriteToken(saveId, writeToken);
      return {
        success: true,
        saveId,
        writeToken,
        savedAt: Date.now(),
      };
    } else {
      return { success: false, error: response.message };
    }
  } catch (error) {
    console.error('Failed to create remote save:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create remote save',
    };
  }
}

// Update an existing remote save
export async function updateRemoteSave(
  actor: any,
  saveId: string,
  landingMessage: string,
  videoSlots: VideoSlot[],
  finalMessage: string,
  onProgress?: (percentage: number) => void
): Promise<RemoteSaveResult> {
  try {
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
    
    // Convert videos to data URLs
    const convertedSlots = await convertVideosToDataUrls(videoSlots, onProgress);
    
    // Create snapshot
    const snapshot: ValentineSnapshot = {
      landingMessage,
      videoSlots: convertedSlots,
      finalMessage,
      savedAt: BigInt(Date.now()),
    };
    
    // Call backend to update snapshot
    const response: UpdateSnapshotResponse = await actor.updateValentineSnapshot(
      saveId,
      writeToken,
      snapshot
    );
    
    if (response.__kind__ === 'Ok') {
      return {
        success: true,
        saveId,
        savedAt: Number(response.savedAt),
      };
    } else {
      return { success: false, error: response.message };
    }
  } catch (error) {
    console.error('Failed to update remote save:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update remote save',
    };
  }
}

// Fetch and restore from remote save
export async function fetchRemoteSave(
  actor: any,
  saveId: string
): Promise<RemoteRestoreResult> {
  try {
    const response: FetchSnapshotResponse = await actor.fetchValentineSnapshot(saveId);
    
    if (response.__kind__ === 'Ok') {
      const { snapshot } = response;
      
      // Convert data URLs back to VideoSlot format
      const videoSlots: VideoSlot[] = snapshot.videoSlots.map((slot) => ({
        heading: slot.heading,
        file: null, // Remote videos don't have File objects
        url: slot.videoUrl, // Use data URL directly
      }));
      
      return {
        success: true,
        landingMessage: snapshot.landingMessage,
        videoSlots,
        finalMessage: snapshot.finalMessage,
        savedAt: Number(snapshot.savedAt),
      };
    } else {
      return { success: false, error: response.message };
    }
  } catch (error) {
    console.error('Failed to fetch remote save:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch remote save',
    };
  }
}
