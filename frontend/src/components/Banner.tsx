import { useEffect, useRef, useState, type ReactNode } from 'react';
import Reveal from './Reveal';

export default function Banner({
  variant,
  title,
  children,
  extra = '',
}: {
  variant: string;
  title: string;
  children: ReactNode;
  extra?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth <= 820) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const el = ref.current;
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
              const diff = (rect.top - window.innerHeight / 2) * 0.06;
              const clamped = Math.max(-15, Math.min(15, diff));
              setOffsetY(clamped);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bgPosStyle = offsetY !== 0 ? { backgroundPositionY: `calc(50% + ${offsetY}px)` } : undefined;

  return (
    <Reveal>
      <div ref={ref} className={`banner ${variant} ${extra}`.trim()} style={bgPosStyle}>
        <h2>{title}</h2>
        <p className="lead">{children}</p>
      </div>
    </Reveal>
  );
}
