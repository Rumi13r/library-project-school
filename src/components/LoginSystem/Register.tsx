import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { BookOpen, Eye, EyeOff, Shield, CheckCircle, RefreshCw, UserCircle, ArrowRight, XCircle } from "lucide-react";
import './Login.css';

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
    <div className="login-container">
      {/* Enhanced Background with Glass Morphism */}
      <div className="login-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>

      <div className="login-content">
        {/* Left Side - Enhanced Illustration with Background Image */}
        <div className="login-illustration">
          <div className="illustration-background">
            <img 
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Library" 
              className="background-image"
            />
            <div className="background-overlay"></div>
          </div>
          
          <div className="illustration-container">
            {/* Main Content */}
            <div className="illustration-content">
              <h1 className="illustration-title">Присъединете се към </h1>  
              <h1 className="illustration-title highlight">Smart School Library</h1>
              <p className="illustration-subtitle">
                Създайте своя акаунт и получете достъп до богатата колекция от книги, ресурси и учебни помагала
              </p>
              
              <div className="features-list">
                <div className="feature-item">
                  <div className="feature-icon">
                    <BookOpen size={20} />
                  </div>
                  <div className="feature-text">
                    <span className="feature-title">10,000+ книги</span>
                    <span className="feature-desc">Богата колекция</span>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">
                    <Shield size={20} />
                  </div>
                  <div className="feature-text">
                    <span className="feature-title">Сигурен достъп</span>
                    <span className="feature-desc">Защитена среда</span>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">
                    <UserCircle size={20} />
                  </div>
                  <div className="feature-text">
                    <span className="feature-title">Лични данни</span>
                    <span className="feature-desc">Персонализиран профил</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Register Form */}
        <div className="login-form-section">
          <div className="form-glass-container">
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-header">
                <h2 className="form-title">Създаване на акаунт</h2>
                <p className="alternative-actions">Попълнете данните си за регистрация</p>
              </div>

              {errorMessage && (
                <div className="error-message">
                  <div className="error-icon">!</div>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* First Name and Last Name Fields */}
              <div className="name-fields">
                <div className="input-group">
                  <label htmlFor="firstName" className="alternative-actions">
                    Име
                  </label>
                  <div className="input-container">
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Вашето име"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="form-input"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="lastName" className="alternative-actions">
                    Фамилия
                  </label>
                  <div className="input-container">
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Вашата фамилия"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="form-input"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="email" className="alternative-actions">
                  Имейл адрес
                </label>
                <div className="input-container">
                  <input
                    id="email"
                    type="email"
                    placeholder="вашият@имейл.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password" className="alternative-actions">
                  Парола
                </label>
                <div className="input-container">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Създайте парола"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                <label className="alternative-actions">Сигурност на паролата:</label>
                {password && (
                  <div className="password-strength">
                    <div className="strength-checks">
                      <div className={`strength-check ${passwordStrength.hasMinLength ? 'valid' : 'invalid'}`}>
                        {passwordStrength.hasMinLength ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Поне 6 символа</span>
                      </div>
                      <div className={`strength-check ${passwordStrength.hasUpperCase ? 'valid' : 'invalid'}`}>
                        {passwordStrength.hasUpperCase ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Главна буква</span>
                      </div>
                      <div className={`strength-check ${passwordStrength.hasLowerCase ? 'valid' : 'invalid'}`}>
                        {passwordStrength.hasLowerCase ? (
                          <CheckCircle size={16} />
                        ) : (
                          <XCircle size={16} />
                        )}
                        <span>Малка буква</span>
                      </div>
                      <div className={`strength-check ${passwordStrength.hasNumbers ? 'valid' : 'invalid'}`}>
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

              <div className="input-group">
                <label htmlFor="confirmPassword" className="alternative-actions">
                  Потвърдете паролата
                </label>
                <div className="input-container">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Повторете паролата"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <div className="password-mismatch">
                    Паролите не съвпадат
                  </div>
                )}
              </div>

              {/* CAPTCHA Section */}
              <div className="input-group">
                <label className="alternative-actions">
                  Въпрос за сигурност
                </label>
                <div className="captcha-container">
                  <div className="captcha-question">
                    <span>Колко е {num1} + {num2}?</span>
                    <button
                      type="button"
                      className="captcha-refresh"
                      onClick={generateCaptcha}
                      disabled={isLoading}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className="input-container">
                    <input
                      type="text"
                      placeholder="Въведете отговора"
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className={`form-input ${captchaError ? 'input-error' : ''}`}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {captchaError && (
                    <div className="captcha-error">
                      Грешен отговор. Опитайте отново.
                    </div>
                  )}
                </div>
              </div>

              <div className="checkbox-wrapper">
                <input type="checkbox" id="remember-me" className="checkbox-input" />
                <label htmlFor="remember-me" className="checkbox-label">
                  <span className="checkmark"></span>
                  Приемам <a href="/terms" className="terms-link">Условията за ползване</a> и <a href="/privacy" className="terms-link">Политиката за поверителност</a>
                </label>
              </div>

              <button
                type="submit"
                className={`login-button ${isLoading ? 'loading' : ''} ${!isPasswordStrong ? 'disabled' : ''}`}
                disabled={isLoading || !isPasswordStrong || password !== confirmPassword || !captchaAnswer || !firstName.trim() || !lastName.trim()}
              >
                {isLoading ? (
                  <div className="button-loader"></div>
                ) : (
                  <>
                    <span>Създай акаунт</span>
                    <ArrowRight className="button-icon" />
                  </>
                )}
              </button>

              <div className="login-divider">
                <span>или</span>
              </div>

              <div className="alternative-actions">
                <p className="register-text">
                  Вече имате акаунт? <a href="/login" className="register-link">Влезте в системата</a>
                </p>
              </div>
            </form>
          </div>

          <div className="login-footer">
            <p className="footer-text">
              © 2024 Smart School Library. Всички права запазени.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;