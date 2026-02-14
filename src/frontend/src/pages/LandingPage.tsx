import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Heart, ArrowRight } from 'lucide-react';
import ValentineLayout from '@/components/ValentineLayout';

interface LandingPageProps {
  message: string;
  onMessageChange: (message: string) => void;
  onNext: () => void;
}

export default function LandingPage({ message, onMessageChange, onNext }: LandingPageProps) {
  return (
    <ValentineLayout>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-2xl">
          <div className="glass-card rounded-2xl p-6 sm:p-8 lg:p-12 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Heart className="w-8 h-8 text-primary fill-current" />
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3">
                Happy Valentine's Day
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Share your heartfelt message with someone special
              </p>
            </div>

            {/* Message Input */}
            <div className="space-y-4 mb-8">
              <label className="block text-sm font-medium text-foreground">
                Your Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="Write your Valentine's message here..."
                className="min-h-[200px] text-base sm:text-lg resize-none bg-white/50 dark:bg-black/20 border-2 focus:border-primary transition-colors"
              />
            </div>

            {/* Action Button */}
            <Button
              onClick={onNext}
              size="lg"
              className="w-full text-base sm:text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Continue to Videos
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </ValentineLayout>
  );
}
