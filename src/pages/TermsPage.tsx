import React, { useState } from 'react';
import {
  FileText, BookOpen, UserCheck, Ban, RefreshCw, Scale, Mail,
  ChevronDown, CheckCircle, AlertTriangle,
} from 'lucide-react';
import './TermsPage.css';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}

const AccordionItem: React.FC<{
  section: Section;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ section, isOpen, onToggle }) => (
  <div className={`trm-accordion ${isOpen ? 'trm-accordion--open' : ''}`}>
    <button className="trm-accordion-header" onClick={onToggle} aria-expanded={isOpen}>
      <div className="trm-accordion-left">
        <div className="trm-accordion-icon">{section.icon}</div>
        <span className="trm-accordion-title">{section.title}</span>
      </div>
      <ChevronDown size={18} className="trm-accordion-chevron" />
    </button>
    <div className="trm-accordion-body">
      <div className="trm-accordion-content">{section.content}</div>
    </div>
  </div>
);

const TermsPage: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('general');

  const toggle = (id: string) => setOpenId(prev => (prev === id ? null : id));

  const sections: Section[] = [
    {
      id: 'general',
      icon: <FileText size={20} />,
      title: 'Общи условия',
      content: (
        <>
          <p>
            Настоящите Условия за ползване уреждат достъпа и използването на платформата
            Smart School Library. С регистрацията потвърждавате, че сте прочели,
            разбрали и се съгласявате с всички условия.
          </p>
          <p>
            Платформата е предназначена изключително за ученици, учители и служители
            на учебното заведение. Достъпът е личен и непрехвърляем.
          </p>
          <ul>
            <li>Условията влизат в сила от датата на регистрация.</li>
            <li>Запазваме правото да актуализираме условията по всяко време.</li>
            <li>При съществени промени ще получите известие по имейл.</li>
            <li>Продължаването на използването означава приемане на промените.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'registration',
      icon: <UserCheck size={20} />,
      title: 'Регистрация и акаунт',
      content: (
        <>
          <p>За пълен достъп до платформата е необходима регистрация:</p>
          <ul>
            <li>Регистрацията е разрешена само с валиден <strong>Gmail адрес</strong> (@gmail.com).</li>
            <li>Трябва да предоставите вярно собствено и фамилно име.</li>
            <li>Всеки потребител може да има само <strong>един активен акаунт</strong>.</li>
            <li>Вие сте отговорни за поверителността на паролата си.</li>
            <li>При съмнение за неоторизиран достъп незабавно уведомете библиотекаря.</li>
            <li>Акаунтите на ученици се деактивират при напускане на учебното заведение.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'books',
      icon: <BookOpen size={20} />,
      title: 'Заемане и връщане на книги',
      content: (
        <>
          <p>Правилата за заемане на библиотечни материали са следните:</p>
          <ul>
            <li><strong>Максимален брой:</strong> едновременно могат да се заемат до 3 книги.</li>
            <li><strong>Срок за връщане:</strong> стандартният срок е 14 дни; може да се удължи с 7 дни.</li>
            <li><strong>Удължаване:</strong> позволено е най-много 2 пъти за една книга.</li>
            <li><strong>Закъснение:</strong> при просрочване достъпът до заемане може да бъде ограничен.</li>
            <li><strong>Повреда или загуба:</strong> потребителят е финансово отговорен за увредени материали.</li>
            <li><strong>Резервации:</strong> книга може да се резервира ако е заета от друг читател.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'conduct',
      icon: <CheckCircle size={20} />,
      title: 'Правила за поведение',
      content: (
        <>
          <p>При използване на платформата потребителите са длъжни да:</p>
          <ul>
            <li>Спазват авторските права на всички дигитални и физически материали.</li>
            <li>Не споделят достъп до акаунта си с трети лица.</li>
            <li>Използват платформата само за образователни цели.</li>
            <li>Не публикуват невярна, обидна или неподходяща информация.</li>
            <li>Отнасят се с уважение към другите потребители и библиотечния персонал.</li>
            <li>Уведомяват администрацията при технически проблеми или злоупотреби.</li>
          </ul>
          <p>Спазването на тези правила осигурява приятна среда за всички членове.</p>
        </>
      ),
    },
    {
      id: 'prohibited',
      icon: <Ban size={20} />,
      title: 'Забранени действия',
      content: (
        <>
          <p>Строго се забранява:</p>
          <ul>
            <li>Използване на ботове или автоматизирани инструменти за достъп.</li>
            <li>Опити за хакване или заобикаляне на системата за сигурност.</li>
            <li>Качване или разпространение на вируси или зловреден код.</li>
            <li>Копиране или разпространение на защитено с авторски права съдържание.</li>
            <li>Регистрация с фалшиви данни или представяне за друг потребител.</li>
            <li>Търговско използване на информация от платформата.</li>
          </ul>
          <p>Нарушенията водят до незабавно блокиране и уведомяване на ръководството.</p>
        </>
      ),
    },
    {
      id: 'warnings',
      icon: <AlertTriangle size={20} />,
      title: 'Санкции и предупреждения',
      content: (
        <>
          <p>При нарушаване на условията се прилага следната процедура:</p>
          <ul>
            <li><strong>1-во нарушение:</strong> писмено предупреждение по имейл.</li>
            <li><strong>2-ро нарушение:</strong> временно ограничаване на акаунта за 7 дни.</li>
            <li><strong>3-то нарушение:</strong> постоянно блокиране на акаунта.</li>
            <li>При тежки нарушения акаунтът се блокира незабавно без предупреждение.</li>
            <li>Можете да обжалвате санкция в рамките на 14 дни по имейл.</li>
          </ul>
          <p>Целта на санкциите е не наказание, а поддържане на реда в общността.</p>
        </>
      ),
    },
    {
      id: 'changes',
      icon: <RefreshCw size={20} />,
      title: 'Промени в условията',
      content: (
        <>
          <p>Smart School Library си запазва правото да изменя настоящите условия:</p>
          <ul>
            <li>При незначителни промени ще публикуваме актуализирана версия.</li>
            <li>При съществени промени ще уведомим по имейл поне <strong>14 дни предварително</strong>.</li>
            <li>Датата на последна актуализация е видима в горната част.</li>
            <li>Ако не сте съгласни, можете да поискате изтриване на акаунта си.</li>
          </ul>
          <p>Препоръчваме периодично да преглеждате условията за евентуални промени.</p>
        </>
      ),
    },
    {
      id: 'liability',
      icon: <Scale size={20} />,
      title: 'Отговорност и право',
      content: (
        <>
          <p>Относно отговорността и приложимото право:</p>
          <ul>
            <li>Платформата се предоставя „както е" без гаранции за непрекъснатост.</li>
            <li>Не носим отговорност за загуба на данни поради технически проблеми.</li>
            <li>Потребителят е отговорен за всички действия с неговия акаунт.</li>
            <li>Условията се уреждат от <strong>българското законодателство</strong>.</li>
            <li>Споровете се решават по взаимно съгласие или пред компетентния съд.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'contact',
      icon: <Mail size={20} />,
      title: 'Контакт',
      content: (
        <>
          <p>За въпроси, свързани с условията за ползване:</p>
          <ul>
            <li>
              <strong>Имейл:</strong>{' '}
              <a href="mailto:biblioteka@uchilishte.bg" className="trm-link">
                biblioteka@uchilishte.bg
              </a>
            </li>
            <li><strong>Адрес:</strong> бул. „Пещерско шосе 26", Пловдив, България</li>
            <li><strong>Работно време:</strong> Понеделник – Петък, 8:00 – 17:00</li>
          </ul>
          <p>Отговаряме на всички запитвания в рамките на <strong>2 работни дни</strong>.</p>
        </>
      ),
    },
  ];

  return (
    <main className="trm-page">

      {/* ── HERO ────────────────────────────────────── */}
      <section className="trm-hero">
        <div className="trm-hero-bg" aria-hidden="true" />
        <div className="trm-container">
          <div className="trm-hero-badge">
            <FileText size={14} />
            <span>Правна информация</span>
          </div>
          <h1 className="trm-hero-title">
            Условия за<br />
            <span className="trm-hero-accent">ползване</span>
          </h1>
          <p className="trm-hero-description">
            Прочетете правилата и условията за използване на платформата
            Smart School Library преди да продължите.
          </p>
          <div className="trm-hero-meta">
            <div className="trm-meta-item">
              <FileText size={15} />
              <span>Последна актуализация: 1 март 2025 г.</span>
            </div>
            <div className="trm-meta-item">
              <Scale size={15} />
              <span>Съгласно българското законодателство</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── СЪДЪРЖАНИЕ ──────────────────────────────── */}
      <section className="trm-section">
        <div className="trm-container trm-layout">

          {/* Sticky навигация */}
          <aside className="trm-nav">
            <p className="trm-nav-label">Съдържание</p>
            <nav>
              {sections.map(s => (
                <button
                  key={s.id}
                  className={`trm-nav-link ${openId === s.id ? 'trm-nav-link--active' : ''}`}
                  onClick={() => {
                    setOpenId(s.id);
                    document
                      .getElementById(`section-${s.id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <span className="trm-nav-icon">{s.icon}</span>
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Accordion секции */}
          <div className="trm-content">
            <p className="trm-intro">
              Добре дошли в Smart School Library. Тези условия регулират използването
              на нашата платформа. Моля, прочетете ги внимателно — те описват вашите
              права и задължения като потребител на системата.
            </p>

            <div className="trm-accordion-list">
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

            <div className="trm-cta">
              <p className="trm-cta-text">Имате въпрос относно условията?</p>
              <a href="mailto:biblioteka@uchilishte.bg" className="trm-cta-btn">
                <Mail size={16} />
                Свържете се с нас
              </a>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
};

export default TermsPage;