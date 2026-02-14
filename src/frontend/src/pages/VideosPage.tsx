import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Upload, ArrowRight } from 'lucide-react';

interface VideoSlot {
  heading: string;
  file: File | null;
  url: string | null;
}

interface VideosPageProps {
  videoSlots: VideoSlot[];
  onVideoSlotChange: (index: number, updates: Partial<VideoSlot>) => void;
  onNext: () => void;
}

export default function VideosPage({ videoSlots, onVideoSlotChange, onNext }: VideosPageProps) {
  const handleHeadingChange = (index: number, value: string) => {
    onVideoSlotChange(index, { heading: value });
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (file) {
      // Revoke previous URL if it's a blob URL (not a remote URL)
      if (videoSlots[index].url && videoSlots[index].url!.startsWith('blob:')) {
        URL.revokeObjectURL(videoSlots[index].url!);
      }
      const url = URL.createObjectURL(file);
      onVideoSlotChange(index, { file, url });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 dark:from-pink-950 dark:via-rose-950 dark:to-red-950 relative overflow-hidden">
      {/* Decorative hearts */}
      <div className="absolute top-20 right-10 text-primary/15 animate-float">
        <Heart className="w-14 h-14 fill-current" />
      </div>
      <div className="absolute bottom-40 left-10 text-primary/10 animate-float-delayed">
        <Heart className="w-16 h-16 fill-current" />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Heart className="w-16 h-16 text-primary fill-current" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-primary">
              Our Special Moments
            </h1>
            <p className="text-lg text-muted-foreground">
              Share three videos that capture our love story
            </p>
          </div>

          {/* Video slots */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {videoSlots.map((video, index) => (
              <div
                key={index}
                className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-primary/20 space-y-4 transition-smooth hover:shadow-2xl hover:border-primary/40"
              >
                {/* Heading input */}
                <div className="space-y-2">
                  <Label htmlFor={`heading-${index}`} className="text-sm font-medium">
                    Video {index + 1} Title
                  </Label>
                  <Input
                    id={`heading-${index}`}
                    value={video.heading}
                    onChange={(e) => handleHeadingChange(index, e.target.value)}
                    className="text-lg font-semibold bg-background/50 border-2 border-primary/30 focus:border-primary rounded-lg"
                    placeholder={`Video ${index + 1} title...`}
                  />
                </div>

                {/* Display heading */}
                <h3 className="text-xl font-bold text-primary text-center py-2">
                  {video.heading}
                </h3>

                {/* Video upload and display */}
                <div className="space-y-3">
                  <Label
                    htmlFor={`video-${index}`}
                    className="flex items-center justify-center gap-2 cursor-pointer bg-primary/10 hover:bg-primary/20 border-2 border-dashed border-primary/40 rounded-xl p-4 transition-smooth"
                  >
                    <Upload className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      {video.file ? 'Change Video' : 'Upload Video'}
                    </span>
                  </Label>
                  <input
                    id={`video-${index}`}
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                    className="hidden"
                  />

                  {/* Video player */}
                  {video.url && (
                    <div className="rounded-xl overflow-hidden border-2 border-primary/30 bg-black">
                      <video
                        src={video.url}
                        controls
                        className="w-full aspect-video"
                        preload="metadata"
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}

                  {!video.url && (
                    <div className="aspect-video bg-muted/30 rounded-xl flex items-center justify-center border-2 border-dashed border-primary/20">
                      <div className="text-center space-y-2">
                        <Heart className="w-12 h-12 text-primary/40 mx-auto" />
                        <p className="text-sm text-muted-foreground">No video uploaded</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Navigation button */}
          <div className="flex justify-center pt-8">
            <Button
              onClick={onNext}
              size="lg"
              className="rounded-full px-8 py-6 text-lg shadow-xl hover:scale-105 transition-smooth bg-primary hover:bg-primary/90"
            >
              Continue to Final Message
              <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
        <p>
          Built with <Heart className="inline w-4 h-4 fill-current text-primary" /> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
              window.location.hostname
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline"
          >
            caffeine.ai
          </a>
        </p>
        <p className="mt-1 text-xs">© {new Date().getFullYear()} All rights reserved</p>
      </footer>
    </div>
  );
}
