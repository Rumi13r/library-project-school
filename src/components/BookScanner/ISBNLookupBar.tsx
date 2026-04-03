import React, { useState, useEffect, useRef } from 'react';
import ISBNScanner from './ISBNScanner';
import { useBookLookup } from './UseBookLookup';
import type { BookData } from './UseBookLookup';

export interface ISBNFillData {
  isbn:        string;
  title:       string;
  author:      string;
  coverUrl:    string;
  publisher:   string;
  year:        number | undefined;
  pages:       number | undefined;
  language:    string;
  description: string;
}

interface ISBNLookupBarProps {
  onFill:       (data: ISBNFillData) => void;
  initialISBN?: string;
  disabled?:    boolean;
}

const ISBNLookupBar: React.FC<ISBNLookupBarProps> = ({
  onFill,
  initialISBN = '',
  disabled    = false,
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [manualISBN,  setManualISBN]  = useState(initialISBN);
  const [displayISBN, setDisplayISBN] = useState('');
  const [coverOk,     setCoverOk]     = useState(true);
  const [justFilled,  setJustFilled]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { loading, error, data, partial, lookup, reset } = useBookLookup();

  // Cleanup timer on unmount — единственият useEffect, нула setState
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const triggerSuccess = () => {
    setJustFilled(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setJustFilled(false), 2500);
  };

  const fireOnFill = (book: BookData) => {
    onFill({
      isbn:        book.isbn,
      title:       book.title,
      author:      book.author,
      coverUrl:    book.coverUrl,
      publisher:   book.publisher,
      year:        book.year    ? parseInt(book.year)  : undefined,
      pages:       book.pages   ? parseInt(book.pages) : undefined,
      language:    book.language,
      description: book.description,
    });
    triggerSuccess();
  };

  const handleDetected = async (isbn: string) => {
    setShowScanner(false);
    setDisplayISBN(isbn);
    setManualISBN(isbn);
    setCoverOk(true);
    const book = await lookup(isbn);
    if (book) fireOnFill(book);
  };

  const handleManualLookup = async () => {
    const isbn = manualISBN.trim();
    if (!isbn) return;
    setDisplayISBN(isbn);
    setCoverOk(true);
    const book = await lookup(isbn);
    if (book) fireOnFill(book);
  };

  const handleReset = () => {
    setManualISBN('');
    setDisplayISBN('');
    setCoverOk(true);
    setJustFilled(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    reset();
  };

  // ── Style tokens ────────────────────────────────────────────────────────────
  const panelBorder = justFilled
    ? '1px solid rgba(34,197,94,0.5)'
    : '1px solid rgba(59,130,246,0.25)';
  const panelBg = justFilled
    ? 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(16,185,129,0.04) 100%)'
    : 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(99,102,241,0.04) 100%)';

  return (
    <>
      {showScanner && (
        <ISBNScanner
          onDetected={handleDetected}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div style={{
        border: panelBorder,
        background: panelBg,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 20,
        transition: 'all 0.4s ease',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(59,130,246,0.12)',
          background: 'rgba(59,130,246,0.04)',
        }}>
          {/* Иконка баркод */}
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
               stroke="#3b82f6" strokeWidth={1.8} style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M4 7v10M8 7v10M12 7v10M3 7h1m2 0h1m2 0h1m-7 10h1m2 0h1
                 m2 0h1M15 7v10m4-10v10m-5 0h1m2 0h1m-4-10h1m2 0h1"/>
          </svg>

          <span style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
            ISBN Скенер
          </span>

          {/* Засечен ISBN pill */}
          {displayISBN && (
            <span style={{
              fontFamily: 'monospace', fontSize: 11, fontWeight: 600,
              background: 'rgba(59,130,246,0.1)', color: '#1e40af',
              border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 100, padding: '2px 8px',
            }}>
              {displayISBN}
            </span>
          )}

          {/* Успешно попълнено */}
          {justFilled && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600,
              background: 'rgba(34,197,94,0.12)', color: '#15803d',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 100, padding: '2px 8px',
              animation: 'fadeSlideIn 0.3s ease-out',
            }}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0
                     011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"/>
              </svg>
              Полетата са попълнени
            </span>
          )}

          {/* Нулирай */}
          {displayISBN && !loading && (
            <button type="button" onClick={handleReset} style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', fontSize: 11, padding: '2px 4px',
              transition: 'color 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#64748b')}
              onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                     0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Нулирай
            </button>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 16px' }}>

          {/* Ред: текстово поле + бутони */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                   stroke="#94a3b8" strokeWidth={1.8}
                   style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 7v10M8 7v10M12 7v10M3 7h1m2 0h1m2 0h1m-7 10h1m2 0h1
                     m2 0h1M15 7v10m4-10v10m-5 0h1m2 0h1m-4-10h1m2 0h1"/>
              </svg>
              <input
                type="text"
                value={manualISBN}
                onChange={e => setManualISBN(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); handleManualLookup(); } }}
                placeholder="Въведете ISBN (978…) или сканирайте"
                disabled={loading}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                  border: '1.5px solid #e2e8f0', borderRadius: 9,
                  fontSize: 13, fontFamily: 'monospace',
                  color: '#1e293b', background: 'white',
                  outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  opacity: loading ? 0.6 : 1,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'; }}
                onBlur={e  => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Бутон Търси */}
            <button type="button" onClick={handleManualLookup}
              disabled={!manualISBN.trim() || loading}
              style={{
                padding: '9px 14px', borderRadius: 9,
                background: manualISBN.trim() && !loading ? '#f1f5f9' : '#f8fafc',
                border: '1.5px solid #e2e8f0',
                color: '#475569', fontSize: 12, fontWeight: 600,
                cursor: manualISBN.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: !manualISBN.trim() || loading ? 0.5 : 1,
                whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (manualISBN.trim() && !loading) { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#1e40af'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            >
              Търси
            </button>

            {/* Бутон Камера */}
            <button type="button" onClick={() => setShowScanner(true)}
              disabled={disabled || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', borderRadius: 9,
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                border: 'none', color: 'white',
                fontSize: 12, fontWeight: 700,
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled || loading ? 0.6 : 1,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spinIcon 1s linear infinite' }} width="14" height="14"
                       fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3"
                            strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
                  </svg>
                  Зарежда…
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                       stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0
                         0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07
                         7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {displayISBN ? 'Сканирай пак' : 'Сканирай'}
                </>
              )}
            </button>
          </div>

          {/* ── Статус зона ───────────────────────────────────────────── */}

          {/* Зареждане */}
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <svg style={{ animation: 'spinIcon 1s linear infinite', flexShrink: 0 }}
                   width="16" height="16" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="3"
                        strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
              </svg>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e40af' }}>
                  Търсене в Google Books, Open Library, WorldCat…
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#60a5fa' }}>
                  Проверяваме 3 извора едновременно
                </p>
              </div>
            </div>
          )}

          {/* Грешка */}
          {!loading && error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="#ef4444"
                   style={{ flexShrink: 0, marginTop: 1 }}>
                <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0
                     012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"/>
              </svg>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                  Не е намерено в нито един извор
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#ef4444', marginTop: 2 }}>
                  Проверете ISBN-а или попълнете полетата ръчно.
                </p>
              </div>
            </div>
          )}

          {/* Намерена книга */}
          {!loading && data && !error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              background: justFilled
                ? 'rgba(34,197,94,0.06)'
                : 'rgba(59,130,246,0.04)',
              border: justFilled
                ? '1px solid rgba(34,197,94,0.2)'
                : '1px solid rgba(59,130,246,0.15)',
              borderRadius: 10, padding: '12px 14px',
              transition: 'all 0.4s ease',
            }}>

              {/* Корица */}
              <div style={{
                width: 52, height: 72, borderRadius: 8, overflow: 'hidden',
                background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
                border: '1px solid rgba(59,130,246,0.2)',
                flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>
                {coverOk ? (
                  <img src={data.coverUrl} alt="Корица"
                       style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                       onError={() => setCoverOk(false)} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
                         stroke="#93c5fd" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477
                           3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13
                           C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13
                           C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Метаданни */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 700,
                  color: '#0f172a', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {data.title || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Без заглавие</span>}
                </p>

                {data.author && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                    {data.author}
                  </p>
                )}

                {/* Source badge + DDC/LCC */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                  {/* Кой API е намерил книгата */}
                  {data.source && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: data.source === 'google'
                        ? 'rgba(59,130,246,0.1)' : data.source === 'openlibrary'
                        ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
                      color: data.source === 'google'
                        ? '#1e40af' : data.source === 'openlibrary'
                        ? '#065f46' : '#4338ca',
                      border: `1px solid ${data.source === 'google'
                        ? 'rgba(59,130,246,0.3)' : data.source === 'openlibrary'
                        ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
                      borderRadius: 100, padding: '2px 7px',
                    }}>
                      {data.source === 'google'    ? '● Google Books'
                     : data.source === 'openlibrary' ? '● Open Library'
                     : data.source === 'worldcat'    ? '● WorldCat'
                     : '● Комбиниран'}
                    </span>
                  )}
                  {data.ddc && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: 'rgba(245,158,11,0.1)', color: '#92400e',
                      border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 100, padding: '2px 7px',
                    }}>
                      DDC {data.ddc}
                    </span>
                  )}
                  {data.lcc && (
                    <span style={{
                      fontSize: 10,
                      background: '#f1f5f9', color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: 100, padding: '2px 7px',
                    }}>
                      LCC {data.lcc}
                    </span>
                  )}
                </div>

                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8' }}>
                  {partial
                    ? '⚠️ Непълни данни — попълнете ръчно'
                    : '✓ Издател, година и страници — попълнете ръчно'}
                </p>
              </div>

              {/* Checkmark */}
              {justFilled && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#22c55e', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(34,197,94,0.4)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="white">
                    <path fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0
                         011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"/>
                  </svg>
                </div>
              )}
            </div>
          )}

          {/* Начален hint */}
          {!loading && !data && !error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              background: 'rgba(59,130,246,0.04)',
              border: '1px dashed rgba(59,130,246,0.2)',
              borderRadius: 8,
            }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24"
                   stroke="#93c5fd" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p style={{ margin: 0, fontSize: 11, color: '#60a5fa' }}>
                Търси в Google Books · Open Library · WorldCat — работи и за нови книги
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spinIcon {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default ISBNLookupBar;