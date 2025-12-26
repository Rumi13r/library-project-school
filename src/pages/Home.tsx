import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ArrowRight, 
  ChevronUp, 
  ChevronDown, 
  Users, 
  BookOpen, 
  Star, 
  User, 
  Search, 
  Quote,
  Newspaper,
  Eye,
  Heart,
  Tag,
  X,
  Info,
  AlertCircle,
  CheckCircle,
  Eye as EyeIcon,
  ImageIcon
} from 'lucide-react';
import { db } from '../firebase/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'; // ДОБАВЕН updateDoc и doc
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as bookService from "../../src/lib/services/bookService";
import * as userService from "../../src/lib/services/userService";
import * as wishlistService from "../../src/lib/services/wishlistService";
import type { BookLibrary } from "../../src/lib/services/bookTypes";

import './Home.css';
import libraryImage from '../assets/images/2.jpg';
import library from '../assets/images/library.png';

interface Recommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
  score: number;
  coverUrl?: string;
  bookDetails?: BookLibrary;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  allowedRoles: string[];
  organizer: string;
  timestamp?: Date;
}

interface News {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string; 
  images?: string[]; 
  date: any;
  author: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  featured?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface EventModalData {
  event: Event;
  colorClass: string;
  calendarDate: any;
}

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllNews, setShowAllNews] = useState(false);
  const [selectedEventModal, setSelectedEventModal] = useState<EventModalData | null>(null);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Функция за отваряне на модал за новина
  const handleOpenNewsModal = (newsItem: News) => {
    // Увеличаване на преглежданията
    incrementViews(newsItem.id);
    
    // Отваряне на модала
    setSelectedNews(newsItem);
  };

  const handleCloseNewsModal = () => {
    setSelectedNews(null);
  };

  // Функция за увеличаване на преглежданията
  const incrementViews = async (newsId: string) => {
    try {
      // Обновяваме локалното състояние
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { ...item, views: (item.views || 0) + 1 }
            : item
        )
      );
      
      // Обновяваме в базата данни
      if (user) {
        const newsRef = doc(db, "news", newsId);
        await updateDoc(newsRef, {
          views: (selectedNews?.views || 0) + 1
        });
      }
    } catch (error) {
      console.error("Грешка при увеличаване на преглежданията:", error);
    }
  };

  // Функция за харесвания
  const handleLike = async (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвратява отварянето на модала при кликване на сърцето
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      // Обновяваме локалното състояние
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { ...item, likes: (item.likes || 0) + 1 }
            : item
        )
      );
      
      // Обновяваме и модала, ако е отворен
      if (selectedNews?.id === newsId) {
        setSelectedNews(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      }
      
      // Обновяваме в базата данни
      const newsRef = doc(db, "news", newsId);
      await updateDoc(newsRef, {
        likes: (selectedNews?.likes || news.find(n => n.id === newsId)?.likes || 0) + 1
      });
    } catch (error) {
      console.error("Грешка при харесване:", error);
    }
  };

  // Функция за промяна на видимите новини
  const toggleShowAllNews = () => {
    setShowAllNews(!showAllNews);
  };

  // Останалите функции остават същите...
  const parseEventDate = (dateString: string, timeString: string = "00:00"): Date => {
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes] = timeString.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    }
    
    const months: { [key: string]: number } = {
      'януари': 0, 'февруари': 1, 'март': 2, 'април': 3,
      'май': 4, 'юни': 5, 'юли': 6, 'август': 7,
      'септември': 8, 'октомври': 9, 'ноември': 10, 'декември': 11
    };
    
    const parts = dateString.split(' ');
    if (parts.length === 2) {
      const day = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase()];
      if (day && month !== undefined) {
        const currentYear = new Date().getFullYear();
        const [hours, minutes] = timeString.split(':').map(Number);
        return new Date(currentYear, month, day, hours, minutes);
      }
    }
    
    return new Date();
  };

  const formatDateForDisplay = (dateString: string): string => {
    if (dateString.includes('-')) {
      const [_year, month, day] = dateString.split('-').map(Number);
      const monthsBg = [
        'януари', 'февруари', 'март', 'април', 'май', 'юни',
        'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'
      ];
      return `${day} ${monthsBg[month - 1]}`;
    }
    return dateString;
  };

  const formatDateForCalendar = (dateString: string) => {
    const date = parseEventDate(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('bg-BG', { month: 'short' }),
      weekday: date.toLocaleDateString('bg-BG', { weekday: 'short' })
    };
  };

  const formatFullDate = (dateString: string): string => {
    const date = parseEventDate(dateString);
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });
  };

  const truncateText = (html: string, maxChars: number = 200): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (plainText.length <= maxChars) {
      return plainText;
    }
    
    return plainText.substring(0, maxChars) + '...';
  };

  const fetchEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const eventsData: Event[] = snapshot.docs.map(doc => {
        const data = doc.data();
        const eventTimestamp = parseEventDate(data.date, data.time);
        
        return { 
          id: doc.id, 
          ...data,
          timestamp: eventTimestamp
        } as Event;
      });
      
      const currentDate = new Date();
      const futureEvents = eventsData.filter(event => {
        if (!event.date || !event.timestamp) return false;
        const eventEndTime = parseEventDate(event.date, event.endTime);
        return eventEndTime >= currentDate;
      });
      
      futureEvents.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      setEvents(futureEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      // Fallback events...
    }
  };

  const fetchNews = async () => {
    try {
      const snapshot = await getDocs(collection(db, "news"));
      const newsData: News[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          image: data.image || '/api/placeholder/400/250',
          images: data.images || [],
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
          tags: data.tags || [],
          views: data.views || 0,
          likes: data.likes || 0,
          featured: data.featured || false
        } as News;
      });
      
      newsData.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      setNews(newsData);
    } catch (error) {
      console.error("Error fetching news:", error);
      // Fallback news...
    }
  };

  const handleBecomeReader = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleEventRegistration = (event: Event) => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/dashboard',
          message: 'Моля, влезте в профила си, за да се запишете за събитие.',
          eventId: event.id
        }
      });
      return;
    }

    if (isEventFull(event)) {
      alert('Събитието е пълно! Не можете да се запишете.');
      return;
    }

    navigate('/dashboard', { 
      state: { 
        eventId: event.id,
        action: 'register',
        fromHomePage: true
      }
    });
  };

  const handleViewEventDetails = (event: Event, index: number) => {
    const calendarDate = formatDateForCalendar(event.date);
    const colorVariants = ['calendar-green', 'calendar-yellow', 'calendar-red', 'calendar-blue'];
    const colorClass = colorVariants[index % colorVariants.length];
    
    setSelectedEventModal({
      event,
      colorClass,
      calendarDate
    });
  };

  const handleCloseEventModal = () => {
    setSelectedEventModal(null);
  };

  const toggleShowAllEvents = () => {
    setShowAllEvents(!showAllEvents);
  };

  const displayedEvents = showAllEvents ? events : events.slice(0, 6);
  const displayedNews = showAllNews ? news : news.slice(0, 4);

  useEffect(() => {
    fetchEvents();
    fetchNews();
  }, []);

  useEffect(() => {
    const generateRecommendations = async () => {
      try {
        setLoadingRecs(true);
        const allBooks = await bookService.fetchAllBooks();
        
        let viewedBooks: string[] = [];
        let userWishlist: string[] = [];
        
        if (user) {
          [viewedBooks, userWishlist] = await Promise.all([
            userService.getUserViewedBooks(user.uid),
            wishlistService.getUserWishlist(user.uid)
          ]);
        }
        
        const recs: Recommendation[] = [];
        const today = new Date();
        
        const popularBooks = allBooks
          .filter(book => {
            if (user) {
              return !viewedBooks.includes(book.id) && !userWishlist.includes(book.id);
            }
            return true;
          })
          .filter(book => book.views && book.views > 50)
          .sort((a, b) => (b.views || 0) - (a.views || 0))
          .slice(0, 3)
          .map(book => ({
            bookId: book.id,
            title: book.title,
            author: book.author,
            reason: 'Популярна в библиотеката',
            score: book.views || 0,
            coverUrl: book.coverUrl,
            bookDetails: book
          }));
        
        recs.push(...popularBooks);
        
        const newBooks = allBooks
          .filter(book => {
            if (user) {
              return !viewedBooks.includes(book.id) && !userWishlist.includes(book.id);
            }
            return true;
          })
          .filter(book => book.year >= today.getFullYear() - 2)
          .sort((a, b) => b.year - a.year)
          .slice(0, 3)
          .map(book => ({
            bookId: book.id,
            title: book.title,
            author: book.author,
            reason: 'Нова книга',
            score: 50 + (book.year - (today.getFullYear() - 2)) * 20,
            coverUrl: book.coverUrl,
            bookDetails: book
          }));
        
        recs.push(...newBooks);
        
        if (user && viewedBooks.length > 0) {
          const viewedBooksData = allBooks.filter(b => viewedBooks.includes(b.id));
          const userGenres = new Set<string>();
          const userAuthors = new Set<string>();
          
          viewedBooksData.forEach(book => {
            book.genres?.forEach(genre => userGenres.add(genre));
            userAuthors.add(book.author);
          });
          
          allBooks.forEach(book => {
            if (!viewedBooks.includes(book.id) && !userWishlist.includes(book.id)) {
              const commonGenres = book.genres?.filter(g => userGenres.has(g)).length || 0;
              if (commonGenres > 0) {
                recs.push({
                  bookId: book.id,
                  title: book.title,
                  author: book.author,
                  reason: `Съвпадение на жанрове (${commonGenres})`,
                  score: commonGenres * 15,
                  coverUrl: book.coverUrl,
                  bookDetails: book
                });
              }
            }
          });
          
          allBooks.forEach(book => {
            if (!viewedBooks.includes(book.id) && !userWishlist.includes(book.id) && userAuthors.has(book.author)) {
              recs.push({
                bookId: book.id,
                title: book.title,
                author: book.author,
                reason: `От любимия ви автор ${book.author}`,
                score: 80,
                coverUrl: book.coverUrl,
                bookDetails: book
              });
            }
          });
        }
        
        const sortedRecs = recs
          .filter((rec, index, self) => 
            index === self.findIndex(r => r.bookId === rec.bookId)
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
        
        setRecommendations(sortedRecs);
        
      } catch (error) {
        console.error("Грешка при генериране на препоръки:", error);
      } finally {
        setLoadingRecs(false);
      }
    };
    
    generateRecommendations();
  }, [user]);
  
  const handleReserveBook = (bookId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate(`/books/${bookId}`);
  };

  const heroData = {
    title: 'Smart School Library',
    subtitle: 'Училищна библиотека',
    description: 'Място за знания и вдъхновение. Нашата библиотека предлага богата колекция от книги, учебни помагала и ресурси за всички ученици и учители.',
    searchPlaceholder: 'Търсете книги, автори или теми...'
  };

  const features = [
    {
      icon: BookOpen,
      title: 'Богата колекция',
      description: 'Над 10,000 книги и учебници за всички специалности'
    },
    {
      icon: Users,
      title: 'Читателски клубове',
      description: 'Регулярни срещи и дискусии за любители на четенето'
    },
    {
      icon: Clock,
      title: 'Онлайн резервации',
      description: 'Резервирайте книги онлайн и ги вземете в удобно за Вас време'
    },
    {
      icon: Star,
      title: 'Съвременна среда',
      description: 'Модерно обзавеждане и уютна атмосфера за организирани събития'
    }
  ];

  const testimonials = [
    {
      name: 'Мария Иванова',
      role: 'Ученичка, 11 клас',
      content: 'Библиотеката е моят втори дом! Намирам всички необходими учебни материали и участвам в читателския клуб.',
      rating: 5
    },
    {
      name: 'Петър Георгиев',
      role: 'Учител по литература',
      content: 'Професионално обслужване и богата колекция. Прекрасно място, където учениците развиват любов към книгата.',
      rating: 5
    },
    {
      name: 'Анна Димитрова',
      role: 'Родител',
      content: 'Дъщеря ми обича да посещава библиотеката. Персоналът е много любезен и винаги помагат с избора на книги.',
      rating: 4
    }
  ];

  const renderTestimonialStars = (rating: number) => {
    return (
      <div className="testimonial-stars">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`testimonial-star ${
              index < rating 
                ? 'star-filled' 
                : 'star-empty'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAvailableSpots = (event: Event) => {
    return Math.max(0, event.maxParticipants - event.currentParticipants);
  };

  const isEventFull = (event: Event) => {
    return getAvailableSpots(event) <= 0;
  };

  const formatNewsDate = (dateInput: any) => {
    let date: Date;
    
    if (dateInput?.toDate) {
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date();
    }
    
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          <img 
            src={libraryImage} 
            alt="Училищна библиотека" 
            className="hero-bg-image"
          />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="hero-blur-box">
            <h1 className="hero-title">
              <span className="handwritten-hero">{heroData.title}</span>
              <p></p>
              <span className="handwritten-hero-sub">{heroData.subtitle}</span>
            </h1>

            <p className="hero-description">
              {heroData.description}
            </p>

            <div className="search-container">
              <div className="search-bar">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder={heroData.searchPlaceholder}
                  className="search-input"
                />
              </div>
            </div>

            <div className="hero-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/catalog')}
              >
                <span>Разгледай каталога</span>
                <ArrowRight className="btn-icon" />
              </button>
              
              <button 
                className="btn btn-secondary"
                onClick={handleBecomeReader}
              >
                <BookOpen className="btn-icon" />
                <span>Стани читател</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="handwritten-title">Защо да изберете нашата библиотека?</h2>
            <p className="section-subtitle">
              Предлагаме модерни услуги и богата колекция, които правят четенето 
              удоволствие за всеки ученик и учител.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon-wrapper">
                    <IconComponent className="feature-icon-svg" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="feature-link">Научете повече →</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Book Catalog Section */}
      <section className="catalog-section">
        <div className="container">
          <div className="section-header">
            <h2 className="handwritten-title">
              {user ? 'Препоръчани за вас' : 'Препоръчани книги'}
            </h2>
            <p className="section-subtitle">
              {user 
                ? 'Книги, подбрани специално за вас въз основа на читателският рейтинг' 
                : 'Най-популярните и нови заглавия в нашата библиотека'}
            </p>
          </div>

          {loadingRecs ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Зареждане на препоръките...</p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="books-grid">
              {recommendations.map((rec) => {
                const book = rec.bookDetails;
                const coverUrl = book?.coverUrl || rec.coverUrl;
                const available = book?.availableCopies && book.availableCopies > 0;
                
                return (
                  <div key={rec.bookId} className="book-card">
                    <div className="book-content">
                      <div className="book-cover-image">
                        {coverUrl ? (
                          <img 
                            src={coverUrl} 
                            alt={rec.title}
                            className="book-cover-image"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('book-cover-fallback');
                            }}
                          />
                        ) : null}
                        <div className={`book-cover-fallback ${coverUrl ? 'hidden' : ''}`}>
                          <BookOpen className="book-cover-icon" />
                        </div>
                        <div className="recommendation-badge">
                          <span>{rec.score} точки</span>
                        </div>
                      </div>
                      
                      <div className="book-details">
                        <h3 className="book-title">{rec.title}</h3>
                        <p className="book-author">{rec.author}</p>
                        <p className="book-reason">{rec.reason}</p>
                        
                        {book && (
                          <div className="book-meta">
                            <span className="book-category">
                              {book.genres?.[0] || 'Без категория'}
                            </span>
                            <span className={`availability ${available ? 'available' : 'unavailable'}`}>
                              {available ? 'Налична' : 'Заета'}
                            </span>
                          </div>
                        )}
                        
                        <button 
                          className="reserve-btn"
                          onClick={() => handleReserveBook(rec.bookId)}
                        >
                          {user ? 'Резервирай' : 'Виж детайли'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpen size={48} />
              <p>Няма налични препоръки в момента</p>
              <p className="empty-subtext">
                {user ? 'Разгледайте повече книги, за да получите персонализирани препоръки' : 'Влезте в профила си за персонализирани препоръки'}
              </p>
            </div>
          )}

          <div className="catalog-footer">
            <button 
              className="btn btn-outline catalog-btn"
              onClick={() => navigate('/books')}
            >
              Виж всички книги
            </button>
          </div>
        </div>
      </section>

      {/* News Section */}
<section className="news-section">
  <div className="container">
    <div className="section-header">
      <div className="section-header-top">
        <Newspaper className="section-title-icon" />
        <h2 className="handwritten-title">Новини и Събития</h2>
      </div>
      <p className="section-subtitle">
        Най-новите актуализации и събития от библиотеката
      </p>
    </div>

    {news.length > 0 ? (
      <>
        {/* Променете тази част - използвайте `news` вместо `displayedNews` */}
        {news.filter(newsItem => newsItem.featured).length > 0 && (
          <div className="featured-news-section">
            <h3 className="featured-news-title">
              <Star size={20} />
              Препоръчани новини
            </h3>
            <div className="featured-news-grid">
              {news
                .filter(newsItem => newsItem.featured)
                .map((newsItem) => (
                  <article 
                    key={newsItem.id} 
                    className="news-card featured-news-card"
                    onClick={() => handleOpenNewsModal(newsItem)}
                  >
                    <div className="featured-badge">
                      <Star size={12} />
                      <span>Препоръчана</span>
                    </div>
                    <div className="news-image-container">
                      <img 
                        src={newsItem.image || '/api/placeholder/400/250'} 
                        alt={newsItem.title}
                        className="news-image"
                        onError={(e) => {
                          e.currentTarget.src = '/api/placeholder/400/250';
                        }}
                      />
                      <div className="news-category-tag">
                        <Tag className="tag-icon" />
                        <span>{newsItem.category || 'Общи'}</span>
                      </div>
                    </div>
                    
                    <div className="news-content">
                      <div className="news-meta">
                        <span className="news-date">{formatNewsDate(newsItem.date)}</span>
                        <span className="news-author">от {newsItem.author || 'Администратор'}</span>
                      </div>
                      
                      <h3 className="news-title">{newsItem.title}</h3>
                      <p className="news-excerpt">{newsItem.excerpt}</p>
                      
                      <div className="news-stats">
                        <div className="news-stat">
                          <Eye className="stat-icon" />
                          <span>{newsItem.views || 0} преглеждания</span>
                        </div>
                        <div className="news-stat">
                          <button 
                            className="like-button"
                            onClick={(e) => handleLike(newsItem.id, e)}
                          >
                            <Heart className={`stat-icon ${newsItem.likes > 0 ? 'liked' : ''}`} />
                            <span>{newsItem.likes || 0} харесвания</span>
                          </button>
                        </div>
                      </div>
                      
                      {newsItem.tags && newsItem.tags.length > 0 && (
                        <div className="news-tags">
                          {newsItem.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span key={tagIndex} className="news-tag">#{tag}</span>
                          ))}
                        </div>
                      )}
                      
                      <button 
                        className="news-read-more" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewsModal(newsItem);
                        }}
                      >
                        <span>Прочети повече</span>
                        <ArrowRight className="read-more-icon" />
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        )}

              <div className="news-grid">
                {displayedNews
                  .filter(newsItem => !newsItem.featured)
                  .map((newsItem) => (
                    <article 
                      key={newsItem.id} 
                      className="news-card"
                      onClick={() => handleOpenNewsModal(newsItem)} // ДОБАВЕН onClick
                    >
                      <div className="news-image-container">
                        <img 
                          src={newsItem.image || '/api/placeholder/400/250'} 
                          alt={newsItem.title}
                          className="news-image"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/400/250';
                          }}
                        />
                        <div className="news-category-tag">
                          <Tag className="tag-icon" />
                          <span>{newsItem.category || 'Общи'}</span>
                        </div>
                      </div>

                      <div className="news-content">
                        <div className="news-meta">
                          <span className="news-date">{formatNewsDate(newsItem.date)}</span>
                          <span className="news-author">от {newsItem.author || 'Администратор'}</span>
                        </div>

                        <h3 className="news-title">{newsItem.title}</h3>
                        <p className="news-excerpt">{newsItem.excerpt}</p>

                        <div className="news-stats">
                          <div className="news-stat">
                            <Eye className="stat-icon" />
                            <span>{newsItem.views || 0} преглеждания</span>
                          </div>
                          <div className="news-stat">
                            <button 
                              className="like-button"
                              onClick={(e) => handleLike(newsItem.id, e)}
                            >
                              <Heart className={`stat-icon ${newsItem.likes > 0 ? 'liked' : ''}`} />
                              <span>{newsItem.likes || 0} харесвания</span>
                            </button>
                          </div>
                        </div>

                        {newsItem.tags && newsItem.tags.length > 0 && (
                          <div className="news-tags">
                            {newsItem.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span key={tagIndex} className="news-tag">#{tag}</span>
                            ))}
                          </div>
                        )}

                        <button 
                          className="news-read-more" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNewsModal(newsItem);
                          }}
                        >
                          <span>Прочети повече</span>
                          <ArrowRight className="read-more-icon" />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          ) : (
            <div className="no-news">
              <Newspaper size={48} />
              <p>Няма новини за показване в момента</p>
            </div>
          )}

          {news.length > 4 && (
            <div className="news-toggle-container">
              <button 
                className="news-toggle-btn"
                onClick={toggleShowAllNews}
              >
                {showAllNews ? (
                  <>
                    <ChevronUp className="toggle-icon" />
                    <span>Покажи по-малко новини</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="toggle-icon" />
                    <span>Покажи всички новини ({news.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Book Animation Section */}
      <section className="home-book-animation-section dark-theme-compatible">
        <div className="home-bookshelf-container">
          <div className="home-bookshelf">
            <div className="home-books">
              <div 
                className="home-book" 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1581128232l/50214741.jpg)' } as any}
              ></div>
              <div 
                className="home-book" 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1544204706l/42505366.jpg)' } as any}
              ></div>
              <div 
                className="home-book" 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1541621322l/42201395.jpg)' } as any}
              ></div>
              <div 
                className="home-book" 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1548518877l/43263520._SY475_.jpg)' } as any}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Events Section */}
      <section className="events-section">
        <div className="container">
          <div className="section-header">
            <div className="section-header-top">
              <Calendar className="section-title-icon" />
              <h2 className="handwritten-title">Предстоящи Събития</h2>
            </div>
            <p className="section-subtitle">
              Присъединете се към различни дискусии и организирани културни събития.
            </p>
          </div>

          <div className="calendar-events-grid">
            {displayedEvents.map((event, index) => {
              const calendarDate = formatDateForCalendar(event.date);
              const colorVariants = ['calendar-green', 'calendar-yellow', 'calendar-red', 'calendar-blue'];
              const colorClass = colorVariants[index % colorVariants.length];
              
              return (
                <div key={event.id} className="calendar-event-card">
                  <div className={`calendar-date home-calendar-date ${colorClass}`}>
                    <div className="calendar-day home-calendar-day">{calendarDate.day}</div>
                    <div className="calendar-month home-calendar-month">{calendarDate.month}</div>
                    <div className="calendar-weekday home-calendar-weekday">{calendarDate.weekday}</div>
                  </div>

                  <div className="calendar-event-content">
                    <div className="event-header-calendar">
                      <h3 className="event-title-calendar">{event.title}</h3>
                      <div className="event-time-badge">
                        <Clock className="time-badge-icon" />
                        <span>{event.time} - {event.endTime}</span>
                      </div>
                    </div>

                    <div className="event-description-container">
                      <div 
                        className="event-description-calendar truncated-description"
                      >
                        {truncateText(event.description, 150)}
                      </div>
                      <div className="view-more-container">
                        <button 
                          className={`view-more-btn ${colorClass}`}
                          onClick={() => handleViewEventDetails(event, index)}
                        >
                          <EyeIcon className="view-more-icon" />
                          <span>Виж повече</span>
                        </button>
                      </div>
                    </div>

                    <div className="event-details-calendar">
                      <div className="event-detail-row">
                        <MapPin className="detail-icon-calendar" />
                        <span className="detail-text-calendar">{event.location}</span>
                      </div>
                      <div className="event-detail-row">
                        <User className="detail-icon-calendar" />
                        <span className="detail-text-calendar">{event.organizer}</span>
                      </div>
                    </div>

                    <div className="event-footer-calendar">
                      <div className="participants-section">
                        <div className="participants-info">
                          <Users className="participants-icon" />
                          <span className="participants-text">
                            {event.currentParticipants} / {event.maxParticipants} записани
                          </span>
                          {getAvailableSpots(event) > 0 && (
                            <span className="spots-available">
                              {getAvailableSpots(event)} свободни места
                            </span>
                          )}
                        </div>
                      </div>

                      <button 
                        className={`event-register-btn ${colorClass} ${
                          isEventFull(event) ? 'event-btn-disabled' : ''
                        }`}
                        disabled={isEventFull(event)}
                        onClick={() => handleEventRegistration(event)}
                      >
                        <span>
                          {isEventFull(event) 
                            ? 'Събитието е пълно' 
                            : 'Запиши се'
                          }
                        </span>
                        {!isEventFull(event) && <ArrowRight className="register-icon" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {events.length === 0 && (
            <div className="no-events">
              <Calendar className="no-events-icon" />
              <p>В момента няма предстоящи събития</p>
            </div>
          )}

          {events.length > 4 && (
            <div className="events-toggle-container">
              <button 
                className="events-toggle-btn"
                onClick={toggleShowAllEvents}
              >
                {showAllEvents ? (
                  <>
                    <ChevronUp className="toggle-icon" />
                    <span>Покажи по-малко събития</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="toggle-icon" />
                    <span>Покажи всички събития ({events.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-header">
            <h2 className="handwritten-title">Какво казват нашите читатели?</h2>
            <p className="section-subtitle">
              Отзиви от ученици, учители и родители
            </p>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <Quote className="testimonial-quote" />
                {renderTestimonialStars(testimonial.rating)}
                <p className="testimonial-content">
                  "{testimonial.content}"
                </p>
                <div className="testimonial-author">
                  <div className="author-name">{testimonial.name}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section dark-theme-compatible">
        <div className="container">
          <div className="section-header">
            <h2 className="handwritten-title">За библиотеката</h2>
            <p className="section-subtitle">
              Нашата мисия е да осигурим среда, в която учениците да учат и да откриват нови светове чрез книгите.
            </p>
          </div>

          <div className="about-content">
            <div className="about-text">
              <div className="about-header">
                <h3 className="about-subtitle">История и мисия</h3>
              </div>
              
              <div className="about-description">
                <p>
                  Нашата библиотека е информационен и административен център на ПГЕЕ-гр. Пловдив, 
                  предоставящ модерни ресурси и подкрепа както за учебната, така и за извънкласната дейност.
                </p>
                <p>
                  Основана преди 20 години, тази институция се превърна в любимо място за ученици и учители. Постоянно обогатяваме колекцията си с нови заглавия 
                  и съвременни ресурси, за да отговорим на нуждите на съвременното образование.
                </p>
                <p>
                  Организираме редовни събития, литературни четения и работилници, които вдъхновяват 
                  любопитството и насърчават любовта към книгата, като същевременно подкрепят 
                  образователния процес и личностното развитие на учениците.
                </p>
                <p>
                  Вярваме, че всяка книга е врата към нов свят, и нашата мисия е да помагаме 
                  на всеки ученик да открие своя път към знанието, критическото мислене и креативността.
                </p>
                <p>
                  Това не е просто библиотека, а общност за споделяне на идеи, която 
                  активно допринася за подобряване на училищната среда.
                </p>
              </div>
            
              <div className="about-buttons">
                <button className="btn btn-primary about-btn">
                  <Users className="btn-icon" />
                  <span>Запознай се с екипа</span>
                </button>
                <button className="btn btn-outline about-btn">
                  <MapPin className="btn-icon" />
                  <span>Свържи се с нас</span>
                </button>
              </div>
            </div>
            
            <div className="about-visual">
              <div className="image-container">
                <img 
                  src={library} 
                  alt="Библиотеката" 
                  className="about-image"
                />
                <div className="image-overlay">
                  <div className="overlay-content">
                    <BookOpen className="overlay-icon" />
                    <span>Вашата библиотека</span>
                  </div>
                </div>
              </div>
              <div className="visual-stats">
                <div className="visual-stat">
                  <div className="stat-number">20+</div>
                  <div className="stat-label">Години опит</div>
                </div>
                <div className="visual-stat">
                  <div className="stat-number">10k+</div>
                  <div className="stat-label">Книги</div>
                </div>
                <div className="visual-stat">
                  <div className="stat-number">2.5k+</div>
                  <div className="stat-label">Читатели</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Modal */}
      {selectedEventModal && (
        <div className="event-modal-overlay" onClick={handleCloseEventModal}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="event-modal-header">
              <div className="event-modal-title">
                <div className={`event-modal-date-badge ${selectedEventModal.colorClass}`}>
                  <div className="event-modal-date-day">{selectedEventModal.calendarDate.day}</div>
                  <div className="event-modal-date-month">{selectedEventModal.calendarDate.month}</div>
                  <div className="event-modal-date-weekday">{selectedEventModal.calendarDate.weekday}</div>
                </div>
                <div className="event-modal-title-text">
                  <h3>{selectedEventModal.event.title}</h3>
                  <div className="event-modal-time">
                    <Clock size={16} />
                    <span>{selectedEventModal.event.time} - {selectedEventModal.event.endTime}</span>
                  </div>
                </div>
              </div>
              <button 
                className="event-modal-close"
                onClick={handleCloseEventModal}
              >
                <X size={24} />
              </button>
            </div>

            <div className="event-modal-content">
              <div className="event-modal-details-grid">
                <div className="event-modal-detail">
                  <MapPin className="event-modal-detail-icon" />
                  <div className="event-modal-detail-content">
                    <div className="event-modal-detail-label">Място</div>
                    <div className="event-modal-detail-value">{selectedEventModal.event.location}</div>
                  </div>
                </div>

                <div className="event-modal-detail">
                  <User className="event-modal-detail-icon" />
                  <div className="event-modal-detail-content">
                    <div className="event-modal-detail-label">Организатор</div>
                    <div className="event-modal-detail-value">{selectedEventModal.event.organizer}</div>
                  </div>
                </div>

                <div className="event-modal-detail">
                  <Users className="event-modal-detail-icon" />
                  <div className="event-modal-detail-content">
                    <div className="event-modal-detail-label">Участници</div>
                    <div className="event-modal-detail-value">
                      {selectedEventModal.event.currentParticipants} / {selectedEventModal.event.maxParticipants} записани
                      {getAvailableSpots(selectedEventModal.event) > 0 && (
                        <span className="event-modal-available-spots">
                          ({getAvailableSpots(selectedEventModal.event)} свободни места)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="event-modal-detail">
                  <Calendar className="event-modal-detail-icon" />
                  <div className="event-modal-detail-content">
                    <div className="event-modal-detail-label">Дата</div>
                    <div className="event-modal-detail-value">{formatFullDate(selectedEventModal.event.date)}</div>
                  </div>
                </div>
              </div>

              <div className="event-modal-description">
                <h4 className="event-modal-description-title">Описание на събитието</h4>
                <div 
                  className="event-modal-description-content"
                  dangerouslySetInnerHTML={{ __html: selectedEventModal.event.description }}
                />
              </div>

              <div className="event-modal-requirements">
                <h4 className="event-modal-requirements-title">
                  <Info size={20} />
                  <span>Изисквания и информация</span>
                </h4>
                <div className="event-modal-requirements-list">
                  <div className="event-modal-requirement">
                    <CheckCircle size={16} />
                    <span>Подходящо за: {selectedEventModal.event.allowedRoles.join(', ')}</span>
                  </div>
                  <div className="event-modal-requirement">
                    <AlertCircle size={16} />
                    <span>Записването се извършва в библиотеката или чрез системата</span>
                  </div>
                </div>
              </div>

              <div className="event-modal-footer">
                <button 
                  className="event-modal-close-btn"
                  onClick={handleCloseEventModal}
                >
                  Затвори
                </button>
                <button 
                  className={`event-modal-register-btn ${selectedEventModal.colorClass} ${
                    !user || isEventFull(selectedEventModal.event) ? 'disabled' : ''
                  }`}
                  disabled={!user || isEventFull(selectedEventModal.event)}
                  onClick={() => handleEventRegistration(selectedEventModal.event)}
                >
                  {!user 
                    ? 'Влезте, за да се запишете' 
                    : isEventFull(selectedEventModal.event) 
                      ? 'Събитието е пълно' 
                      : 'Запиши се за събитието'
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* News Details Modal */}
{selectedNews && (
  <div className="event-modal-overlay" onClick={handleCloseNewsModal}>
    <div className="event-modal news-modal" onClick={(e) => e.stopPropagation()}>
      <div className="event-modal-header">
        <div className="event-modal-title">
          <div className="news-modal-category-badge">
            <Tag size={16} />
            <span>{selectedNews.category}</span>
          </div>
          <div className="event-modal-title-text">
            <h3>{selectedNews.title}</h3>
            <div className="event-modal-time">
              <Calendar size={16} />
              <span>{formatNewsDate(selectedNews.date)}</span>
            </div>
          </div>
        </div>
        <button 
          className="event-modal-close"
          onClick={handleCloseNewsModal}
        >
          <X size={24} />
        </button>
      </div>

      <div className="event-modal-content">
        {/* Галерия със снимки - само ако има снимки */}
        {(() => {
          // Комбинираме основната снимка с допълнителните
          const allImages = [
            selectedNews.image,
            ...(selectedNews.images || [])
          ].filter(img => img && img.trim() !== "");
          
          if (allImages.length > 0) {
            return (
              <div className="news-gallery">
                <h4 className="gallery-title">
                  <ImageIcon size={20} />
                  <span>Галерия</span>
                </h4>
                <div className="gallery-container">
                  <div className="gallery-grid">
                    {allImages.map((image, index) => (
                      <div key={index} className="gallery-item">
                        <img 
                          src={image} 
                          alt={`${selectedNews.title} - снимка ${index + 1}`}
                          className="gallery-image"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/400/250';
                          }}
                        />
                        {index === 0 && (
                          <div className="image-label">Основна снимка</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        <div className="event-modal-description">
          <h4 className="event-modal-description-title">Съдържание</h4>
          <div className="event-modal-description-content">
            <div dangerouslySetInnerHTML={{ __html: selectedNews.content }} />
          </div>
        </div>
        
        {/* Статистики в модала */}
        <div className="news-stats-modal">
          <div className="news-stat-modal">
            <Eye className="stat-icon" />
            <span>{selectedNews.views || 0} преглеждания</span>
          </div>
          <div className="news-stat-modal">
            <button 
              className="like-button-modal"
              onClick={(e) => handleLike(selectedNews.id, e)}
            >
              <Heart className={`stat-icon ${selectedNews.likes > 0 ? 'liked' : ''}`} />
              <span>{selectedNews.likes || 0} харесвания</span>
            </button>
          </div>
        </div>
        
        {/* Тагове в модала */}
        {selectedNews.tags && selectedNews.tags.length > 0 && (
          <div className="news-tags-modal">
            <div className="tags-title">
              <Tag size={16} />
              <span>Тагове:</span>
            </div>
            <div className="tags-list">
              {selectedNews.tags.map((tag, index) => (
                <span key={index} className="news-tag-modal">#{tag}</span>
              ))}
            </div>
          </div>
        )}
        
        <div className="event-modal-footer">
          <button 
            className="event-modal-close-btn"
            onClick={handleCloseNewsModal}
          >
            Затвори
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default Home;