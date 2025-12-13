import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  X, 
  BookOpen, 
  User, 
  ChevronDown, 
  Home, 
  Calendar, 
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  Shield,
  Settings,
  ChevronRight
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import './Header.css';

interface UserData {
  role?: 'admin' | 'librarian' | 'reader';
  profile?: {
    displayName?: string;
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Тема
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  }, [theme]);

  // Скрол
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Затваряне на падащите менюта при клик извън тях
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-dropdown') && !target.closest('.mobile-menu')) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const navigation: NavigationItem[] = [
    { name: 'Начало', href: '/', icon: Home },
    { name: 'Каталог', href: '/catalog', icon: BookOpen },
    { name: 'Събития', href: '/events', icon: Calendar }, 
  ];

  const quickLinks = [
    { name: 'Електронни книги', href: '/onlineBooks' },
    { name: 'Учебни помагала', href: '#' },
    { name: 'ИИ ресурси за учители', href: '/ai-resources' },
    { name: 'Читателски клуб', href: '/readersClub' },
    { name: 'Архив събития', href: '/archivedEvents' },
    { name: 'Работно време', href: '#' },
    { name: 'За нас', href: '#за-нас' },
  ];

  const handleLoginClick = useCallback(() => {
    setIsMenuOpen(false);
    navigate('/login');
  }, [navigate]);

  const handleRegisterClick = useCallback(() => {
    setIsMenuOpen(false);
    navigate('/register');
  }, [navigate]);

  const handleLogoutClick = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setIsMenuOpen(false);
      setIsUserDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleLogoClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleNavClick = useCallback((href: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    if (href.startsWith('/')) {
      navigate(href);
      setIsMenuOpen(false);
    } else if (href.startsWith('#')) {
      window.location.hash = href;
      setIsMenuOpen(false);
    }
  }, [navigate]);

  const handleDashboardClick = useCallback(() => {
    navigate('/dashboard');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [navigate]);

  const handleAdminPanelClick = useCallback(() => {
    navigate('/admin');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [navigate]);

  const getUserDisplayName = useCallback((): string => {
    if (userData?.profile?.displayName) {
      return userData.profile.displayName;
    }
    return currentUser?.email?.split('@')[0] || 'Потребител';
  }, [currentUser, userData]);

  const getUserRoleText = useCallback((): string => {
    switch (userData?.role) {
      case 'admin':
        return 'Администратор';
      case 'librarian':
        return 'Библиотекар';
      case 'reader':
        return 'Читател';
      default:
        return 'Потребител';
    }
  }, [userData]);

  const isActiveLink = useCallback((href: string): boolean => {
    return location.pathname === href || location.hash === href;
  }, [location]);

  const toggleUserDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUserDropdownOpen(prev => !prev);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div 
            className="logo-wrapper" 
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
          >
            <div className="logo-icon-wrapper">
              <BookOpen className="logo-icon" />
            </div>
            <div className="logo-text-container">
              <span className="logo-text">Smart School Library</span>
              <span className="logo-subtitle">Място за знания и вдъхновение</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Основна навигация">
          <div className="nav-links">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const isActive = isActiveLink(item.href);
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  onClick={(e) => handleNavClick(item.href, e)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <IconComponent className="nav-link-icon" />
                  {item.name}
                </a>
              );
            })}
            
            {/* Quick Links Dropdown */}
            <div className="dropdown">
              <button 
                className="dropdown-btn"
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span>Бързи връзки</span>
                <ChevronDown className="dropdown-icon" />
              </button>
              <div className="dropdown-content">
                {quickLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="dropdown-link"
                    onClick={(e) => handleNavClick(link.href, e)}
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Header Actions */}
        <div className="header-actions">
          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Превключване към ${theme === 'light' ? 'тъмна' : 'светла'} тема`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {!loading && (
            <div className="auth-section">
              {currentUser ? (
                <div className="user-dropdown" onClick={toggleUserDropdown}>
                  {/* User Avatar Trigger */}
                  <button 
                    className="user-trigger"
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="user-avatar-small">
                      <User className="user-avatar-icon" />
                    </div>
                    <div className="user-info-small">
                      <span className="user-name-small">{getUserDisplayName()}</span>
                      <ChevronDown className={`dropdown-chevron ${isUserDropdownOpen ? 'rotated' : ''}`} />
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown-header">
                        <div className="dropdown-user-info">
                          <div className="dropdown-avatar">
                            <User size={24} />
                          </div>
                          <div>
                            <div className="dropdown-user-name">{getUserDisplayName()}</div>
                            <div className="dropdown-user-role">{getUserRoleText()}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        className="dropdown-item"
                        onClick={handleDashboardClick}
                      >
                        <LayoutDashboard size={16} />
                        <span>Моят Профил</span>
                        <ChevronRight className="item-chevron" />
                      </button>
                      
                      {userData?.role === 'admin' && (
                        <button 
                          className="dropdown-item"
                          onClick={handleAdminPanelClick}
                        >
                          <Shield size={16} />
                          <span>Админ Панел</span>
                          <ChevronRight className="item-chevron" />
                        </button>
                      )}
                      
                      <button 
                        className="dropdown-item"
                        onClick={() => navigate('/settings')}
                      >
                        <Settings size={16} />
                        <span>Настройки</span>
                        <ChevronRight className="item-chevron" />
                      </button>
                      
                      <div className="dropdown-divider"></div>
                      
                      <button 
                        className="dropdown-item logout-item"
                        onClick={handleLogoutClick}
                      >
                        <LogOut size={16} />
                        <span>Изход</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="guest-actions">
                  <button 
                    className="auth-btn login-btn"
                    onClick={handleLoginClick}
                  >
                    <User className="user-icon" />
                    <span className="btn-text">Вход</span>
                  </button>
                  <button 
                    className="auth-btn register-btn"
                    onClick={handleRegisterClick}
                  >
                    <BookOpen className="user-icon" />
                    <span className="btn-text">Регистрация</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Затваряне на менюто" : "Отваряне на менюто"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div 
        className={`mobile-menu ${isMenuOpen ? 'mobile-menu-open' : ''}`}
        aria-hidden={!isMenuOpen}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mobile-nav">
          {/* Theme Toggle in Mobile */}
          <div className="mobile-theme-section">
            <button
              className="mobile-theme-toggle"
              onClick={toggleTheme}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              <span>{theme === 'light' ? 'Тъмна тема' : 'Светла тема'}</span>
            </button>
          </div>

          {/* Navigation Links */}
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = isActiveLink(item.href);
            
            return (
              <a
                key={item.name}
                href={item.href}
                className={`mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''}`}
                onClick={(e) => handleNavClick(item.href, e)}
                aria-current={isActive ? 'page' : undefined}
              >
                <IconComponent className="mobile-nav-icon" />
                {item.name}
              </a>
            );
          })}
          
          {/* Quick Links in Mobile */}
          <div className="mobile-quick-links">
            <h4 className="quick-links-title">Бързи връзки</h4>
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="mobile-quick-link"
                onClick={(e) => handleNavClick(link.href, e)}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Auth Section in Mobile */}
          <div className="mobile-auth-section">
            {currentUser ? (
              <div className="mobile-user-info">
                <div className="mobile-user-details">
                  <div className="mobile-user-avatar">
                    <User className="mobile-user-avatar-icon" />
                  </div>
                  <div>
                    <div className="mobile-user-name">{getUserDisplayName()}</div>
                    <div className="mobile-user-role">{getUserRoleText()}</div>
                  </div>
                </div>
                <div className="mobile-user-actions">
                  <button 
                    className="mobile-dropdown-item"
                    onClick={handleDashboardClick}
                  >
                    <LayoutDashboard size={16} />
                    <span>Моят Профил</span>
                    <ChevronRight className="item-chevron" />
                  </button>
                  
                  {userData?.role === 'admin' && (
                    <button 
                      className="mobile-dropdown-item"
                      onClick={handleAdminPanelClick}
                    >
                      <Shield size={16} />
                      <span>Админ Панел</span>
                      <ChevronRight className="item-chevron" />
                    </button>
                  )}
                  
                  <button 
                    className="mobile-dropdown-item"
                    onClick={() => navigate('/settings')}
                  >
                    <Settings size={16} />
                    <span>Настройки</span>
                    <ChevronRight className="item-chevron" />
                  </button>
                  
                  <div className="mobile-divider"></div>
                  
                  <button 
                    className="mobile-dropdown-item logout-item"
                    onClick={handleLogoutClick}
                  >
                    <LogOut size={16} />
                    <span>Изход</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-auth-buttons">
                <button 
                  className="mobile-auth-btn login-btn"
                  onClick={handleLoginClick}
                >
                  <User className="user-icon" />
                  <span>Вход в профил</span>
                </button>
                <button 
                  className="mobile-auth-btn register-btn"
                  onClick={handleRegisterClick}
                >
                  <BookOpen className="user-icon" />
                  <span>Регистрация</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;