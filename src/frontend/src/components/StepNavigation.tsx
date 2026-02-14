import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StepNavigationProps {
  currentStep: 'landing' | 'videos' | 'final';
  onNavigate: (step: 'landing' | 'videos' | 'final') => void;
}

export default function StepNavigation({ currentStep, onNavigate }: StepNavigationProps) {
  const steps = [
    { id: 'landing' as const, label: 'Message' },
    { id: 'videos' as const, label: 'Videos' },
    { id: 'final' as const, label: 'Final' },
  ];

  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => currentIndex > 0 && onNavigate(steps[currentIndex - 1].id)}
        disabled={currentIndex === 0}
        className="gap-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="flex items-center gap-2 px-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(step.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentStep === step.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-white/50 dark:bg-white/10 text-muted-foreground hover:bg-white/70 dark:hover:bg-white/20'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep === step.id
                  ? 'bg-primary-foreground/20'
                  : 'bg-muted-foreground/20'
              }`}>
                {index + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className="w-8 h-0.5 bg-border" />
            )}
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => currentIndex < steps.length - 1 && onNavigate(steps[currentIndex + 1].id)}
        disabled={currentIndex === steps.length - 1}
        className="gap-1"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
