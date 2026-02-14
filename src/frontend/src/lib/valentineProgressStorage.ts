// Utility for persisting Valentine's Day progress to browser storage
// Text data goes to localStorage, video Blobs go to IndexedDB

interface VideoSlotData {
  heading: string;
  fileName: string | null;
  fileType: string | null;
}

interface ProgressSnapshot {
  landingMessage: string;
  videoSlots: VideoSlotData[];
  finalMessage: string;
  savedAt: number;
}

const STORAGE_KEY = 'valentine_progress';
const DB_NAME = 'ValentineVideosDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveVideoBlob(index: number, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, `video_${index}`);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function loadVideoBlob(index: number): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(`video_${index}`);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result instanceof Blob ? result : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading video blob:', error);
    return null;
  }
}

async function deleteVideoBlob(index: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(`video_${index}`);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting video blob:', error);
  }
}

// Main save/load functions
export async function saveProgress(
  landingMessage: string,
  videoSlots: Array<{ heading: string; file: File | null }>,
  finalMessage: string
): Promise<void> {
  try {
    // Save text data to localStorage
    const snapshot: ProgressSnapshot = {
      landingMessage,
      videoSlots: videoSlots.map((slot) => ({
        heading: slot.heading,
        fileName: slot.file?.name || null,
        fileType: slot.file?.type || null,
      })),
      finalMessage,
      savedAt: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    
    // Save video blobs to IndexedDB (only if they are File objects, not remote URLs)
    for (let i = 0; i < videoSlots.length; i++) {
      if (videoSlots[i].file) {
        await saveVideoBlob(i, videoSlots[i].file!);
      } else {
        // Clear any previously saved video at this index
        await deleteVideoBlob(i);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please try removing some videos.');
    }
    throw new Error('Failed to save progress. Please try again.');
  }
}

export async function loadProgress(): Promise<{
  landingMessage: string;
  videoSlots: Array<{ heading: string; file: File | null; url: string | null }>;
  finalMessage: string;
  savedAt: number | null;
} | null> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const snapshot: ProgressSnapshot = JSON.parse(stored);
    
    // Load video blobs from IndexedDB and create File objects
    const videoSlots = await Promise.all(
      snapshot.videoSlots.map(async (slotData, index) => {
        if (slotData.fileName && slotData.fileType) {
          const blob = await loadVideoBlob(index);
          if (blob) {
            // Create a File object from the Blob
            const file = new File([blob], slotData.fileName, { type: slotData.fileType });
            const url = URL.createObjectURL(file);
            return { heading: slotData.heading, file, url };
          }
        }
        return { heading: slotData.heading, file: null, url: null };
      })
    );
    
    return {
      landingMessage: snapshot.landingMessage,
      videoSlots,
      finalMessage: snapshot.finalMessage,
      savedAt: snapshot.savedAt,
    };
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Note: We don't clear IndexedDB here to avoid complexity
    // Old videos will be overwritten on next save
  } catch (error) {
    console.error('Error clearing progress:', error);
  }
}
