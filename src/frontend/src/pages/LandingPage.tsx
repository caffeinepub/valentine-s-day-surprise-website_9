import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  message: string;
  onMessageChange: (message: string) => void;
  onNext: () => void;
}

export default function LandingPage({ message, onMessageChange, onNext }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 dark:from-pink-950 dark:via-rose-950 dark:to-red-950 relative overflow-hidden">
      {/* Decorative hearts */}
      <div className="absolute top-10 left-10 text-primary/20 animate-float">
        <Heart className="w-16 h-16 fill-current" />
      </div>
      <div className="absolute top-32 right-20 text-primary/15 animate-float-delayed">
        <Heart className="w-12 h-12 fill-current" />
      </div>
      <div className="absolute bottom-32 left-1/4 text-primary/10 animate-float">
        <Heart className="w-20 h-20 fill-current" />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col items-center justify-center min-h-screen relative z-10">
        <div className="max-w-3xl w-full space-y-8 text-center">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <Heart className="w-20 h-20 md:w-24 md:h-24 text-primary fill-current animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary tracking-tight">
              Valentine's Day
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              A special surprise just for you
            </p>
          </div>

          {/* Editable message section */}
          <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-xl border-2 border-primary/20 space-y-6">
            <div className="space-y-3">
              <label htmlFor="message" className="block text-sm font-medium text-muted-foreground">
                Customize your message:
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                className="min-h-[100px] text-lg resize-none bg-background/50 border-2 border-primary/30 focus:border-primary rounded-xl"
                placeholder="Enter your Valentine's message..."
              />
            </div>

            {/* Display message */}
            <div className="pt-6 border-t-2 border-primary/10">
              <p className="text-2xl md:text-4xl font-semibold text-primary leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed navigation button - lower right */}
      <Button
        onClick={onNext}
        size="lg"
        className="fixed bottom-8 right-8 rounded-full w-16 h-16 md:w-20 md:h-20 shadow-2xl hover:scale-110 transition-smooth bg-primary hover:bg-primary/90 z-20"
        aria-label="Next page"
      >
        <ArrowRight className="w-8 h-8 md:w-10 md:h-10" />
      </Button>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-sm text-muted-foreground z-10">
        <p>
          Built with <Heart className="inline w-4 h-4 fill-current text-primary" /> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
