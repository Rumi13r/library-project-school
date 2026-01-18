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
  ChevronRight,
  BookUser
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import styles from './Header.module.css';

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
      if (!target.closest(`.${styles.userProfileContainer}`) && !target.closest(`.${styles.mobileMenu}`)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [styles]);

  const navigation: NavigationItem[] = [
    { name: 'Начало', href: '/', icon: Home },
    { name: 'Каталог', href: '/catalog', icon: BookOpen },
    { name: 'Събития', href: '/events', icon: Calendar }, 
  ];

  const quickLinks = [
    { name: 'Електронни книги', href: '/onlineBooks' },
    { name: 'Учебни помагала', href: '/studyMaterials' },
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

  // ВСИЧКИ потребители отиват на същия потребителски дашборд
  const handleUserDashboardClick = useCallback(() => {
    // Всички отиват на същия потребителски дашборд
    navigate('/dashboard');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [navigate]);

  const handleAdminDashboardClick = useCallback(() => {
    navigate('/admin');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [navigate]);

  const handleLibrarianDashboardClick = useCallback(() => {
    navigate('/librarian');
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

  // Функция за рендериране на подходящите дашборди според ролята
  const renderDashboardLinks = () => {
    if (!userData?.role) return null;

    switch (userData.role) {
      case 'admin':
        return (
          <>
            <button 
              className={styles.dropdownItem}
              onClick={handleAdminDashboardClick}
            >
              <Shield size={16} />
              <span>Админ Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
            <button 
              className={styles.dropdownItem}
              onClick={handleUserDashboardClick}
            >
              <LayoutDashboard size={16} />
              <span>Моят Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
          </>
        );
      case 'librarian':
        return (
          <>
            <button 
              className={styles.dropdownItem}
              onClick={handleLibrarianDashboardClick}
            >
              <BookUser size={16} />
              <span>Библиотекарски Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
            <button 
              className={styles.dropdownItem}
              onClick={handleUserDashboardClick}
            >
              <LayoutDashboard size={16} />
              <span>Моят Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
          </>
        );
      case 'reader':
        return (
          <button 
            className={styles.dropdownItem}
            onClick={handleUserDashboardClick}
          >
            <LayoutDashboard size={16} />
            <span>Моят Дашборд</span>
            <ChevronRight className={styles.itemChevron} />
          </button>
        );
      default:
        return null;
    }
  };

  // Функция за рендериране на мобилните дашборд линкове
  const renderMobileDashboardLinks = () => {
    if (!userData?.role) return null;

    switch (userData.role) {
      case 'admin':
        return (
          <>
            <button 
              className={styles.mobileDropdownItem}
              onClick={handleAdminDashboardClick}
            >
              <Shield size={16} />
              <span>Админ Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
            <button 
              className={styles.mobileDropdownItem}
              onClick={handleUserDashboardClick}
            >
              <LayoutDashboard size={16} />
              <span>Моят Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
          </>
        );
      case 'librarian':
        return (
          <>
            <button 
              className={styles.mobileDropdownItem}
              onClick={handleLibrarianDashboardClick}
            >
              <BookUser size={16} />
              <span>Библиотекарски Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
            <button 
              className={styles.mobileDropdownItem}
              onClick={handleUserDashboardClick}
            >
              <LayoutDashboard size={16} />
              <span>Моят Дашборд</span>
              <ChevronRight className={styles.itemChevron} />
            </button>
          </>
        );
      case 'reader':
        return (
          <button 
            className={styles.mobileDropdownItem}
            onClick={handleUserDashboardClick}
          >
            <LayoutDashboard size={16} />
            <span>Моят Дашборд</span>
            <ChevronRight className={styles.itemChevron} />
          </button>
        );
      default:
        return null;
    }
  };

  // Добавяне на класове според ролята за аватара
  const getAvatarClass = () => {
    if (!userData?.role) return '';
    switch (userData.role) {
      case 'admin':
        return styles.admin;
      case 'librarian':
        return styles.librarian;
      case 'reader':
        return styles.reader;
      default:
        return '';
    }
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.headerContainer}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div 
            className={styles.logoWrapper} 
            onClick={handleLogoClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
          >
            <div className={styles.logoIconWrapper}>
              <BookOpen className={styles.logoIcon} />
            </div>
            <div className={styles.logoTextContainer}>
              <span className={styles.logoText}>Smart School Library</span>
              <span className={styles.logoSubtitle}>Място за знания и вдъхновение</span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className={styles.desktopNav} aria-label="Основна навигация">
          <div className={styles.navLinks}>
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const isActive = isActiveLink(item.href);
              
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                  onClick={(e) => handleNavClick(item.href, e)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <IconComponent className={styles.navLinkIcon} />
                  {item.name}
                </a>
              );
            })}
            
            {/* Quick Links Dropdown */}
            <div className={styles.dropdown}>
              <button 
                className={styles.dropdownBtn}
                aria-expanded="false"
                aria-haspopup="true"
              >
                <span>Бързи връзки</span>
                <ChevronDown className={styles.dropdownIcon} />
              </button>
              <div className={styles.dropdownContent}>
                {quickLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className={styles.dropdownLink}
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
        <div className={styles.headerActions}>
          {/* Theme Toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Превключване към ${theme === 'light' ? 'тъмна' : 'светла'} тема`}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {!loading && (
            <div className={styles.authSection}>
              {currentUser ? (
                <div className={styles.userProfileContainer} onClick={toggleUserDropdown}>
                  {/* User Avatar Trigger */}
                  <button 
                    className={styles.userTrigger}
                    aria-expanded={isUserDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className={`${styles.userAvatarContainer} ${getAvatarClass()}`}>
                      <User className={`${styles.userAvatarIcon} ${getAvatarClass()}`} />
                    </div>
                    <div className={styles.userInfoWrapper}>
                      <span className={styles.userName}>{getUserDisplayName()}</span>
                      <ChevronDown className={`${styles.dropdownArrow} ${isUserDropdownOpen ? styles.rotated : ''}`} />
                    </div>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div className={styles.userDropdownMenu} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.dropdownHeader}>
                        <div className={styles.dropdownUserInfo}>
                          <div className={`${styles.dropdownAvatar} ${getAvatarClass()}`}>
                            <User size={24} />
                          </div>
                          <div>
                            <div className={styles.dropdownUserName}>{getUserDisplayName()}</div>
                            <div className={styles.dropdownUserRole}>{getUserRoleText()}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className={styles.dropdownDivider}></div>
                      
                      {renderDashboardLinks()}
                      
                      <button 
                        className={styles.dropdownItem}
                        onClick={() => navigate('/settings')}
                      >
                        <Settings size={16} />
                        <span>Настройки</span>
                        <ChevronRight className={styles.itemChevron} />
                      </button>
                      
                      <div className={styles.dropdownDivider}></div>
                      
                      <button 
                        className={`${styles.dropdownItem} ${styles.logoutItem}`}
                        onClick={handleLogoutClick}
                      >
                        <LogOut size={16} />
                        <span>Изход</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.guestActions}>
                  <button 
                    className={`${styles.authBtn} ${styles.loginBtn}`}
                    onClick={handleLoginClick}
                  >
                    <User className={styles.userIcon} />
                    <span className={styles.btnText}>Вход</span>
                  </button>
                  <button 
                    className={`${styles.authBtn} ${styles.registerBtn}`}
                    onClick={handleRegisterClick}
                  >
                    <BookOpen className={styles.userIcon} />
                    <span className={styles.btnText}>Регистрация</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Затваряне на менюто" : "Отваряне на менюто"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className={styles.menuIcon} /> : <Menu className={styles.menuIcon} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div 
        className={`${styles.mobileMenu} ${isMenuOpen ? styles.mobileMenuOpen : ''}`}
        aria-hidden={!isMenuOpen}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.mobileNav}>
          {/* Theme Toggle in Mobile */}
          <div className={styles.mobileThemeSection}>
            <button
              className={styles.mobileThemeToggle}
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
                className={`${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`}
                onClick={(e) => handleNavClick(item.href, e)}
                aria-current={isActive ? 'page' : undefined}
              >
                <IconComponent className={styles.mobileNavIcon} />
                {item.name}
              </a>
            );
          })}
          
          {/* Quick Links in Mobile */}
          <div className={styles.mobileQuickLinks}>
            <h4 className={styles.quickLinksTitle}>Бързи връзки</h4>
            {quickLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={styles.mobileQuickLink}
                onClick={(e) => handleNavClick(link.href, e)}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Auth Section in Mobile */}
          <div className={styles.mobileAuthSection}>
            {currentUser ? (
              <div className={styles.mobileUserInfo}>
                <div className={styles.mobileUserDetails}>
                  <div className={`${styles.mobileUserAvatar} ${getAvatarClass()}`}>
                    <User className={styles.mobileUserAvatarIcon} />
                  </div>
                  <div>
                    <div className={styles.mobileUserName}>{getUserDisplayName()}</div>
                    <div className={styles.mobileUserRole}>{getUserRoleText()}</div>
                  </div>
                </div>
                <div className={styles.mobileUserActions}>
                  {renderMobileDashboardLinks()}
                  
                  <button 
                    className={styles.mobileDropdownItem}
                    onClick={() => navigate('/settings')}
                  >
                    <Settings size={16} />
                    <span>Настройки</span>
                    <ChevronRight className={styles.itemChevron} />
                  </button>
                  
                  <div className={styles.mobileDivider}></div>
                  
                  <button 
                    className={`${styles.mobileDropdownItem} ${styles.logoutItem}`}
                    onClick={handleLogoutClick}
                  >
                    <LogOut size={16} />
                    <span>Изход</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.mobileAuthButtons}>
                <button 
                  className={`${styles.mobileAuthBtn} ${styles.loginBtn}`}
                  onClick={handleLoginClick}
                >
                  <User className={styles.userIcon} />
                  <span>Вход в профил</span>
                </button>
                <button 
                  className={`${styles.mobileAuthBtn} ${styles.registerBtn}`}
                  onClick={handleRegisterClick}
                >
                  <BookOpen className={styles.userIcon} />
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