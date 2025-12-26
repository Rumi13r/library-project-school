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
  Share2,
  Heart,
  Bookmark,
  Tag,
  ExternalLink,
  X,
  Info,
  AlertCircle,
  CheckCircle,
  Eye as EyeIcon,
  ImageIcon
} from 'lucide-react';
import { db } from '../firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  // Във вашия Home.tsx/Home.jsx, близо до другите useState
const [selectedNews, setSelectedNews] = useState<News | null>(null);
const handleOpenNewsModal = (newsItem: News) => {
    setSelectedNews(newsItem);
};
const handleCloseNewsModal = () => {
    setSelectedNews(null);
};

  // Нова функция за парсване на дати - поддържа и ISO и български формат
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

  // Функция за форматиране на датата за показване в български стил
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
  console.log(formatDateForDisplay);

  // Функция за форматиране на дата за календар
  const formatDateForCalendar = (dateString: string) => {
    const date = parseEventDate(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('bg-BG', { month: 'short' }),
      weekday: date.toLocaleDateString('bg-BG', { weekday: 'short' })
    };
  };

  // Функция за форматиране на пълна дата
  const formatFullDate = (dateString: string): string => {
    const date = parseEventDate(dateString);
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long'
    });
  };

  // Функция за премахване на HTML тагове и съкращаване на текста
  const truncateText = (html: string, maxChars: number = 200): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Съкращаваме текста по брой знаци
    if (plainText.length <= maxChars) {
      return plainText;
    }
    
    return plainText.substring(0, maxChars) + '...';
  };

  // Зареждане на събития от Firestore
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
      const currentDate = new Date();
      
      const fallbackEvents = [
        {
          id: '1',
          title: 'Среща с писател',
          date: '2025-12-15',
          time: '14:00',
          endTime: '15:30',
          location: 'Читалня',
          description: '<h3>Среща с известен български автор</h3><p>Присъединете се към незабравима среща с един от най-известните български автори на съвременната литература. Ще има възможност за дискусия, автографи и лични разговори с писателя.</p><ul><li>Представяне на нови книги</li><li>Въпросник и отговори</li><li>Автограф сесия</li></ul>',
          maxParticipants: 20,
          currentParticipants: 8,
          allowedRoles: ['reader', 'librarian'],
          organizer: 'Мария Иванова',
          timestamp: parseEventDate('2025-12-15', '14:00')
        },
        {
          id: '2',
          title: 'Чета с приятели',
          date: '2025-12-20',
          time: '16:00',
          endTime: '17:30',
          location: 'Детски отдел',
          description: '<h3>Четене на приказки за най-малките</h3><p>Специално събитие за деца от 4 до 8 години. Ще четем любими приказки и ще организираме занимания свързани с прочетените истории.</p><p><strong>Включени активности:</strong></p><ol><li>Четене на приказки</li><li>Рисуване на герои</li><li>Театрална постановка</li></ol>',
          maxParticipants: 15,
          currentParticipants: 12,
          allowedRoles: ['reader'],
          organizer: 'Петър Георгиев',
          timestamp: parseEventDate('2025-12-20', '16:00')
        },
        {
          id: '3',
          title: 'Литературен клуб',
          date: '2025-12-22',
          time: '17:00',
          endTime: '18:30',
          location: 'Главна зала',
          description: '<h3>Дискусия за съвременна българска литература</h3><p>Дискусия на тема "Съвременната българска литература в контекста на европейските тенденции". Ще обсъждаме творби на млади български автори и тяхното място в световната литература.</p><p><em>Водещ: д-р Александър Петров</em></p>',
          maxParticipants: 25,
          currentParticipants: 18,
          allowedRoles: ['reader', 'librarian'],
          organizer: 'Анна Петрова',
          timestamp: parseEventDate('2025-12-22', '17:00')
        },
        {
          id: '4',
          title: 'Творческа работилница',
          date: '2025-12-25',
          time: '10:00',
          endTime: '12:00',
          location: 'Творческа стая',
          description: '<h3>Работилница по писане на разкази</h3><p>Практическа работилница за всички, които искат да научат основите на писането на разкази. Ще разгледаме техники за изграждане на герои, сюжет и атмосфера.</p><p><u>Какво ще научите:</u></p><ul><li>Как да изградите запомнящ се герой</li><li>Техники за развитие на сюжет</li><li>Как да създадете атмосфера в разказа</li></ul>',
          maxParticipants: 12,
          currentParticipants: 6,
          allowedRoles: ['reader'],
          organizer: 'Георги Димитров',
          timestamp: parseEventDate('2025-12-25', '10:00')
        }
      ].filter(event => {
        const eventEndTime = parseEventDate(event.date, event.endTime);
        return eventEndTime >= currentDate;
      }).sort((a, b) => a.timestamp!.getTime() - b.timestamp!.getTime());
      
      setEvents(fallbackEvents);
    }
  };

  // Зареждане на новини
const fetchNews = async () => {
  try {
    const snapshot = await getDocs(collection(db, "news"));
    const newsData: News[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Обработка на снимките
        image: data.image || '/api/placeholder/400/250',
        images: data.images || [], // Допълнителни снимки (може да е празен масив)
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
        tags: data.tags || [],
        views: data.views || 0,
        likes: data.likes || 0,
        featured: data.featured || false
      } as News;
    });
    
    // Сортиране по дата (най-новите първи)
    newsData.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    setNews(newsData);
  } catch (error) {
    console.error("Error fetching news:", error);
    // Fallback новини
    const fallbackNews: News[] = [
      {
        id: '1',
        title: 'Нова колекция от детски книги',
        excerpt: 'Разширяваме колекцията си с над 200 нови заглавия за деца и юноши',
        content: 'Библиотеката е обогатила колекцията си с най-новите заглавия в детската и юношеска литература...',
        image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
        ],
        date: new Date('2024-12-10'),
        author: 'Мария Иванова',
        category: 'Нови книги',
        tags: ['книги', 'деца', 'нови заглавия'],
        views: 156,
        likes: 23,
        featured: true
      }
    ];
    setNews(fallbackNews);
  }
};
  // Функция за регистрация в системата (става читател)
  const handleBecomeReader = () => {
    if (user) {
      // Ако потребителят е вече влязъл, пренасочваме към профила
      navigate('/dashboard');
    } else {
      // Ако не е влязъл, пренасочваме към регистрация
      navigate('/register');
    }
  };

  // Промени тази функция в Home компонента
const handleEventRegistration = (event: Event) => {
  if (!user) {
    // Ако не е логнат, води към логин страница
    navigate('/login', { 
      state: { 
        redirectTo: '/dashboard',
        message: 'Моля, влезте в профила си, за да се запишете за събитие.',
        eventId: event.id // Запазваме ID на събитието
      }
    });
    return;
  }

  if (isEventFull(event)) {
    alert('Събитието е пълно! Не можете да се запишете.');
    return;
  }

  // Ако е логнат, води към дашборда с флаг за автоматично отваряне на модала
  navigate('/dashboard', { 
    state: { 
      eventId: event.id,
      action: 'register',
      fromHomePage: true // ДОБАВЕНО: Флаг, че идваме от HomePage
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

  const toggleShowAllNews = () => {
    setShowAllNews(!showAllNews);
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
        
        // Зареждане на всички книги
        const allBooks = await bookService.fetchAllBooks();
        
        // Зареждане на потребителски данни ако има логнат потребител
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
        
        // 1. ПОПУЛЯРНИ КНИГИ (за всички)
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
        
        // 2. НОВИ КНИГИ
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
        
        // 3. За логнати потребители - персонализирани препоръки
        if (user && viewedBooks.length > 0) {
          const viewedBooksData = allBooks.filter(b => viewedBooks.includes(b.id));
          const userGenres = new Set<string>();
          const userAuthors = new Set<string>();
          
          viewedBooksData.forEach(book => {
            book.genres?.forEach(genre => userGenres.add(genre));
            userAuthors.add(book.author);
          });
          
          // По жанр
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
          
          // По автор
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
        
        // Сортиране и вземане на топ 6
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
  
  // Функция за резервиране
  const handleReserveBook = (bookId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    // Тук може да добавиш логика за резервиране
    navigate(`/books/${bookId}`);
  };

  // Hero Section Data
  const heroData = {
    title: 'Smart School Library',
    subtitle: 'Училищна библиотека',
    description: 'Място за знания и вдъхновение. Нашата библиотека предлага богата колекция от книги, учебни помагала и ресурси за всички ученици и учители.',
    searchPlaceholder: 'Търсете книги, автори или теми...'
  };

  // Features Data
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


  // Testimonials Data
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
  
  // Проверка дали датата е Firebase Timestamp
  if (dateInput?.toDate) {
    date = dateInput.toDate();
  } 
  // Проверка дали е string
  else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } 
  // Проверка дали вече е Date обект
  else if (dateInput instanceof Date) {
    date = dateInput;
  }
  // В противен случай създаваме нова дата
  else {
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
      {/* Modern Hero Section with Background Image */}
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

            {/* Search Bar */}
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
              {/* Променен бутон "Разгледай каталога" */}
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/catalog')}
              >
                <span>Разгледай каталога</span>
                <ArrowRight className="btn-icon" />
              </button>
              
              {/* Променен бутон "Стани читател" */}
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
    console.log('Book data:', {
      id: rec.bookId,
      title: rec.title,
      bookTitle: book?.title,
      coverUrl: rec.coverUrl,
      bookCoverUrl: book?.coverUrl,
      hasBookDetails: !!book,
      fullBookData: book
    });
    
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

    {displayedNews.length > 0 ? (
      <>
        {/* Препоръчани новини (ако има) */}
        {displayedNews.filter(newsItem => newsItem.featured).length > 0 && (
          <div className="featured-news-section">
            <div className="featured-news-grid">
              {displayedNews
                .filter(newsItem => newsItem.featured)
                .map((newsItem) => (
                  <article key={newsItem.id} className="news-card featured-news-card">
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
                      
                      <button 
  className="news-read-more" 
  onClick={() => handleOpenNewsModal(newsItem)}
>
  <span>Прочети повече</span>
  <ExternalLink className="read-more-icon" />
</button>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        )}

        {/* Всички новини */}
        <div className="news-grid">
          {displayedNews
            .filter(newsItem => !newsItem.featured || displayedNews.filter(n => n.featured).length === 0)
            .map((newsItem, _index) => (
              <article key={newsItem.id} className="news-card">
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
                  <div className="news-overlay">
                    <button className="news-action-btn">
                      <Bookmark className="action-icon" />
                    </button>
                    <button className="news-action-btn">
                      <Share2 className="action-icon" />
                    </button>
                  </div>
                </div>

                <div className="news-content">
                  <div className="news-meta">
                    <span className="news-date">{formatNewsDate(newsItem.date)}</span>
                    <span className="news-author">от {newsItem.author || 'Администратор'}</span>
                  </div>

                  <h3 className="news-title">{newsItem.title}</h3>
                  <p className="news-excerpt">{newsItem.excerpt}</p>

                  <div className="news-footer">
                    <div className="news-stats">
                      <div className="news-stat">
                        <Eye className="stat-icon" />
                        <span>{newsItem.views || 0}</span>
                      </div>
                      <div className="news-stat">
                        <Heart className="stat-icon" />
                        <span>{newsItem.likes || 0}</span>
                      </div>
                    </div>

                    <div className="news-tags">
                      {(newsItem.tags || []).slice(0, 2).map((tag, tagIndex) => (
                        <span key={tagIndex} className="news-tag">#{tag}</span>
                      ))}
                    </div>
                  </div>

                  <button className="news-read-more">
                    <span>Прочети повече</span>
                    <ExternalLink className="read-more-icon" />
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

   {/* Book Animation Section - ОПРАВЕН ЗА МОБИЛНИ */}
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

      {/* Enhanced Events Section with Calendar Design */}
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

                    {/* Съкратено описание с бутон "Виж повече" */}
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

      {/* About Section - Добавен CSS клас за тъмна тема */}
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
        {/* Галерия със снимки */}
        <div className="news-gallery">
          <h4 className="gallery-title">
            <ImageIcon size={20} />
            <span>Снимки</span>
          </h4>
          <div className="gallery-container">
            {(() => {
              // Комбинираме основната снимка с допълнителните
              const allImages = [
                selectedNews.image,
                ...(selectedNews.images || [])
              ].filter(img => img && img.trim() !== "");
              
              if (allImages.length > 0) {
                return (
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
                );
              } else {
                return (
                  <div className="no-images">
                    <ImageIcon size={32} />
                    <p>Няма добавени снимки за тази новина</p>
                  </div>
                );
              }
            })()}
          </div>
        </div>

        <div className="event-modal-description">
          <h4 className="event-modal-description-title">Съдържание</h4>
          <div className="event-modal-description-content">
            <div dangerouslySetInnerHTML={{ __html: selectedNews.content }} />
          </div>
        </div>
        
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