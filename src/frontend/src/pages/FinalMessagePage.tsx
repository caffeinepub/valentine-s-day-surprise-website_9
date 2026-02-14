import { Textarea } from '@/components/ui/textarea';
import { Heart } from 'lucide-react';
import FloatingHearts from '@/components/FloatingHearts';

interface FinalMessagePageProps {
  message: string;
  onMessageChange: (message: string) => void;
}

export default function FinalMessagePage({ message, onMessageChange }: FinalMessagePageProps) {
  return (
    <div className="min-h-screen romantic-vibrant-bg relative overflow-hidden flex items-center justify-center p-4">
      {/* Floating hearts around the box */}
      <FloatingHearts />

      {/* Central dark pink box */}
      <div className="relative z-10 w-full max-w-2xl">
        <div className="romantic-dark-bg rounded-3xl p-8 md:p-12 shadow-2xl border-4 border-white/20 backdrop-blur-sm space-y-6">
          {/* Heart icon */}
          <div className="flex justify-center">
            <Heart className="w-16 h-16 md:w-20 md:h-20 text-white fill-current animate-pulse" />
          </div>

          {/* Editable message */}
          <div className="space-y-4">
            <label htmlFor="final-message" className="block text-sm font-medium text-white/80 text-center">
              Your Final Message:
            </label>
            <Textarea
              id="final-message"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              className="min-h-[120px] text-lg resize-none bg-white/10 border-2 border-white/30 focus:border-white/60 rounded-2xl text-white placeholder:text-white/50"
              placeholder="Write your heartfelt message..."
            />
          </div>

          {/* Display message */}
          <div className="pt-6 border-t-2 border-white/20">
            <p className="text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center leading-relaxed">
              {message}
            </p>
          </div>

          {/* Decorative hearts */}
          <div className="flex justify-center gap-4 pt-4">
            <Heart className="w-6 h-6 text-white/60 fill-current" />
            <Heart className="w-8 h-8 text-white fill-current" />
            <Heart className="w-6 h-6 text-white/60 fill-current" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/70 z-10">
        <p>
          Built with <Heart className="inline w-4 h-4 fill-current text-white" /> using{' '}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
