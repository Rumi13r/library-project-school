import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import {
  BookOpen, Eye, EyeOff, ArrowRight,
  User, Shield, AlertCircle,
  CheckCircle, XCircle, Info,
} from "lucide-react";
import styles from './Login.module.css';

/* ─── Helper компоненти (същите като в Register) ─────────── */

const FieldHint: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    marginTop: '0.35rem', fontSize: '0.8rem', lineHeight: 1.5,
    color: ok ? '#16a34a' : '#dc2626',
    animation: 'lv-fadein 0.2s ease both',
  }}>
    {ok
      ? <CheckCircle size={14} style={{ flexShrink: 0 }} />
      : <XCircle     size={14} style={{ flexShrink: 0 }} />
    }
    <span>{text}</span>
  </div>
);

const FieldInfo: React.FC<{ text: string; example?: string }> = ({ text, example }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
    marginTop: '0.35rem', fontSize: '0.8rem', lineHeight: 1.5,
    color: '#2563eb',
  }}>
    <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>
      {text}
      {example && (
        <span style={{ color: '#6b7280', marginLeft: '0.3rem' }}>
          — напр. <em>{example}</em>
        </span>
      )}
    </span>
  </div>
);

const FieldWarn: React.FC<{ text: string; fix: string }> = ({ text, fix }) => (
  <div style={{
    display: 'flex', alignItems: 'flex-start', gap: '0.4rem',
    marginTop: '0.3rem', fontSize: '0.8rem', lineHeight: 1.5,
    color: '#b45309',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '6px',
    padding: '0.35rem 0.6rem',
    animation: 'lv-fadein 0.2s ease both',
  }}>
    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span><strong>{text}</strong> — {fix}</span>
  </div>
);

/* ══════════════════════════════════════════════════════════ */
const Login: React.FC = () => {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const navigate = useNavigate();

  const [touched, setTouched] = useState({ email: false, password: false });
  const touch = (field: 'email' | 'password') =>
    setTouched(prev => ({ ...prev, [field]: true }));

  /* ── валидация ─────────────────────────────────────────── */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const v = {
    email: {
      ok:        emailRegex.test(email),
      empty:     touched.email && email.length === 0,
      noAt:      touched.email && email.length > 0 && !email.includes('@'),
      badFormat: touched.email && email.length > 0 && !emailRegex.test(email),
    },
    password: {
      ok:    password.length >= 6,
      empty: touched.password && password.length === 0,
      short: touched.password && password.length > 0 && password.length < 6,
    },
  };

  const formIsValid = v.email.ok && v.password.ok;

  /* ── submit ────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!formIsValid) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if      (role === "admin")     navigate("/admin");
        else if (role === "librarian") navigate("/librarian");
        else                           navigate("/dashboard");
      } else {
        setErrorMessage("Потребителят няма зададена роля");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if      (error.message.includes("invalid-credential"))  setErrorMessage("Грешен имейл или парола");
        else if (error.message.includes("too-many-requests"))   setErrorMessage("Твърде много опити. Опитайте по-късно.");
        else                                                     setErrorMessage("Възникна грешка при влизане");
      } else {
        setErrorMessage("Възникна неочаквана грешка");
      }
    } finally {
      setIsLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className={styles.container}>
      <style>{`
        @keyframes lv-fadein {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className={styles.background}>
        <div className={`${styles.shape} ${styles.shape1}`} />
        <div className={`${styles.shape} ${styles.shape2}`} />
        <div className={`${styles.shape} ${styles.shape3}`} />
      </div>

      <div className={styles.content}>

        {/* ── Лява страна ─────────────────────────────── */}
        <div className={styles.illustration}>
          <div className={styles.illustrationBg}>
            <img
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
              alt="Library"
              className={styles.bgImage}
            />
            <div className={styles.overlay} />
          </div>

          <div className={styles.illustrationContent}>
            <div>
              <h1 className={styles.illustrationTitle}>Добре дошли в</h1>
              <h1 className={styles.illustrationTitle} style={{ color: '#ffffff' }}>
                Smart School Library
              </h1>
              <p className={styles.illustrationSubtitle}>
                Влезте в своя акаунт за достъп до богатата колекция от книги,
                ресурси и учебни помагала.
              </p>

              <div className={styles.features}>
                {[
                  { icon: <BookOpen size={20} />, title: "10,000+ книги",   desc: "Богата колекция"     },
                  { icon: <Shield   size={20} />, title: "Сигурен достъп",  desc: "Защитена среда"      },
                  { icon: <User     size={20} />, title: "Персонализирано", desc: "Индивидуален профил" },
                ].map(f => (
                  <div className={styles.feature} key={f.title}>
                    <div className={styles.featureIcon}>{f.icon}</div>
                    <div className={styles.featureText}>
                      <span className={styles.featureTitle}>{f.title}</span>
                      <span className={styles.featureDesc}>{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Дясна страна — форма ──────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <form onSubmit={handleLogin} noValidate>

              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Вход в системата</h2>
                <p className={styles.alternative}>Въведете вашите данни за достъп</p>
              </div>

              {/* Server грешка */}
              {errorMessage && (
                <div className={styles.error}>
                  <div className={styles.errorIcon}>
                    <AlertCircle size={14} />
                  </div>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ── Имейл ─────────────────────────── */}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Имейл адрес
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="email"
                    type="email"
                    placeholder="вашият@имейл.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => touch('email')}
                    className={`${styles.input} ${
                      touched.email && !v.email.ok ? styles.inputError : ''
                    }`}
                    required
                    disabled={isLoading}
                  />
                </div>

                {!touched.email && (
                  <FieldInfo
                    text="Въведете имейла, с който сте се регистрирали"
                    example="ivan@gmail.com"
                  />
                )}
                {touched.email && v.email.ok && (
                  <FieldHint ok text="Валиден имейл адрес!" />
                )}
                {v.email.empty && (
                  <FieldWarn
                    text="Полето е задължително"
                    fix="Въведете вашия имейл адрес"
                  />
                )}
                {v.email.noAt && (
                  <FieldWarn
                    text="Липсва @"
                    fix='Имейлът трябва да съдържа @ — напр. "ivan@gmail.com"'
                  />
                )}
                {v.email.badFormat && !v.email.noAt && (
                  <FieldWarn
                    text="Невалиден формат"
                    fix='Проверете имейла — напр. "ivan@gmail.com"'
                  />
                )}
              </div>

              {/* ── Парола ─────────────────────────── */}
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Парола
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Въведете паролата си"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => touch('password')}
                    className={`${styles.input} ${
                      touched.password && !v.password.ok ? styles.inputError : ''
                    }`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowPassword(val => !val)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {!touched.password && (
                  <FieldInfo text="Въведете паролата за вашия акаунт" />
                )}
                {touched.password && v.password.ok && (
                  <FieldHint ok text="Паролата е въведена!" />
                )}
                {v.password.empty && (
                  <FieldWarn
                    text="Полето е задължително"
                    fix="Въведете вашата парола"
                  />
                )}
                {v.password.short && (
                  <FieldWarn
                    text="Паролата е твърде кратка"
                    fix="Паролата трябва да е поне 6 символа"
                  />
                )}
              </div>

              {/* ── Запомни ме + Забравена парола ──── */}
              <div className={styles.formOptions}>
                <label className={styles.checkbox} style={{ cursor: 'pointer' }}>
                  <RememberCheckbox />
                  <span className={styles.checkboxText}>Запомни ме</span>
                </label>
                <a href="/forgot-password" className={styles.forgot}>
                  Забравена парола?
                </a>
              </div>

              {/* ── Бутон ──────────────────────────── */}
              <button
                type="submit"
                className={`${styles.button} ${isLoading ? styles.loading : ''} ${
                  !formIsValid && touched.email && touched.password ? styles.disabled : ''
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className={styles.loader} />
                ) : (
                  <>
                    <span>Влез в акаунта</span>
                    <ArrowRight className={styles.buttonIcon} />
                  </>
                )}
              </button>

              <div className={styles.divider}><span>или</span></div>

              <div className={styles.alternative}>
                <p className={styles.registerText}>
                  Нямате акаунт?{" "}
                  <a href="/register" className={styles.registerLink}>Създайте нов</a>
                </p>
              </div>

            </form>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              © 2024 Smart School Library. Всички права запазени.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

/* ── "Запомни ме" чекбокс ──────────────────────────────── */
const RememberCheckbox: React.FC = () => {
  const [checked, setChecked] = useState(false);
  return (
    <span
      onClick={() => setChecked(v => !v)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: '20px',
        height: '20px',
        borderRadius: '5px',
        border: checked ? '2px solid #16a34a' : '2px solid #d1d5db',
        background: checked ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'transparent',
        boxShadow: checked ? '0 2px 8px rgba(22,163,74,0.35)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        cursor: 'pointer',
      }}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7.5L10 1" stroke="white" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
};

export default Login;