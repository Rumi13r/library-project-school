// src/components/Dashboard/StudyMaterialFormModal.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Award, Lightbulb, CheckCircle, Plus, X, ExternalLink } from 'lucide-react';
import styles from './BookFormModal.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface StudyMaterialFormData {
  title:              string;
  author:             string;
  description:        string;
  subject:            string;
  grade:              string;
  category:           string;
  tags:               string;
  language:           string;
  format:             string;
  url:                string;
  thumbnailUrl:       string;
  fileSize:           string;
  duration:           string;
  pages:              number;
  exercises:          number;
  solutions:          boolean;
  rating:             number;
  ratingsCount:       number;
  views:              number;
  downloads:          number;
  featured:           boolean;
  difficulty:         Difficulty;
  learningObjectives: string; // newline-separated
  additionalLinks:    { title: string; url: string; type: string }[];
}

// ── InitialData allows tags and learningObjectives as string[] (from Firestore) ─
type StudyMaterialInitialData = Partial<
  Omit<StudyMaterialFormData, 'tags' | 'learningObjectives'> & {
    id?: string;
    tags?: string | string[];
    learningObjectives?: string | string[];
  }
>;

export interface StudyMaterialFormModalProps {
  mode:        'create' | 'edit';
  initialData: StudyMaterialInitialData;
  onSave:      (data: StudyMaterialFormData) => Promise<void>;
  onClose:     () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FORMATS     = ['PDF', 'DOC', 'PPT', 'VIDEO', 'INTERACTIVE'];
const SUBJECTS    = ['Математика','Български език','Физика','Химия','Биология','История','География','Информатика','Английски език','Философия','Друго'];
const CATEGORIES  = ['Конспекти','Тестове','Видео уроци','Презентации','Интерактивни материали','Решени задачи','Упражнения','Друго'];
const GRADES      = Array.from({ length: 12 }, (_, i) => String(i + 1));
const DIFFICULTIES = [
  { value:'beginner',     label:'Начинаещ — 1-6 клас или въвеждащо ниво' },
  { value:'intermediate', label:'Напреднал — 7-10 клас или общо ниво' },
  { value:'advanced',     label:'Експерт — 11-12 клас, матура, олимпиади' },
] as const;

// ── Validation ────────────────────────────────────────────────────────────────
type Errors = Partial<Record<keyof StudyMaterialFormData, string>>;

const validate = (f: StudyMaterialFormData): Errors => {
  const e: Errors = {};
  if (!f.title.trim())   e.title   = 'Заглавието е задължително (мин. 2 символа)';
  else if (f.title.trim().length < 2) e.title = 'Заглавието трябва да е поне 2 символа';
  if (!f.author.trim())  e.author  = 'Авторът е задължителен';
  if (!f.url.trim())     e.url     = 'URL адресът е задължителен';
  else if (!/^https?:\/\/.+\..+/.test(f.url)) e.url = 'Невалиден URL (трябва да започва с https://)';
  if (!f.subject)        e.subject = 'Изберете учебен предмет';
  if (!f.category)       e.category= 'Изберете категория';
  if (f.thumbnailUrl && !/^https?:\/\/.+\..+/.test(f.thumbnailUrl)) e.thumbnailUrl = 'Невалиден URL за снимка';
  if (f.pages    < 0)    e.pages   = 'Не може да е отрицателно число';
  if (f.exercises< 0)    e.exercises='Не може да е отрицателно число';
  return e;
};

const REQUIRED: (keyof StudyMaterialFormData)[] = ['title', 'author', 'url', 'subject', 'category'];

// ── toFormData ────────────────────────────────────────────────────────────────
const toFormData = (d: StudyMaterialInitialData): StudyMaterialFormData => ({
  title:              d.title             || '',
  author:             d.author            || '',
  description:        d.description       || '',
  subject:            d.subject           || '',
  grade:              d.grade             || '',
  category:           d.category          || '',
  tags:               Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags ?? ''),
  language:           d.language          || 'Български',
  format:             d.format            || 'PDF',
  url:                d.url               || '',
  thumbnailUrl:       d.thumbnailUrl      || '',
  fileSize:           d.fileSize          || '',
  duration:           d.duration          || '',
  pages:              d.pages             ?? 0,
  exercises:          d.exercises         ?? 0,
  solutions:          d.solutions         || false,
  rating:             d.rating            ?? 0,
  ratingsCount:       d.ratingsCount      ?? 0,
  views:              d.views             ?? 0,
  downloads:          d.downloads         ?? 0,
  featured:           d.featured          || false,
  difficulty:         d.difficulty        || 'beginner',
  learningObjectives: Array.isArray(d.learningObjectives)
    ? d.learningObjectives.join('\n')
    : (d.learningObjectives ?? ''),
  additionalLinks:    d.additionalLinks   || [],
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
const StudyMaterialForm: React.FC<StudyMaterialFormModalProps> = ({ mode, initialData, onSave, onClose }) => {
  const [form,       setForm]       = useState<StudyMaterialFormData>(() => toFormData(initialData));
  const [errors,     setErrors]     = useState<Errors>({});
  const [touched,    setTouched]    = useState<Set<keyof StudyMaterialFormData>>(new Set());
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [thumbOk,    setThumbOk]    = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl,   setNewLinkUrl]   = useState('');
  const [newLinkType,  setNewLinkType]  = useState('web');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const update = useCallback(<K extends keyof StudyMaterialFormData>(key: K, value: StudyMaterialFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (touched.has(key)) {
        const errs = validate(next);
        setErrors(p => ({ ...p, [key]: errs[key] }));
      }
      return next;
    });
  }, [touched]);

  const touch = useCallback((key: keyof StudyMaterialFormData) => {
    setTouched(p => new Set([...p, key]));
    const errs = validate(form);
    setErrors(p => ({ ...p, [key]: errs[key] }));
  }, [form]);

  const ic = (key: keyof StudyMaterialFormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.input} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };
  const sc = (key: keyof StudyMaterialFormData) => {
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
    setTouched(new Set(Object.keys(form) as (keyof StudyMaterialFormData)[]));
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      setShowBanner(true); setTimeout(() => setShowBanner(false), 4500);
      const first = Object.keys(allErrors)[0];
      document.getElementById(`sm-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            <p className={styles.heroLabel}>Учебни Помагала · {mode === 'create' ? 'Нов запис' : 'Редактиране'}</p>
            <h2 className={styles.heroTitle}>
              {mode === 'create' ? <>Добавяне на <em>учебен материал</em></> : <>Редактиране на <em>{initialData.title || 'материал'}</em></>}
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
                <Field label="Заглавие" required error={touched.has('title') ? errors.title : undefined} hint="Пример: Конспект по математика за 10. клас">
                  <input id="sm-title" className={ic('title')} type="text" value={form.title}
                    onChange={e => update('title', e.target.value)} onBlur={() => touch('title')}
                    placeholder="Пълното заглавие на материала" maxLength={200} />
                </Field>
                <Field label="Автор" required error={touched.has('author') ? errors.author : undefined} hint="Пример: Проф. Иван Петров или Колектив">
                  <input id="sm-author" className={ic('author')} type="text" value={form.author}
                    onChange={e => update('author', e.target.value)} onBlur={() => touch('author')}
                    placeholder="Собствено Фамилно" />
                </Field>
                <Field label="URL адрес" required error={touched.has('url') ? errors.url : undefined} hint="Директен линк за изтегляне или преглед">
                  <input id="sm-url" className={ic('url')} type="url" value={form.url}
                    onChange={e => update('url', e.target.value)} onBlur={() => touch('url')}
                    placeholder="https://..." />
                </Field>
                <Field label="Снимка / Корица (URL)" error={touched.has('thumbnailUrl') ? errors.thumbnailUrl : undefined}>
                  <div className={styles.coverPreviewRow}>
                    <div className={styles.coverThumb}>
                      {form.thumbnailUrl && thumbOk
                        ? <img src={form.thumbnailUrl} alt="" className={styles.coverThumbImg} onError={() => setThumbOk(false)} />
                        : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
                    </div>
                    <div style={{ flex:1 }}>
                      <input className={ic('thumbnailUrl')} type="url" value={form.thumbnailUrl}
                        onChange={e => { update('thumbnailUrl', e.target.value); setThumbOk(true); }}
                        onBlur={() => touch('thumbnailUrl')} placeholder="https://example.com/cover.jpg" />
                    </div>
                  </div>
                </Field>
              </div>
            </div>

            {/* ── 02: Учебна информация ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>02</span>
                <h3 className={styles.sectionTitle}>Учебна информация</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Учебен предмет" required error={touched.has('subject') ? errors.subject : undefined}>
                  <select id="sm-subject" className={sc('subject')} value={form.subject}
                    onChange={e => update('subject', e.target.value)} onBlur={() => touch('subject')}>
                    <option value="">— Изберете предмет —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Клас" hint="Оставете празно ако важи за всички класове">
                  <select className={styles.select} value={form.grade} onChange={e => update('grade', e.target.value)}>
                    <option value="">— Всички класове —</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}. клас</option>)}
                  </select>
                </Field>
                <Field label="Категория" required error={touched.has('category') ? errors.category : undefined}>
                  <select id="sm-category" className={sc('category')} value={form.category}
                    onChange={e => update('category', e.target.value)} onBlur={() => touch('category')}>
                    <option value="">— Изберете категория —</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Формат на файла">
                  <select className={styles.select} value={form.format} onChange={e => update('format', e.target.value)}>
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* ── 03: Детайли ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>03</span>
                <h3 className={styles.sectionTitle}>Детайли на материала</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Ниво на трудност">
                  <select className={styles.select} value={form.difficulty} onChange={e => update('difficulty', e.target.value as Difficulty)}>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </Field>
                <Field label="Език" hint="Пример: Български, Английски">
                  <input className={styles.input} type="text" value={form.language}
                    onChange={e => update('language', e.target.value)} placeholder="Български" />
                </Field>
                <Field label="Брой страници" hint="0 ако не е приложимо" error={touched.has('pages') ? errors.pages : undefined}>
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn} onClick={() => update('pages', Math.max(0, form.pages-1))}>−</button>
                    <input type="number" className={styles.numberInput} value={form.pages} min={0}
                      onChange={e => update('pages', parseInt(e.target.value)||0)} onBlur={() => touch('pages')} />
                    <button type="button" className={styles.numberBtn} onClick={() => update('pages', form.pages+1)}>+</button>
                  </div>
                </Field>
                <Field label="Брой упражнения" hint="0 ако не е приложимо" error={touched.has('exercises') ? errors.exercises : undefined}>
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn} onClick={() => update('exercises', Math.max(0, form.exercises-1))}>−</button>
                    <input type="number" className={styles.numberInput} value={form.exercises} min={0}
                      onChange={e => update('exercises', parseInt(e.target.value)||0)} onBlur={() => touch('exercises')} />
                    <button type="button" className={styles.numberBtn} onClick={() => update('exercises', form.exercises+1)}>+</button>
                  </div>
                </Field>
                <Field label="Размер на файла" hint="Пример: 3.2 MB, 58 MB">
                  <input className={styles.input} type="text" value={form.fileSize}
                    onChange={e => update('fileSize', e.target.value)} placeholder="напр. 3.2 MB" />
                </Field>
                <Field label="Времетраене (за видео)" hint="Пример: 45 мин, 1ч 30мин">
                  <input className={styles.input} type="text" value={form.duration}
                    onChange={e => update('duration', e.target.value)} placeholder="напр. 45 мин" />
                </Field>
              </div>
            </div>

            {/* ── 04: Описание ── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>04</span>
                <h3 className={styles.sectionTitle}>Описание, цели и тагове</h3>
              </div>
              <div className={styles.grid}>
                <Field label="Описание" className={styles.gridFull} hint="За какво е материалът? Какво ще научат учениците? (до 500 символа)">
                  <textarea className={styles.textarea} rows={3} value={form.description} maxLength={500}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Пример: Пълен конспект с теория, формули и решени примери по всички теми от учебната програма за 10. клас." />
                  <p className={styles.charCounter}>{form.description.length}/500</p>
                </Field>
                <Field label="Тагове" className={styles.gridFull} hint="Разделете с запетая. Пример: математика, конспект, 10 клас, матура">
                  <input className={styles.input} type="text" value={form.tags}
                    onChange={e => update('tags', e.target.value)}
                    placeholder="математика, конспект, 10 клас" />
                </Field>
                <Field className={styles.gridFull}
                  label="Учебни цели"
                  hint="По един ред на цел. Пример: Разбиране на основни понятия / Решаване на задачи от тип...">
                  <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:4 }}>
                    <Lightbulb size={14} style={{ color:'#f59e0b', flexShrink:0, marginTop:4 }} />
                    <span className={styles.hint}>Всяка цел на нов ред</span>
                  </div>
                  <textarea className={styles.textarea} rows={3} value={form.learningObjectives}
                    onChange={e => update('learningObjectives', e.target.value)}
                    placeholder={"Разбиране на основни математически понятия\nПрилагане на формули в задачи\nПодготовка за изпит"} />
                </Field>
              </div>

              {/* Additional links */}
              <div style={{ marginTop:14 }}>
                <p className={styles.label} style={{ marginBottom:8 }}>Допълнителни ресурси</p>
                <div className={styles.linksGrid}>
                  <input className={styles.input} type="text" placeholder="Заглавие" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} />
                  <input className={styles.input} type="url" placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
                  <select className={styles.select} value={newLinkType} onChange={e => setNewLinkType(e.target.value)}>
                    <option value="web">Web</option><option value="pdf">PDF</option><option value="video">Video</option>
                  </select>
                  <button type="button" onClick={addLink}
                    style={{ background:'#3b82f6', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', width:38, height:38 }}>
                    <Plus size={15}/>
                  </button>
                </div>
                {form.additionalLinks.map((link, i) => (
                  <div key={i} className={styles.linkItem}>
                    <ExternalLink size={12} style={{ color:'#3b82f6', flexShrink:0 }} />
                    <span className={styles.linkItemText}>{link.title}</span>
                    <span className={styles.linkItemType}>[{link.type}]</span>
                    <button className={styles.linkRemoveBtn} onClick={() => removeLink(i)}><X size={12}/></button>
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
                <label className={`${styles.checkboxItem} ${form.solutions ? styles.checked : ''}`}>
                  <input type="checkbox" className={styles.checkboxNative} checked={form.solutions} onChange={e => update('solutions', e.target.checked)} />
                  <div className={styles.checkboxBox}>{form.solutions && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <CheckCircle size={15} style={{ color:'#10b981', marginLeft:2 }} />
                  <span className={styles.checkboxLabel}>✅ Съдържа решения (тестовете включват отговори)</span>
                </label>
                <label className={`${styles.checkboxItem} ${form.featured ? styles.checked : ''}`}>
                  <input type="checkbox" className={styles.checkboxNative} checked={form.featured} onChange={e => update('featured', e.target.checked)} />
                  <div className={styles.checkboxBox}>{form.featured && <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}</div>
                  <Award size={15} style={{ color:'#f59e0b', marginLeft:2 }} />
                  <span className={styles.checkboxLabel}>⭐ Препоръчан материал (показва се с жълт бадж)</span>
                </label>
              </div>
            </div>

          </div>{/* /body */}

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <div className={styles.requiredLegend}>
                <div className={styles.requiredDot} />
                <span>Задължителни: Заглавие, Автор, URL, Предмет, Категория</span>
              </div>
            </div>
            <div className={styles.footerRight}>
              <button type="button" className={styles.btnCancel} onClick={onClose}>Откажи</button>
              <button type="button" className={`${styles.btnSubmit} ${saved ? styles.btnSubmitSuccess : ''}`}
                onClick={handleSubmit} disabled={saving || saved}>
                {saving ? (<><svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ animation:'fmSpin 1s linear infinite' }}><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/></svg>Запазване…</>)
                : saved  ? 'Запазено!'
                : mode === 'create' ? 'Добави материал' : 'Запази промените'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StudyMaterialForm;