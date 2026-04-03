import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import {
  BookOpen, Eye, EyeOff, Shield, CheckCircle,
  RefreshCw, UserCircle, ArrowRight, XCircle, AlertCircle, Info,
} from "lucide-react";
import styles from './Login.module.css';
import ErrorModal from './ErrorModal';

/* ─── типове ─────────────────────────────────────────────── */
interface Touched {
  firstName: boolean;
  lastName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
  captcha: boolean;
}

/* ─── помощни инлайн компоненти ──────────────────────────── */

/** Зелено/червено съобщение под поле */
const FieldHint: React.FC<{ ok: boolean; text: string; example?: string }> = ({
  ok, text, example,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "0.4rem",
      marginTop: "0.35rem",
      fontSize: "0.8rem",
      lineHeight: 1.5,
      color: ok ? "#16a34a" : "#dc2626",
      animation: "fadeSlideIn 0.2s ease both",
    }}
  >
    {ok
      ? <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      : <XCircle     size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    }
    <span>
      {text}
      {!ok && example && (
        <span style={{ color: "#6b7280", marginLeft: "0.3rem" }}>
          — напр. <em>{example}</em>
        </span>
      )}
    </span>
  </div>
);

/** Синя информационна подсказка (преди потребителят да е докоснал полето) */
const FieldInfo: React.FC<{ text: string; example?: string }> = ({ text, example }) => (
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

/** Оранжево предупреждение за конкретно неизпълнено изискване */
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
    }}
  >
    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
    <span>
      <strong>{text}</strong> — {fix}
    </span>
  </div>
);

/* ══════════════════════════════════════════════════════════ */
const Register: React.FC = () => {
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName,       setFirstName]       = useState("");
  const [lastName,        setLastName]        = useState("");
  const [errorMessage,    setErrorMessage]    = useState("");
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [showErrorModal,  setShowErrorModal]  = useState(false);
  const [termsAccepted,   setTermsAccepted]   = useState(false);

  /* touched — показва грешки само след като потребителят е докоснал полето */
  const [touched, setTouched] = useState<Touched>({
    firstName: false, lastName: false, email: false,
    password: false, confirmPassword: false, captcha: false,
  });

  const touch = (field: keyof Touched) =>
    setTouched(prev => ({ ...prev, [field]: true }));

  /* CAPTCHA */
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  useEffect(() => { generateCaptcha(); }, []);

  const generateCaptcha = () => {
    setNum1(Math.floor(Math.random() * 10) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  /* ── валидационни правила ─────────────────────────────── */
  const nameRegex = /^[А-Яа-яA-Za-zЁёA-ZÀ-ÿ\s'-]+$/u;

  const validation = {
    firstName: {
      ok:      firstName.trim().length >= 2 && nameRegex.test(firstName),
      tooShort: firstName.trim().length > 0 && firstName.trim().length < 2,
      badChars: firstName.trim().length > 0 && !nameRegex.test(firstName),
    },
    lastName: {
      ok:      lastName.trim().length >= 2 && nameRegex.test(lastName),
      tooShort: lastName.trim().length > 0 && lastName.trim().length < 2,
      badChars: lastName.trim().length > 0 && !nameRegex.test(lastName),
    },
    email: {
      ok:         email.toLowerCase().endsWith("@gmail.com") && email.length > 10,
      notGmail:   email.length > 0 && !email.toLowerCase().endsWith("@gmail.com"),
      tooShort:   email.length > 0 && email.length <= 10,
    },
    password: {
      hasMinLength: password.length >= 6,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers:   /[0-9]/.test(password),
      get ok() {
        return this.hasMinLength && this.hasUpperCase && this.hasLowerCase && this.hasNumbers;
      },
    },
    confirmPassword: {
      ok:       confirmPassword.length > 0 && confirmPassword === password,
      mismatch: confirmPassword.length > 0 && confirmPassword !== password,
    },
    captcha: {
      ok:    captchaAnswer === (num1 + num2).toString() && captchaAnswer.length > 0,
      wrong: captchaAnswer.length > 0 && captchaAnswer !== (num1 + num2).toString(),
    },
  };

  const formIsValid =
    validation.firstName.ok &&
    validation.lastName.ok &&
    validation.email.ok &&
    validation.password.ok &&
    validation.confirmPassword.ok &&
    validation.captcha.ok &&
    termsAccepted;

  /* ── helper за показване на модал ─────────────────────── */
  const showError = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorModal(true);
    setIsLoading(false);
  };

  /* ── submit ────────────────────────────────────────────── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Маркира всички полета като touched при натискане на бутона
    setTouched({ firstName: true, lastName: true, email: true,
                 password: true, confirmPassword: true, captcha: true });

    if (!formIsValid) {
      showError("Моля, коригирайте грешките в полетата преди да продължите.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email,
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        role: "reader",
        books: [],
        events: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: {
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName:  lastName.trim(),
          phone: "",
          grade: "",
        },
      });

      navigate("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        const msg = error.message;
        if      (msg.includes("email-already-in-use")) showError("Имейлът вече се използва от друг акаунт.");
        else if (msg.includes("weak-password"))        showError("Паролата е твърде слаба.");
        else if (msg.includes("invalid-email"))        showError("Невалиден имейл адрес.");
        else                                           showError("Възникна грешка при регистрация. Опитайте отново.");
      } else {
        showError("Възникна неочаквана грешка.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const navigate = useNavigate();

  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className={styles.container}>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background */}
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
              <h1 className={styles.illustrationTitle}>Присъединете се към</h1>
              <h1 className={styles.illustrationTitle} style={{ color: '#ffffff' }}>
                Smart School Library
              </h1>
              <p className={styles.illustrationSubtitle}>
                Създайте своя акаунт и получете достъп до богатата колекция от книги, ресурси и учебни помагала
              </p>
              <div className={styles.features}>
                {[
                  { icon: <BookOpen size={20} />,  title: "10,000+ книги",      desc: "Богата колекция"      },
                  { icon: <Shield   size={20} />,  title: "Сигурен достъп",     desc: "Защитена среда"       },
                  { icon: <UserCircle size={20} />,title: "Лични данни",        desc: "Персонализиран профил"},
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

        {/* ── Дясна страна — форма ─────────────────────── */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <form onSubmit={handleRegister} noValidate>

              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Създаване на акаунт</h2>
                <p className={styles.alternative}>Попълнете данните си за регистрация</p>
              </div>

              {/* ── Имена ─────────────────────────────── */}
              <div className={styles.nameFields}>

                {/* Име */}
                <div className={styles.inputGroup}>
                  <label htmlFor="firstName" className={styles.label}>Име</label>
                  <div className={styles.inputContainer}>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="напр. Иван"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onBlur={() => touch("firstName")}
                      className={`${styles.input} ${
                        touched.firstName && !validation.firstName.ok ? styles.inputError : ""
                      } ${
                        touched.firstName && validation.firstName.ok ? styles.inputSuccess ?? "" : ""
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  {!touched.firstName && (
                    <FieldInfo text="Въведете собственото си име" example="Иван, Maria" />
                  )}
                  {touched.firstName && validation.firstName.ok && (
                    <FieldHint ok text="Името изглежда добре!" />
                  )}
                  {touched.firstName && validation.firstName.tooShort && (
                    <FieldWarn text="Твърде кратко" fix='Името трябва да е поне 2 букви — напр. "Ян"' />
                  )}
                  {touched.firstName && validation.firstName.badChars && (
                    <FieldWarn text="Невалидни символи" fix='Използвайте само букви — напр. "Иван" или "Ivan"' />
                  )}
                  {touched.firstName && !firstName.trim() && (
                    <FieldWarn text="Полето е задължително" fix="Въведете вашето собствено име" />
                  )}
                </div>

                {/* Фамилия */}
                <div className={styles.inputGroup}>
                  <label htmlFor="lastName" className={styles.label}>Фамилия</label>
                  <div className={styles.inputContainer}>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="напр. Петров"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onBlur={() => touch("lastName")}
                      className={`${styles.input} ${
                        touched.lastName && !validation.lastName.ok ? styles.inputError : ""
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  {!touched.lastName && (
                    <FieldInfo text="Въведете вашата фамилия" example="Петров, Ivanova" />
                  )}
                  {touched.lastName && validation.lastName.ok && (
                    <FieldHint ok text="Фамилията изглежда добре!" />
                  )}
                  {touched.lastName && validation.lastName.tooShort && (
                    <FieldWarn text="Твърде кратко" fix='Фамилията трябва да е поне 2 букви — напр. "Ли"' />
                  )}
                  {touched.lastName && validation.lastName.badChars && (
                    <FieldWarn text="Невалидни символи" fix='Използвайте само букви — напр. "Петров"' />
                  )}
                  {touched.lastName && !lastName.trim() && (
                    <FieldWarn text="Полето е задължително" fix="Въведете вашата фамилия" />
                  )}
                </div>
              </div>

              {/* ── Имейл ─────────────────────────────── */}
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.label}>
                  Имейл адрес{" "}
                  <span style={{ color: "#6b7280", fontWeight: 400, fontSize: "0.78rem" }}>
                    (само @gmail.com)
                  </span>
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="email"
                    type="email"
                    placeholder="вашият@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => touch("email")}
                    className={`${styles.input} ${
                      touched.email && !validation.email.ok ? styles.inputError : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {!touched.email && (
                  <FieldInfo text="Само Gmail адреси са разрешени" example="ivan.petrov@gmail.com" />
                )}
                {touched.email && validation.email.ok && (
                  <FieldHint ok text="Валиден Gmail адрес!" />
                )}
                {touched.email && validation.email.notGmail && (
                  <FieldWarn
                    text="Не е Gmail адрес"
                    fix='Адресът трябва да завършва на @gmail.com — напр. "ivan@gmail.com"'
                  />
                )}
                {touched.email && !email && (
                  <FieldWarn text="Полето е задължително" fix="Въведете вашия Gmail адрес" />
                )}
              </div>

              {/* ── Парола ────────────────────────────── */}
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>Парола</label>
                <div className={styles.inputContainer}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Създайте парола"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => touch("password")}
                    className={`${styles.input} ${
                      touched.password && !validation.password.ok ? styles.inputError : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowPassword(v => !v)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Изисквания за парола — винаги видими щом потребителят почне да пише */}
                {(touched.password || password) && (
                  <div className={styles.passwordRequirements} style={{ marginTop: "0.5rem" }}>
                    <div
                      style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.4rem", fontWeight: 600 }}
                    >
                      Изисквания за паролата:
                    </div>
                    <div className={styles.strengthChecks}>
                      {[
                        {
                          ok:   validation.password.hasMinLength,
                          text: "Поне 6 символа",
                          fix:  'напр. "Abc123"',
                        },
                        {
                          ok:   validation.password.hasUpperCase,
                          text: "Главна буква (A–Z)",
                          fix:  'добавете буква като "A", "B", "G"',
                        },
                        {
                          ok:   validation.password.hasLowerCase,
                          text: "Малка буква (a–z)",
                          fix:  'добавете буква като "a", "b", "c"',
                        },
                        {
                          ok:   validation.password.hasNumbers,
                          text: "Поне една цифра (0–9)",
                          fix:  'добавете цифра като "1", "5", "9"',
                        },
                      ].map(({ ok, text, fix }) => (
                        <div
                          key={text}
                          className={`${styles.strengthCheck} ${ok ? styles.valid : styles.invalid}`}
                        >
                          {ok
                            ? <CheckCircle size={14} />
                            : <XCircle     size={14} />
                          }
                          <span>
                            {text}
                            {!ok && (
                              <span style={{ color: "#9ca3af", marginLeft: "0.3rem", fontSize: "0.75rem" }}>
                                — {fix}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {touched.password && validation.password.ok && (
                      <FieldHint ok text="Паролата отговаря на всички изисквания!" />
                    )}
                  </div>
                )}

                {!touched.password && !password && (
                  <FieldInfo
                    text="Паролата трябва да съдържа главна буква, малка буква и цифра"
                    example="Slav@123"
                  />
                )}
              </div>

              {/* ── Потвърди паролата ─────────────────── */}
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Потвърдете паролата
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPwd ? "text" : "password"}
                    placeholder="Повторете паролата"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    onBlur={() => touch("confirmPassword")}
                    className={`${styles.input} ${
                      touched.confirmPassword && !validation.confirmPassword.ok ? styles.inputError : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowConfirmPwd(v => !v)}
                    disabled={isLoading}
                  >
                    {showConfirmPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {!touched.confirmPassword && (
                  <FieldInfo text="Въведете паролата отново за потвърждение" />
                )}
                {touched.confirmPassword && validation.confirmPassword.ok && (
                  <FieldHint ok text="Паролите съвпадат!" />
                )}
                {touched.confirmPassword && validation.confirmPassword.mismatch && (
                  <FieldWarn
                    text="Паролите не съвпадат"
                    fix="Уверете се, че въвеждате същата парола и в двете полета"
                  />
                )}
                {touched.confirmPassword && !confirmPassword && (
                  <FieldWarn text="Полето е задължително" fix="Повторете паролата" />
                )}
              </div>

              {/* ── CAPTCHA ───────────────────────────── */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>Въпрос за сигурност</label>
                <div className={styles.captchaContainer}>
                  <div className={styles.captchaQuestion}>
                    <span>Колко е {num1} + {num2}?</span>
                    <button
                      type="button"
                      className={styles.captchaRefresh}
                      onClick={generateCaptcha}
                      disabled={isLoading}
                      title="Генерирай нов въпрос"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className={styles.inputContainer}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Въведете отговора"
                      value={captchaAnswer}
                      onChange={e => {
                        setCaptchaAnswer(e.target.value);
                        touch("captcha");
                      }}
                      onBlur={() => touch("captcha")}
                      className={`${styles.input} ${
                        touched.captcha && !validation.captcha.ok ? styles.inputError : ""
                      }`}
                      disabled={isLoading}
                    />
                  </div>
                  {!touched.captcha && (
                    <FieldInfo
                      text={`Изчислете сумата и въведете резултата`}
                      example={`ако е 3 + 5, въведете "8"`}
                    />
                  )}
                  {touched.captcha && validation.captcha.ok && (
                    <FieldHint ok text="Правилен отговор!" />
                  )}
                  {touched.captcha && validation.captcha.wrong && (
                    <FieldWarn
                      text="Грешен отговор"
                      fix={`Изчислете ${num1} + ${num2} и въведете само числото`}
                    />
                  )}
                  {touched.captcha && !captchaAnswer && (
                    <FieldWarn text="Полето е задължително" fix="Изчислете и въведете резултата" />
                  )}
                </div>
              </div>

              {/* ── Terms ─────────────────────────────── */}
              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  style={{ display: 'none' }}
                  required
                />
                <label htmlFor="terms" className={styles.checkbox} style={{ cursor: 'pointer' }}>
                  {/* Custom checkbox box */}
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: termsAccepted ? '2px solid #16a34a' : '2px solid #d1d5db',
                    background: termsAccepted ? 'linear-gradient(135deg, #16a34a, #22c55e)' : 'transparent',
                    boxShadow: termsAccepted ? '0 2px 8px rgba(22,163,74,0.35)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                    marginTop: '1px',
                  }}>
                    {termsAccepted && (
                      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                        <path
                          d="M1 4L4 7.5L10 1"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className={styles.checkboxText}>
                    Приемам{" "}
                    <a href="/terms" className={styles.termsLink}>Условията за ползване</a> и{" "}
                    <a href="/privacy" className={styles.termsLink}>Политиката за поверителност</a>
                  </span>
                </label>
              </div>

              {/* ── Бутон ─────────────────────────────── */}
              <button
                type="submit"
                className={`${styles.button} ${isLoading ? styles.loading : ""} ${
                  !formIsValid ? styles.disabled : ""
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className={styles.loader} />
                ) : (
                  <>
                    <span>Създай акаунт</span>
                    <ArrowRight className={styles.buttonIcon} />
                  </>
                )}
              </button>

              <div className={styles.divider}><span>или</span></div>

              <div className={styles.alternative}>
                <p className={styles.registerText}>
                  Вече имате акаунт?{" "}
                  <a href="/login" className={styles.registerLink}>Влезте в системата</a>
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

      {/* ── Error Modal ───────────────────────────────── */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorMessage}
      />
    </div>
  );
};

export default Register;