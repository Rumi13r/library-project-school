import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebase";
import { BookOpen, Eye, EyeOff, ArrowRight, User, Shield } from "lucide-react";
import './Login.css';

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
            {/* Main Content - ОРИГИНАЛНОТО ЛОГО И СТРУКТУРА */}
            <div className="illustration-content">
              <h1 className="illustration-title">Добре дошли в </h1>  
              <h1 className="illustration-title highlight">Smart School Library</h1>
              <p className="illustration-subtitle">
                Влезте в своя акаунт за достъп до богатата колекция от книги, ресурси и учебни помагала
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
                    <User size={20} />
                  </div>
                  <div className="feature-text">
                    <span className="feature-title">Персонализирано</span>
                    <span className="feature-desc">Индивидуален профил</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Login Form (ОСТАВА СЪЩИЯ) */}
        <div className="login-form-section">
          <div className="form-glass-container">
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-header">
                <h2 className="form-title">Вход в системата</h2>
                <p className="alternative-actions">Въведете вашите данни за достъп</p>
              </div>

              {errorMessage && (
                <div className="error-message">
                  <div className="error-icon">!</div>
                  <span>{errorMessage}</span>
                </div>
              )}

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
                    placeholder="Въведете паролата си"
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
              </div>

              <div className="form-options">
  <div className="checkbox-wrapper">
    <input type="checkbox" id="remember-me" className="checkbox-input" />
    <label htmlFor="remember-me" className="checkbox-label">
      <span className="checkmark"></span>
      <span className="checkbox-text">Запомни ме</span>
    </label>
  </div>
  <a href="/forgot-password" className="forgot-password">
    Забравена парола?
  </a>
</div>

              <button
                type="submit"
                className={`login-button ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="button-loader"></div>
                ) : (
                  <>
                    <span>Влез в акаунта</span>
                    <ArrowRight className="button-icon" />
                  </>
                )}
              </button>

              <div className="login-divider">
                <span>или</span>
              </div>

              <div className="alternative-actions">
                <p className="register-text">
                  Нямате акаунт? <a href="/register" className="register-link">Създайте нов</a>
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

export default Login;