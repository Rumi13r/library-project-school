import React from 'react';
import {
  BookOpen,
  Users,
  Heart,
  Star,
  Award,
  Clock,
  MapPin,
  Mail,
  Phone,
  Target,
  Lightbulb,
  Shield,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  const stats = [
    { value: '5000+', label: 'Книги в каталога',     icon: BookOpen },
    { value: '500+', label: 'Активни читатели',      icon: Users    },
    { value: '20+',   label: 'Години опит',           icon: Award    },
    { value: '98%',   label: 'Доволни потребители',   icon: Star     },
  ];

  const values = [
    {
      icon: BookOpen,
      title: 'Знание',
      description:
        'Вярваме, че достъпът до знание е основно право на всеки ученик. Нашата библиотека осигурява богата колекция от ресурси за всички.',
    },
    {
      icon: Lightbulb,
      title: 'Иновация',
      description:
        'Непрекъснато обновяваме колекцията си с нови заглавия и дигитални ресурси, за да отговорим на нуждите на съвременното образование.',
    },
    {
      icon: Heart,
      title: 'Общност',
      description:
        'Създаваме топла и приветлива среда, в която ученици и учители могат да се срещат, споделят и вдъхновяват взаимно.',
    },
    {
      icon: Shield,
      title: 'Доверие',
      description:
        'Изграждаме дълготрайни отношения с нашите читатели, основани на взаимно уважение и отговорност към знанието.',
    },
  ];

  return (
    <>
      <Header />

      <main className="about-page">

        {/* ── HERO ── */}
        <section className="about-hero">
          <div className="about-hero-bg" aria-hidden="true" />
          <div className="about-container">
            <div className="about-hero-badge">
              <BookOpen size={14} />
              <span>За нас</span>
            </div>

            <h1 className="about-hero-title">
              Вдъхновяваме<br />
              <span className="about-hero-accent">любовта към четенето</span>
            </h1>

            <p className="about-hero-description">
              Smart School Library е повече от библиотека — това е живо пространство
              за знание, творчество и общност. Тук всеки ученик намира своя свят.
            </p>

            <div className="about-hero-stats">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div className="about-stat-card" key={stat.label}>
                    <div className="about-stat-icon">
                      <Icon size={20} />
                    </div>
                    <div className="about-stat-value">{stat.value}</div>
                    <div className="about-stat-label">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ИСТОРИЯ ── */}
        <section className="about-section">
          <div className="about-container about-story-grid">
            <div className="about-story-text">
              <div className="about-section-tag">Нашата история</div>
              <h2 className="about-section-title">
                Място, създадено с любов към знанието
              </h2>
              <p className="about-body-text">
                Библиотеката е основана преди повече от 15 години с една проста мисия —
                да даде на всеки ученик достъп до света на книгите. Оттогава сме нараснали
                от скромна читалня до модерен информационен център.
              </p>
              <p className="about-body-text">
                Днес разполагаме с над 5 000 заглавия, богата дигитална колекция и активен
                читателски клуб, който обединява ученици и учители около общата страст към четенето.
              </p>

              <div className="about-story-highlights">
                <div className="about-highlight">
                  <Clock size={16} />
                  <span>Пон – Пет: 8:00 – 17:00</span>
                </div>
                <div className="about-highlight">
                  <MapPin size={16} />
                  <span>бул. „Пещерско шосе 26", Пловдив</span>
                </div>
                <div className="about-highlight">
                  <Target size={16} />
                  <span>Мисия: Достъп до знание за всеки</span>
                </div>
              </div>
            </div>

            <div className="about-story-visual">
              <div className="about-visual-card about-visual-card--main">
                <BookOpen size={48} className="about-visual-icon" />
                <div className="about-visual-text">
                  <strong>Smart School Library</strong>
                  <span>Вашето място за знание</span>
                </div>
              </div>
              <div className="about-visual-card about-visual-card--accent">
                <Heart size={20} className="about-visual-icon-sm" />
                <span>Обичаме книгите</span>
              </div>
              <div className="about-visual-card about-visual-card--stat">
                <span className="about-visual-big">20+</span>
                <span className="about-visual-sub">години опит</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── ЦЕННОСТИ ── */}
        <section className="about-section about-section--alt">
          <div className="about-container">
            <div className="about-section-header">
              <div className="about-section-tag">Нашите ценности</div>
              <h2 className="about-section-title">Принципите, които ни водят</h2>
              <p className="about-section-subtitle">
                Всичко, което правим, е вдъхновено от четири основни ценности.
              </p>
            </div>

            <div className="about-values-grid">
              {values.map((value) => {
                const Icon = value.icon;
                return (
                  <div className="about-value-card" key={value.title}>
                    <div className="about-value-icon">
                      <Icon size={24} />
                    </div>
                    <h3 className="about-value-title">{value.title}</h3>
                    <p className="about-value-description">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── ЕКИП ── */}
        <section className="about-section">
          <div className="about-container">
            <div className="about-section-header">
              <div className="about-section-tag">Нашият екип</div>
              <h2 className="about-section-title">Човекът зад библиотеката</h2>
              <p className="about-section-subtitle">
                Посветен специалист, готов да ви помогне по всяко време.
              </p>
            </div>

            <div className="about-team-single">
              <div className="about-team-card">
                <div className="about-team-avatar about-team-avatar--green">ПЕ</div>
                <h3 className="about-team-name">Петя</h3>
                <div className="about-team-role">Главен библиотекар</div>
                <p className="about-team-description">
                  С над 20 години опит в управлението на училищни библиотеки.
                  Специалист по детска литература и образователни ресурси.
                  Отговаря за цялостната организация и развитие на библиотеката.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── КОНТАКТИ CTA ── */}
        <section className="about-section about-section--cta">
          <div className="about-container">
            <div className="about-cta-box">
              <div className="about-cta-icon">
                <Mail size={32} />
              </div>
              <h2 className="about-cta-title">Свържете се с нас</h2>
              <p className="about-cta-text">
                Имате въпрос или предложение? Ние сме тук да помогнем.
              </p>
              <div className="about-cta-contacts">
                <a href="mailto:biblioteka@uchilishte.bg" className="about-cta-link">
                  <Mail size={16} />
                  biblioteka@uchilishte.bg
                </a>
                <a href="tel:021234567" className="about-cta-link">
                  <Phone size={16} />
                  (02) 123 4567
                </a>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default AboutPage;