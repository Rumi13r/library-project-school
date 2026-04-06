import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Bell,
  Trash2,
  Mail,
  ChevronDown,
  FileText,
} from 'lucide-react';
import './PrivacyPage.css';

/* ─── Типове ─────────────────────────────────────────────── */
interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

/* ─── Accordion елемент ──────────────────────────────────── */
const AccordionItem: React.FC<{ section: Section; isOpen: boolean; onToggle: () => void }> = ({
  section, isOpen, onToggle,
}) => (
  <div className={`prv-accordion ${isOpen ? 'prv-accordion--open' : ''}`}>
    <button className="prv-accordion-header" onClick={onToggle} aria-expanded={isOpen}>
      <div className="prv-accordion-left">
        <div className="prv-accordion-icon">{section.icon}</div>
        <span className="prv-accordion-title">{section.title}</span>
      </div>
      <ChevronDown size={18} className="prv-accordion-chevron" />
    </button>
    <div className="prv-accordion-body">
      <div className="prv-accordion-content">{section.content}</div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════ */
const PrivacyPage: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('collection');

  const toggle = (id: string) =>
    setOpenId(prev => (prev === id ? null : id));

  const sections: Section[] = [
    {
      id: 'collection',
      icon: <Database size={20} />,
      title: 'Каква информация събираме',
      content: (
        <>
          <p>При регистрация и използване на платформата събираме следните данни:</p>
          <ul>
            <li><strong>Лични данни</strong> — собствено и фамилно име, имейл адрес, клас/степен на обучение.</li>
            <li><strong>Данни за акаунта</strong> — парола (съхранявана в криптиран вид), дата на регистрация, роля в системата.</li>
            <li><strong>Данни за активност</strong> — заети и върнати книги, посетени събития, история на търсенията в каталога.</li>
            <li><strong>Технически данни</strong> — IP адрес, вид браузър и устройство, дата и час на влизане.</li>
          </ul>
          <p>Не събираме финансова информация, биометрични данни или данни от социални мрежи.</p>
        </>
      ),
    },
    {
      id: 'usage',
      icon: <Eye size={20} />,
      title: 'Как използваме вашите данни',
      content: (
        <>
          <p>Събраните данни се използват единствено за:</p>
          <ul>
            <li>Управление на вашия акаунт и достъп до библиотечните ресурси.</li>
            <li>Проследяване на заетите книги и напомняния за срокове за връщане.</li>
            <li>Персонализирани препоръки за книги на база вашите предпочитания.</li>
            <li>Изпращане на известия за нови книги и предстоящи събития.</li>
            <li>Подобряване на функционалността и потребителското изживяване на платформата.</li>
            <li>Изпълнение на законови задължения на учебното заведение.</li>
          </ul>
          <p>Данните ви <strong>никога не се продават</strong> и не се споделят с рекламодатели.</p>
        </>
      ),
    },
    {
      id: 'storage',
      icon: <Lock size={20} />,
      title: 'Съхранение и сигурност',
      content: (
        <>
          <p>Сигурността на вашите данни е наш приоритет. Прилагаме следните мерки:</p>
          <ul>
            <li><strong>Криптиране</strong> — всички пароли се хешират с bcrypt; данните се предават по HTTPS/TLS.</li>
            <li><strong>Firebase сигурност</strong> — използваме Firebase Authentication и Firestore с правила за достъп на ниво документ.</li>
            <li><strong>Ограничен достъп</strong> — само администратори и библиотекари имат достъп до потребителски данни.</li>
            <li><strong>Период на съхранение</strong> — данните се пазят докато акаунтът е активен или до 2 години след последна активност.</li>
          </ul>
          <p>При съмнение за нарушение на сигурността ще бъдете уведомени в рамките на 72 часа.</p>
        </>
      ),
    },
    {
      id: 'rights',
      icon: <UserCheck size={20} />,
      title: 'Вашите права',
      content: (
        <>
          <p>Съгласно GDPR и действащото българско законодателство имате право на:</p>
          <ul>
            <li><strong>Достъп</strong> — да поискате копие на всички данни, които пазим за вас.</li>
            <li><strong>Коригиране</strong> — да поискате корекция на неточни или непълни данни.</li>
            <li><strong>Изтриване</strong> — да поискате заличаване на данните ви ("право да бъдеш забравен").</li>
            <li><strong>Ограничаване</strong> — да ограничите начина, по който обработваме данните ви.</li>
            <li><strong>Преносимост</strong> — да получите данните си в машинно четим формат (JSON/CSV).</li>
            <li><strong>Възражение</strong> — да възразите срещу обработката на данните ви за конкретни цели.</li>
          </ul>
          <p>За упражняване на правата си изпратете заявка на <a href="mailto:biblioteka@uchilishte.bg" className="prv-link">biblioteka@uchilishte.bg</a>. Отговаряме в рамките на 30 дни.</p>
        </>
      ),
    },
    {
      id: 'cookies',
      icon: <Bell size={20} />,
      title: 'Бисквитки и известия',
      content: (
        <>
          <p>Използваме следните видове бисквитки:</p>
          <ul>
            <li><strong>Задължителни</strong> — необходими за работата на платформата (сесия, автентикация). Не могат да се изключат.</li>
            <li><strong>Функционални</strong> — запомнят предпочитанията ви (тъмен/светъл режим, език). Могат да се управляват от настройките.</li>
            <li><strong>Аналитични</strong> — анонимни данни за посещаемост (Google Analytics). Можете да ги откажете.</li>
          </ul>
          <p>Push известията (за нови книги и напомняния) се изпращат само ако изрично сте дали съгласие от профила си.</p>
        </>
      ),
    },
    {
      id: 'deletion',
      icon: <Trash2 size={20} />,
      title: 'Изтриване на акаунт',
      content: (
        <>
          <p>Можете да поискате изтриване на акаунта си по всяко време:</p>
          <ul>
            <li>Изпратете заявка от имейла, с който сте регистрирани, до <a href="mailto:biblioteka@uchilishte.bg" className="prv-link">biblioteka@uchilishte.bg</a>.</li>
            <li>В рамките на <strong>7 работни дни</strong> ще изтрием личните ви данни от системата.</li>
            <li>История на заети книги може да се запази в анонимизиран вид за статистически цели.</li>
            <li>Ако имате активно заети книги, акаунтът ще бъде деактивиран след тяхното връщане.</li>
          </ul>
          <p>След изтриване данните не могат да бъдат възстановени.</p>
        </>
      ),
    },
    {
      id: 'contact',
      icon: <Mail size={20} />,
      title: 'Контакт и жалби',
      content: (
        <>
          <p>За въпроси, свързани с поверителността на данните, се свържете с нас:</p>
          <ul>
            <li><strong>Имейл:</strong> <a href="mailto:biblioteka@uchilishte.bg" className="prv-link">biblioteka@uchilishte.bg</a></li>
            <li><strong>Адрес:</strong> бул. „Пещерско шосе 26", Пловдив, България</li>
            <li><strong>Работно време:</strong> Понеделник – Петък, 8:00 – 17:00</li>
          </ul>
          <p>
            Ако смятате, че правата ви са нарушени, можете да подадете жалба до{' '}
            <a
              href="https://www.cpdp.bg"
              className="prv-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Комисията за защита на личните данни (КЗЛД)
            </a>.
          </p>
        </>
      ),
    },
  ];

  return (
    <>

      <main className="prv-page">

        {/* ── HERO ────────────────────────────────────── */}
        <section className="prv-hero">
          <div className="prv-hero-bg" aria-hidden="true" />
          <div className="prv-container">
            <div className="prv-hero-badge">
              <Shield size={14} />
              <span>Поверителност</span>
            </div>
            <h1 className="prv-hero-title">
              Политика за<br />
              <span className="prv-hero-accent">поверителност</span>
            </h1>
            <p className="prv-hero-description">
              Защитата на личните ви данни е наш приоритет. Прочетете как събираме,
              използваме и пазим вашата информация.
            </p>
            <div className="prv-hero-meta">
              <div className="prv-meta-item">
                <FileText size={15} />
                <span>Последна актуализация: 1 март 2025 г.</span>
              </div>
              <div className="prv-meta-item">
                <Shield size={15} />
                <span>Съответства с GDPR и ЗЗЛД</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── СЪДЪРЖАНИЕ ──────────────────────────────── */}
        <section className="prv-section">
          <div className="prv-container prv-layout">

            {/* Sticky навигация */}
            <aside className="prv-nav">
              <p className="prv-nav-label">Съдържание</p>
              <nav>
                {sections.map(s => (
                  <button
                    key={s.id}
                    className={`prv-nav-link ${openId === s.id ? 'prv-nav-link--active' : ''}`}
                    onClick={() => {
                      setOpenId(s.id);
                      document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <span className="prv-nav-icon">{s.icon}</span>
                    {s.title}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Accordion секции */}
            <div className="prv-content">
              <p className="prv-intro">
                Smart School Library се ангажира да защитава личните данни на своите потребители
                в съответствие с Регламент (ЕС) 2016/679 (GDPR) и Закона за защита на личните
                данни (ЗЗЛД). Тази политика описва какви данни събираме и как ги използваме.
              </p>

              <div className="prv-accordion-list">
                {sections.map(s => (
                  <div id={`section-${s.id}`} key={s.id}>
                    <AccordionItem
                      section={s}
                      isOpen={openId === s.id}
                      onToggle={() => toggle(s.id)}
                    />
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="prv-cta">
                <p className="prv-cta-text">
                  Имате въпрос относно вашите данни?
                </p>
                <a href="mailto:biblioteka@uchilishte.bg" className="prv-cta-btn">
                  <Mail size={16} />
                  Свържете се с нас
                </a>
              </div>
            </div>

          </div>
        </section>

      </main>

    </>
  );
};

export default PrivacyPage;