import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import VideosPage from './pages/VideosPage';
import FinalMessagePage from './pages/FinalMessagePage';
import SaveProgressButton from './components/SaveProgressButton';
import StepNavigation from './components/StepNavigation';
import { saveProgress, loadProgress } from './lib/valentineProgressStorage';
import { getSaveIdFromURL, setSaveIdInURL, buildShareableLink, removeSaveIdFromURL } from './lib/saveId';
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
  // Initial fallback default used only when no remote saveId, global-latest, or local saved progress is available
  const [landingMessage, setLandingMessage] = useState("Happy Valentine's Day, Apshara!");
  
  // Initial fallback defaults for video slots (headings only; URLs remain unchanged)
  // These values are used only before restore/hydration from remote or local storage
  const [videoSlots, setVideoSlots] = useState<VideoSlot[]>([
    { 
      heading: '🤭', 
      file: null, 
      url: 'https://image2url.com/r2/default/videos/1771095915401-63c93159-e8fd-4bbb-b597-ec2f0c851aae.mp4' 
    },
    { 
      heading: '🤐', 
      file: null, 
      url: 'https://image2url.com/r2/default/videos/1771096125343-9f368017-cf72-4a89-a32a-82afbda31671.mp4' 
    },
    { 
      heading: 'Am I in Love with You? Definitely', 
      file: null, 
      url: 'https://image2url.com/r2/default/videos/1771096462549-283a08bb-3e21-4aed-bedc-66811ea1f837.mp4' 
    },
  ]);
  
  // Initial fallback default for final message used only before restore/hydration
  const [finalMessage, setFinalMessage] = useState(
    "Happy Valentine's Day, Flora. I've been feeling terrible about last night, and I'm so sorry for how I acted. You deserve to be treated with nothing but love, especially today. I'm incredibly lucky to have you, and I'd love to make it up to you and focus on us. I love you\nthis alr?\n"
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

  const handleToggleGlobalLatest = (enabled: boolean) => {
    setIsGlobalLatestMode(enabled);
    if (enabled) {
      // Switching to global latest mode
      setActiveSaveId(null);
      removeSaveIdFromURL();
      setShareableLink('');
    }
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-romantic flex items-center justify-center">
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="glass-card rounded-lg p-4 flex items-start gap-3 shadow-lg border-2 border-destructive/50">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-destructive">{remoteRestoreError}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRemoteRestoreError('')}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Newer version notification */}
      {hasNewerVersion && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="glass-card rounded-lg p-4 flex items-start gap-3 shadow-lg border-2 border-primary/50">
            <RefreshCw className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-primary">
                A newer version is available (v{newerVersion?.toString()})
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReloadNewerVersion}
                  className="text-xs"
                >
                  Reload
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearNotification}
                  className="text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button - fixed position */}
      <div className="fixed top-4 right-4 z-40">
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
          onToggleGlobalLatest={handleToggleGlobalLatest}
        />
      </div>

      {/* Step Navigation */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40">
        <StepNavigation currentStep={currentPage} onNavigate={handleNavigate} />
      </div>

      {/* Page content */}
      {currentPage === 'landing' && (
        <LandingPage
          message={landingMessage}
          onMessageChange={setLandingMessage}
          onNext={() => setCurrentPage('videos')}
        />
      )}

      {currentPage === 'videos' && (
        <VideosPage
          videoSlots={videoSlots}
          onVideoSlotChange={handleVideoSlotChange}
          onNext={() => setCurrentPage('final')}
        />
      )}

      {currentPage === 'final' && (
        <FinalMessagePage
          message={finalMessage}
          onMessageChange={setFinalMessage}
          onBackToStart={() => setCurrentPage('landing')}
        />
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 py-4 text-center text-sm text-muted-foreground bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
        <p>
          © {new Date().getFullYear()} · Built with ❤️ using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
