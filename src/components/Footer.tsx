import React from 'react';
import {
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Heart,
  ArrowUp,
  Calendar,
  Home,
} from 'lucide-react';
import './Footer.css';

const Footer: React.FC = () => {
  const quickLinks = [
    { name: 'Начало',  href: '/', icon: Home },
    { name: 'Каталог', href: '/catalog', icon: BookOpen }, 
    { name: 'Нови книги', href: '/new-books' },
    { name: 'Събития', href: '/events',  icon: Calendar },
    { name: 'За нас', href: '/about' }, 
  ];

  const resources = [
    { name: 'Електронни книги', href: '/onlineBooks' },
    { name: 'Учебни помагала', href: '/studyMaterials'},
    { name: 'Читателски клуб', href: '/readersClub' },
  ];

  const services = [
    { name: 'ИИ ресурси', href: '/ai-resources' },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      {/* Основна част */}
      <div className="footer-main">
        <div className="footer-container">
          {/* Секция с марка */}
          <div className="brand-section">
            <div className="brand-logo">
              <BookOpen className="logo-icon" />
              <span className="logo-text">Smart School Library</span>
            </div>
            <p className="brand-description">
              Училищната библиотека е посветена на обогатяването на образованието чрез силата на знанието.
              Създаваме вдъхновяваща среда за ученици и учители.
            </p>
          </div>

          {/* Бързи връзки */}
          <div className="footer-section">
            <h3 className="section-title">Бързи връзки</h3>
            <ul className="footer-links">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="footer-link">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Ресурси */}
          <div className="footer-section">
            <h3 className="section-title">Ресурси</h3>
            <ul className="footer-links">
              {resources.map((resource) => (
                <li key={resource.name}>
                  <a href={resource.href} className="footer-link">
                    {resource.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Услуги */}
          <div className="footer-section">
            <h3 className="section-title">Услуги</h3>
            <ul className="footer-links">
              {services.map((service) => (
                <li key={service.name}>
                  <a href={service.href} className="footer-link">
                    {service.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Контакти */}
          <div className="footer-section">
            <h3 className="section-title">Контакти</h3>
            <div className="contact-info">
              <div className="contact-item">
                <MapPin className="contact-icon" />
                <div>
                  <p className="contact-text">бул. „Пещерско шосе 26"</p>
                  <p className="contact-text">Пловдив, България</p>
                </div>
              </div>

              <div className="contact-item">
                <Phone className="contact-icon" />
                <div>
                  <p className="contact-text">Работно време:</p>
                  <p className="contact-text">Пон-Пет: 8:00 - 17:00</p>
                </div>
              </div>

              <div className="contact-item">
                <Mail className="contact-icon" />
                <div>
                  <p className="contact-text">biblioteka@uchilishte.bg</p>
                  <p className="contact-text">Отговаряме в рамките на 24ч</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Долен колонтитул */}
      <div className="footer-bottom">
        <div className="footer-bottom-container">
          <div className="copyright">
            <p>
              © 2025 Smart School Library. Всички права запазени.
              Създадено с <Heart className="heart-icon" /> към образованието
            </p>
          </div>

          <div className="footer-bottom-links">
            <a href="/privacy" className="bottom-link">
              Политика за поверителност
            </a>
            <a href="/terms" className="bottom-link">
              Условия за използване
            </a>
          </div>

          <button
            className="scroll-top-btn"
            onClick={scrollToTop}
            aria-label="Върни се най-отгоре"
          >
            <ArrowUp className="scroll-top-icon" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;