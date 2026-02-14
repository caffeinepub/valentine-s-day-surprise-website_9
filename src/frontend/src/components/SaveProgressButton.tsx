import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle, Share2, Copy, LogIn } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SaveProgressButtonProps {
  onSave: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  errorMessage?: string;
  shareableLink?: string;
  uploadProgress?: number;
  isAuthenticated: boolean;
  onLogin: () => void;
  isGlobalLatestMode: boolean;
  onToggleGlobalLatest: (enabled: boolean) => void;
}

export default function SaveProgressButton({
  onSave,
  status,
  lastSavedAt,
  errorMessage,
  shareableLink,
  uploadProgress = 0,
  isAuthenticated,
  onLogin,
  isGlobalLatestMode,
  onToggleGlobalLatest,
}: SaveProgressButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleCopy = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  const getButtonText = () => {
    if (!isAuthenticated) return 'Login to Save';
    if (status === 'saving') return 'Saving...';
    if (status === 'saved') return 'Saved!';
    if (status === 'error') return 'Save Failed';
    return 'Save Progress';
  };

  const getButtonIcon = () => {
    if (!isAuthenticated) return <LogIn className="w-4 h-4" />;
    if (status === 'saving') return null;
    if (status === 'saved') return <Check className="w-4 h-4" />;
    if (status === 'error') return <AlertCircle className="w-4 h-4" />;
    return <Save className="w-4 h-4" />;
  };

  const getButtonVariant = () => {
    if (!isAuthenticated) return 'secondary';
    if (status === 'error') return 'destructive';
    return 'default';
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      onLogin();
    } else {
      onSave();
    }
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const now = Date.now();
    const diff = now - lastSavedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault();
                handleButtonClick();
              } else {
                setIsPopoverOpen(true);
              }
            }}
            disabled={status === 'saving'}
            variant={getButtonVariant()}
            className="gap-2 shadow-lg"
          >
            {getButtonIcon()}
            {getButtonText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Save Options</h4>
              
              {/* Global Latest Toggle */}
              {!shareableLink && (
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md mb-3">
                  <div className="flex-1">
                    <Label htmlFor="global-latest" className="text-sm font-medium cursor-pointer">
                      Save as shared latest
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Anyone can see this version
                    </p>
                  </div>
                  <Switch
                    id="global-latest"
                    checked={isGlobalLatestMode}
                    onCheckedChange={onToggleGlobalLatest}
                  />
                </div>
              )}
              
              <Button
                onClick={() => {
                  handleButtonClick();
                  setIsPopoverOpen(false);
                }}
                disabled={status === 'saving'}
                className="w-full"
              >
                {getButtonIcon()}
                <span className="ml-2">{getButtonText()}</span>
              </Button>
            </div>

            {/* Upload Progress */}
            {status === 'saving' && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {status === 'error' && errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Last Saved */}
            {lastSavedAt && status !== 'error' && (
              <p className="text-xs text-muted-foreground text-center">
                Last saved {formatLastSaved()}
              </p>
            )}

            {/* Shareable Link */}
            {shareableLink && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Share this Valentine</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={shareableLink}
                    readOnly
                    className="text-xs"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view your Valentine
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
