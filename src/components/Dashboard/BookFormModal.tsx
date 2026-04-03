
import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as bookService from '../../lib/services/bookService';
import type { BookLibrary } from '../../lib/services/bookTypes';
import ISBNLookupBar from '../BookScanner/ISBNLookupBar';
import type { ISBNFillData } from '../BookScanner/ISBNLookupBar';
import styles from './BookFormModal.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookFormModalProps {
  mode:        'create' | 'edit';
  initialData: Partial<BookLibrary>;
  onSave:      (data: Partial<BookLibrary>) => Promise<void>;
  onClose:     () => void;
}

type FormData = {
  isbn:             string;
  title:            string;
  author:           string;
  category:         string;
  genre:            string;
  copies:           number;
  availableCopies:  number;
  publisher:        string;
  year:             number;
  pages:            number;
  language:         string;
  edition:          string;
  coverType:        'soft' | 'hard';
  condition:        'new' | 'good' | 'fair' | 'poor';
  location:         string;
  shelfNumber:      string;
  callNumber:       string;
  description:      string;
  tags:             string;
  ageRecommendation:string;
  coverUrl:         string;
  borrowPeriod:     number;
  maxRenewals:      number;
  featured:         boolean;
  isActive:         boolean;
  underMaintenance: boolean;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;

// ─── Required fields ──────────────────────────────────────────────────────────

const REQUIRED: (keyof FormData)[] = ['isbn', 'title', 'author', 'category', 'genre', 'copies'];

// ─── Validation ───────────────────────────────────────────────────────────────

const validateForm = (data: FormData): FieldErrors => {
  const errors: FieldErrors = {};

  if (!data.title.trim())
    errors.title = 'Заглавието е задължително';
  else if (data.title.trim().length < 2)
    errors.title = 'Заглавието трябва да е поне 2 символа';

  if (!data.author.trim())
    errors.author = 'Авторът е задължителен';
  else if (!/^[А-Яа-яA-Za-z\s\-.]+$/.test(data.author.trim()))
    errors.author = 'Само букви, тире и точки';

  if (!data.isbn.trim())
    errors.isbn = 'ISBN е задължителен';
  else if (!/^(978|979)\d{10}$|^\d{10}$/.test(data.isbn.replace(/-/g, '')))
    errors.isbn = 'Невалиден ISBN формат (трябва да е ISBN-10 или ISBN-13)';

  if (!data.category)
    errors.category = 'Изберете категория';

  if (!data.genre)
    errors.genre = 'Изберете жанр';

  if (data.copies < 1 || data.copies > 999)
    errors.copies = 'Между 1 и 999 копия';

  if (data.year && (data.year < 1400 || data.year > new Date().getFullYear()))
    errors.year = `Между 1400 и ${new Date().getFullYear()}`;

  if (data.pages && data.pages < 1)
    errors.pages = 'Страниците трябва да са положително число';

  if (data.coverUrl && !/^https?:\/\/.+\..+/.test(data.coverUrl))
    errors.coverUrl = 'Въведете валиден URL (https://...)';

  return errors;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toFormData = (d: Partial<BookLibrary>): FormData => ({
  isbn:             d.isbn             || '',
  title:            d.title            || '',
  author:           d.author           || '',
  category:         d.category         || '',
  genre:            d.genres?.[0]      || '',
  copies:           d.copies           ?? 1,
  availableCopies:  d.availableCopies  ?? 1,
  publisher:        d.publisher        || '',
  year:             d.year             || new Date().getFullYear(),
  pages:            d.pages            || 0,
  language:         d.language         || 'Български',
  edition:          d.edition          || 'Първо издание',
  coverType:        (d.coverType as 'soft' | 'hard') || 'soft',
  condition:        (d.condition as 'new' | 'good' | 'fair' | 'poor') || 'good',
  location:         d.location         || 'Библиотека',
  shelfNumber:      d.shelfNumber      || '',
  callNumber:       d.callNumber       || '',
  description:      d.description      || '',
  tags:             d.tags?.join(', ') || '',
  ageRecommendation:d.ageRecommendation|| '',
  coverUrl:         d.coverUrl         || '',
  borrowPeriod:     d.borrowPeriod     ?? 14,
  maxRenewals:      d.maxRenewals      ?? 2,
  featured:         d.featured         || false,
  isActive:         d.isActive         !== false,
  underMaintenance: d.underMaintenance || false,
});

// ─── Sub-components ───────────────────────────────────────────────────────────

// Animated field with label, validation and hint
const Field: React.FC<{
  id?:       string;
  label:     string;
  required?: boolean;
  error?:    string;
  hint?:     string;
  className?: string;
  children:  React.ReactNode;
}> = ({ id, label, required, error, hint, className, children }) => (
  <div id={id} className={`${styles.field} ${className||''}`}>
    <label className={styles.label}>
      {label}
      {required && <span className={error ? styles.reqError : styles.req}>*</span>}
    </label>
    {children}
    {error && (
      <div className={styles.errorMsg}>
        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"/>
        </svg>
        {error}
      </div>
    )}
    {!error && hint && <p className={styles.hint}>{hint}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const BookFormModal: React.FC<BookFormModalProps> = ({
  mode, initialData, onSave, onClose,
}) => {
  const [form,     setForm]     = useState<FormData>(() => toFormData(initialData));
  const [errors,   setErrors]   = useState<FieldErrors>({});
  const [touched,  setTouched]  = useState<Set<keyof FormData>>(new Set());
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Field update + live validate touched fields
  const update = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (touched.has(key)) {
        const errs = validateForm(next);
        setErrors(prev => ({ ...prev, [key]: errs[key] }));
      }
      return next;
    });
  }, [touched]);

  // Mark field as touched on blur
  const touch = useCallback((key: keyof FormData) => {
    setTouched(prev => new Set([...prev, key]));
    const errs = validateForm(form);
    setErrors(prev => ({ ...prev, [key]: errs[key] }));
  }, [form]);

  // ISBN Lookup fill
  const handleISBNFill = (data: ISBNFillData) => {
    setForm(prev => ({
      ...prev,
      ...(data.isbn        && { isbn:        data.isbn }),
      ...(data.title       && { title:       data.title }),
      ...(data.author      && { author:      data.author }),
      ...(data.coverUrl    && { coverUrl:    data.coverUrl }),
      ...(data.publisher   && { publisher:   data.publisher }),
      ...(data.year        && { year:        data.year }),
      ...(data.pages       && { pages:       data.pages }),
      ...(data.language    && { language:    data.language }),
      ...(data.description && { description: data.description }),
    }));
    setErrors(prev => ({
      ...prev,
      isbn: undefined, title: undefined, author: undefined,
    }));
  };

  // Submit
  const handleSubmit = async () => {
    // Validate all
    const allErrors = validateForm(form);
    const allTouched = new Set(Object.keys(form) as (keyof FormData)[]);
    setTouched(allTouched);
    setErrors(allErrors);

    if (Object.keys(allErrors).length > 0) {
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 4000);
      // Scroll to first error
      const firstErr = Object.keys(allErrors)[0];
      document.getElementById(`field-${firstErr}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      await onSave({
        isbn:              form.isbn,
        title:             form.title,
        author:            form.author,
        category:          form.category,
        genres:            form.genre ? [form.genre] : [],
        copies:            form.copies,
        availableCopies:   form.availableCopies ?? form.copies,
        publisher:         form.publisher,
        year:              form.year,
        pages:             form.pages,
        language:          form.language,
        edition:           form.edition,
        coverType:         form.coverType,
        condition:         form.condition,
        location:          form.location,
        shelfNumber:       form.shelfNumber,
        callNumber:        form.callNumber,
        description:       form.description,
        tags:              form.tags.split(',').map(t => t.trim()).filter(Boolean),
        ageRecommendation: form.ageRecommendation,
        coverUrl:          form.coverUrl,
        borrowPeriod:      form.borrowPeriod,
        maxRenewals:       form.maxRenewals,
        featured:          form.featured,
        isActive:          form.isActive,
        underMaintenance:  form.underMaintenance,
      });
      setSaved(true);
      setTimeout(onClose, 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Input class helper
  const ic = (key: keyof FormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.input} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };

  const sc = (key: keyof FormData) => {
    const hasErr = !!errors[key] && touched.has(key);
    const isOk   = touched.has(key) && !errors[key] && REQUIRED.includes(key);
    return `${styles.select} ${hasErr ? styles.inputError : ''} ${isOk ? styles.inputValid : ''}`;
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <div className={styles.overlay}
           ref={overlayRef}
           onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className={styles.modal}>

          {/* ══ HERO HEADER ═══════════════════════════════════════════════ */}
          <div className={styles.heroHeader}>
            <p className={styles.heroLabel}>
              Библиотечна система · {mode === 'create' ? 'Нов запис' : 'Редактиране'}
            </p>
            <h2 className={styles.heroTitle}>
              {mode === 'create'
                ? <>Добавяне на <em>нова книга</em></>
                : <>Редактиране на <em>{initialData.title || 'книга'}</em></>}
            </h2>
            <button className={styles.heroClose} onClick={onClose} aria-label="Затвори">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                   stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* ══ ISBN SCANNER (само при create) ════════════════════════════ */}
          {mode === 'create' && (
            <div className={styles.scannerWrap}>
              <ISBNLookupBar
                onFill={handleISBNFill}
                initialISBN={form.isbn}
              />
            </div>
          )}

          {/* ══ ERROR BANNER ═══════════════════════════════════════════════ */}
          {showBanner && (
            <div className={styles.errorBanner}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"/>
              </svg>
              <div>
                <strong>Моля, поправете грешките:</strong>{' '}
                {Object.values(errors).filter(Boolean).join(' · ')}
              </div>
            </div>
          )}

          {/* ══ BODY ══════════════════════════════════════════════════════ */}
          <div className={styles.body}>

            {/* ── Section 01: Идентификация ────────────────────────────── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>01</span>
                <h3 className={styles.sectionTitle}>Идентификация</h3>
                <span className={styles.sectionNote}>задължителни полета</span>
              </div>

              <div className={styles.grid}>

                {/* ISBN */}
                <Field id="field-isbn" label="ISBN" required
                       error={touched.has('isbn') ? errors.isbn : undefined}
                       hint="Пример: 978-954-473-123-4">
                  <input
                    id="field-isbn"
                    className={`${ic('isbn')} ${styles.isbnInput}`}
                    type="text"
                    value={form.isbn}
                    onChange={e => update('isbn', e.target.value.replace(/\s/g,''))}
                    onBlur={() => touch('isbn')}
                    placeholder="978-XXXXXXXXXX"
                    maxLength={17}
                  />
                </Field>

                {/* Заглавие */}
                <Field label="Заглавие" required
                       error={touched.has('title') ? errors.title : undefined}
                       hint="Пример: Под игото">
                  <input
                    id="field-title"
                    className={ic('title')}
                    type="text"
                    value={form.title}
                    onChange={e => update('title', e.target.value)}
                    onBlur={() => touch('title')}
                    placeholder="Пълното заглавие на книгата"
                  />
                </Field>

                {/* Автор */}
                <Field label="Автор" required
                       error={touched.has('author') ? errors.author : undefined}
                       hint="Пример: Иван Вазов">
                  <input
                    id="field-author"
                    className={ic('author')}
                    type="text"
                    value={form.author}
                    onChange={e => update('author', e.target.value)}
                    onBlur={() => touch('author')}
                    placeholder="Собствено Фамилно"
                  />
                </Field>

                {/* Издател */}
                <Field label="Издател"
                       hint="Пример: Просвета, Сиела, Хермес">
                  <input
                    className={ic('publisher')}
                    type="text"
                    value={form.publisher}
                    onChange={e => update('publisher', e.target.value)}
                    onBlur={() => touch('publisher')}
                    placeholder="Издателство"
                  />
                </Field>

                {/* Категория */}
                <Field label="Категория" required
                       error={touched.has('category') ? errors.category : undefined}>
                  <select
                    id="field-category"
                    className={sc('category')}
                    value={form.category}
                    onChange={e => update('category', e.target.value)}
                    onBlur={() => touch('category')}
                  >
                    <option value="">— Изберете категория —</option>
                    {bookService.BOOK_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                {/* Жанр */}
                <Field label="Жанр" required
                       error={touched.has('genre') ? errors.genre : undefined}>
                  <select
                    id="field-genre"
                    className={sc('genre')}
                    value={form.genre}
                    onChange={e => update('genre', e.target.value)}
                    onBlur={() => touch('genre')}
                  >
                    <option value="">— Изберете жанр —</option>
                    {bookService.BOOK_GENRES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>

              </div>
            </div>

            {/* ── Section 02: Библиотечно местоположение ───────────────── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>02</span>
                <h3 className={styles.sectionTitle}>Библиотечно местоположение</h3>
              </div>

              <div className={styles.grid}>

                {/* Копия */}
                <Field label="Брой копия" required
                       error={touched.has('copies') ? errors.copies : undefined}
                       hint="Общо физически копия в библиотеката">
                  <div className={`${styles.numberWrap} ${touched.has('copies') && errors.copies ? styles.inputError : ''}`}>
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('copies', Math.max(1, form.copies - 1))}>−</button>
                    <input
                      type="number" className={styles.numberInput}
                      value={form.copies} min={1} max={999}
                      onChange={e => update('copies', parseInt(e.target.value) || 1)}
                      onBlur={() => touch('copies')}
                    />
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('copies', Math.min(999, form.copies + 1))}>+</button>
                  </div>
                </Field>

                {/* Налични */}
                <Field label="Налични копия"
                       hint={`Максимум: ${form.copies}`}>
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('availableCopies', Math.max(0, form.availableCopies - 1))}>−</button>
                    <input
                      type="number" className={styles.numberInput}
                      value={form.availableCopies} min={0} max={form.copies}
                      onChange={e => update('availableCopies', Math.min(form.copies, parseInt(e.target.value)||0))}
                    />
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('availableCopies', Math.min(form.copies, form.availableCopies + 1))}>+</button>
                  </div>
                </Field>

                {/* Рафт */}
                <Field label="Рафт №" hint="Пример: БГ-А3, РУС-Б2">
                  <input
                    className={ic('shelfNumber')}
                    type="text"
                    value={form.shelfNumber}
                    onChange={e => update('shelfNumber', e.target.value)}
                    placeholder="Напр. БГ-А3"
                  />
                </Field>

                {/* Сигнатура */}
                <Field label="Сигнатура" hint="Пример: 891.811 VAZ">
                  <input
                    className={ic('callNumber')}
                    type="text"
                    value={form.callNumber}
                    onChange={e => update('callNumber', e.target.value)}
                    placeholder="Dewey / LCC сигнатура"
                  />
                </Field>

                {/* Отдел */}
                <Field label="Отдел / Местоположение">
                  <select className={styles.select} value={form.location}
                    onChange={e => update('location', e.target.value)}>
                    {['Библиотека','Основен отдел','Учебен отдел','Чуждестранна литература',
                      'Кратка проза','Фантастика','Справочен отдел'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </Field>

                {/* Период */}
                <Field label="Период на заемане (дни)" hint="Препоръчително: 14 или 30 дни">
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('borrowPeriod', Math.max(1, form.borrowPeriod - 1))}>−</button>
                    <input
                      type="number" className={styles.numberInput}
                      value={form.borrowPeriod} min={1} max={90}
                      onChange={e => update('borrowPeriod', parseInt(e.target.value)||14)}
                    />
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('borrowPeriod', Math.min(90, form.borrowPeriod + 1))}>+</button>
                  </div>
                </Field>

              </div>
            </div>

            {/* ── Section 03: Публикационни данни ─────────────────────── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>03</span>
                <h3 className={styles.sectionTitle}>Публикационни данни</h3>
              </div>

              <div className={styles.grid}>

                {/* Година */}
                <Field label="Година на издаване"
                       error={touched.has('year') ? errors.year : undefined}
                       hint={`Между 1400 и ${new Date().getFullYear()}`}>
                  <input
                    className={ic('year')}
                    type="number"
                    value={form.year || ''}
                    onChange={e => update('year', parseInt(e.target.value)||0)}
                    onBlur={() => touch('year')}
                    placeholder={`${new Date().getFullYear()}`}
                    min={1400} max={new Date().getFullYear()}
                  />
                </Field>

                {/* Страници */}
                <Field label="Брой страници"
                       error={touched.has('pages') ? errors.pages : undefined}
                       hint="Пример: 320">
                  <input
                    className={ic('pages')}
                    type="number"
                    value={form.pages || ''}
                    onChange={e => update('pages', parseInt(e.target.value)||0)}
                    onBlur={() => touch('pages')}
                    placeholder="320"
                    min={1}
                  />
                </Field>

                {/* Език */}
                <Field label="Език">
                  <select className={styles.select} value={form.language}
                    onChange={e => update('language', e.target.value)}>
                    {['Български','Английски','Немски','Френски','Руски','Испански','Италиански','Друг'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </Field>

                {/* Издание */}
                <Field label="Издание" hint="Пример: Второ преработено издание">
                  <input
                    className={styles.input}
                    type="text"
                    value={form.edition}
                    onChange={e => update('edition', e.target.value)}
                    placeholder="Първо издание"
                  />
                </Field>

                {/* Макс. удължавания */}
                <Field label="Макс. удължавания" hint="Препоръчително: 2">
                  <div className={styles.numberWrap}>
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('maxRenewals', Math.max(0, form.maxRenewals - 1))}>−</button>
                    <input
                      type="number" className={styles.numberInput}
                      value={form.maxRenewals} min={0} max={10}
                      onChange={e => update('maxRenewals', parseInt(e.target.value)||0)}
                    />
                    <button type="button" className={styles.numberBtn}
                      onClick={() => update('maxRenewals', Math.min(10, form.maxRenewals + 1))}>+</button>
                  </div>
                </Field>

                {/* Препоръчана за възраст */}
                <Field label="Препоръчана за възраст" hint="Пример: 12+, 16+, Всички">
                  <input
                    className={styles.input}
                    type="text"
                    value={form.ageRecommendation}
                    onChange={e => update('ageRecommendation', e.target.value)}
                    placeholder="12+"
                  />
                </Field>

              </div>

              {/* Физическо състояние */}
              <div style={{ marginTop: 16 }}>
                <label className={styles.label}>Физическо състояние</label>
                <div className={styles.conditionGroup}>
                  {([
                    { val:'new',  label:'🆕 Нова',          cls:styles.condNew  },
                    { val:'good', label:'✅ Добра',          cls:styles.condGood },
                    { val:'fair', label:'⚠️ Задоволителна',  cls:styles.condFair },
                    { val:'poor', label:'❌ Лоша',           cls:styles.condPoor },
                  ] as const).map(({ val, label, cls }) => (
                    <button key={val} type="button"
                      className={`${styles.condBadge} ${form.condition===val ? cls : ''}`}
                      onClick={() => update('condition', val)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Вид корици */}
              <div style={{ marginTop: 16 }}>
                <label className={styles.label}>Вид корици</label>
                <div className={styles.coverTypeGroup}>
                  <button type="button"
                    className={`${styles.coverTypeBtn} ${form.coverType==='soft' ? styles.active : ''}`}
                    onClick={() => update('coverType', 'soft')}>
                    <span className={styles.coverTypeIcon}>📖</span>
                    Меки корици
                  </button>
                  <button type="button"
                    className={`${styles.coverTypeBtn} ${form.coverType==='hard' ? styles.active : ''}`}
                    onClick={() => update('coverType', 'hard')}>
                    <span className={styles.coverTypeIcon}>📚</span>
                    Твърди корици
                  </button>
                </div>
              </div>

            </div>

            {/* ── Section 04: Описание и дигитално ───────────────────── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>04</span>
                <h3 className={styles.sectionTitle}>Описание и медия</h3>
              </div>

              <div className={styles.grid}>

                {/* Описание */}
                <Field label="Описание / Анотация" className={styles.gridFull}
                       hint="Кратко резюме на книгата (до 500 символа)">
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={e => update('description', e.target.value)}
                    placeholder="Книгата разказва за..."
                    maxLength={500}
                    rows={3}
                  />
                  <p className={styles.charCounter}>{form.description.length}/500</p>
                </Field>

                {/* Тагове */}
                <Field label="Тагове" className={styles.gridFull}
                       hint="Разделете с запетая. Пример: класика, патриотична, задължителна литература">
                  <input
                    className={styles.input}
                    type="text"
                    value={form.tags}
                    onChange={e => update('tags', e.target.value)}
                    placeholder="класика, задължителна литература, БГ лит"
                  />
                </Field>

                {/* Корица URL */}
                <div className={`${styles.field} ${styles.gridFull}`}>
                  <label className={styles.label}>Линк към корица</label>
                  <div className={styles.coverPreviewRow}>
                    <div className={styles.coverThumb}>
                      {form.coverUrl && coverLoaded ? (
                        <img src={form.coverUrl} alt="Корица"
                             className={styles.coverThumbImg}
                             onError={() => setCoverLoaded(false)}/>
                      ) : (
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        className={`${ic('coverUrl')}`}
                        type="url"
                        value={form.coverUrl}
                        onChange={e => { update('coverUrl', e.target.value); setCoverLoaded(true); }}
                        onBlur={() => touch('coverUrl')}
                        placeholder="https://example.com/book-cover.jpg"
                      />
                      {touched.has('coverUrl') && errors.coverUrl && (
                        <div className={styles.errorMsg}>
                          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"/>
                          </svg>
                          {errors.coverUrl}
                        </div>
                      )}
                      <p className={styles.hint}>Корицата ще се зареди автоматично при валиден URL</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* ── Section 05: Настройки ──────────────────────────────── */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionNum}>05</span>
                <h3 className={styles.sectionTitle}>Настройки</h3>
              </div>

              <div className={styles.checkboxGroup}>
                {[
                  { key: 'featured'        as const, label: '⭐ Препоръчана книга' },
                  { key: 'isActive'        as const, label: '✅ Активна в системата' },
                  { key: 'underMaintenance'as const, label: '🔧 В ремонт / обслужване' },
                ].map(({ key, label }) => (
                  <label key={key}
                    className={`${styles.checkboxItem} ${form[key] ? styles.checked : ''}`}>
                    <input type="checkbox" className={styles.checkboxNative}
                      checked={!!form[key]}
                      onChange={e => update(key, e.target.checked as FormData[typeof key])}/>
                    <div className={styles.checkboxBox}>
                      {form[key] && (
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={styles.checkboxLabel}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>{/* /body */}

          {/* ══ FOOTER ════════════════════════════════════════════════════ */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              <div className={styles.requiredLegend}>
                <div className={styles.requiredDot}/>
                <span>Задължителни: Заглавие, Автор, ISBN, Категория, Жанр, Копия</span>
              </div>
            </div>

            <div className={styles.footerRight}>
              <button type="button" className={styles.btnCancel} onClick={onClose}>
                Откажи
              </button>
              <button
                type="button"
                className={`${styles.btnSubmit} ${saved ? styles.btnSubmitSuccess : ''}`}
                onClick={handleSubmit}
                disabled={saving || saved}
              >
                {saving ? (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                         style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3"
                              strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round"/>
                    </svg>
                    Запазване…
                  </>
                ) : saved ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"/>
                    </svg>
                    Запазено!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                         stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
                    </svg>
                    {mode === 'create' ? 'Добави книгата' : 'Запази промените'}
                  </>
                )}
              </button>
            </div>
          </div>

        </div>{/* /modal */}
      </div>{/* /overlay */}

      <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default BookFormModal;