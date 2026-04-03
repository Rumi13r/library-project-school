import { useState } from 'react';

// ─── Публичен тип ─────────────────────────────────────────────────────────────

export interface BookData {
  isbn:        string;
  title:       string;
  author:      string;
  publisher:   string;
  year:        string;
  pages:       string;
  language:    string;
  description: string;
  coverUrl:    string;
  ddc:         string;  
  lcc:         string;  
  source:      'google' | 'openlibrary' | 'worldcat' | 'combined';
}

export interface BookLookupState {
  loading:  boolean;
  error:    string | null;
  data:     BookData | null;
  partial:  boolean;  
  attempts: string[]; 
}

const clean = (s?: string | null): string => s?.trim() ?? '';

const normalizeAuthor = (raw: string): string => {
  if (!raw) return '';
  // "Вазов, Иван" → "Иван Вазов"
  const parts = raw.split(',').map(s => s.trim());
  return parts.length >= 2
    ? `${parts.slice(1).join(' ')} ${parts[0]}`.replace(/\s+/g, ' ').trim()
    : raw.trim();
};

const extractYear = (raw?: string): string => {
  if (!raw) return '';
  const m = raw.match(/\d{4}/);
  return m ? m[0] : '';
};

// ─── API 1: Google Books ──────────────────────────────────────────────────────
// Безплатен, без API ключ, ~40 млн. книги, отлично за нови заглавия.

const fetchGoogleBooks = async (isbn: string): Promise<Partial<BookData> | null> => {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}&maxResults=1`;
  const res  = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  if (!json.items?.length) return null;

  const vol  = json.items[0].volumeInfo ?? {};
  const isbn13 = vol.industryIdentifiers?.find((i: { type: string; identifier: string }) => i.type === 'ISBN_13')?.identifier ?? isbn;
  const isbn10 = vol.industryIdentifiers?.find((i: { type: string; identifier: string }) => i.type === 'ISBN_10')?.identifier ?? '';

  // Google Books корица — предпочитаме Google, fallback към Open Library
  const googleCover = `https://books.google.com/books/content?vid=ISBN${isbn13}&printsec=frontcover&img=1&zoom=1`;
  const olCover     = isbn10
    ? `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`
    : `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
  const thumbnailCover = vol.imageLinks?.thumbnail?.replace('http://', 'https://') ?? '';
  const coverUrl   = googleCover || thumbnailCover || olCover;

  return {
    isbn:        isbn13 || isbn,
    title:       clean(vol.title),
    author:      (vol.authors ?? []).join(', '),
    publisher:   clean(vol.publisher),
    year:        extractYear(vol.publishedDate),
    pages:       vol.pageCount?.toString() ?? '',
    language:    mapLanguage(clean(vol.language)),
    description: clean(vol.description?.replace(/<[^>]+>/g, '')).slice(0, 500),
    coverUrl,
    ddc:         '',
    lcc:         '',
    source:      'google',
  };
};

// ─── API 2: Open Library ──────────────────────────────────────────────────────
// Безплатен, ~30 млн. книги, добри данни за корица.

const fetchOpenLibrary = async (isbn: string): Promise<Partial<BookData> | null> => {
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
  if (!res.ok) return null;

  const book = await res.json();

  // Автор — трябва отделна заявка
  let author = '';
  if (Array.isArray(book.authors) && book.authors.length > 0) {
    try {
      const aRes = await fetch(`https://openlibrary.org${book.authors[0].key}.json`);
      if (aRes.ok) { const a = await aRes.json(); author = clean(a.name); }
    } catch { /* ignore */ }
  }
  // Fallback: автор от works
  if (!author && Array.isArray(book.works) && book.works.length > 0) {
    try {
      const wRes = await fetch(`https://openlibrary.org${book.works[0].key}.json`);
      if (wRes.ok) {
        const w = await wRes.json();
        if (Array.isArray(w.authors) && w.authors.length > 0) {
          const aRes = await fetch(`https://openlibrary.org${w.authors[0].author.key}.json`);
          if (aRes.ok) { const a = await aRes.json(); author = clean(a.name); }
        }
      }
    } catch { /* ignore */ }
  }

  return {
    isbn,
    title:       clean(book.title),
    author,
    publisher:   clean(book.publishers?.[0]),
    year:        extractYear(book.publish_date),
    pages:       book.number_of_pages?.toString() ?? '',
    language:    '',
    description: '',
    coverUrl:    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    ddc:         '',
    lcc:         '',
    source:      'openlibrary',
  };
};

// ─── API 3: WorldCat Classify ─────────────────────────────────────────────────
// Безплатен, ~500 млн. записа, DDC/LCC, добър за стари и академични книги.

const fetchWorldCat = async (isbn: string): Promise<Partial<BookData> | null> => {
  const res = await fetch(
    `https://classify.oclc.org/classify2/Classify?summary=true&isbn=${encodeURIComponent(isbn)}`
  );
  if (!res.ok) return null;

  const xml    = new DOMParser().parseFromString(await res.text(), 'application/xml');
  if (xml.querySelector('parsererror')) return null;

  const NS   = 'http://classify.oclc.org';
  const code = xml.getElementsByTagNameNS(NS, 'response')[0]?.getAttribute('code') ?? '';

  if (code !== '0' && code !== '4') return null;

  let title = '', author = '';
  if (code === '0') {
    const w = xml.getElementsByTagNameNS(NS, 'work')[0];
    title  = clean(w?.getAttribute('title'));
    author = normalizeAuthor(clean(w?.getAttribute('author')));
  } else {
    const ws = xml.getElementsByTagNameNS(NS, 'work');
    if (ws.length > 0) {
      title  = clean(ws[0].getAttribute('title'));
      author = normalizeAuthor(clean(ws[0].getAttribute('author')));
    }
  }

  const ddc = xml.getElementsByTagNameNS(NS, 'ddc')[0]
    ?.getElementsByTagNameNS(NS, 'mostPopular')[0]?.getAttribute('sfa')?.trim() ?? '';
  const lcc = xml.getElementsByTagNameNS(NS, 'lcc')[0]
    ?.getElementsByTagNameNS(NS, 'mostPopular')[0]?.getAttribute('sfa')?.trim() ?? '';

  return {
    isbn,
    title,
    author,
    publisher:   '',
    year:        '',
    pages:       '',
    language:    '',
    description: '',
    coverUrl:    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
    ddc,
    lcc,
    source:      'worldcat',
  };
};

// ─── Verif cover URL ──────────────────────────────────────────────────────────
// Open Library връща placeholder ако липсва корица.
// Проверяваме с HEAD заявка (ако е < 1KB → placeholder)

const verifyCover = async (url: string): Promise<boolean> => {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const size = parseInt(res.headers.get('content-length') ?? '0');
    return res.ok && size > 1000; // placeholder-ите са ~800 байта
  } catch { return false; }
};

// ─── Language map ─────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  bg: 'Български', en: 'Английски', de: 'Немски', fr: 'Френски',
  ru: 'Руски', es: 'Испански', it: 'Италиански', tr: 'Турски',
  el: 'Гръцки', uk: 'Украински', pl: 'Полски', cs: 'Чешки',
};

const mapLanguage = (code: string): string => LANG_MAP[code] ?? code;

// ─── Main fetch — верига ──────────────────────────────────────────────────────

const isComplete = (d: Partial<BookData>): boolean =>
  !!(d.title && d.author);

export const fetchBookByISBN = async (isbn: string): Promise<{ data: BookData; attempts: string[] }> => {
  const cleanISBN = isbn.replace(/-/g, '').trim();
  const attempts: string[] = [];

  let result: Partial<BookData> = { isbn: cleanISBN, ddc: '', lcc: '' };

  // ── Step 1: Google Books ──────────────────────────────────────────────────
  attempts.push('Google Books');
  try {
    const g = await fetchGoogleBooks(cleanISBN);
    if (g) {
      result = { ...result, ...g };
      if (isComplete(result)) {
        // Проверяваме корицата
        const coverOk = await verifyCover(result.coverUrl ?? '');
        if (!coverOk) result.coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-L.jpg`;
        return { data: result as BookData, attempts };
      }
    }
  } catch { /* continue to next API */ }

  // ── Step 2: Open Library ──────────────────────────────────────────────────
  attempts.push('Open Library');
  try {
    const ol = await fetchOpenLibrary(cleanISBN);
    if (ol) {
      // Сливаме — запазваме вече намерените данни, попълваме липсващите
      result = {
        ...result,
        title:       result.title  || ol.title  || '',
        author:      result.author || ol.author || '',
        publisher:   result.publisher || ol.publisher || '',
        year:        result.year   || ol.year   || '',
        pages:       result.pages  || ol.pages  || '',
        description: result.description || ol.description || '',
        coverUrl:    result.coverUrl || ol.coverUrl || '',
        source:      'combined',
      };
      if (isComplete(result)) {
        return { data: result as BookData, attempts };
      }
    }
  } catch { /* continue */ }

  // ── Step 3: WorldCat ──────────────────────────────────────────────────────
  attempts.push('WorldCat');
  try {
    const wc = await fetchWorldCat(cleanISBN);
    if (wc) {
      result = {
        ...result,
        title:  result.title  || wc.title  || '',
        author: result.author || wc.author || '',
        ddc:    wc.ddc || '',
        lcc:    wc.lcc || '',
        source: 'combined',
      };
    }
  } catch { /* ignore */ }

  // ── Ако нищо не е намерено ────────────────────────────────────────────────
  if (!result.title && !result.author) {
    throw new Error(
      `Книгата не е намерена в нито един от изворите (ISBN: ${cleanISBN}). ` +
      `Проверете дали ISBN-ът е правилен или попълнете данните ръчно.`
    );
  }

  return { data: result as BookData, attempts };
};

// ─── React Hook ───────────────────────────────────────────────────────────────

export const useBookLookup = () => {
  const [state, setState] = useState<BookLookupState>({
    loading:  false,
    error:    null,
    data:     null,
    partial:  false,
    attempts: [],
  });
  const lookup = async (isbn: string): Promise<BookData | null> => {
    setState({ loading: true, error: null, data: null, partial: false, attempts: [] });
    try {
      const { data, attempts } = await fetchBookByISBN(isbn);
      const partial = !data.title || !data.author;
      setState({ loading: false, error: null, data, partial, attempts });
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестна грешка';
      setState({ loading: false, error: msg, data: null, partial: false, attempts: [] });
      return null;
    }
  };

  const reset = () =>
    setState({ loading: false, error: null, data: null, partial: false, attempts: [] });

  return { ...state, lookup, reset };
};

// Backward-compatible alias (за ISBNLookupBar)
export const useWorldCat = useBookLookup;
export type  WorldCatBook = BookData;