import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Book, ExternalLink, Search, Filter, Download, Eye, Heart,
  Share2, Bookmark, Star, Clock, Tag, ChevronDown, ChevronUp,
  Globe, FileText, Video, Headphones, Award, TrendingUp,
  Calendar, BookOpen, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './OnlineBooksPage.css';
import type { FSDate } from '../lib/services/types';

interface OnlineBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;
  format: string;
  url: string;
  thumbnailUrl: string;
  fileSize?: string;
  duration?: string;
  pages?: number;
  rating: number;
  ratingsCount: number;
  views: number;
  downloads: number;
  featured: boolean;
  createdAt: FSDate;
  lastUpdated: FSDate;
  license?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ageGroup?: string;
  requirements?: string[];
  additionalLinks?: { title: string; url: string; type: string }[];
}

// ── FSDate → milliseconds helper ─────────────────────────────────────────────
const fsDateToMs = (d: FSDate): number => {
  if (!d) return 0;
  if (d instanceof Date) return d.getTime();
  if (typeof d === 'string') return new Date(d).getTime();
  if (typeof d === 'object') {
    if ('toDate' in d && typeof d.toDate === 'function') return d.toDate().getTime();
    if ('seconds' in d && typeof d.seconds === 'number') return d.seconds * 1000;
  }
  return 0;
};
// ─────────────────────────────────────────────────────────────────────────────

const OnlineBooksPage: React.FC = () => {
  const [books, setBooks] = useState<OnlineBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<OnlineBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedBook, setSelectedBook] = useState<OnlineBook | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── filterAndSortBooks declared BEFORE the useEffect that calls it ──────────
  const filterAndSortBooks = useCallback(() => {
    let filtered = [...books];

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (categoryFilter !== 'all') filtered = filtered.filter(b => b.category  === categoryFilter);
    if (formatFilter   !== 'all') filtered = filtered.filter(b => b.format    === formatFilter);
    if (languageFilter !== 'all') filtered = filtered.filter(b => b.language  === languageFilter);
    if (difficultyFilter !== 'all') filtered = filtered.filter(b => b.difficulty === difficultyFilter);

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => fsDateToMs(b.createdAt) - fsDateToMs(a.createdAt));
        break;
      case 'popular':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'downloads':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'author':
        filtered.sort((a, b) => a.author.localeCompare(b.author));
        break;
    }

    setFilteredBooks(filtered);
  }, [books, searchTerm, categoryFilter, formatFilter, languageFilter, difficultyFilter, sortBy]);

  useEffect(() => { filterAndSortBooks(); }, [filterAndSortBooks]);

  // ─────────────────────────────────────────────────────────────────────────────

  const extractFiltersData = useCallback((booksData: OnlineBook[]) => {
    const categories = new Set<string>();
    const languages  = new Set<string>();
    booksData.forEach(book => { categories.add(book.category); languages.add(book.language); });
    setAvailableCategories(Array.from(categories).sort());
    setAvailableLanguages(Array.from(languages).sort());
  }, []);

  const fetchOnlineBooks = useCallback(async () => {
    try {
      setLoading(true);
      const booksQuery = query(collection(db, 'onlineBooks'), orderBy('createdAt', 'desc'));
      const snapshot   = await getDocs(booksQuery);
      const booksData: OnlineBook[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OnlineBook));
      setBooks(booksData);
      extractFiltersData(booksData);
    } catch (error) {
      console.error('Error fetching online books:', error);
      const fallback: OnlineBook[] = [
        {
          id: '1', title: 'Гръмна гръм', author: 'Рей Бредбъри',
          description: 'Класически научнофантастичен разказ за пътуване назад във времето.',
          category: 'Фантастика', subcategory: 'Кратък разказ',
          tags: ['бредбъри', 'фантастика', 'science fiction'],
          language: 'Български', format: 'PDF',
          url: 'https://chitanka.info/book/4662-grymna-grym',
          thumbnailUrl: 'https://assets2.chitanka.info/thumb/book-cover/12/4662.max.jpg',
          fileSize: '1.2 MB', pages: 12, rating: 4.9, ratingsCount: 1240,
          views: 5120, downloads: 3410, featured: true,
          createdAt: new Date('2023-07-15'), lastUpdated: new Date('2024-02-01'),
          publisher: 'Ray Bradbury Estate', year: 1952, difficulty: 'intermediate', ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4662-grymna-grym/export/epub', type: 'pdf' },
            { title: 'Текст онлайн',  url: 'https://chitanka.info/text/4662-grymna-grym',             type: 'web' },
          ],
        },
      ];
      setBooks(fallback);
      extractFiltersData(fallback);
    } finally {
      setLoading(false);
    }
  }, [extractFiltersData]);

  useEffect(() => { fetchOnlineBooks(); }, [fetchOnlineBooks]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleBookClick = (book: OnlineBook) => { setSelectedBook(book); setShowBookDetails(true); };

  const handleReadOnline = (book: OnlineBook) => {
    try {
      const newWindow = window.open(book.url, '_blank');
      // FIX: use assign() instead of directly assigning to location.href
      if (!newWindow) window.location.assign(book.url);
    } catch (error) {
      console.error('Error opening book:', error);
      alert('Възникна грешка при отварянето на книгата.');
    }
  };

  const handleDownload = async (book: OnlineBook) => {
    try {
      let downloadUrl = book.url;
      if (book.url.includes('chitanka.info')) {
        const pdfLink = book.additionalLinks?.find(l => l.title.toLowerCase().includes('pdf') || l.type === 'pdf');
        downloadUrl = pdfLink ? pdfLink.url : book.url.replace('/book/', '/export/') + '/epub';
      }
      const link = document.createElement('a');
      link.href       = downloadUrl;
      link.download   = `${book.title.replace(/\s+/g, '_')}.pdf`;
      link.target     = '_blank';
      link.rel        = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => alert(`Книгата "${book.title}" започва да се сваля!`), 100);
    } catch (error) {
      console.error('Error downloading book:', error);
      alert('Възникна грешка при свалянето. Моля, опитайте отново.');
    }
  };

  const handleShareBook = (book: OnlineBook) => {
    const shareText = `${book.title} от ${book.author}\n\n${book.description.substring(0, 150)}...\n\nПрочети онлайн: ${book.url}`;
    if (navigator.share) {
      navigator.share({ title: book.title, text: `Прочети "${book.title}" от ${book.author}`, url: book.url })
        .catch(() => copyToClipboard(shareText));
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => alert('Информацията е копирана в клипборда!'))
        .catch(() => prompt('Копирайте следния текст:', text));
    } else {
      prompt('Копирайте следния текст:', text);
    }
  };

  const toggleBookExpansion = (bookId: string) =>
    setExpandedBookId(expandedBookId === bookId ? null : bookId);

  const clearFilters = () => {
    setSearchTerm(''); setCategoryFilter('all'); setFormatFilter('all');
    setLanguageFilter('all'); setDifficultyFilter('all'); setSortBy('newest');
  };

  const handleSuggestBook = () => {
    if (user) navigate('/suggest-book');
    else navigate('/login', { state: { redirectTo: '/online-books', message: 'Моля, влезте в профила си, за да предложите книга.' } });
  };

  // ── Icon / colour helpers ───────────────────────────────────────────────────

  type IconComp = React.ComponentType<{ size?: number; className?: string }>;

  const getFormatIcon = (format: string): IconComp => {
    const map: Record<string, IconComp> = { PDF: FileText, EPUB: Book, MOBI: Book, AUDIO: Headphones, VIDEO: Video };
    return map[format] ?? FileText;
  };

  const getFormatColor = (format: string): string =>
    ({ PDF: '#ef4444', EPUB: '#3b82f6', MOBI: '#8b5cf6', AUDIO: '#10b981', VIDEO: '#f59e0b' }[format] ?? '#6b7280');

  const getDifficultyColor = (difficulty?: string): string =>
    ({ beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' }[difficulty ?? ''] ?? '#6b7280');

  const renderStars = (rating: number) => {
    const full    = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="stars-container">
        {[...Array(5)].map((_, i) => {
          if (i < full)              return <Star key={i} className="star-icon star-filled" />;
          if (i === full && hasHalf) return <Star key={i} className="star-icon star-half" />;
          return                            <Star key={i} className="star-icon star-empty" />;
        })}
        <span className="rating-number">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="online-books-page">
        <div className="loading-spinner">
          <div className="spinner" />
          <span>Зареждане на онлайн книги...</span>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="online-books-page">
      <div className="online-books-container">

        {/* Header */}
        <div className="online-books-header">
          <div className="online-books-title-section">
            <div className="title-icon-wrapper online"><Book className="online-books-title-icon" /></div>
            <div className="title-content">
              <h1 className="handwritten-title">Онлайн Библиотека</h1>
              <p className="online-books-subtitle">Дигитални книги, учебници и ресурси за свободен достъп</p>
            </div>
          </div>
          <div className="online-books-actions">
            <button className="suggest-book-btn mobile-hidden" onClick={handleSuggestBook}>
              <BookOpen size={18} /><span>Предложи книга</span>
            </button>
            {isMobileView && (
              <button className="mobile-filters-toggle" onClick={() => setShowMobileFilters(true)}>
                <Filter size={20} /><span>Филтри</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="mobile-filters-modal">
            <div className="mobile-filters-header">
              <h3>Филтриране</h3>
              <button className="close-filters-btn" onClick={() => setShowMobileFilters(false)}><X size={24} /></button>
            </div>
            <div className="mobile-filters-content">
              {[
                { label: 'Търсене', icon: <Search size={16} />, type: 'text' as const,
                  value: searchTerm, onChange: (v: string) => setSearchTerm(v), placeholder: 'Търсете книги, автори, теми...' },
              ].map(f => (
                <div key={f.label} className="filter-group mobile">
                  <label className="filter-label">{f.icon}{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={f.value}
                    onChange={e => f.onChange(e.target.value)} className="filter-input mobile" />
                </div>
              ))}
              <div className="filter-group mobile">
                <label className="filter-label"><Tag size={16} />Категория</label>
                <select className="filter-select mobile" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">Всички категории</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><FileText size={16} />Формат</label>
                <select className="filter-select mobile" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                  <option value="all">Всички формати</option>
                  <option value="PDF">PDF документи</option>
                  <option value="EPUB">EPUB книги</option>
                  <option value="AUDIO">Аудио книги</option>
                  <option value="VIDEO">Видео курсове</option>
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><Globe size={16} />Език</label>
                <select className="filter-select mobile" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}>
                  <option value="all">Всички езици</option>
                  {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><TrendingUp size={16} />Трудност</label>
                <select className="filter-select mobile" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
                  <option value="all">Всички нива</option>
                  <option value="beginner">Начинаещ</option>
                  <option value="intermediate">Напреднал</option>
                  <option value="advanced">Експерт</option>
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><Calendar size={16} />Подреди по</label>
                <select className="filter-select mobile" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Най-нови</option>
                  <option value="popular">Най-популярни</option>
                  <option value="rating">Най-висок рейтинг</option>
                  <option value="title">Име (А-Я)</option>
                  <option value="author">Автор (А-Я)</option>
                  <option value="downloads">Най-сваляни</option>
                </select>
              </div>
            </div>
            <div className="mobile-filters-actions">
              <button className="clear-filters-btn mobile" onClick={() => { clearFilters(); setShowMobileFilters(false); }}>Изчисти</button>
              <button className="apply-filters-btn" onClick={() => setShowMobileFilters(false)}>Приложи</button>
            </div>
          </div>
        )}

        {/* Desktop Filters */}
        {!isMobileView && (
          <div className="online-books-filters desktop-filters">
            <div className="main-search-box">
              <Search className="search-icon" />
              <input type="text" placeholder="Търсете книги, автори, теми..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="search-input" />
              <div className="search-info"><Book size={16} /><span>{books.length} книги налично</span></div>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label"><Filter size={16} />Категория</label>
                <select className="filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">Всички категории</option>
                  {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label"><FileText size={16} />Формат</label>
                <select className="filter-select" value={formatFilter} onChange={e => setFormatFilter(e.target.value)}>
                  <option value="all">Всички формати</option>
                  <option value="PDF">PDF документи</option>
                  <option value="EPUB">EPUB книги</option>
                  <option value="AUDIO">Аудио книги</option>
                  <option value="VIDEO">Видео курсове</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label"><Globe size={16} />Език</label>
                <select className="filter-select" value={languageFilter} onChange={e => setLanguageFilter(e.target.value)}>
                  <option value="all">Всички езици</option>
                  {availableLanguages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label"><TrendingUp size={16} />Трудност</label>
                <select className="filter-select" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
                  <option value="all">Всички нива</option>
                  <option value="beginner">Начинаещ</option>
                  <option value="intermediate">Напреднал</option>
                  <option value="advanced">Експерт</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label"><Calendar size={16} />Подреди по</label>
                <select className="filter-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="newest">Най-нови</option>
                  <option value="popular">Най-популярни</option>
                  <option value="rating">Най-висок рейтинг</option>
                  <option value="title">Име (А-Я)</option>
                  <option value="author">Автор (А-Я)</option>
                  <option value="downloads">Най-сваляни</option>
                </select>
              </div>
              {(searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' ||
                languageFilter !== 'all' || difficultyFilter !== 'all' || sortBy !== 'newest') && (
                <button className="clear-filters-btn" onClick={clearFilters}>Изчисти филтрите</button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Search Bar */}
        {isMobileView && (
          <div className="mobile-search-container">
            <div className="mobile-search-box">
              <Search className="search-icon" />
              <input type="text" placeholder="Търсене..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)} className="mobile-search-input" />
              <div className="mobile-search-info"><span>{books.length} книги</span></div>
            </div>
          </div>
        )}

        {/* Books Grid */}
        <div className="online-books-content">
          {filteredBooks.length > 0 ? (
            <>
              <div className="books-stats">
                <BookOpen className="stats-icon" />
                <span className="books-count">Намерени {filteredBooks.length} книги</span>
                {searchTerm && <span className="search-results">Резултати за "{searchTerm}"</span>}
                {isMobileView && (
                  <button className="mobile-suggest-btn" onClick={handleSuggestBook}>
                    <BookOpen size={16} /><span>Предложи</span>
                  </button>
                )}
              </div>

              <div className="books-grid">
                {filteredBooks.map(book => {
                  const FormatIcon = getFormatIcon(book.format);
                  const isExpanded = expandedBookId === book.id;
                  return (
                    <div
                      key={book.id}
                      className={`book-card ${book.featured ? 'featured' : ''} ${isMobileView ? 'mobile-view' : ''}`}
                      onClick={() => isMobileView && handleBookClick(book)}
                    >
                      {/* ── Featured badge ── */}
                      {book.featured && (
                        <div className="featured-badge">
                          <Award size={13} />
                          <span>Препоръчано</span>
                        </div>
                      )}

                      <div className="book-header">
                        <div className="book-thumbnail">
                          <img src={book.thumbnailUrl} alt={book.title} className="book-image"
                            onError={e => {
                              e.currentTarget.style.display = 'none';
                              const fb = e.currentTarget.nextElementSibling;
                              if (fb) fb.classList.remove('hidden');
                            }} />
                          <div className="book-image-fallback hidden"><Book className="fallback-icon" /></div>
                        </div>

                        <div className="book-main-info">
                          <div className="book-title-section">
                            <h3 className="book-title">{book.title}</h3>
                            <p className="book-author">{book.author}</p>
                          </div>
                          <div className="book-meta">
                            <div className="book-category"><Tag size={14} /><span>{book.category}</span></div>
                            <div className="book-format" style={{ color: getFormatColor(book.format) }}>
                              <FormatIcon size={14} /><span>{book.format}</span>
                            </div>
                            {book.difficulty && !isMobileView && (
                              <div className="book-difficulty" style={{ color: getDifficultyColor(book.difficulty) }}>
                                <TrendingUp size={14} />
                                <span>
                                  {book.difficulty === 'beginner' && 'Начинаещ'}
                                  {book.difficulty === 'intermediate' && 'Напреднал'}
                                  {book.difficulty === 'advanced' && 'Експерт'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="book-description">
                        <p>{isMobileView ? `${book.description.substring(0, 100)}...` : book.description}</p>
                      </div>

                      {!isMobileView && (
                        <>
                          {isExpanded && (
                            <div className="book-details-expanded">
                              {book.pages    && <div className="book-detail"><FileText size={14} /><span>{book.pages} страници</span></div>}
                              {book.fileSize && <div className="book-detail"><Download  size={14} /><span>{book.fileSize}</span></div>}
                              {book.duration && <div className="book-detail"><Clock      size={14} /><span>{book.duration}</span></div>}
                              {book.language && <div className="book-detail"><Globe      size={14} /><span>{book.language}</span></div>}
                              {book.year     && <div className="book-detail"><Calendar   size={14} /><span>{book.year} година</span></div>}
                              {book.additionalLinks && book.additionalLinks.length > 0 && (
                                <div className="additional-links">
                                  <h4>Допълнителни ресурси:</h4>
                                  <div className="links-list">
                                    {book.additionalLinks.map((link, i) => (
                                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                        className="additional-link" onClick={e => e.stopPropagation()}>
                                        <ExternalLink size={12} /><span>{link.title}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {book.tags && book.tags.length > 0 && (
                                <div className="book-tags">
                                  {book.tags.map((tag, i) => <span key={i} className="book-tag">#{tag}</span>)}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="book-stats">
                            <div className="stat-group">
                              {renderStars(book.rating)}
                              <span className="ratings-count">({book.ratingsCount})</span>
                            </div>
                            <div className="stat-group"><Eye size={14} /><span>{book.views} прегледа</span></div>
                            <div className="stat-group"><Download size={14} /><span>{book.downloads} сваляния</span></div>
                          </div>
                        </>
                      )}

                      <div className="book-actions">
                        <button className="read-online-btn"
                          onClick={e => { e.stopPropagation(); handleReadOnline(book); }}>
                          <Eye size={16} /><span>Прочети онлайн</span>
                        </button>
                        {['PDF', 'EPUB', 'MOBI'].includes(book.format) && (
                          <button className="download-btn"
                            onClick={e => { e.stopPropagation(); handleDownload(book); }}>
                            <Download size={16} /><span>{isMobileView ? 'Свали' : 'Свали PDF'}</span>
                          </button>
                        )}
                        {!isMobileView && (
                          <div className="action-buttons">
                            <button className="action-btn"
                              onClick={e => { e.stopPropagation(); toggleBookExpansion(book.id); }}
                              title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <button className="action-btn"
                              onClick={e => { e.stopPropagation(); handleShareBook(book); }} title="Сподели">
                              <Share2 size={16} />
                            </button>
                            {user && (
                              <>
                                <button className="action-btn" title="Добави в любими" onClick={e => e.stopPropagation()}><Heart size={16} /></button>
                                <button className="action-btn" title="Запази за по-късно" onClick={e => e.stopPropagation()}><Bookmark size={16} /></button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!isMobileView && (
                        <div className="book-link">
                          <a href={book.url} target="_blank" rel="noopener noreferrer"
                            className="direct-link" onClick={e => e.stopPropagation()}>
                            <ExternalLink size={14} /><span>Директен линк към книгата</span>
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="no-books-found">
              <Book size={80} className="no-books-icon" />
              <h3 className="handwritten-title-small">
                {searchTerm ? 'Няма намерени книги' : 'Все още няма онлайн книги'}
              </h3>
              <p>
                {searchTerm
                  ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                  : 'Библиотеката с онлайн книги все още се попълва.'}
              </p>
              {(searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' ||
                languageFilter !== 'all' || difficultyFilter !== 'all') && (
                <button className="clear-filters-btn" onClick={clearFilters}>Изчисти филтрите</button>
              )}
            </div>
          )}
        </div>

        {/* Info Section (desktop only) */}
        {!isMobileView && (
          <div className="online-books-info">
            {[
              { icon: <Globe size={24} />, title: 'Достъп до знание отвсякъде', text: 'Нашата онлайн библиотека предлага свободен достъп до образователни ресурси. Четете на всяко устройство, по всяко време.' },
              { icon: <Award size={24} />, title: 'Качество и разнообразие', text: 'Книгите са организирани по категории, формати и нива на трудност. От класическа литература до съвременни учебници.' },
              { icon: <Share2 size={24} />, title: 'Споделяне на знания', text: 'Всички ресурси са с отворен достъп. Можете свободно да ги използвате и споделяте.' },
            ].map((c, i) => (
              <div key={i} className="info-card">
                <div className="info-icon">{c.icon}</div>
                <div className="info-content"><h4>{c.title}</h4><p>{c.text}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div className="book-modal-overlay" onClick={() => setShowBookDetails(false)}>
          <div className={`book-modal ${isMobileView ? 'mobile' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="book-modal-content">
              <div className="book-modal-header">
                <div className="book-modal-thumbnail">
                  <img src={selectedBook.thumbnailUrl} alt={selectedBook.title} className="book-modal-image" />
                </div>
                <div className="book-modal-info">
                  <h2>{selectedBook.title}</h2>
                  <p className="book-modal-author">от {selectedBook.author}</p>
                  <div className="book-modal-meta">
                    <span className="book-modal-category">{selectedBook.category}</span>
                    <span className="book-modal-format">{selectedBook.format}</span>
                    {selectedBook.year && <span className="book-modal-year">{selectedBook.year}</span>}
                  </div>
                  <div className="book-modal-rating">
                    {renderStars(selectedBook.rating)}
                    <span>{selectedBook.ratingsCount} ревюта</span>
                  </div>
                </div>
                <button className="close-modal-btn" onClick={() => setShowBookDetails(false)}><X size={24} /></button>
              </div>
              <div className="book-modal-body">
                <div className="book-modal-description"><h3>Описание</h3><p>{selectedBook.description}</p></div>
                <div className="book-modal-details">
                  <h3>Детайли</h3>
                  <div className="details-grid">
                    {selectedBook.pages     && <div className="detail-item"><span className="detail-label">Страници:</span><span className="detail-value">{selectedBook.pages}</span></div>}
                    {selectedBook.fileSize  && <div className="detail-item"><span className="detail-label">Размер:</span><span className="detail-value">{selectedBook.fileSize}</span></div>}
                    {selectedBook.language  && <div className="detail-item"><span className="detail-label">Език:</span><span className="detail-value">{selectedBook.language}</span></div>}
                    {selectedBook.difficulty && (
                      <div className="detail-item">
                        <span className="detail-label">Ниво:</span>
                        <span className="detail-value">
                          {selectedBook.difficulty === 'beginner' ? 'Начинаещ' : selectedBook.difficulty === 'intermediate' ? 'Напреднал' : 'Експерт'}
                        </span>
                      </div>
                    )}
                    {selectedBook.ageGroup && <div className="detail-item"><span className="detail-label">Възраст:</span><span className="detail-value">{selectedBook.ageGroup}</span></div>}
                  </div>
                </div>
                {selectedBook.additionalLinks && selectedBook.additionalLinks.length > 0 && (
                  <div className="book-modal-links">
                    <h3>Допълнителни ресурси</h3>
                    <div className="links-list">
                      {selectedBook.additionalLinks.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="modal-link">
                          <ExternalLink size={14} /><span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="book-modal-footer">
                <button className="modal-read-btn" onClick={() => { handleReadOnline(selectedBook); setShowBookDetails(false); }}>
                  <Eye size={18} /><span>Прочети онлайн</span>
                </button>
                {['PDF', 'EPUB', 'MOBI'].includes(selectedBook.format) && (
                  <button className="modal-download-btn" onClick={() => { handleDownload(selectedBook); setShowBookDetails(false); }}>
                    <Download size={18} /><span>Свали PDF</span>
                  </button>
                )}
                <button className="modal-share-btn" onClick={() => handleShareBook(selectedBook)}>
                  <Share2 size={18} /><span>Сподели</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineBooksPage;