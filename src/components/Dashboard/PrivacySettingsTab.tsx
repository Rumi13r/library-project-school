// src/components/Dashboard/PrivacySettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
  Shield, FileText, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, AlertTriangle,
  Lock, Eye, Bell, Trash2,
} from 'lucide-react';
import styles from './UserDashboard.module.css';

interface ConsentRecord {
  privacyPolicy:   boolean;
  termsOfUse:      boolean;
  cookieConsent:   boolean;
  marketingEmails: boolean;
  acceptedAt?:     string;
  privacyVersion:  string;
  termsVersion:    string;
}

const PRIVACY_VERSION = '1.0.0';
const TERMS_VERSION   = '1.0.0';

const EMPTY_CONSENT: ConsentRecord = {
  privacyPolicy: false, termsOfUse: false,
  cookieConsent: false, marketingEmails: false,
  privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION,
};

interface Props { userId: string; userEmail: string; }

// ─────────────────────────────────────────────────────────────────────────────
const PrivacySettingsTab: React.FC<Props> = ({ userId, userEmail }) => {
  const [consent,     setConsent]     = useState<ConsentRecord>(EMPTY_CONSENT);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'user_consent', userId));
        if (snap.exists()) setConsent(snap.data() as ConsentRecord);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleSave = async () => {
    if (!consent.privacyPolicy || !consent.termsOfUse) {
      alert('Трябва да приемете Политиката за поверителност и Условията за използване.');
      return;
    }
    try {
      setSaving(true);
      await setDoc(doc(db, 'user_consent', userId), {
        ...consent, acceptedAt: new Date().toISOString(),
        updatedAt: Timestamp.now(), userEmail,
        privacyVersion: PRIVACY_VERSION, termsVersion: TERMS_VERSION,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); alert('Грешка при запазване!'); }
    finally { setSaving(false); }
  };

  const tog = (k: 'privacyPolicy'|'termsOfUse'|'cookieConsent'|'marketingEmails') => {
    setConsent(p => ({ ...p, [k]: !p[k] })); setSaved(false);
  };

  if (loading) return <div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Настройки и Поверителност</h2>
        <p className={styles.sectionSubtitle}>Управлявайте съгласията си и прегледайте правилата за ползване.</p>
      </div>

      {/* Required */}
      <div className="privacy-section">
        <h3 className="privacy-section-title"><Shield size={17} style={{color:'#3b82f6'}}/>Задължителни съгласия</h3>
        <ConsentCard
          icon={<Lock size={17} style={{color:'#3b82f6'}}/>}
          title="Политика за поверителност" version={PRIVACY_VERSION}
          accepted={consent.privacyPolicy} required
          expanded={showPrivacy} onToggleExpand={()=>setShowPrivacy(v=>!v)}
          onToggleAccept={()=>tog('privacyPolicy')}
          summary="Описва как събираме, използваме и защитаваме вашите лични данни съгласно GDPR."
          fullText={PRIVACY_POLICY_TEXT} acceptedAt={consent.acceptedAt}
        />
        <ConsentCard
          icon={<FileText size={17} style={{color:'#8b5cf6'}}/>}
          title="Условия за ползване" version={TERMS_VERSION}
          accepted={consent.termsOfUse} required
          expanded={showTerms} onToggleExpand={()=>setShowTerms(v=>!v)}
          onToggleAccept={()=>tog('termsOfUse')}
          summary="Правилата за използване на библиотечната система, вашите права и задължения."
          fullText={TERMS_OF_USE_TEXT} acceptedAt={consent.acceptedAt}
        />
      </div>

      {/* Optional */}
      <div className="privacy-section">
        <h3 className="privacy-section-title"><Bell size={17} style={{color:'#10b981'}}/>Допълнителни предпочитания</h3>
        <OptionalToggle
          icon={<Eye size={15} style={{color:'#10b981'}}/>}
          title="Бисквитки (Cookies)"
          description="Функционални бисквитки за по-добро потребителско изживяване."
          checked={consent.cookieConsent} onChange={()=>tog('cookieConsent')}
        />
        <OptionalToggle
          icon={<Bell size={15} style={{color:'#f59e0b'}}/>}
          title="Известия по имейл"
          description="Получавайте известия за нови книги, събития и напомняния за заеми."
          checked={consent.marketingEmails} onChange={()=>tog('marketingEmails')}
        />
      </div>

      {/* Warning */}
      {!consent.privacyPolicy || !consent.termsOfUse ? (
        <div className="privacy-warning">
          <AlertTriangle size={17} style={{color:'#f59e0b',flexShrink:0}}/>
          <p>Трябва да приемете <strong>Политиката за поверителност</strong> и <strong>Условията за ползване</strong>, за да запазите настройките.</p>
        </div>
      ) : null}

      {/* Save */}
      <div className="privacy-save-row">
        <button onClick={handleSave} disabled={saving||!consent.privacyPolicy||!consent.termsOfUse}
          className={`${styles.registerBtn} privacy-save-btn`}>
          <Shield size={17}/>{saving?'Запазване...':'Запази настройките'}
        </button>
        {saved && <span className="privacy-saved"><CheckCircle size={16}/>Запазено успешно!</span>}
      </div>

      {/* Last updated */}
      {consent.acceptedAt && (
        <div className="privacy-last-updated">
          <Clock size={13}/>
          <span>Последно обновено: {new Date(consent.acceptedAt).toLocaleDateString('bg-BG',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
        </div>
      )}

      {/* Deletion note */}
      <div className="privacy-deletion-note">
        <div className="privacy-deletion-title"><Trash2 size={15} style={{color:'#ef4444'}}/><strong>Изтриване на акаунт</strong></div>
        <p>За изтриване на профила и всички данни се свържете с библиотекаря или изпратете заявка на <a href="mailto:library@school.bg">library@school.bg</a>.</p>
      </div>
    </div>
  );
};

// ── ConsentCard ───────────────────────────────────────────────────────────────
interface CCProps {
  icon:React.ReactNode; title:string; version:string; accepted:boolean; required:boolean;
  expanded:boolean; onToggleExpand:()=>void; onToggleAccept:()=>void;
  summary:string; fullText:string; acceptedAt?:string;
}
const ConsentCard:React.FC<CCProps>=({icon,title,version,accepted,required,expanded,onToggleExpand,onToggleAccept,summary,fullText})=>(
  <div className={`privacy-consent-card ${accepted?'accepted':''}`}>
    <div className="privacy-consent-header">
      <div className="privacy-consent-icon">{icon}</div>
      <div className="privacy-consent-info">
        <div className="privacy-consent-title-row">
          <span className="privacy-consent-title">{title}</span>
          <span className="privacy-version-badge">v{version}</span>
          {required&&<span className="privacy-required-badge">Задължително</span>}
        </div>
        <p className="privacy-consent-summary">{summary}</p>
      </div>
      <div className="privacy-consent-actions">
        <span className={`privacy-status ${accepted?'accepted':'pending'}`}>
          {accepted?<><CheckCircle size={14}/>Прието</>:<><XCircle size={14}/>Не е прието</>}
        </span>
        <button className="privacy-expand-btn" onClick={onToggleExpand}>
          {expanded?<><ChevronUp size={13}/>Скрий</>:<><ChevronDown size={13}/>Прочети</>}
        </button>
        <button className={`privacy-accept-btn ${accepted?'withdraw':''}`} onClick={onToggleAccept}>
          {accepted?<><XCircle size={13}/>Оттегли</>:<><CheckCircle size={13}/>Приемам</>}
        </button>
      </div>
    </div>
    {expanded&&(
      <div className="privacy-consent-body">
        <div className="privacy-consent-text">{fullText}</div>
      </div>
    )}
  </div>
);

// ── OptionalToggle ────────────────────────────────────────────────────────────
interface OTProps { icon:React.ReactNode; title:string; description:string; checked:boolean; onChange:()=>void; }
const OptionalToggle:React.FC<OTProps>=({icon,title,description,checked,onChange})=>(
  <div className="privacy-toggle-row">
    <div className="privacy-toggle-info">
      <span className="privacy-toggle-icon">{icon}</span>
      <div>
        <p className="privacy-toggle-title">{title}</p>
        <p className="privacy-toggle-desc">{description}</p>
      </div>
    </div>
    <button className={`privacy-switch ${checked?'on':''}`} onClick={onChange} role="switch" aria-checked={checked}>
      <span className="privacy-switch-thumb"/>
    </button>
  </div>
);

// ── Policy text ───────────────────────────────────────────────────────────────
const PRIVACY_POLICY_TEXT=`ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ
Версия ${PRIVACY_VERSION} | Влиза в сила от 01.01.2024

1. ВЪВЕДЕНИЕ
Нашата библиотека зачита неприкосновеността на личния живот и се ангажира да защитава личните данни съгласно GDPR (Регламент ЕС 2016/679).

2. ДАННИ, КОИТО СЪБИРАМЕ
• Имейл адрес и потребителско име при регистрация
• История на заемите и резервациите
• Списък с желани книги и рейтинги
• Регистрации за събития и генерирани билети
• IP адрес и технически данни на браузъра

3. КАК ИЗПОЛЗВАМЕ ДАННИТЕ
• Управление на акаунта и обслужване на заемите
• Персонализирани препоръки за книги
• Напомняния за срокове на заеми
• Подобряване на услугите

4. СИГУРНОСТ
Данните се съхраняват в защитена Firebase база (Google Cloud). Прилагаме криптиране и контрол на достъпа.

5. ВАШИТЕ ПРАВА (GDPR)
• Право на достъп | Право на корекция | Право на изтриване
• Право на ограничаване | Право на преносимост | Право на възражение

6. КОНТАКТ: library@school.bg
`;

const TERMS_OF_USE_TEXT=`УСЛОВИЯ ЗА ПОЛЗВАНЕ
Версия ${TERMS_VERSION} | Влиза в сила от 01.01.2024

1. ПРИЕМАНЕ
С регистрацията потвърждавате, че сте прочели и приемате тези условия.

2. УСЛУГИ
• Достъп до каталога и заемане на книги
• Резервиране на материали
• Записване за библиотечни събития
• Достъп до онлайн книги и учебни материали

3. ЗАДЪЛЖЕНИЯ НА ПОТРЕБИТЕЛЯ
• Да предоставя верни данни при регистрация
• Да връща заетите материали навреме
• Да не злоупотребява с услугите
• Да не споделя профила с трети лица

4. СРОКОВЕ НА ЗАЕМ
• Стандартен срок: 14 дни | Максимални подновявания: 2
• При просрочие резервацията може да се отмени автоматично

5. ОГРАНИЧАВАНЕ НА ОТГОВОРНОСТТА
Библиотеката не носи отговорност за технически прекъсвания извън нейния контрол.

6. ПРИЛОЖИМО ПРАВО
Условията се уреждат от законодателството на Република България.
`;

export default PrivacySettingsTab;