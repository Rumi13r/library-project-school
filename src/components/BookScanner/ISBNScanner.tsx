import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';

interface ISBNScannerProps {
  onDetected: (isbn: string) => void;
  onClose:    () => void;
}

// Уникален ID за CSS скоупинг — предотвратява конфликти
const SCANNER_ID = 'isbn-scanner-viewport';

const ISBNScanner: React.FC<ISBNScannerProps> = ({ onDetected, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const detectedRef  = useRef(false);

  const [ready,   setReady]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [flashed, setFlashed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints: {
            facingMode: 'environment',
            width:      { ideal: 1280 },
            height:     { ideal: 720 },
          },
        },
        locator:      { patchSize: 'medium', halfSample: true },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        decoder:      { readers: ['ean_reader'] },
        locate:       true,
      },
      (err) => {
        if (err) {
          setError('Не може да се достъпи камерата. Проверете разрешенията на браузъра.');
          return;
        }
        Quagga.start();
        setReady(true);
      },
    );

    Quagga.onDetected((result) => {
      const code = result.codeResult?.code;
      if (code && /^(978|979)\d{10}$|^\d{10}$/.test(code) && !detectedRef.current) {
        detectedRef.current = true;
        setFlashed(true);
        setTimeout(() => {
          Quagga.stop();
          onDetected(code);
        }, 400);
      }
    });

    return () => { Quagga.stop(); };
  }, []);

  return (
    <>
      {/*
        ── CSS инжектиран директно за Quagga елементите.
        Tailwind [&>video] не работи надеждно за динамично монтирани елементи,
        затова използваме конкретен ID + style таг.
      */}
      <style>{`
        #${SCANNER_ID} video {
          position: absolute;
          top: 0; left: 0;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          border-radius: 0;
          display: block;
        }
        #${SCANNER_ID} canvas {
          position: absolute;
          top: 0; left: 0;
          width: 100% !important;
          height: 100% !important;
          opacity: 0.45;
        }
        /* Скриваме canvas.imgBuffer — само drawingCanvas е нужен */
        #${SCANNER_ID} canvas.imgBuffer {
          display: none;
        }
        @keyframes scanMove {
          0%, 100% { top: 4px; }
          50%       { top: calc(100% - 5px); }
        }
        @keyframes flashIn {
          0%   { opacity: 0.9; }
          100% { opacity: 0; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1.6);  opacity: 0; }
        }
      `}</style>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ── Panel ──────────────────────────────────────────────────── */}
        <div style={{ width: '100%', maxWidth: 460, padding: '0 16px' }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Пулсиращ индикатор */}
              <div style={{ position: 'relative', width: 12, height: 12 }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  background: ready ? '#22c55e' : '#f59e0b',
                }} />
                {ready && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    background: '#22c55e',
                    animation: 'pulseRing 1.2s ease-out infinite',
                  }} />
                )}
              </div>
              <span style={{
                color: 'white', fontWeight: 600, fontSize: 13,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                {ready ? 'Сканиране активно' : 'Стартиране на камерата…'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => { Quagga.stop(); onClose(); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, padding: '6px 8px',
                color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Затвори
            </button>
          </div>

          {/* ── Camera viewport ──────────────────────────────────────── */}
          <div style={{
            position: 'relative',
            width: '100%',
            /* Фиксирана височина — гарантира видимост на камерата */
            height: 320,
            borderRadius: 16,
            overflow: 'hidden',
            background: '#0a0a0a',
            border: '2px solid rgba(59,130,246,0.4)',
            boxShadow: '0 0 40px rgba(59,130,246,0.15), 0 20px 60px rgba(0,0,0,0.6)',
          }}>
            {/* Quagga монтира video+canvas тук */}
            <div
              id={SCANNER_ID}
              ref={containerRef}
              style={{ position: 'absolute', inset: 0 }}
            />

            {/* Flash при засичане */}
            {flashed && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 50,
                background: 'rgba(255,255,255,0.85)',
                animation: 'flashIn 0.4s ease-out forwards',
                pointerEvents: 'none',
              }} />
            )}

            {/* Overlay с прицел — само когато камерата е готова */}
            {ready && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                {/* Затъмнени зони около прицела */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `
                    linear-gradient(to bottom,
                      rgba(0,0,0,0.5) 0%,
                      rgba(0,0,0,0.1) 30%,
                      rgba(0,0,0,0.1) 70%,
                      rgba(0,0,0,0.5) 100%
                    )
                  `,
                }} />

                {/* Прицелна кутия */}
                <div style={{
                  position: 'relative',
                  width: 280, height: 90,
                  zIndex: 10,
                }}>
                  {/* Ъглови скоби */}
                  {[
                    { top: -2, left: -2,   borderTop: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6',   borderRadius: '5px 0 0 0' },
                    { top: -2, right: -2,  borderTop: '3px solid #3b82f6', borderRight: '3px solid #3b82f6',  borderRadius: '0 5px 0 0' },
                    { bottom: -2, left: -2,  borderBottom: '3px solid #3b82f6', borderLeft: '3px solid #3b82f6',  borderRadius: '0 0 0 5px' },
                    { bottom: -2, right: -2, borderBottom: '3px solid #3b82f6', borderRight: '3px solid #3b82f6', borderRadius: '0 0 5px 0' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      position: 'absolute', width: 22, height: 22, ...s,
                    }} />
                  ))}

                  {/* Сканираща линия */}
                  <div style={{
                    position: 'absolute', left: 4, right: 4, height: 2,
                    background: 'linear-gradient(90deg, transparent 0%, #60a5fa 30%, #3b82f6 50%, #60a5fa 70%, transparent 100%)',
                    boxShadow: '0 0 8px #3b82f6, 0 0 16px rgba(59,130,246,0.5)',
                    animation: 'scanMove 1.8s ease-in-out infinite',
                    borderRadius: 2,
                  }} />

                  {/* Централна точка */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    boxShadow: '0 0 8px #3b82f6',
                  }} />
                </div>

                <p style={{
                  marginTop: 14, color: 'rgba(255,255,255,0.75)',
                  fontSize: 11, fontWeight: 600,
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                  zIndex: 10,
                }}>
                  Насочете ISBN баркода към рамката
                </p>
              </div>
            )}

            {/* Инициализация — placeholder докато камерата се стартира */}
            {!ready && !error && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 30,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)',
                gap: 12,
              }}>
                <svg style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }}
                     width="32" height="32" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                          strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
                </svg>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                  Стартиране на камерата…
                </span>
              </div>
            )}
          </div>

          {/* ── Грешка ────────────────────────────────────────────────── */}
          {error && (
            <div style={{
              marginTop: 12,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '12px 16px',
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="#f87171" style={{ flexShrink: 0, marginTop: 1 }}>
                <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"/>
              </svg>
              <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* ── Footer hint ────────────────────────────────────────────── */}
          <p style={{
            marginTop: 14, textAlign: 'center',
            color: 'rgba(255,255,255,0.25)', fontSize: 11,
          }}>
            WorldCat · ISBN-13 (978 / 979) · ISBN-10
          </p>
        </div>

        {/* Spin keyframe */}
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );
};

export default ISBNScanner;