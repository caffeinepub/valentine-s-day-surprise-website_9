import { useState, useEffect, useMemo } from 'react';
import LandingPage from './pages/LandingPage';
import VideosPage from './pages/VideosPage';
import FinalMessagePage from './pages/FinalMessagePage';
import SaveProgressButton from './components/SaveProgressButton';
import { saveProgress, loadProgress } from './lib/valentineProgressStorage';
import { getSaveIdFromURL, setSaveIdInURL, buildShareableLink } from './lib/saveId';
import {
  createRemoteSave,
  updateRemoteSave,
  fetchRemoteSave,
  saveGlobalLatest,
  fetchGlobalLatest,
  validateVideoSizes,
} from './lib/valentineRemoteProgress';
import { useActor } from './hooks/useActor';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useValentineSnapshotPolling } from './hooks/useValentineSnapshotPolling';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Page = 'landing' | 'videos' | 'final';

interface VideoSlot {
  heading: string;
  file: File | null;
  url: string | null;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isLoading, setIsLoading] = useState(true);
  const [remoteRestoreError, setRemoteRestoreError] = useState<string>('');
  
  // Lifted state for all editable content
  const [landingMessage, setLandingMessage] = useState("Happy Valentine's Day, [Name]!");
  const [videoSlots, setVideoSlots] = useState<VideoSlot[]>([
    { heading: 'Our First Memory', file: null, url: null },
    { heading: 'A Special Moment', file: null, url: null },
    { heading: 'Forever Together', file: null, url: null },
  ]);
  const [finalMessage, setFinalMessage] = useState(
    "You are the love of my life. Happy Valentine's Day! ❤️"
  );
  
  // Save status tracking
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  // Remote snapshot tracking
  const [currentVersion, setCurrentVersion] = useState<bigint | undefined>(undefined);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [isGlobalLatestMode, setIsGlobalLatestMode] = useState(false);
  const [initialContentLoaded, setInitialContentLoaded] = useState(false);
  
  // Track unsaved changes for polling
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { actor, isFetching } = useActor();
  const { identity, login } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();

  // Detect unsaved changes
  useEffect(() => {
    if (initialContentLoaded) {
      setHasUnsavedChanges(true);
    }
  }, [landingMessage, videoSlots, finalMessage, initialContentLoaded]);

  // Polling for remote updates
  const { hasNewerVersion, newerVersion, clearNotification } = useValentineSnapshotPolling({
    saveId: activeSaveId || undefined,
    isGlobalLatest: isGlobalLatestMode,
    currentVersion,
    hasUnsavedChanges,
    enabled: !isLoading && (!!activeSaveId || isGlobalLatestMode),
  });

  // Load saved progress on mount (remote first, then local fallback)
  useEffect(() => {
    const loadSavedProgress = async () => {
      const saveId = getSaveIdFromURL();
      
      // Try remote restore first if saveId exists
      if (saveId && actor && !isFetching) {
        setActiveSaveId(saveId);
        setIsGlobalLatestMode(false);
        
        try {
          const result = await fetchRemoteSave(actor, saveId);
          
          if (result.success && result.landingMessage && result.videoSlots && result.finalMessage) {
            setLandingMessage(result.landingMessage);
            setVideoSlots(result.videoSlots);
            setFinalMessage(result.finalMessage);
            setLastSavedAt(result.savedAt || null);
            setCurrentVersion(result.version);
            setShareableLink(buildShareableLink(saveId));
            setInitialContentLoaded(true);
            setHasUnsavedChanges(false);
            setIsLoading(false);
            return;
          } else {
            // Remote restore failed, show error but continue
            setRemoteRestoreError(
              result.error || 'Failed to load saved content from link. Loading local backup...'
            );
          }
        } catch (error) {
          console.error('Remote restore error:', error);
          setRemoteRestoreError('Failed to load saved content from link. Loading local backup...');
        }
      }
      
      // Try global latest if no saveId
      if (!saveId && actor && !isFetching) {
        setIsGlobalLatestMode(true);
        setActiveSaveId(null);
        
        try {
          const result = await fetchGlobalLatest(actor);
          
          if (result.success && result.landingMessage && result.videoSlots && result.finalMessage) {
            setLandingMessage(result.landingMessage);
            setVideoSlots(result.videoSlots);
            setFinalMessage(result.finalMessage);
            setLastSavedAt(result.savedAt || null);
            setCurrentVersion(result.version);
            setInitialContentLoaded(true);
            setHasUnsavedChanges(false);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Global latest restore error:', error);
        }
      }
      
      // Fall back to local restore
      try {
        const saved = await loadProgress();
        if (saved) {
          setLandingMessage(saved.landingMessage);
          setVideoSlots(saved.videoSlots);
          setFinalMessage(saved.finalMessage);
          setLastSavedAt(saved.savedAt);
        }
        setInitialContentLoaded(true);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Error loading saved progress:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isFetching) {
      loadSavedProgress();
    }
  }, [actor, isFetching]);

  // Cleanup video URLs on unmount (only revoke object URLs, not remote URLs)
  useEffect(() => {
    return () => {
      videoSlots.forEach((slot) => {
        if (slot.url && slot.url.startsWith('blob:')) {
          URL.revokeObjectURL(slot.url);
        }
      });
    };
  }, []);

  const navigateToVideos = () => setCurrentPage('videos');
  const navigateToFinal = () => setCurrentPage('final');

  const handleReloadNewerVersion = async () => {
    clearNotification();
    setIsLoading(true);
    
    try {
      let result;
      
      if (isGlobalLatestMode) {
        result = await fetchGlobalLatest(actor);
      } else if (activeSaveId) {
        result = await fetchRemoteSave(actor, activeSaveId);
      }
      
      if (result && result.success && result.landingMessage && result.videoSlots && result.finalMessage) {
        setLandingMessage(result.landingMessage);
        setVideoSlots(result.videoSlots);
        setFinalMessage(result.finalMessage);
        setLastSavedAt(result.savedAt || null);
        setCurrentVersion(result.version);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to reload newer version:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Check authentication first
    if (!isAuthenticated) {
      setSaveStatus('error');
      setSaveErrorMessage('Please log in to save your Valentine.');
      
      // Optionally trigger login
      setTimeout(() => {
        login();
      }, 1000);
      
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveErrorMessage('');
      }, 5000);
      return;
    }
    
    setSaveStatus('saving');
    setSaveErrorMessage('');
    setUploadProgress(0);
    
    try {
      // Validate video sizes before attempting save
      const validation = validateVideoSizes(videoSlots);
      if (!validation.valid) {
        setSaveStatus('error');
        setSaveErrorMessage(validation.error || 'Video size validation failed');
        setTimeout(() => {
          setSaveStatus('idle');
          setSaveErrorMessage('');
        }, 5000);
        return;
      }
      
      if (!actor) {
        throw new Error('Backend connection not available');
      }
      
      // Remote save (create, update, or global latest)
      let result;
      
      if (isGlobalLatestMode) {
        // Save to global latest
        result = await saveGlobalLatest(
          actor,
          landingMessage,
          videoSlots,
          finalMessage,
          setUploadProgress
        );
      } else if (activeSaveId) {
        // Update existing save
        result = await updateRemoteSave(
          actor,
          activeSaveId,
          currentVersion || BigInt(1),
          landingMessage,
          videoSlots,
          finalMessage,
          setUploadProgress
        );
      } else {
        // Create new save
        result = await createRemoteSave(
          actor,
          landingMessage,
          videoSlots,
          finalMessage,
          setUploadProgress
        );
        
        if (result.success && result.saveId) {
          setActiveSaveId(result.saveId);
          setSaveIdInURL(result.saveId);
          setShareableLink(buildShareableLink(result.saveId));
          setIsGlobalLatestMode(false);
        }
      }
      
      if (result.success) {
        setSaveStatus('saved');
        setLastSavedAt(result.savedAt || Date.now());
        setCurrentVersion(result.version);
        setHasUnsavedChanges(false);
        
        // Also save locally as fallback
        try {
          await saveProgress(landingMessage, videoSlots, finalMessage);
        } catch (localError) {
          console.error('Local save failed:', localError);
        }
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error) {
      setSaveStatus('error');
      setSaveErrorMessage(error instanceof Error ? error.message : 'Failed to save progress');
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveErrorMessage('');
      }, 5000);
    }
  };

  const handleVideoSlotChange = (index: number, updates: Partial<VideoSlot>) => {
    setVideoSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot))
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 dark:from-pink-950 dark:via-rose-950 dark:to-red-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg text-muted-foreground">Loading your Valentine's surprise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Remote restore error message */}
      {remoteRestoreError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
          <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{remoteRestoreError}</p>
            </div>
            <button
              onClick={() => setRemoteRestoreError('')}
              className="mt-2 text-xs text-destructive/70 hover:text-destructive underline mx-auto block"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
      {/* Newer version notification */}
      {hasNewerVersion && !hasUnsavedChanges && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md">
          <div className="bg-blue-50 dark:bg-blue-950 border-2 border-blue-500/50 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                  Newer content available
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  This Valentine has been updated. Reload to see the latest version.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleReloadNewerVersion}
                className="flex-1"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reload
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearNotification}
                className="flex-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Save button - fixed position, visible on all pages */}
      <div className="fixed top-8 right-8 z-50">
        <SaveProgressButton
          onSave={handleSave}
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          errorMessage={saveErrorMessage}
          shareableLink={shareableLink}
          uploadProgress={uploadProgress}
          isAuthenticated={isAuthenticated}
          onLogin={login}
          isGlobalLatestMode={isGlobalLatestMode}
          onToggleGlobalLatest={(enabled) => {
            if (enabled) {
              setIsGlobalLatestMode(true);
              setActiveSaveId(null);
              setShareableLink('');
            } else {
              setIsGlobalLatestMode(false);
            }
          }}
        />
      </div>

      {currentPage === 'landing' && (
        <LandingPage
          message={landingMessage}
          onMessageChange={setLandingMessage}
          onNext={navigateToVideos}
        />
      )}
      {currentPage === 'videos' && (
        <VideosPage
          videoSlots={videoSlots}
          onVideoSlotChange={handleVideoSlotChange}
          onNext={navigateToFinal}
        />
      )}
      {currentPage === 'final' && (
        <FinalMessagePage
          message={finalMessage}
          onMessageChange={setFinalMessage}
        />
      )}
    </div>
  );
}

export default App;
