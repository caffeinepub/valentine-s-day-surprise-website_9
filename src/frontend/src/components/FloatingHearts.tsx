import { Heart } from 'lucide-react';

export default function FloatingHearts() {
  const hearts = [
    { size: 'w-10 h-10', position: 'top-[10%] left-[8%]', animation: 'animate-float', delay: '0s', opacity: 'opacity-50' },
    { size: 'w-14 h-14', position: 'top-[25%] right-[12%]', animation: 'animate-float-delayed', delay: '1s', opacity: 'opacity-40' },
    { size: 'w-8 h-8', position: 'top-[45%] left-[5%]', animation: 'animate-float', delay: '2s', opacity: 'opacity-30' },
    { size: 'w-12 h-12', position: 'top-[60%] right-[8%]', animation: 'animate-float-delayed', delay: '0.5s', opacity: 'opacity-45' },
    { size: 'w-10 h-10', position: 'bottom-[15%] left-[15%]', animation: 'animate-float', delay: '1.5s', opacity: 'opacity-35' },
    { size: 'w-14 h-14', position: 'bottom-[25%] right-[18%]', animation: 'animate-float-delayed', delay: '2.5s', opacity: 'opacity-50' },
    { size: 'w-8 h-8', position: 'top-[35%] left-[20%]', animation: 'animate-float', delay: '3s', opacity: 'opacity-25' },
    { size: 'w-12 h-12', position: 'top-[70%] right-[25%]', animation: 'animate-float-delayed', delay: '1.8s', opacity: 'opacity-40' },
  ];

  return (
    <>
      {hearts.map((heart, index) => (
        <div
          key={index}
          className={`absolute ${heart.position} ${heart.animation} ${heart.opacity} pointer-events-none`}
          style={{ animationDelay: heart.delay }}
        >
          <Heart className={`${heart.size} text-primary/30 fill-current`} />
        </div>
      ))}
    </>
  );
}
