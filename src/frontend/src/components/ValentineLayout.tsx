import { ReactNode } from 'react';
import FloatingHearts from './FloatingHearts';

interface ValentineLayoutProps {
  children: ReactNode;
  showHearts?: boolean;
}

export default function ValentineLayout({ children, showHearts = true }: ValentineLayoutProps) {
  return (
    <div className="min-h-screen gradient-romantic relative overflow-hidden">
      {showHearts && <FloatingHearts />}
      <div className="relative z-10 min-h-screen flex flex-col">
        {children}
      </div>
    </div>
  );
}
