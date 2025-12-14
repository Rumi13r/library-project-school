import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Book, 
  ExternalLink, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Heart, 
  Share2, 
  Bookmark,
  Star,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Video,
  Headphones,
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './OnlineBooksPage.css';

interface OnlineBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;
  format: string; // PDF, EPUB, MOBI, AUDIO, VIDEO
  url: string;
  thumbnailUrl: string;
  fileSize?: string;
  duration?: string; // За аудио/видео книги
  pages?: number;
  rating: number;
  ratingsCount: number;
  views: number;
  downloads: number;
  featured: boolean;
  createdAt: any;
  lastUpdated: any;
  license?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ageGroup?: string;
  requirements?: string[];
  additionalLinks?: {
    title: string;
    url: string;
    type: string;
  }[];
}

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
  const [showVazovStories, setShowVazovStories] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // Добавяме event listener за промяна на размера на екрана
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchOnlineBooks();
  }, []);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, categoryFilter, formatFilter, languageFilter, difficultyFilter, sortBy]);

  const fetchOnlineBooks = async () => {
    try {
      setLoading(true);
      // Заявка към Firestore
      const booksQuery = query(
        collection(db, "onlineBooks"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(booksQuery);
      const booksData: OnlineBook[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OnlineBook));

      setBooks(booksData);
      extractFiltersData(booksData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching online books:", error);
      // Fallback data за демонстрация - Всички книги включително разказите на Вазов
      const allBooks: OnlineBook[] = [
        {
          id: '1',
          title: 'Гръмна гръм',
          author: 'Рей Бредбъри',
          description: 'Класически научнофантастичен разказ за пътуване назад във времето, в който дребна, на пръв поглед незначителна промяна, води до драматични последици в бъдещето.',
          category: 'Фантастика',
          subcategory: 'Кратък разказ',
          tags: ['бредбъри', 'фантастика', 'science fiction', 'времеви пътувания', 'ефект на пеперудата', 'класика'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4662-grymna-grym',
          thumbnailUrl: 'https://assets2.chitanka.info/thumb/book-cover/12/4662.max.jpg',
          fileSize: '1.2 MB',
          pages: 12,
          rating: 4.9,
          ratingsCount: 1240,
          views: 5120,
          downloads: 3410,
          featured: true,
          createdAt: new Date('2023-07-15'),
          lastUpdated: new Date('2024-02-01'),
          publisher: 'Ray Bradbury Estate',
          year: 1952,
          difficulty: 'intermediate',
          ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4662-grymna-grym/export/epub', type: 'pdf' },
            { title: 'Текст онлайн', url: 'https://chitanka.info/text/4662-grymna-grym', type: 'web' },
            { title: 'Анализ на разказа', url: 'https://literature.bg/analysis/grymna-grym', type: 'web' }
          ]
        },
        // ... останалите книги (същите като преди)
        // Моля, запазете всички други книги от оригиналния код тук
      ];
      
      setBooks(allBooks);
      extractFiltersData(allBooks);
      setLoading(false);
    }
  };

  const extractFiltersData = (booksData: OnlineBook[]) => {
    const categories = new Set<string>();
    const languages = new Set<string>();
    
    booksData.forEach(book => {
      categories.add(book.category);
      languages.add(book.language);
    });
    
    setAvailableCategories(Array.from(categories).sort());
    setAvailableLanguages(Array.from(languages).sort());
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(book => book.category === categoryFilter);
    }

    if (formatFilter !== 'all') {
      filtered = filtered.filter(book => book.format === formatFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(book => book.language === languageFilter);
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(book => book.difficulty === difficultyFilter);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  };

  const handleBookClick = (book: OnlineBook) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const handleReadOnline = (book: OnlineBook) => {
    try {
      const newWindow = window.open(book.url, '_blank');
      
      if (newWindow) {
        console.log(`Book "${book.title}" opened in new tab`);
      } else {
        window.location.href = book.url;
      }
      
    } catch (error) {
      console.error('Error opening book:', error);
      alert('Възникна грешка при отварянето на книгата.');
    }
  };

  const handleDownload = async (book: OnlineBook) => {
    try {
      let downloadUrl = book.url;
      
      if (book.url.includes('chitanka.info')) {
        downloadUrl = book.url.replace('/book/', '/export/') + '/epub';
        
        const pdfLink = book.additionalLinks?.find(link => 
          link.title.toLowerCase().includes('pdf') || link.type === 'pdf'
        );
        
        if (pdfLink) {
          downloadUrl = pdfLink.url;
        }
      }
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      link.onclick = () => {
        setTimeout(() => {
          console.log(`Book "${book.title}" downloaded`);
          alert(`Книгата "${book.title}" започва да се сваля!`);
        }, 100);
      };
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading book:', error);
      alert('Възникна грешка при свалянето на книгата. Моля, опитайте отново.');
    }
  };

  const handleShareBook = (book: OnlineBook) => {
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Прочети "${book.title}" от ${book.author} - ${book.description.substring(0, 100)}...`,
        url: book.url,
      }).catch(error => {
        console.log('Error sharing:', error);
        fallbackShare(book);
      });
    } else {
      fallbackShare(book);
    }
  };

  const fallbackShare = (book: OnlineBook) => {
    const shareText = `${book.title} от ${book.author}\n\n${book.description.substring(0, 150)}...\n\nПрочети онлайн: ${book.url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Информацията за книгата е копирана в клипборда!'))
        .catch(err => {
          console.error('Failed to copy: ', err);
          prompt('Копирайте следния текст:', shareText);
        });
    } else {
      prompt('Копирайте следния текст:', shareText);
    }
  };

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBookId(expandedBookId === bookId ? null : bookId);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return FileText;
      case 'EPUB': return Book;
      case 'MOBI': return Book;
      case 'AUDIO': return Headphones;
      case 'VIDEO': return Video;
      default: return FileText;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'PDF': return '#ef4444';
      case 'EPUB': return '#3b82f6';
      case 'MOBI': return '#8b5cf6';
      case 'AUDIO': return '#10b981';
      case 'VIDEO': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="stars-container">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} className="star-icon star-filled" />;
          } else if (index === fullStars && hasHalfStar) {
            return <Star key={index} className="star-icon star-half" />;
          } else {
            return <Star key={index} className="star-icon star-empty" />;
          }
        })}
        <span className="rating-number">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setFormatFilter('all');
    setLanguageFilter('all');
    setDifficultyFilter('all');
    setSortBy('newest');
  };

  const handleSuggestBook = () => {
    if (user) {
      navigate('/suggest-book');
    } else {
      navigate('/login', { 
        state: { 
          redirectTo: '/online-books',
          message: 'Моля, влезте в профила си, за да предложите книга.' 
        }
      });
    }
  };

  const getVazovStories = () => {
    return books.filter(book => 
      book.author.toLowerCase().includes('вазов') && 
      book.category === 'Българска литература' &&
      book.subcategory === 'Разказ'
    );
  };

  const toggleVazovStories = () => {
    setShowVazovStories(!showVazovStories);
  };
console.log(toggleVazovStories);

  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters);
  };

  const applyMobileFilters = () => {
    filterAndSortBooks();
    setShowMobileFilters(false);
  };

  if (loading) {
    return (
      <div className="online-books-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на онлайн книги...</span>
        </div>
      </div>
    );
  }

  const vazovStories = getVazovStories();
  const hasVazovStories = vazovStories.length > 0;
console.log(hasVazovStories);
  return (
    <div className="online-books-page">
      <div className="online-books-container">
        {/* Header */}
        <div className="online-books-header">
          <div className="online-books-title-section">
            <div className="title-icon-wrapper online">
              <Book className="online-books-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Онлайн Библиотека</h1>
              <p className="online-books-subtitle">
                Дигитални книги, учебници и ресурси за свободен достъп
              </p>
            </div>
          </div>

          <div className="online-books-actions">
            <button 
              className="suggest-book-btn mobile-hidden"
              onClick={handleSuggestBook}
            >
              <BookOpen size={18} />
              <span>Предложи книга</span>
            </button>
            
            {isMobileView && (
              <button 
                className="mobile-filters-toggle"
                onClick={toggleMobileFilters}
              >
                <Filter size={20} />
                <span>Филтри</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="mobile-filters-modal">
            <div className="mobile-filters-header">
              <h3>Филтриране</h3>
              <button 
                className="close-filters-btn"
                onClick={() => setShowMobileFilters(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mobile-filters-content">
              <div className="filter-group mobile">
                <label className="filter-label">
                  <Search size={16} />
                  Търсене
                </label>
                <input
                  type="text"
                  placeholder="Търсете книги, автори, теми..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input mobile"
                />
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <Tag size={16} />
                  Категория
                </label>
                <select 
                  className="filter-select mobile"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Всички категории</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <FileText size={16} />
                  Формат
                </label>
                <select 
                  className="filter-select mobile"
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                >
                  <option value="all">Всички формати</option>
                  <option value="PDF">PDF документи</option>
                  <option value="EPUB">EPUB книги</option>
                  <option value="AUDIO">Аудио книги</option>
                  <option value="VIDEO">Видео курсове</option>
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <Globe size={16} />
                  Език
                </label>
                <select 
                  className="filter-select mobile"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <option value="all">Всички езици</option>
                  {availableLanguages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <TrendingUp size={16} />
                  Трудност
                </label>
                <select 
                  className="filter-select mobile"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="all">Всички нива</option>
                  <option value="beginner">Начинаещ</option>
                  <option value="intermediate">Напреднал</option>
                  <option value="advanced">Експерт</option>
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <Calendar size={16} />
                  Подреди по
                </label>
                <select 
                  className="filter-select mobile"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
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
              <button 
                className="clear-filters-btn mobile"
                onClick={() => {
                  clearFilters();
                  setShowMobileFilters(false);
                }}
              >
                Изчисти филтрите
              </button>
              <button 
                className="apply-filters-btn"
                onClick={applyMobileFilters}
              >
                Приложи филтрите
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters (Desktop) */}
        {!isMobileView && (
          <div className="online-books-filters desktop-filters">
            <div className="main-search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Търсете книги, автори, теми..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="search-info">
                <Book size={16} />
                <span>{books.length} книги налично</span>
              </div>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">
                  <Filter size={16} />
                  Категория
                </label>
                <select 
                  className="filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Всички категории</option>
                  {availableCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <FileText size={16} />
                  Формат
                </label>
                <select 
                  className="filter-select"
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                >
                  <option value="all">Всички формати</option>
                  <option value="PDF">PDF документи</option>
                  <option value="EPUB">EPUB книги</option>
                  <option value="AUDIO">Аудио книги</option>
                  <option value="VIDEO">Видео курсове</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <Globe size={16} />
                  Език
                </label>
                <select 
                  className="filter-select"
                  value={languageFilter}
                  onChange={(e) => setLanguageFilter(e.target.value)}
                >
                  <option value="all">Всички езици</option>
                  {availableLanguages.map(language => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <TrendingUp size={16} />
                  Трудност
                </label>
                <select 
                  className="filter-select"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="all">Всички нива</option>
                  <option value="beginner">Начинаещ</option>
                  <option value="intermediate">Напреднал</option>
                  <option value="advanced">Експерт</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">
                  <Calendar size={16} />
                  Подреди по
                </label>
                <select 
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
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
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Изчисти филтрите
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Search Bar */}
        {isMobileView && (
          <div className="mobile-search-container">
            <div className="mobile-search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Търсене..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-search-input"
              />
              <div className="mobile-search-info">
                <span>{books.length} книги</span>
              </div>
            </div>
          </div>
        )}

        {/* Books Grid */}
        <div className="online-books-content">
          {filteredBooks.length > 0 ? (
            <>
              <div className="books-stats">
                <BookOpen className="stats-icon" />
                <span className="books-count">
                  Намерени {filteredBooks.length} книги
                </span>
                {searchTerm && (
                  <span className="search-results">
                    Резултати за "{searchTerm}"
                  </span>
                )}
                
                {isMobileView && (
                  <button 
                    className="mobile-suggest-btn"
                    onClick={handleSuggestBook}
                  >
                    <BookOpen size={16} />
                    <span>Предложи</span>
                  </button>
                )}
              </div>

              <div className="books-grid">
                {filteredBooks.map((book) => {
                  const FormatIcon = getFormatIcon(book.format);
                  const isExpanded = expandedBookId === book.id;
                  
                  return (
                    <div 
                      key={book.id} 
                      className={`book-card ${book.featured ? 'featured' : ''} ${isMobileView ? 'mobile-view' : ''}`}
                      onClick={() => isMobileView && handleBookClick(book)}
                    >
                      <div className="book-header">
                        <div className="book-thumbnail">
                          <img 
                            src={book.thumbnailUrl} 
                            alt={book.title}
                            className="book-image"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="book-image-fallback hidden">
                            <Book className="fallback-icon" />
                          </div>
                          {book.featured && (
                            <div className="featured-badge">
                              <Award size={14} />
                              <span>Препоръчано</span>
                            </div>
                          )}
                        </div>

                        <div className="book-main-info">
                          <div className="book-title-section">
                            <h3 className="book-title">{book.title}</h3>
                            <p className="book-author">{book.author}</p>
                          </div>

                          <div className="book-meta">
                            <div className="book-category">
                              <Tag size={14} />
                              <span>{book.category}</span>
                            </div>
                            <div 
                              className="book-format"
                              style={{ color: getFormatColor(book.format) }}
                            >
                              <FormatIcon size={14} />
                              <span>{book.format}</span>
                            </div>
                            {book.difficulty && !isMobileView && (
                              <div 
                                className="book-difficulty"
                                style={{ color: getDifficultyColor(book.difficulty) }}
                              >
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
                              {book.pages && (
                                <div className="book-detail">
                                  <FileText size={14} />
                                  <span>{book.pages} страници</span>
                                </div>
                              )}
                              {book.fileSize && (
                                <div className="book-detail">
                                  <Download size={14} />
                                  <span>{book.fileSize}</span>
                                </div>
                              )}
                              {book.duration && (
                                <div className="book-detail">
                                  <Clock size={14} />
                                  <span>{book.duration}</span>
                                </div>
                              )}
                              {book.language && (
                                <div className="book-detail">
                                  <Globe size={14} />
                                  <span>{book.language}</span>
                                </div>
                              )}
                              {book.year && (
                                <div className="book-detail">
                                  <Calendar size={14} />
                                  <span>{book.year} година</span>
                                </div>
                              )}
                              
                              {book.additionalLinks && book.additionalLinks.length > 0 && (
                                <div className="additional-links">
                                  <h4>Допълнителни ресурси:</h4>
                                  <div className="links-list">
                                    {book.additionalLinks.map((link, index) => (
                                      <a 
                                        key={index}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="additional-link"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ExternalLink size={12} />
                                        <span>{link.title}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {book.tags && book.tags.length > 0 && (
                                <div className="book-tags">
                                  {book.tags.map((tag, index) => (
                                    <span key={index} className="book-tag">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="book-stats">
                            <div className="stat-group">
                              {renderStars(book.rating)}
                              <span className="ratings-count">({book.ratingsCount})</span>
                            </div>
                            <div className="stat-group">
                              <Eye size={14} />
                              <span>{book.views} прегледа</span>
                            </div>
                            <div className="stat-group">
                              <Download size={14} />
                              <span>{book.downloads} сваляния</span>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="book-actions">
                        <button 
                          className="read-online-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReadOnline(book);
                          }}
                        >
                          <Eye size={16} />
                          <span>Прочети онлайн</span>
                        </button>
                        
                        {(book.format === 'PDF' || book.format === 'EPUB' || book.format === 'MOBI') && (
                          <button 
                            className="download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(book);
                            }}
                          >
                            <Download size={16} />
                            <span>{isMobileView ? 'Свали' : 'Свали PDF'}</span>
                          </button>
                        )}

                        {!isMobileView && (
                          <div className="action-buttons">
                            <button 
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookExpansion(book.id);
                              }}
                              title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            
                            <button 
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareBook(book);
                              }}
                              title="Сподели"
                            >
                              <Share2 size={16} />
                            </button>
                            
                            {user && (
                              <>
                                <button 
                                  className="action-btn"
                                  title="Добави в любими"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Heart size={16} />
                                </button>
                                
                                <button 
                                  className="action-btn"
                                  title="Запази за по-късно"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Bookmark size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {!isMobileView && (
                        <div className="book-link">
                          <a 
                            href={book.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="direct-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={14} />
                            <span>Директен линк към книгата</span>
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
                  : 'Библиотеката с онлайн книги все още се попълва. Проверете отново по-късно за нови книги и ресурси.'
                }
              </p>
              {(searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' || 
                languageFilter !== 'all' || difficultyFilter !== 'all') && (
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Изчисти филтрите
                </button>
              )}
            </div>
          )}
        </div>

        {/* Information Section */}
        {!isMobileView && (
          <div className="online-books-info">
            <div className="info-card">
              <div className="info-icon">
                <Globe size={24} />
              </div>
              <div className="info-content">
                <h4>Достъп до знание отвсякъде</h4>
                <p>
                  Нашата онлайн библиотека предлага свободен достъп до образователни 
                  ресурси, книги и курсове. Всички материали са проверени и подходящи 
                  за учебни цели. Четете на всяко устройство, по всяко време.
                </p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <Award size={24} />
              </div>
              <div className="info-content">
                <h4>Качество и разнообразие</h4>
                <p>
                  Поддържаме високи стандарти за качество на съдържанието. 
                  Книгите са организирани по категории, формати и нива на трудност 
                  за по-лесно търсене. От класическа литература до съвременни учебници.
                </p>
              </div>
            </div>

            <div className="info-card">
              <div className="info-icon">
                <Share2 size={24} />
              </div>
              <div className="info-content">
                <h4>Споделяне на знания</h4>
                <p>
                  Всички ресурси са с отворен достъп или под свободни лицензи. 
                  Можете свободно да ги използвате, споделяте и препращате, 
                  спазвайки условията на лицензите. Знанието трябва да бъде свободно.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div 
          className="book-modal-overlay"
          onClick={() => setShowBookDetails(false)}
        >
          <div 
            className={`book-modal ${isMobileView ? 'mobile' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="book-modal-content">
              <div className="book-modal-header">
                <div className="book-modal-thumbnail">
                  <img 
                    src={selectedBook.thumbnailUrl} 
                    alt={selectedBook.title}
                    className="book-modal-image"
                  />
                </div>
                <div className="book-modal-info">
                  <h2>{selectedBook.title}</h2>
                  <p className="book-modal-author">от {selectedBook.author}</p>
                  <div className="book-modal-meta">
                    <span className="book-modal-category">{selectedBook.category}</span>
                    <span className="book-modal-format">{selectedBook.format}</span>
                    {selectedBook.year && (
                      <span className="book-modal-year">{selectedBook.year}</span>
                    )}
                  </div>
                  <div className="book-modal-rating">
                    {renderStars(selectedBook.rating)}
                    <span>{selectedBook.ratingsCount} ревюта</span>
                  </div>
                </div>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowBookDetails(false)}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="book-modal-body">
                <div className="book-modal-description">
                  <h3>Описание</h3>
                  <p>{selectedBook.description}</p>
                </div>
                
                <div className="book-modal-details">
                  <h3>Детайли</h3>
                  <div className="details-grid">
                    {selectedBook.pages && (
                      <div className="detail-item">
                        <span className="detail-label">Страници:</span>
                        <span className="detail-value">{selectedBook.pages}</span>
                      </div>
                    )}
                    {selectedBook.fileSize && (
                      <div className="detail-item">
                        <span className="detail-label">Размер на файла:</span>
                        <span className="detail-value">{selectedBook.fileSize}</span>
                      </div>
                    )}
                    {selectedBook.language && (
                      <div className="detail-item">
                        <span className="detail-label">Език:</span>
                        <span className="detail-value">{selectedBook.language}</span>
                      </div>
                    )}
                    {selectedBook.difficulty && (
                      <div className="detail-item">
                        <span className="detail-label">Ниво на трудност:</span>
                        <span className="detail-value">
                          {selectedBook.difficulty === 'beginner' && 'Начинаещ'}
                          {selectedBook.difficulty === 'intermediate' && 'Напреднал'}
                          {selectedBook.difficulty === 'advanced' && 'Експерт'}
                        </span>
                      </div>
                    )}
                    {selectedBook.ageGroup && (
                      <div className="detail-item">
                        <span className="detail-label">Възрастова група:</span>
                        <span className="detail-value">{selectedBook.ageGroup}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedBook.additionalLinks && selectedBook.additionalLinks.length > 0 && (
                  <div className="book-modal-links">
                    <h3>Допълнителни ресурси</h3>
                    <div className="links-list">
                      {selectedBook.additionalLinks.map((link, index) => (
                        <a 
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modal-link"
                        >
                          <ExternalLink size={14} />
                          <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="book-modal-footer">
                <button 
                  className="modal-read-btn"
                  onClick={() => {
                    handleReadOnline(selectedBook);
                    setShowBookDetails(false);
                  }}
                >
                  <Eye size={18} />
                  <span>Прочети онлайн</span>
                </button>
                
                {(selectedBook.format === 'PDF' || selectedBook.format === 'EPUB' || selectedBook.format === 'MOBI') && (
                  <button 
                    className="modal-download-btn"
                    onClick={() => {
                      handleDownload(selectedBook);
                      setShowBookDetails(false);
                    }}
                  >
                    <Download size={18} />
                    <span>Свали PDF</span>
                  </button>
                )}
                
                <button 
                  className="modal-share-btn"
                  onClick={() => handleShareBook(selectedBook)}
                >
                  <Share2 size={18} />
                  <span>Сподели</span>
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