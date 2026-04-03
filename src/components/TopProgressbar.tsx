import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface ProgressBarProps {
  height?:   number;
  duration?: number;
  color?:    string;
}

const TopProgressBar: React.FC<ProgressBarProps> = ({
  height   = 3,
  duration = 500,
  color    = '#16a34a',
}) => {
  const location                = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(false);
  const [done,     setDone]     = useState(false);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    [timerRef, completeRef, fadeRef].forEach(r => {
      if (r.current) clearTimeout(r.current);
    });
  };

  useEffect(() => {
    clear();
    setDone(false);
    setVisible(true);
    setProgress(0);

    const steps    = 12;
    const interval = duration / steps;
    let   current  = 0;

    const tick = () => {
      current += 1;
      const pct = Math.min(88, Math.round(current * 7.5));
      setProgress(pct);
      if (current < steps) timerRef.current = setTimeout(tick, interval);
    };

    timerRef.current = setTimeout(tick, 50);

    completeRef.current = setTimeout(() => {
      setProgress(100);
      setDone(true);
      fadeRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setDone(false);
      }, 500);
    }, duration + 80);

    return clear;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <>
      <style>{`@keyframes pgPulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      <div
        aria-hidden="true"
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          right:         0,
          zIndex:        9999,
          height:        `${height}px`,
          pointerEvents: 'none',
        }}
      >
        {/* Bar fill */}
        <div style={{
          height:     '100%',
          width:      `${progress}%`,
          background: color,
          transition: done
            ? 'width .2s ease, opacity .4s ease .1s'
            : 'width .3s cubic-bezier(.4,0,.2,1)',
          opacity:      done ? 0 : 1,
          borderRadius: '0 2px 2px 0',
          boxShadow:    `0 0 8px ${color}bb`,
        }} />

        {/* Leading-edge glow pulse */}
        {!done && progress > 2 && (
          <div style={{
            position:   'absolute',
            top:        0,
            left:       `${Math.max(0, progress - 4)}%`,
            width:      '60px',
            height:     '100%',
            background: `linear-gradient(to right, transparent, ${color}, transparent)`,
            animation:  'pgPulse 1s ease-in-out infinite',
          }} />
        )}
      </div>
    </>
  );
};

export default TopProgressBar;