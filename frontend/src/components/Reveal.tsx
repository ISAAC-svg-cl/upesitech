import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  cascade?: boolean;
  stagger?: number;
  as?: 'div' | 'section';
};

export default function Reveal({
  children,
  className = '',
  delay = 0,
  cascade = false,
  stagger = 75,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties = {
    ...(delay > 0 ? { transitionDelay: `${delay}ms` } : {}),
    ...(cascade ? ({ '--stagger-step': `${stagger}ms` } as CSSProperties) : {}),
  };

  return (
    <Tag
      ref={ref}
      className={`reveal ${cascade ? 'reveal-cascade' : ''} ${revealed ? 'revealed' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}
