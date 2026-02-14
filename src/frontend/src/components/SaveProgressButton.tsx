import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, Check, AlertCircle, Share2, Copy } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface SaveProgressButtonProps {
  onSave: () => void;
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  errorMessage?: string;
  shareableLink?: string;
  uploadProgress?: number;
}

export default function SaveProgressButton({
  onSave,
  status,
  lastSavedAt,
  errorMessage,
  shareableLink,
  uploadProgress = 0,
}: SaveProgressButtonProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopyLink = async () => {
    if (shareableLink) {
      try {
        await navigator.clipboard.writeText(shareableLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={onSave}
          disabled={status === 'saving'}
          size="lg"
          className="rounded-full px-6 py-6 shadow-xl hover:scale-105 transition-smooth bg-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {status === 'saving' ? (
            <>
              <Save className="w-5 h-5 mr-2 animate-pulse" />
              Saving...
            </>
          ) : status === 'saved' ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Saved
            </>
          ) : status === 'error' ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2" />
              Save Failed
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Progress
            </>
          )}
        </Button>
        
        {shareableLink && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-6 py-6 shadow-xl hover:scale-105 transition-smooth"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Share Your Valentine</h4>
                <p className="text-xs text-muted-foreground">
                  Copy this link to share your Valentine's message. Anyone with this link can view it.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={shareableLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copySuccess ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {status === 'saving' && uploadProgress > 0 && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}
      
      {status === 'saved' && lastSavedAt && (
        <p className="text-xs text-muted-foreground">
          Last saved at {formatTime(lastSavedAt)}
        </p>
      )}
      
      {status === 'error' && errorMessage && (
        <p className="text-xs text-destructive max-w-xs text-center break-words">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
