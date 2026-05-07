import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../firebase/firebase";
import {
  Mail,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  BookOpen,
  Shield,
  RefreshCw,
} from "lucide-react";
import styles from "./ForgotPassword.module.css";

/* ─── Типове ──────────────────────────────────────────────── */

interface FirebaseAuthError {
  code: string;
  message: string;
}

function isFirebaseError(error: unknown): error is FirebaseAuthError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as FirebaseAuthError).code === "string"
  );
}

/* ─── Firebase action code settings ─────────────────────── */

const ACTION_CODE_SETTINGS = {
  url: "https://library-project-school.vercel.app/login",
  handleCodeInApp: false,
} as const;

/* ─── Firebase error map ────────────────────────────────── */

const FIREBASE_ERRORS: Record<string, string> = {
  "auth/user-not-found":        "Няма регистриран акаунт с този имейл адрес.",
  "auth/invalid-email":         "Невалиден формат на имейл адрес.",
  "auth/too-many-requests":     "Твърде много опити. Моля, опитайте по-късно.",
  "auth/network-request-failed":"Мрежова грешка. Проверете интернет връзката си.",
  "auth/invalid-credential":    "Невалидни данни. Проверете имейла си.",
};

/* ─── Helper компоненти (идентични с Login.tsx) ─────────── */

const FieldHint: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
      marginTop: "0.35rem",
      fontSize: "0.8rem",
      lineHeight: 1.5,
      color: ok ? "#16a34a" : "#dc2626",
      animation: "fp-fadein 0.2s ease both",
    }}
  >
    {ok ? (
      <CheckCircle size={14} style={{ flexShrink: 0 }} />
    ) : (
      <XCircle size={14} style={{ flexShrink: 0 }} />
    )}
    <span>{text}</span>
  </div>
);

const FieldInfo: React.FC<{ text: string; example?: string }> = ({
  text,
  example,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "0.4rem",
      marginTop: "0.35rem",
      fontSize: "0.8rem",
      lineHeight: 1.5,
      color: "#2563eb",
    }}
  >
    <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>
      {text}
      {example && (
        <span style={{ color: "#6b7280", marginLeft: "0.3rem" }}>
          — напр. <em>{example}</em>
        </span>
      )}
    </span>
  </div>
);

const FieldWarn: React.FC<{ text: string; fix: string }> = ({ text, fix }) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "0.4rem",
      marginTop: "0.3rem",
      fontSize: "0.8rem",
      lineHeight: 1.5,
      color: "#b45309",
      background: "#fffbeb",
      border: "1px solid #fcd34d",
      borderRadius: "6px",
      padding: "0.35rem 0.6rem",
      animation: "fp-fadein 0.2s ease both",
    }}
  >
    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>
      <strong>{text}</strong> — {fix}
    </span>
  </div>
);

/* ══════════════════════════════════════════════════════════ */
const ForgotPassword: React.FC = () => {
  const [email,        setEmail]        = useState<string>("");
  const [isLoading,    setIsLoading]    = useState<boolean>(false);
  const [success,      setSuccess]      = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [touched,      setTouched]      = useState<boolean>(false);

  /* ── Валидация ────────────────────────────────────────── */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const v = {
    ok:        emailRegex.test(email),
    empty:     touched && email.length === 0,
    noAt:      touched && email.length > 0 && !email.includes("@"),
    badFormat: touched && email.length > 0 && !emailRegex.test(email),
  };

  /* ── Submit ───────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setTouched(true);
    if (!v.ok) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      await sendPasswordResetEmail(auth, email.trim(), ACTION_CODE_SETTINGS);
      setSuccess(true);
    } catch (error: unknown) {
      if (isFirebaseError(error)) {
        setErrorMessage(
          FIREBASE_ERRORS[error.code] ?? "Възникна грешка. Моля, опитайте отново."
        );
      } else {
        setErrorMessage("Възникна неочаквана грешка.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = (): void => {
    setSuccess(false);
    setEmail("");
    setTouched(false);
    setErrorMessage("");
  };

  /* ══════════════════════════════════════════════════════ */
  /* ── Success екран ───────────────────────────────────── */
  if (success) {
    return (
      <div className={styles.container}>
        <style>{`
          @keyframes fp-fadein {
            from { opacity: 0; transform: translateY(-3px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fp-scalein {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes fp-checkmark {
            from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
            to   { opacity: 1; transform: scale(1) rotate(0deg); }
          }
        `}</style>

        <div className={styles.background}>
          <div className={`${styles.shape} ${styles.shape1}`} />
          <div className={`${styles.shape} ${styles.shape2}`} />
          <div className={`${styles.shape} ${styles.shape3}`} />
        </div>

        <div className={styles.content}>
          {/* Лява страна */}
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
                <h1 className={styles.illustrationTitle} style={{ color: "#ffffff" }}>
                  Smart School Library
                </h1>
                <p className={styles.illustrationSubtitle}>
                  Имейлът беше изпратен успешно. Проверете пощата си и следвайте инструкциите за нова парола.
                </p>
                <div className={styles.features}>
                  {[
                    { icon: <BookOpen size={20} />, title: "10,000+ книги",   desc: "Богата колекция"     },
                    { icon: <Shield   size={20} />, title: "Сигурен достъп",  desc: "Защитена среда"      },
                    { icon: <Mail     size={20} />, title: "Бързо възстановяване", desc: "За минути" },
                  ].map((f) => (
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

          {/* Дясна страна — success card */}
          <div className={styles.formSection}>
            <div className={styles.formContainer} style={{ animation: "fp-scalein 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>

              <div className={styles.successIconWrap}>
                <div className={styles.successIconRing}>
                  <CheckCircle size={36} className={styles.successIcon} />
                </div>
              </div>

              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Имейлът е изпратен!</h2>
                <p className={styles.formSubtitle}>
                  Изпратихме линк за възстановяване на:
                </p>
                <div className={styles.emailBadge}>
                  <Mail size={15} />
                  <span>{email}</span>
                </div>
              </div>

              <div className={styles.infoBox}>
                <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <p>
                  Не виждаш имейла? Провери папката{" "}
                  <strong>Spam / Нежелана поща</strong>. Линкът е валиден{" "}
                  <strong>1 час</strong>.
                </p>
              </div>

              <div className={styles.successActions}>
                <button
                  type="button"
                  onClick={handleReset}
                  className={styles.buttonSecondary}
                >
                  <RefreshCw size={16} />
                  <span>Изпрати отново</span>
                </button>

                <Link to="/login" className={styles.button}>
                  <span>Обратно към Вход</span>
                  <ArrowRight className={styles.buttonIcon} />
                </Link>
              </div>
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
  }

  /* ── Основна форма ───────────────────────────────────── */
  return (
    <div className={styles.container}>
      <style>{`
        @keyframes fp-fadein {
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
        {/* Лява страна */}
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
              <h1 className={styles.illustrationTitle} style={{ color: "#ffffff" }}>
                Smart School Library
              </h1>
              <p className={styles.illustrationSubtitle}>
                Въведете имейла си и ще получите инструкции за нова парола на секунди.
              </p>
              <div className={styles.features}>
                {[
                  { icon: <BookOpen size={20} />, title: "10,000+ книги",        desc: "Богата колекция"        },
                  { icon: <Shield   size={20} />, title: "Сигурен достъп",       desc: "Защитена среда"         },
                  { icon: <Mail     size={20} />, title: "Бързо възстановяване", desc: "Имейл за минути"        },
                ].map((f) => (
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

        {/* Дясна страна — форма */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <form onSubmit={handleSubmit} noValidate>

              <div className={styles.formHeader}>
                <Link to="/login" className={styles.backLink}>
                  <ArrowLeft size={15} />
                  <span>Обратно към Вход</span>
                </Link>
                <h2 className={styles.formTitle}>Забравена парола</h2>
                <p className={styles.formSubtitle}>
                  Въведете имейла, с който сте регистрирани, и ще Ви изпратим линк за нова парола.
                </p>
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

              {/* ── Имейл поле ────────────────────────── */}
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
                    autoComplete="email"
                    autoFocus
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage("");
                    }}
                    onBlur={() => setTouched(true)}
                    className={`${styles.input} ${
                      touched && !v.ok ? styles.inputError : ""
                    }`}
                    required
                    disabled={isLoading}
                  />
                </div>

                {!touched && (
                  <FieldInfo
                    text="Въведете имейла, с който сте се регистрирали"
                    example="ivan@gmail.com"
                  />
                )}
                {touched && v.ok && (
                  <FieldHint ok text="Валиден имейл адрес!" />
                )}
                {v.empty && (
                  <FieldWarn
                    text="Полето е задължително"
                    fix="Въведете вашия имейл адрес"
                  />
                )}
                {v.noAt && (
                  <FieldWarn
                    text='Липсва символ "@"'
                    fix='Имейлът трябва да съдържа @ — напр. "ivan@gmail.com"'
                  />
                )}
                {v.badFormat && !v.noAt && (
                  <FieldWarn
                    text="Невалиден формат"
                    fix='Проверете имейла — напр. "ivan@gmail.com"'
                  />
                )}
              </div>

              {/* ── Submit бутон ───────────────────────── */}
              <button
                type="submit"
                className={`${styles.button} ${isLoading ? styles.loading : ""} ${
                  touched && !v.ok ? styles.disabled : ""
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className={styles.loader} />
                ) : (
                  <>
                    <span>Изпрати линк за възстановяване</span>
                    <ArrowRight className={styles.buttonIcon} />
                  </>
                )}
              </button>

              <div className={styles.divider}>
                <span>или</span>
              </div>

              <div className={styles.alternative}>
                <p className={styles.registerText}>
                  Спомнихте си паролата?{" "}
                  <Link to="/login" className={styles.registerLink}>
                    Влезте в акаунта
                  </Link>
                </p>
              </div>

            </form>
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              © 2025 Smart School Library. Всички права запазени.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;