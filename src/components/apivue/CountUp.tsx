import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Animates a number from 0 (or previous value) to `value` using
 * requestAnimationFrame. Falls back to the final value immediately
 * when the user prefers reduced motion.
 */
export function CountUp({
  value,
  duration = 900,
  format = true,
  className,
}: {
  value: number;
  duration?: number;
  format?: boolean;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  /* `fromRef` tracks the last *settled* value. Starting at the real `value`
     means the first paint is correct even before the effect runs — numbers
     must never flash 0 when real data is already on screen. */
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current === value ? value : fromRef.current;
    /* Nothing to animate: value unchanged, or first mount already rendered. */
    if (from === value) {
      setDisplay(value);
      return;
    }
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  /* Announce the settled value, not every intermediate frame. */
  const text = format ? Math.round(display).toLocaleString() : String(Math.round(display));
  return <span className={className}>{text}</span>;
}
