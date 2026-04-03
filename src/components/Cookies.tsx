// src/components/Cookies.tsx
import React, { useState, useEffect } from 'react';
import { Cookie, X, Shield, ExternalLink } from 'lucide-react';
import './Cookies.css';

const STORAGE_KEY = 'cookiesAccepted';

const Cookies: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem(STORAGE_KEY);
    if (!choice) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="ckb-overlay" role="dialog" aria-modal="true" aria-label="Уведомление за бисквитки">
      <div className="ckb-banner">
        <div className="ckb-stripe" aria-hidden="true" />

        <div className="ckb-icon-wrap" aria-hidden="true">
          <Cookie size={22} />
        </div>

        <div className="ckb-body">
          <h3 className="ckb-title">Използваме бисквитки</h3>
          <p className="ckb-text">
            Този сайт използва задължителни бисквитки за автентикация и функционални
            бисквитки за запомняне на предпочитанията ви.{' '}
            <a href="/privacy" className="ckb-link">
              Политика за поверителност
              <ExternalLink size={11} />
            </a>
          </p>
        </div>

        <div className="ckb-actions">
          <button onClick={decline} className="ckb-btn ckb-btn--decline">
            Откажи
          </button>
          <button onClick={accept} className="ckb-btn ckb-btn--accept">
            <Shield size={14} />
            Приемам
          </button>
        </div>

        <button onClick={decline} className="ckb-close" aria-label="Затвори">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Cookies;