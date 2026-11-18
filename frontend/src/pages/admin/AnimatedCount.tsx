import { useEffect, useState } from 'react';

type AnimatedCountProps = {
  value: number;
  duration?: number;
};

export default function AnimatedCount({ value, duration = 600 }: AnimatedCountProps) {
  const [count, setCount] = useState<number>(() => (value === 0 ? 0 : 0));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(value);
      return;
    }

    if (value === 0) {
      setCount(0);
      return;
    }

    let animId: number;
    const startTime = performance.now();
    const startVal = 0;
    const diff = value - startVal;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Courbe easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(startVal + diff * ease));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return <>{count}</>;
}
