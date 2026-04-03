import React, { useEffect } from 'react';
import { XCircle, X, AlertTriangle } from 'lucide-react';

/* ─── Типове ─────────────────────────────────────────────── */
interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

/* ─── Съвети според грешката ─────────────────────────────── */
const getTips = (message: string): string[] => {
  const m = message.toLowerCase();

  if (m.includes('gmail')) return [
    'Използвайте имейл адрес, завършващ на @gmail.com',
    'Пример: vashe.ime@gmail.com',
    'Регистрацията с други доставчици не е разрешена',
  ];

  if (m.includes('имена') || m.includes('попълнете')) return [
    'Попълнете полето "Име" с вашето собствено име',
    'Попълнете полето "Фамилия" с вашата фамилия',
    'Двете полета са задължителни',
  ];

  if (m.includes('не съвпадат')) return [
    'Въведете еднаква парола в двете полета',
    'Проверете дали Caps Lock е включен',
    'Използвайте иконата за показване на паролата',
  ];

  if (m.includes('парола') || m.includes('изисквания')) return [
    'Паролата трябва да е поне 6 символа',
    'Включете поне една главна буква (A–Z)',
    'Включете поне една малка буква (a–z)',
    'Включете поне една цифра (0–9)',
  ];

  if (m.includes('captcha') || m.includes('въпрос') || m.includes('грешен отговор')) return [
    'Изчислете сумата на двете числа',
    'Въведете само цифрата без интервали',
    'Използвайте бутона за обновяване ако числата са трудни',
  ];

  if (m.includes('вече се използва')) return [
    'Вече съществува акаунт с този имейл',
    'Опитайте да влезете вместо да се регистрирате',
    'Ако сте забравили паролата използвайте "Забравена парола"',
  ];

  if (m.includes('невалиден имейл')) return [
    'Проверете дали имейлът е написан правилно',
    'Форматът трябва да е: example@gmail.com',
    'Не използвайте интервали или специални символи',
  ];

  if (m.includes('коригирайте')) return [
    'Проверете всички полета маркирани в червено',
    'Всяко поле показва точно какво трябва да поправите',
    'Зелено означава коректно, червено — грешка',
  ];

  return [
    'Проверете всички полета и се уверете, че са попълнени правилно',
    'Опреснете страницата и опитайте отново',
    'Ако проблемът продължава, свържете се с библиотеката',
  ];
};

/* ─── Инлайн стилове ─────────────────────────────────────── */
const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    animation: 'em-fadein 0.2s ease both',
  },
  modal: {
    background: 'var(--bg-primary, #ffffff)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
    border: '1px solid rgba(0,0,0,0.07)',
    overflow: 'hidden' as const,
    animation: 'em-slideup 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '1.25rem 1.5rem',
    background: 'linear-gradient(135deg, #fef2f2, #fff7ed)',
    borderBottom: '1px solid rgba(220,38,38,0.1)',
  },
  headerIcon: {
    width: '44px',
    height: '44px',
    background: 'linear-gradient(135deg, #ef4444, #f97316)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#dc2626',
    margin: '0 0 0.15rem',
    letterSpacing: '-0.01em',
  },
  subtitle: { fontSize: '0.78rem', color: '#6b7280', margin: 0 },
  closeBtn: {
    width: '32px',
    height: '32px',
    background: 'rgba(0,0,0,0.06)',
    border: 'none',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#6b7280',
    flexShrink: 0,
    transition: 'all 0.2s ease',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.625rem',
    margin: '1.25rem 1.5rem 0',
    padding: '0.875rem 1rem',
    background: 'rgba(220,38,38,0.06)',
    border: '1px solid rgba(220,38,38,0.15)',
    borderRadius: '10px',
  },
  errorMsg: {
    fontSize: '0.875rem',
    color: '#b91c1c',
    fontWeight: 500,
    margin: 0,
    lineHeight: 1.5,
  },
  tipsSection: { padding: '1.25rem 1.5rem' },
  tipsLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: '#6b7280',
    margin: '0 0 0.875rem',
  },
  tipsList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
  },
  tipItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary, #0f172a)',
    lineHeight: 1.55,
  },
  tipBadge: {
    width: '22px',
    height: '22px',
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'white',
    flexShrink: 0,
    marginTop: '1px',
  },
  footer: { padding: '0 1.5rem 1.5rem' },
  confirmBtn: {
    width: '100%',
    padding: '0.8rem',
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
    transition: 'all 0.25s ease',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
};

/* ─── Компонент ──────────────────────────────────────────── */
const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, message }) => {
  const tips = getTips(message);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Keyframe анимации — вградени директно */}
      <style>{`
        @keyframes em-fadein  { from { opacity:0 } to { opacity:1 } }
        @keyframes em-slideup {
          from { opacity:0; transform:translateY(20px) scale(0.97) }
          to   { opacity:1; transform:translateY(0)   scale(1)     }
        }
      `}</style>

      <div style={s.overlay} onClick={onClose} role="dialog" aria-modal="true">
        <div style={s.modal} onClick={e => e.stopPropagation()}>

          {/* Хедър */}
          <div style={s.header}>
            <div style={s.headerIcon}>
              <AlertTriangle size={22} />
            </div>
            <div style={s.headerText}>
              <h3 style={s.title}>Възникна проблем</h3>
              <p style={s.subtitle}>Прочетете указанията по-долу</p>
            </div>
            <button style={s.closeBtn} onClick={onClose} aria-label="Затвори">
              <X size={18} />
            </button>
          </div>

          {/* Съобщение за грешката */}
          <div style={s.errorBox}>
            <XCircle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={s.errorMsg}>{message}</p>
          </div>

          {/* Съвети */}
          <div style={s.tipsSection}>
            <p style={s.tipsLabel}>Какво да направите:</p>
            <ul style={s.tipsList}>
              {tips.map((tip, i) => (
                <li key={i} style={s.tipItem}>
                  <span style={s.tipBadge}>{i + 1}</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Бутон */}
          <div style={s.footer}>
            <button
              style={s.confirmBtn}
              onClick={onClose}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(22,163,74,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(22,163,74,0.3)';
              }}
            >
              Разбрах, ще поправя
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default ErrorModal;