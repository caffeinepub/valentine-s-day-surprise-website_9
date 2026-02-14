import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import ValentineLayout from '@/components/ValentineLayout';

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
  return (
    <ValentineLayout showHearts={false}>
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
              Featured Videos
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Customize the titles for your special video memories
            </p>
          </div>

          {/* Video Grid */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {videoSlots.map((slot, index) => (
              <div key={index} className="glass-card rounded-xl p-4 sm:p-6 shadow-lg flex flex-col">
                {/* Video Player */}
                <div className="video-container mb-4 bg-black/10 dark:bg-black/30 rounded-lg overflow-hidden group">
                  {slot.url ? (
                    <video
                      src={slot.url}
                      controls
                      className="absolute inset-0 w-full h-full object-cover"
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Heading Input */}
                <div className="space-y-2">
                  <Label htmlFor={`video-heading-${index}`} className="text-sm font-medium">
                    Video Title
                  </Label>
                  <Input
                    id={`video-heading-${index}`}
                    value={slot.heading}
                    onChange={(e) => onVideoSlotChange(index, { heading: e.target.value })}
                    placeholder={`Video ${index + 1} title`}
                    className="bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={onNext}
              size="lg"
              className="text-base sm:text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Continue to Final Message
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </ValentineLayout>
  );
}
