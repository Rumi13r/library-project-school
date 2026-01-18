import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { BookOpen, Eye, EyeOff, ArrowRight, User, Shield } from "lucide-react";
import styles from './Login.module.css'; // Това е промяната!

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Вземаме данните от Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Пренасочване според ролята
        if (userData.role === "admin") {
          navigate("/admin");
        } else if (userData.role === "librarian") {
          navigate("/librarian");
        } else {
          navigate("/dashboard");
        }
      } else {
        setErrorMessage("Потребителят няма зададена роля");
      }

    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorMsg = error.message;
        if (errorMsg.includes('invalid-credential')) {
          setErrorMessage("Грешен имейл или парола");
        } else if (errorMsg.includes('too-many-requests')) {
          setErrorMessage("Твърде много опити. Опитайте по-късно.");
        } else {
          setErrorMessage("Възникна грешка при влизане");
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
              <h1 className={styles.illustrationTitle}>Добре дошли в </h1>  
              <h1 className={`${styles.illustrationTitle} ${styles.highlight}`}>Smart School Library</h1>
              <p className={styles.illustrationSubtitle}>
                Влезте в своя акаунт за достъп до богатата колекция от книги, ресурси и учебни помагала
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
                    <User size={20} />
                  </div>
                  <div className={styles.featureText}>
                    <span className={styles.featureTitle}>Персонализирано</span>
                    <span className={styles.featureDesc}>Индивидуален профил</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Login Form */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <form onSubmit={handleLogin}>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Вход в системата</h2>
                <p className={styles.alternative}>Въведете вашите данни за достъп</p>
              </div>

              {errorMessage && (
                <div className={styles.error}>
                  <div className={styles.errorIcon}>!</div>
                  <span>{errorMessage}</span>
                </div>
              )}

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
                    placeholder="Въведете паролата си"
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
              </div>

              <div className={styles.formOptions}>
                <div className={styles.checkbox}>
                  <input type="checkbox" id="remember-me" className={styles.checkboxInput} />
                  <label htmlFor="remember-me">
                    <span className={styles.checkboxMark}></span>
                    <span className={styles.checkboxText}>Запомни ме</span>
                  </label>
                </div>
                <a href="/forgot-password" className={styles.forgot}>
                  Забравена парола?
                </a>
              </div>

              <button
                type="submit"
                className={`${styles.button} ${isLoading ? styles.loading : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className={styles.loader}></div>
                ) : (
                  <>
                    <span>Влез в акаунта</span>
                    <ArrowRight className={styles.buttonIcon} />
                  </>
                )}
              </button>

              <div className={styles.divider}>
                <span>или</span>
              </div>

              <div className={styles.alternative}>
                <p className={styles.registerText}>
                  Нямате акаунт? <a href="/register" className={styles.registerLink}>Създайте нов</a>
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

export default Login;