// src/components/Dashboard/AIResourceFormModal.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Award, BookOpen, FileText, Video, GraduationCap, Globe, Cpu, BookMarked } from 'lucide-react';
import styles from './Bookformmodal.module.css';
// ── Types ─────────────────────────────────────────────────────────────────────
export type AIResourceType = 'book'|'article'|'video'|'course'|'tool'|'research'|'website';
export type Difficulty     = 'beginner'|'intermediate'|'advanced';

export interface AIResourceFormData {
  title:         string;
  description:   string;
  type:          AIResourceType;
  url:           string;
  author:        string;
  publisher:     string;
  publishDate:   string;
  language:      string;
  difficulty:    Difficulty;
  tags:          string;
  thumbnail:     string;
  estimatedTime: string;
  rating:        number;
  downloads:     number;
  isFree:        boolean;
  featured:      boolean;
  addedBy:       string;
}

// ── InitialData allows tags as string[] (from Firestore) or string (from form) ─
type AIResourceInitialData = Partial<
  Omit<AIResourceFormData, 'tags'> & { id?: string; tags?: string | string[] }
>;

export interface AIResourceFormModalProps {
  mode:        'create' | 'edit';
  initialData: AIResourceInitialData;
  onSave:      (data: AIResourceFormData) => Promise<void>;
  onClose:     () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPES: { value: AIResourceType; label: string; icon: React.ReactNode; color: string }[] = [
  { value:'book',     label:'Книга',       icon:<BookOpen    size={14}/>, color:'#3b82f6' },
  { value:'article',  label:'Статия',      icon:<FileText    size={14}/>, color:'#10b981' },
  { value:'video',    label:'Видео',       icon:<Video       size={14}/>, color:'#ef4444' },
  { value:'course',   label:'Курс',        icon:<GraduationCap size={14}/>, color:'#8b5cf6' },
  { value:'tool',     label:'Инструмент',  icon:<Cpu         size={14}/>, color:'#f59e0b' },
  { value:'research', label:'Изследване',  icon:<BookMarked  size={14}/>, color:'#ec4899' },
  { value:'website',  label:'Уебсайт',     icon:<Globe       size={14}/>, color:'#6366f1' },
];

const DIFFICULTIES = [
  { value:'beginner',     label:'Начинаещ — подходящ за всеки учител' },
  { value:'intermediate', label:'Напреднал — нужна е базова ИИ грамотност' },
  { value:'advanced',     label:'Експерт — технически или изследователски материал' },
] as const;

const LANGUAGES = ['Български','Английски','Немски','Френски','Испански','Друг'];

// ── Validation ────────────────────────────────────────────────────────────────
type Errors = Partial<Record<keyof AIResourceFormData, string>>;

const validate = (f: AIResourceFormData): Errors => {
  const e: Errors = {};
  if (!f.title.trim())  e.title  = 'Заглавието е задължително (мин. 2 символа)';
  else if (f.title.trim().length < 2) e.title = 'Заглавието трябва да е поне 2 символа';
  if (!f.author.trim()) e.author = 'Авторът или организацията е задължителна';
  if (!f.url.trim())    e.url    = 'URL адресът е задължителен';
  else if (!/^https?:\/\/.+\..+/.test(f.url)) e.url = 'Невалиден URL (трябва да започва с https://)';
  if (f.thumbnail && !/^https?:\/\/.+\..+/.test(f.thumbnail)) e.thumbnail = 'Невалиден URL за снимка';
  return e;
};

const REQUIRED: (keyof AIResourceFormData)[] = ['title', 'author', 'url'];

// ── toFormData ────────────────────────────────────────────────────────────────
const toFormData = (d: AIResourceInitialData): AIResourceFormData => ({
  title:         d.title         || '',
  description:   d.description   || '',
  type:          d.type          || 'article',
  url:           d.url           || '',
  author:        d.author        || '',
  publisher:     d.publisher     || '',
  publishDate:   d.publishDate   || new Date().toISOString().split('T')[0],
  language:      d.language      || 'Български',
  difficulty:    d.difficulty    || 'beginner',
  tags:          Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags ?? ''),
  thumbnail:     d.thumbnail     || '',
  estimatedTime: d.estimatedTime || '',
  rating:        d.rating        ?? 0,
  downloads:     d.downloads     ?? 0,
  isFree:        d.isFree        ?? true,
  featured:      d.featured      || false,
  addedBy:       d.addedBy       || 'Библиотекар',
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
const AIResourcesForm: React.FC<AIResourceFormModalProps> = ({ mode, initialData, onSave, onClose }) => {
  const [form,       setForm]       = useState<AIResourceFormData>(() => toFormData(initialData));
  const [errors,     setErrors]     = useState<Errors>({});
  const [touched,    setTouched]    = useState<Set<keyof AIResourceFormData>>(new Set());
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [thumbOk,    setThumbOk]    = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const update = useCallback(<K extends keyof AIResourceFormData>(key: K, value: AIResourceFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (touched.has(key)) {
        const errs = validate(next);
        setErrors(p => ({ ...p, [key]: errs[key] }));
      }
      return next;
    });
  }, [touched]);

  const touch = useCallback((key: keyof AIResourceFormData) => {
    setTouched(p => new Set([...p, key]));
    const errs = validate(form);
    setErrors(p => ({ ...p, [key]: errs[key] }));
  }, [form]);

  const ic = (key: keyof AIResourceFormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.input} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };

  const handleSubmit = async () => {
    const allErrors = validate(form);
    setTouched(new Set(Object.keys(form) as (keyof AIResourceFormData)[]));
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setShowBanner(true); setTimeout(() => setShowBanner(false), 4500);
      const first = Object.keys(allErrors)[0];
      document.getElementById(`ai-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const selectedType = TYPES.find(t => t.value === form.type) ?? TYPES[0];

  return (
    <div className={styles.root}>
      <div className={styles.overlay} ref={overlayRef}
        onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className={styles.modal}>

          {/* Hero Header */}
          <div className={styles.heroHeader}>
            <p className={styles.heroLabel}>ИИ Ресурси · {mode === 'create' ? 'Нов запис' : 'Редактиране'}</p>
            <h2 className={styles.heroTitle}>
              {mode === 'create' ? <>Добавяне на <em>ИИ ресурс</em></> : <>Редактиране на <em>{initialData.title || 'ресурс'}</em></>}
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

          <div className={styles.body}>

            {/* ── 01: Основна информация ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>01</span>
                <h3 className={styles.sectionTitle}>Основна информация</h3>
                <span className={styles.sectionNote}>задължителни полета</span>
              </div>
              <div className={styles.grid}>
                <Field label="Заглавие" required error={touched.has('title') ? errors.title : undefined} hint="Пример: ChatGPT в образованието — практическо ръководство">
                  <input id="ai-title" className={ic('title')} type="text" value={form.title}
                    onChange={e => update('title', e.target.value)} onBlur={() => touch('title')}
                    placeholder="Заглавие на ресурса" maxLength={200} />
                </Field>
                <Field label="Автор / Организация" required error={touched.has('author') ? errors.author : undefined} hint="Пример: Д-р Иван Петров или MIT OpenCourseWare">
                  <input id="ai-author" className={ic('author')} type="text" value={form.author}
                    onChange={e => update('author', e.target.value)} onBlur={() => touch('author')}
                    placeholder="Собствено Фамилно или Организация" />
                </Field>
                <Field label="URL адрес" required error={touched.has('url') ? errors.url : undefined} hint="Директен линк към ресурса">
                  <input id="ai-url" className={ic('url')} type="url" value={form.url}
                    onChange={e => update('url', e.target.value)} onBlur={() => touch('url')}
                    placeholder="https://..." />
                </Field>
                <Field label="Снимка / Thumbnail (URL)" error={touched.has('thumbnail') ? errors.thumbnail : undefined} hint="Линк към представителна снимка">
                  <div className={styles.coverPreviewRow}>
                    <div className={styles.coverThumb}>
                      {form.thumbnail && thumbOk
                        ? <img src={form.thumbnail} alt="Thumbnail" className={styles.coverThumbImg} onError={() => setThumbOk(false)} />
                        : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <input className={ic('thumbnail')} type="url" value={form.thumbnail}
                        onChange={e => { update('thumbnail', e.target.value); setThumbOk(true); }}
                        onBlur={() => touch('thumbnail')} placeholder="https://example.com/image.jpg" />
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            {/* ── 02: Тип на ресурса ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>02</span>
                <h3 className={styles.sectionTitle}>Тип на ресурса</h3>
              </div>
              <p className={styles.hint} style={{ marginBottom: 10 }}>Изберете типа, който най-добре описва ресурса:</p>
              <div className={styles.typeChipGroup}>
                {TYPES.map(t => (
                  <button key={t.value} type="button"
                    className={`${styles.typeChip} ${form.type === t.value ? styles.typeChipActive : ''}`}
                    style={form.type === t.value ? { background: t.color+'15', borderColor: t.color, color: t.color } : {}}
                    onClick={() => update('type', t.value)}>
                    {t.icon}{t.label}
                  </button>
                ))}
              </div>
              <p className={styles.hint} style={{ marginTop: 8 }}>
                Избрано: <strong style={{ color: selectedType.color }}>{selectedType.label}</strong>
              </p>
            </div>

            {/* ── 03: Класификация ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>03</span>
                <h3 className={styles.sectionTitle}>Класификация и детайли</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Ниво на трудност">
                  <select className={styles.select} value={form.difficulty} onChange={e => update('difficulty', e.target.value as Difficulty)}>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Език" hint="Езикът на ресурса">
                  <select className={styles.select} value={form.language} onChange={e => update('language', e.target.value)}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Издател / Платформа" hint="Пример: Coursera, YouTube, ResearchGate, Springer">
                  <input className={styles.input} type="text" value={form.publisher}
                    onChange={e => update('publisher', e.target.value)} placeholder="Coursera, YouTube, ResearchGate..." />
                </Field>
                <Field label="Дата на публикуване">
                  <input className={styles.input} type="date" value={form.publishDate}
                    onChange={e => update('publishDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]} />
                </Field>
                <Field label="Оценено времетраене" hint="Пример: 30 минути, 2 часа, 4 седмици">
                  <input className={styles.input} type="text" value={form.estimatedTime}
                    onChange={e => update('estimatedTime', e.target.value)} placeholder="напр. 2 часа" />
                </Field>
                <Field label="Добавено от" hint="Пример: Библиотекар, Директор, Учител">
                  <input className={styles.input} type="text" value={form.addedBy}
                    onChange={e => update('addedBy', e.target.value)} placeholder="Библиотекар" />
                </Field>
              </div>
            </div>

            {/* ── 04: Описание ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>04</span>
                <h3 className={styles.sectionTitle}>Описание и тагове</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Описание" className={styles.gridFull} hint="Какво ще научи учителят от този ресурс? (до 600 символа)">
                  <textarea className={styles.textarea} rows={3} value={form.description} maxLength={600}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Пример: Практическо ръководство за използване на ChatGPT в час по математика — включва готови промпти и примерни уроци." />
                  <p className={styles.charCounter}>{form.description.length}/600</p>
                </Field>
                <Field label="Тагове" className={styles.gridFull} hint="Разделете с запетая. Пример: ChatGPT, математика, промпти, образование">
                  <input className={styles.input} type="text" value={form.tags}
                    onChange={e => update('tags', e.target.value)}
                    placeholder="ChatGPT, образование, педагогика, промпти" />
                </Field>
              </div>
            </div>

            {/* ── 05: Настройки ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>05</span>
                <h3 className={styles.sectionTitle}>Настройки</h3>
              </div>
              <div className={styles.checkboxGroup}>
                <label className={`${styles.checkboxItem} ${form.isFree ? styles.checked : ''}`}>
                  <input type="checkbox" className={styles.checkboxNative} checked={form.isFree} onChange={e => update('isFree', e.target.checked)} />
                  <div className={styles.checkboxBox}>{form.isFree && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <span className={styles.checkboxLabel}>🆓 Безплатен ресурс (без регистрация или заплащане)</span>
                </label>
                <label className={`${styles.checkboxItem} ${form.featured ? styles.checked : ''}`}>
                  <input type="checkbox" className={styles.checkboxNative} checked={form.featured} onChange={e => update('featured', e.target.checked)} />
                  <div className={styles.checkboxBox}>{form.featured && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <Award size={15} style={{ color: '#f59e0b', marginLeft: 2 }} />
                  <span className={styles.checkboxLabel}>⭐ Препоръчан ресурс (показва се с жълт бадж)</span>
                </label>
              </div>
            </div>

          </div>{/* /body */}

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <div className={styles.requiredLegend}>
                <div className={styles.requiredDot} />
                <span>Задължителни: Заглавие, Автор / Организация, URL</span>
              </div>
            </div>
            <div className={styles.footerRight}>
              <button type="button" className={styles.btnCancel} onClick={onClose}>Откажи</button>
              <button type="button" className={`${styles.btnSubmit} ${saved ? styles.btnSubmitSuccess : ''}`}
                onClick={handleSubmit} disabled={saving || saved}>
                {saving ? (<><svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ animation:'fmSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Запазване…</>)
                : saved  ? 'Запазено!'
                : mode === 'create' ? 'Добави ресурс' : 'Запази промените'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AIResourcesForm;