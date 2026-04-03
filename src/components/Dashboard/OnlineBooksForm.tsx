// src/components/Dashboard/OnlineBookFormModal.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Award, Plus, X, ExternalLink } from 'lucide-react';
import styles from './BookFormModal.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdditionalLink { title: string; url: string; type: string; }

export interface OnlineBookFormData {
  title:       string;
  author:      string;
  description: string;
  category:    string;
  subcategory: string;
  tags:        string;
  language:    string;
  format:      string;
  url:         string;
  thumbnailUrl:string;
  fileSize:    string;
  duration:    string;
  pages:       number;
  rating:      number;
  ratingsCount:number;
  views:       number;
  downloads:   number;
  featured:    boolean;
  year:        number | '';
  publisher:   string;
  isbn:        string;
  difficulty:  'beginner' | 'intermediate' | 'advanced';
  ageGroup:    string;
  license:     string;
  additionalLinks: AdditionalLink[];
}

// ── InitialData allows tags as string[] (from Firestore) or string (from form) ─
type OnlineBookInitialData = Partial<
  Omit<OnlineBookFormData, 'tags'> & { id?: string; tags?: string | string[] }
>;

export interface OnlineBookFormModalProps {
  mode:        'create' | 'edit';
  initialData: OnlineBookInitialData;
  onSave:      (data: OnlineBookFormData) => Promise<void>;
  onClose:     () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FORMATS     = ['PDF', 'EPUB', 'MOBI', 'AUDIO', 'VIDEO'];
const DIFFICULTIES = [
  { value: 'beginner',     label: 'Начинаещ' },
  { value: 'intermediate', label: 'Напреднал' },
  { value: 'advanced',     label: 'Експерт' },
] as const;
const CATEGORIES = [
  'Българска литература', 'Световна литература', 'Фантастика',
  'Детска литература', 'Учебници', 'Научна литература',
  'История', 'Философия', 'Математика', 'Наука и техника', 'Друго',
];
const LICENSES = ['Безплатен достъп', 'Creative Commons', 'Public Domain', 'Авторско право', 'Учебна употреба'];

// ── Validation ────────────────────────────────────────────────────────────────
type Errors = Partial<Record<keyof OnlineBookFormData, string>>;

const validate = (f: OnlineBookFormData): Errors => {
  const e: Errors = {};
  if (!f.title.trim())      e.title  = 'Заглавието е задължително (мин. 2 символа)';
  else if (f.title.trim().length < 2) e.title = 'Заглавието трябва да е поне 2 символа';
  if (!f.author.trim())     e.author = 'Авторът е задължителен';
  if (!f.url.trim())        e.url    = 'URL адресът е задължителен';
  else if (!/^https?:\/\/.+\..+/.test(f.url)) e.url = 'Невалиден URL (трябва да започва с https://)';
  if (!f.category)          e.category = 'Изберете категория';
  if (f.thumbnailUrl && !/^https?:\/\/.+\..+/.test(f.thumbnailUrl))
    e.thumbnailUrl = 'Невалиден URL за снимка';
  if (f.year !== '' && f.year !== 0 && (Number(f.year) < 1400 || Number(f.year) > new Date().getFullYear()))
    e.year = `Между 1400 и ${new Date().getFullYear()}`;
  if (f.pages < 0) e.pages = 'Не може да е отрицателно число';
  return e;
};

const REQUIRED: (keyof OnlineBookFormData)[] = ['title', 'author', 'url', 'category'];

// ── Default form data ─────────────────────────────────────────────────────────
const toFormData = (d: OnlineBookInitialData): OnlineBookFormData => ({
  title:          d.title        || '',
  author:         d.author       || '',
  description:    d.description  || '',
  category:       d.category     || '',
  subcategory:    d.subcategory  || '',
  tags:           Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags ?? ''),
  language:       d.language     || 'Български',
  format:         d.format       || 'PDF',
  url:            d.url          || '',
  thumbnailUrl:   d.thumbnailUrl || '',
  fileSize:       d.fileSize     || '',
  duration:       d.duration     || '',
  pages:          d.pages        ?? 0,
  rating:         d.rating       ?? 0,
  ratingsCount:   d.ratingsCount ?? 0,
  views:          d.views        ?? 0,
  downloads:      d.downloads    ?? 0,
  featured:       d.featured     || false,
  year:           d.year         ?? '',
  publisher:      d.publisher    || '',
  isbn:           d.isbn         || '',
  difficulty:     d.difficulty   || 'beginner',
  ageGroup:       d.ageGroup     || '',
  license:        d.license      || 'Безплатен достъп',
  additionalLinks: d.additionalLinks || [],
});

// ── Field component ───────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string; required?: boolean; error?: string;
  hint?: string; className?: string; children: React.ReactNode;
}> = ({ label, required, error, hint, className, children }) => (
  <div className={`${styles.field} ${className || ''}`}>
    <label className={styles.label}>
      {label}
      {required && <span className={error ? styles.reqError : styles.req}>*</span>}
    </label>
    {children}
    {error  && <div className={styles.errorMsg}><svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>{error}</div>}
    {!error && hint && <p className={styles.hint}>{hint}</p>}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
const OnlineBookForm: React.FC<OnlineBookFormModalProps> = ({ mode, initialData, onSave, onClose }) => {
  const [form,       setForm]       = useState<OnlineBookFormData>(() => toFormData(initialData));
  const [errors,     setErrors]     = useState<Errors>({});
  const [touched,    setTouched]    = useState<Set<keyof OnlineBookFormData>>(new Set());
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [thumbOk,    setThumbOk]    = useState(false);
  // Additional links state
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl,   setNewLinkUrl]   = useState('');
  const [newLinkType,  setNewLinkType]  = useState('web');

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const update = useCallback(<K extends keyof OnlineBookFormData>(key: K, value: OnlineBookFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (touched.has(key)) {
        const errs = validate(next);
        setErrors(p => ({ ...p, [key]: errs[key] }));
      }
      return next;
    });
  }, [touched]);

  const touch = useCallback((key: keyof OnlineBookFormData) => {
    setTouched(p => new Set([...p, key]));
    const errs = validate(form);
    setErrors(p => ({ ...p, [key]: errs[key] }));
  }, [form]);

  const ic = (key: keyof OnlineBookFormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.input} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };
  const sc = (key: keyof OnlineBookFormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.select} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };

  const addLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    update('additionalLinks', [...form.additionalLinks, { title: newLinkTitle.trim(), url: newLinkUrl.trim(), type: newLinkType }]);
    setNewLinkTitle(''); setNewLinkUrl(''); setNewLinkType('web');
  };
  const removeLink = (i: number) => update('additionalLinks', form.additionalLinks.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const allErrors = validate(form);
    setTouched(new Set(Object.keys(form) as (keyof OnlineBookFormData)[]));
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setShowBanner(true); setTimeout(() => setShowBanner(false), 4500);
      const first = Object.keys(allErrors)[0];
      document.getElementById(`ob-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      setSaving(true);
      await onSave(form);
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.root}>
      <div className={styles.overlay} ref={overlayRef}
        onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className={styles.modal}>

          {/* Hero Header */}
          <div className={styles.heroHeader}>
            <p className={styles.heroLabel}>Онлайн Библиотека · {mode === 'create' ? 'Нов запис' : 'Редактиране'}</p>
            <h2 className={styles.heroTitle}>
              {mode === 'create' ? <>Добавяне на <em>онлайн книга</em></> : <>Редактиране на <em>{initialData.title || 'книга'}</em></>}
            </h2>
            <button className={styles.heroClose} onClick={onClose} aria-label="Затвори">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Error Banner */}
          {showBanner && (
            <div className={styles.errorBanner}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink:0 }}><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              <div><strong>Моля, поправете грешките:</strong> {Object.values(errors).filter(Boolean).join(' · ')}</div>
            </div>
          )}

          {/* Body */}
          <div className={styles.body}>

            {/* ── 01: Основна информация ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>01</span>
                <h3 className={styles.sectionTitle}>Основна информация</h3>
                <span className={styles.sectionNote}>задължителни полета</span>
              </div>
              <div className={styles.grid}>
                {/* Removed invalid id prop from Field — id is placed on the input element directly */}
                <Field label="Заглавие" required error={touched.has('title') ? errors.title : undefined} hint="Пример: Под игото">
                  <input id="ob-title" className={ic('title')} type="text" value={form.title}
                    onChange={e => update('title', e.target.value)} onBlur={() => touch('title')}
                    placeholder="Пълното заглавие на книгата" maxLength={200} />
                </Field>
                <Field label="Автор" required error={touched.has('author') ? errors.author : undefined} hint="Пример: Иван Вазов">
                  <input id="ob-author" className={ic('author')} type="text" value={form.author}
                    onChange={e => update('author', e.target.value)} onBlur={() => touch('author')}
                    placeholder="Собствено Фамилно" />
                </Field>
                <Field label="URL адрес" required error={touched.has('url') ? errors.url : undefined} hint="Директен линк към книгата онлайн">
                  <input id="ob-url" className={ic('url')} type="url" value={form.url}
                    onChange={e => update('url', e.target.value)} onBlur={() => touch('url')}
                    placeholder="https://chitanka.info/book/..." />
                </Field>
                <Field label="Снимка (URL)" error={touched.has('thumbnailUrl') ? errors.thumbnailUrl : undefined} hint="Линк към корицата на книгата">
                  <div className={styles.coverPreviewRow}>
                    <div className={styles.coverThumb}>
                      {form.thumbnailUrl && thumbOk
                        ? <img src={form.thumbnailUrl} alt="Корица" className={styles.coverThumbImg} onError={() => setThumbOk(false)} />
                        : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input className={ic('thumbnailUrl')} type="url" value={form.thumbnailUrl}
                        onChange={e => { update('thumbnailUrl', e.target.value); setThumbOk(true); }}
                        onBlur={() => touch('thumbnailUrl')} placeholder="https://example.com/cover.jpg" />
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            {/* ── 02: Категория и формат ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>02</span>
                <h3 className={styles.sectionTitle}>Категория и формат</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Категория" required error={touched.has('category') ? errors.category : undefined}>
                  <select id="ob-category" className={sc('category')} value={form.category}
                    onChange={e => update('category', e.target.value)} onBlur={() => touch('category')}>
                    <option value="">— Изберете категория —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Подкатегория" hint="Пример: Кратък разказ, Роман, Сборник">
                  <input className={styles.input} type="text" value={form.subcategory}
                    onChange={e => update('subcategory', e.target.value)} placeholder="Кратък разказ" />
                </Field>
                <Field label="Формат">
                  <select className={styles.select} value={form.format} onChange={e => update('format', e.target.value)}>
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Език" hint="Пример: Български, Английски">
                  <input className={styles.input} type="text" value={form.language}
                    onChange={e => update('language', e.target.value)} placeholder="Български" />
                </Field>
                <Field label="Ниво на трудност">
                  <select className={styles.select} value={form.difficulty} onChange={e => update('difficulty', e.target.value as OnlineBookFormData['difficulty'])}>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Лиценз">
                  <select className={styles.select} value={form.license} onChange={e => update('license', e.target.value)}>
                    {LICENSES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* ── 03: Публикационни данни ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>03</span>
                <h3 className={styles.sectionTitle}>Публикационни данни</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Издател" hint="Пример: Просвета, Сиела, Project Gutenberg">
                  <input className={styles.input} type="text" value={form.publisher}
                    onChange={e => update('publisher', e.target.value)} placeholder="Издателство" />
                </Field>
                <Field label="Година" error={touched.has('year') ? errors.year : undefined} hint={`Между 1400 и ${new Date().getFullYear()}`}>
                  <input className={ic('year')} type="number" value={form.year ?? ''}
                    onChange={e => update('year', e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                    onBlur={() => touch('year')} placeholder={`${new Date().getFullYear()}`}
                    min={1400} max={new Date().getFullYear()} />
                </Field>
                <Field label="ISBN" hint="Пример: 978-954-473-123-4 (незадължително)">
                  <input className={styles.input} type="text" value={form.isbn}
                    onChange={e => update('isbn', e.target.value)} placeholder="978-XXXXXXXXXX" maxLength={17} />
                </Field>
                <Field label="Препоръчана възраст" hint="Пример: 12+, 16+, Всички">
                  <input className={styles.input} type="text" value={form.ageGroup}
                    onChange={e => update('ageGroup', e.target.value)} placeholder="12+" />
                </Field>
                <Field label="Брой страници" error={touched.has('pages') ? errors.pages : undefined} hint="0 ако не е приложимо">
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn} onClick={() => update('pages', Math.max(0, form.pages - 1))}>−</button>
                    <input type="number" className={styles.numberInput} value={form.pages} min={0}
                      onChange={e => update('pages', parseInt(e.target.value) || 0)} onBlur={() => touch('pages')} />
                    <button type="button" className={styles.numberBtn} onClick={() => update('pages', form.pages + 1)}>+</button>
                  </div>
                </Field>
                <Field label="Размер на файла" hint="Пример: 2.5 MB, 15 MB">
                  <input className={styles.input} type="text" value={form.fileSize}
                    onChange={e => update('fileSize', e.target.value)} placeholder="напр. 2.5 MB" />
                </Field>
                <Field label="Времетраене" hint="За аудио/видео. Пример: 8ч 30мин">
                  <input className={styles.input} type="text" value={form.duration}
                    onChange={e => update('duration', e.target.value)} placeholder="напр. 8ч 30мин" />
                </Field>
              </div>
            </div>

            {/* ── 04: Описание и тагове ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>04</span>
                <h3 className={styles.sectionTitle}>Описание и тагове</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Описание / Анотация" className={styles.gridFull} hint="Кратко резюме (до 600 символа)">
                  <textarea className={styles.textarea} value={form.description} rows={3} maxLength={600}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Книгата разказва за..." />
                  <p className={styles.charCounter}>{form.description.length}/600</p>
                </Field>
                <Field label="Тагове" className={styles.gridFull} hint="Разделете с запетая. Пример: класика, бредбъри, фантастика">
                  <input className={styles.input} type="text" value={form.tags}
                    onChange={e => update('tags', e.target.value)}
                    placeholder="класика, приключение, задължителна литература" />
                </Field>
              </div>

              {/* Additional links */}
              <div style={{ marginTop: 14 }}>
                <p className={styles.label} style={{ marginBottom: 8 }}>Допълнителни ресурси</p>
                <div className={styles.linksGrid}>
                  <input className={styles.input} type="text" placeholder="Заглавие на ресурса" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} />
                  <input className={styles.input} type="url" placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
                  <select className={styles.select} value={newLinkType} onChange={e => setNewLinkType(e.target.value)}>
                    <option value="web">Web</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                  <button type="button" onClick={addLink}
                    style={{ background: '#3b82f6', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}>
                    <Plus size={15} />
                  </button>
                </div>
                {form.additionalLinks.map((link, i) => (
                  <div key={i} className={styles.linkItem}>
                    <ExternalLink size={12} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <span className={styles.linkItemText}>{link.title}</span>
                    <span className={styles.linkItemType}>[{link.type}]</span>
                    <button className={styles.linkRemoveBtn} onClick={() => removeLink(i)}><X size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 05: Настройки ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>05</span>
                <h3 className={styles.sectionTitle}>Настройки</h3>
              </div>
              <div className={styles.checkboxGroup}>
                <label className={`${styles.checkboxItem} ${form.featured ? styles.checked : ''}`}>
                  <input type="checkbox" className={styles.checkboxNative} checked={form.featured} onChange={e => update('featured', e.target.checked)} />
                  <div className={styles.checkboxBox}>{form.featured && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <Award size={15} style={{ color: '#f59e0b', marginLeft: 2 }} />
                  <span className={styles.checkboxLabel}>⭐ Препоръчана книга (показва се с жълт бадж)</span>
                </label>
              </div>
            </div>

          </div>{/* /body */}

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <div className={styles.requiredLegend}>
                <div className={styles.requiredDot} />
                <span>Задължителни: Заглавие, Автор, URL, Категория</span>
              </div>
            </div>
            <div className={styles.footerRight}>
              <button type="button" className={styles.btnCancel} onClick={onClose}>Откажи</button>
              <button type="button" className={`${styles.btnSubmit} ${saved ? styles.btnSubmitSuccess : ''}`}
                onClick={handleSubmit} disabled={saving || saved}>
                {saving ? (<><svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ animation: 'fmSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Запазване…</>)
                : saved  ? (<><svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>Запазено!</>)
                : mode === 'create' ? 'Добави книгата' : 'Запази промените'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnlineBookForm;