import { useState, useEffect, useRef } from 'react';

const SLIDES = [
  {
    src: '/img/slide-service.jpg',
    alt: "UpesiTech - Nous sommes à votre service. Chez nous, c'est la qualité.",
  },
  {
    src: '/img/slide-collab.jpg',
    alt: "UpesiTech - Nous sommes ouverts aux collaborations.",
  },
  {
    src: '/img/slide-jobs.jpg',
    alt: "UpesiTech - Les meilleures offres d'emploi sont sur UpesiTech.",
  },
];

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setIndex((i) => (i === 0 ? SLIDES.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === SLIDES.length - 1 ? 0 : i + 1));

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i === SLIDES.length - 1 ? 0 : i + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="hero-slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label="Affiches et actualités UpesiTech"
    >
      <div className="hero-slider-track">
        {SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            className={`hero-slider-slide ${i === index ? 'active' : ''}`}
            aria-hidden={i !== index}
          >
            <img src={slide.src} alt={slide.alt} loading={i === 0 ? 'eager' : 'lazy'} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="hero-slider-nav prev"
        onClick={prev}
        aria-label="Affiche précédente"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        className="hero-slider-nav next"
        onClick={next}
        aria-label="Affiche suivante"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="hero-slider-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`hero-slider-dot ${i === index ? 'active' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Aller à l'affiche ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
