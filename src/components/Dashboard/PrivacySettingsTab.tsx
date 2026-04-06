// src/components/Dashboard/PrivacySettingsTab.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
  Shield, FileText, CheckCircle, XCircle, Clock,
  AlertTriangle, Lock, Eye, Trash2, ExternalLink,
} from 'lucide-react';
import styles from './UserDashboard.module.css';

interface ConsentRecord {
  privacyPolicy:  boolean;
  termsOfUse:     boolean;
  cookieConsent:  boolean;
  acceptedAt?:    string;
  privacyVersion: string;
  termsVersion:   string;
}

const PRIVACY_VERSION = '1.0.0';
const TERMS_VERSION   = '1.0.0';

const EMPTY_CONSENT: ConsentRecord = {
  privacyPolicy:  false,
  termsOfUse:     false,
  cookieConsent:  false,
  privacyVersion: PRIVACY_VERSION,
  termsVersion:   TERMS_VERSION,
};

// Key used by the cookie banner to store acceptance in localStorage
const COOKIE_BANNER_KEY = 'cookieConsent';

interface Props { userId: string; userEmail: string; }

// ─────────────────────────────────────────────────────────────────────────────
const PrivacySettingsTab: React.FC<Props> = ({ userId, userEmail }) => {
  const navigate = useNavigate();

  const [consent,  setConsent]  = useState<ConsentRecord>(EMPTY_CONSENT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // ── Load Firestore consent + sync cookie from localStorage ────────────────
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'user_consent', userId));
        const firestoreData = snap.exists() ? (snap.data() as ConsentRecord) : EMPTY_CONSENT;

        // Read cookie acceptance set by the cookie banner (localStorage)
        const cookieFromBanner = localStorage.getItem(COOKIE_BANNER_KEY) === 'true';

        setConsent({
          ...firestoreData,
          cookieConsent: cookieFromBanner || firestoreData.cookieConsent,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!consent.privacyPolicy || !consent.termsOfUse) {
      alert('Трябва да приемете Политиката за поверителност и Условията за използване.');
      return;
    }
    try {
      setSaving(true);
      await setDoc(doc(db, 'user_consent', userId), {
        ...consent,
        acceptedAt:     new Date().toISOString(),
        updatedAt:      Timestamp.now(),
        userEmail,
        privacyVersion: PRIVACY_VERSION,
        termsVersion:   TERMS_VERSION,
      });
      // Keep localStorage in sync when user toggles cookies here
      localStorage.setItem(COOKIE_BANNER_KEY, String(consent.cookieConsent));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Грешка при запазване!');
    } finally {
      setSaving(false);
    }
  };

  const tog = (k: 'privacyPolicy' | 'termsOfUse' | 'cookieConsent') => {
    setConsent(p => ({ ...p, [k]: !p[k] }));
    setSaved(false);
  };

  if (loading) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>Зареждане...</p>
    </div>
  );

  const canSave = consent.privacyPolicy && consent.termsOfUse;

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Настройки и Поверителност</h2>
        <p className={styles.sectionSubtitle}>
          Управлявайте съгласията си и прегледайте правилата за ползване.
        </p>
      </div>

      {/* ── Задължителни съгласия ── */}
      <div className="privacy-section">
        <h3 className="privacy-section-title">
          <Shield size={17} style={{ color: '#3b82f6' }} />
          Задължителни съгласия
        </h3>

        <ConsentCard
          icon={<Lock size={17} style={{ color: '#3b82f6' }} />}
          title="Политика за поверителност"
          version={PRIVACY_VERSION}
          accepted={consent.privacyPolicy}
          summary="Описва как събираме, използваме и защитаваме вашите лични данни съгласно GDPR."
          onNavigate={() => navigate('/privacy')}
          onToggleAccept={() => tog('privacyPolicy')}
          acceptedAt={consent.acceptedAt}
        />

        <ConsentCard
          icon={<FileText size={17} style={{ color: '#8b5cf6' }} />}
          title="Условия за ползване"
          version={TERMS_VERSION}
          accepted={consent.termsOfUse}
          summary="Правилата за използване на библиотечната система, вашите права и задължения."
          onNavigate={() => navigate('/terms')}
          onToggleAccept={() => tog('termsOfUse')}
          acceptedAt={consent.acceptedAt}
        />
      </div>

      {/* ── Допълнителни предпочитания (само бисквитки) ── */}
      <div className="privacy-section">
        <h3 className="privacy-section-title">
          <Eye size={17} style={{ color: '#10b981' }} />
          Допълнителни предпочитания
        </h3>

        <div className="privacy-toggle-row">
          <div className="privacy-toggle-info">
            <span className="privacy-toggle-icon">
              <Eye size={15} style={{ color: '#10b981' }} />
            </span>
            <div>
              <p className="privacy-toggle-title">Бисквитки (Cookies)</p>
              <p className="privacy-toggle-desc">
                Функционални бисквитки за по-добро потребителско изживяване.
                Отразява избора ви при първото посещение на сайта.
              </p>
            </div>
          </div>
          <button
            className={`privacy-switch ${consent.cookieConsent ? 'on' : ''}`}
            onClick={() => tog('cookieConsent')}
            role="switch"
            aria-checked={consent.cookieConsent}
          >
            <span className="privacy-switch-thumb" />
          </button>
        </div>
      </div>

      {/* ── Предупреждение ── */}
      {!canSave && (
        <div className="privacy-warning">
          <AlertTriangle size={17} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <p>
            Трябва да приемете <strong>Политиката за поверителност</strong> и{' '}
            <strong>Условията за ползване</strong>, за да запазите настройките.
          </p>
        </div>
      )}

      {/* ── Запази ── */}
      <div className="privacy-save-row">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className={`${styles.registerBtn} privacy-save-btn`}
        >
          <Shield size={17} />
          {saving ? 'Запазване...' : 'Запази настройките'}
        </button>
        {saved && (
          <span className="privacy-saved">
            <CheckCircle size={16} />
            Запазено успешно!
          </span>
        )}
      </div>

      {/* ── Последно обновено ── */}
      {consent.acceptedAt && (
        <div className="privacy-last-updated">
          <Clock size={13} />
          <span>
            Последно обновено:{' '}
            {new Date(consent.acceptedAt).toLocaleDateString('bg-BG', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* ── Изтриване на акаунт ── */}
      <div className="privacy-deletion-note">
        <div className="privacy-deletion-title">
          <Trash2 size={15} style={{ color: '#ef4444' }} />
          <strong>Изтриване на акаунт</strong>
        </div>
        <p>
          За изтриване на профила и всички данни се свържете с библиотекаря
          или изпратете заявка на{' '}
          <a href="mailto:library@school.bg">library@school.bg</a>.
        </p>
      </div>
    </div>
  );
};

// ── ConsentCard ───────────────────────────────────────────────────────────────
interface CCProps {
  icon:            React.ReactNode;
  title:           string;
  version:         string;
  accepted:        boolean;
  summary:         string;
  onNavigate:      () => void;
  onToggleAccept:  () => void;
  acceptedAt?:     string;
}

const ConsentCard: React.FC<CCProps> = ({
  icon, title, version, accepted, summary, onNavigate, onToggleAccept,
}) => (
  <div className={`privacy-consent-card ${accepted ? 'accepted' : ''}`}>
    <div className="privacy-consent-header">
      <div className="privacy-consent-icon">{icon}</div>

      <div className="privacy-consent-info">
        <div className="privacy-consent-title-row">
          <span className="privacy-consent-title">{title}</span>
          <span className="privacy-version-badge">v{version}</span>
          <span className="privacy-required-badge">Задължително</span>
        </div>
        <p className="privacy-consent-summary">{summary}</p>
      </div>

      <div className="privacy-consent-actions">
        <span className={`privacy-status ${accepted ? 'accepted' : 'pending'}`}>
          {accepted
            ? <><CheckCircle size={14} />Прието</>
            : <><XCircle    size={14} />Не е прието</>}
        </span>

        {/* Navigate to the full page instead of dropdown */}
        <button className="privacy-expand-btn" onClick={onNavigate}>
          <ExternalLink size={13} />
          Прочети
        </button>

        <button
          className={`privacy-accept-btn ${accepted ? 'withdraw' : ''}`}
          onClick={onToggleAccept}
        >
          {accepted
            ? <><XCircle      size={13} />Оттегли</>
            : <><CheckCircle  size={13} />Приемам</>}
        </button>
      </div>
    </div>
  </div>
);

export default PrivacySettingsTab;