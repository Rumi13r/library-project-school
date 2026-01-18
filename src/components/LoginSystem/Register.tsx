import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { BookOpen, Eye, EyeOff, Shield, CheckCircle, RefreshCw, UserCircle, ArrowRight, XCircle } from "lucide-react";
import styles from './Login.module.css'; // ИЗПОЛЗВАЙ СЪЩИЯ CSS МОДУЛ КАТО LOGIN

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  
  // CAPTCHA state
  const [num1, setNum1] = useState<number>(0);
  const [num2, setNum2] = useState<number>(0);
  const [captchaAnswer, setCaptchaAnswer] = useState<string>("");
  const [captchaError, setCaptchaError] = useState<boolean>(false);

  // Generate CAPTCHA on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const random1 = Math.floor(Math.random() * 10) + 1;
    const random2 = Math.floor(Math.random() * 10) + 1;
    setNum1(random1);
    setNum2(random2);
    setCaptchaAnswer("");
    setCaptchaError(false);
  };

  // Изчисляване на силата на паролата
  const passwordStrength = {
    hasMinLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /[0-9]/.test(password),
  };

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setCaptchaError(false);

    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("Моля, попълнете и двете имена");
      setIsLoading(false);
      return;
    }

    // CAPTCHA validation
    const expectedAnswer = (num1 + num2).toString();
    if (captchaAnswer !== expectedAnswer) {
      setCaptchaError(true);
      setErrorMessage("Грешен отговор на въпроса за сигурност");
      setIsLoading(false);
      generateCaptcha();
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Паролите не съвпадат");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Паролата трябва да е поне 6 символа");
      setIsLoading(false);
      return;
    }

    // Допълнителна проверка за сила на паролата
    if (!isPasswordStrong) {
      setErrorMessage("Паролата не отговаря на всички изисквания за сигурност");
      setIsLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        role: "reader",
        books: [],
        events: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        profile: {
          displayName: `${firstName.trim()} ${lastName.trim()}`,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: "",
          grade: ""
        }
      });

      navigate("/");

    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMsg = error.message;
        if (errorMsg.includes('email-already-in-use')) {
          setErrorMessage("Имейлът вече се използва");
        } else if (errorMsg.includes('weak-password')) {
          setErrorMessage("Паролата е твърде слаба");
        } else if (errorMsg.includes('invalid-email')) {
          setErrorMessage("Невалиден имейл адрес");
        } else {
          setErrorMessage("Възникна грешка при регистрация");
        }
      } else {
        setErrorMessage("Възникна неочаквана грешка");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Enhanced Background with Glass Morphism */}
      <div className={styles.background}>
        <div className={`${styles.shape} ${styles.shape1}`}></div>
        <div className={`${styles.shape} ${styles.shape2}`}></div>
        <div className={`${styles.shape} ${styles.shape3}`}></div>
      </div>

      <div className={styles.content}>
        {/* Left Side - Enhanced Illustration with Background Image */}
        <div className={styles.illustration}>
          <div className={styles.illustrationBg}>
            <img 
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Library" 
              className={styles.bgImage}
            />
            <div className={styles.overlay}></div>
          </div>
          
          <div className={styles.illustrationContent}>
            {/* Main Content */}
            <div>
              <h1 className={styles.illustrationTitle}>Присъединете се към </h1>  
              <h1 className={`${styles.illustrationTitle} ${styles.highlight}`}>Smart School Library</h1>
              <p className={styles.illustrationSubtitle}>
                Създайте своя акаунт и получете достъп до богатата колекция от книги, ресурси и учебни помагала
              </p>
              
              <div className={styles.features}>
                <div className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <BookOpen size={20} />
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureTitle}>10,000+ книги</span>
                    <span className={styles.featureDesc}>Богата колекция</span>
                  </div>
                </div>
                
                <div className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <Shield size={20} />
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureTitle}>Сигурен достъп</span>
                    <span className={styles.featureDesc}>Защитена среда</span>
                  </div>
                </div>
                
                <div className={styles.feature}>
                  <div className={styles.featureIcon}>
                    <UserCircle size={20} />
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureTitle}>Лични данни</span>
                    <span className={styles.featureDesc}>Персонализиран профил</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Register Form */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <form onSubmit={handleRegister}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Създаване на акаунт</h2>
                <p className={styles.alternative}>Попълнете данните си за регистрация</p>
              </div>

              {errorMessage && (
                <div className={styles.error}>
                  <div className={styles.errorIcon}>!</div>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* First Name and Last Name Fields */}
              <div className={styles.nameFields}>
                <div className={styles.inputGroup}>
                  <label htmlFor="firstName" className={styles.label}>
                    Име
                  </label>
                  <div className={styles.inputContainer}>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Вашето име"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={styles.input}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="lastName" className={styles.label}>
                    Фамилия
                  </label>
                  <div className={styles.inputContainer}>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Вашата фамилия"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={styles.input}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

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
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.label}>
                  Парола
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Създайте парола"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                <label className={styles.label}>Сигурност на паролата:</label>
                {password && (
                  <div className={styles.passwordRequirements}>
                    <div className={styles.strengthChecks}>
                      <div className={`${styles.strengthCheck} ${passwordStrength.hasMinLength ? styles.valid : styles.invalid}`}>
                        {passwordStrength.hasMinLength ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Поне 6 символа</span>
                      </div>
                      <div className={`${styles.strengthCheck} ${passwordStrength.hasUpperCase ? styles.valid : styles.invalid}`}>
                        {passwordStrength.hasUpperCase ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Главна буква</span>
                      </div>
                      <div className={`${styles.strengthCheck} ${passwordStrength.hasLowerCase ? styles.valid : styles.invalid}`}>
                        {passwordStrength.hasLowerCase ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Малка буква</span>
                      </div>
                      <div className={`${styles.strengthCheck} ${passwordStrength.hasNumbers ? styles.valid : styles.invalid}`}>
                        {passwordStrength.hasNumbers ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Цифра</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Потвърдете паролата
                </label>
                <div className={styles.inputContainer}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Повторете паролата"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className={styles.passwordMismatch}>
                    Паролите не съвпадат
                  </div>
                )}
              </div>

              {/* CAPTCHA Section */}
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  Въпрос за сигурност
                </label>
                <div className={styles.captchaContainer}>
                  <div className={styles.captchaQuestion}>
                    <span>Колко е {num1} + {num2}?</span>
                    <button
                      type="button"
                      className={styles.captchaRefresh}
                      onClick={generateCaptcha}
                      disabled={isLoading}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className={styles.inputContainer}>
                    <input
                      type="text"
                      placeholder="Въведете отговора"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className={`${styles.input} ${captchaError ? styles.inputError : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {captchaError && (
                    <div className={styles.captchaError}>
                      Грешен отговор. Опитайте отново.
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.checkboxWrapper}>
                <input type="checkbox" id="terms" className={styles.checkboxInput} />
                <label htmlFor="terms" className={styles.checkbox}>
                  <span className={styles.checkboxMark}></span>
                  <span className={styles.checkboxText}>
                    Приемам <a href="/terms" className={styles.termsLink}>Условията за ползване</a> и <a href="/privacy" className={styles.termsLink}>Политиката за поверителност</a>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className={`${styles.button} ${isLoading ? styles.loading : ''} ${!isPasswordStrong ? styles.disabled : ''}`}
                disabled={isLoading || !isPasswordStrong || password !== confirmPassword || !captchaAnswer || !firstName.trim() || !lastName.trim()}
              >
                {isLoading ? (
                  <div className={styles.loader}></div>
                ) : (
                  <>
                    <span>Създай акаунт</span>
                    <ArrowRight className={styles.buttonIcon} />
                  </>
                )}
              </button>

              <div className={styles.divider}>
                <span>или</span>
              </div>

              <div className={styles.alternative}>
                <p className={styles.registerText}>
                  Вече имате акаунт? <a href="/login" className={styles.registerLink}>Влезте в системата</a>
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

export default Register;