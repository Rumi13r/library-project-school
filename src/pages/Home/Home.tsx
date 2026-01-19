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
import { db } from '../../firebase/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as bookService from "../../lib/services/bookService";
import * as userService from "../../lib/services/userService";
import * as wishlistService from "../../lib/services/wishlistService";
import type { BookLibrary } from "../../lib/services/bookTypes";

// Импортиране на CSS модули
import styles from './Home.module.css';
import heroStyles from './Hero.module.css';
import buttonStyles from './Button.module.css';
import featuresStyles from './Features.module.css';
import catalogStyles from './Catalog.module.css';
import eventsStyles from './Events.module.css';
import newsStyles from './News.module.css';
import testimonialsStyles from './Testimonials.module.css';
import aboutStyles from './About.module.css';
import bookAnimationStyles from './BookAnimation.module.css';
import modalStyles from './Modal.module.css';
import typographyStyles from './Typography.module.css';

import libraryImage from '../../assets/images/2.jpg';
import library from '../../assets/images/library.png';

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

  // Добавете тези функции към вашия Home компонент

// Функция за добавяне на събитие в Google Calendar
const handleAddToGoogleCalendar = (event: Event) => {
  const eventDate = parseEventDate(event.date, event.time);
  const endDate = parseEventDate(event.date, event.endTime);
  
  // Форматиране на дати за Google Calendar
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };
  
  const startDateTime = formatGoogleDate(eventDate);
  const endDateTime = formatGoogleDate(endDate);
  
  // Създаване на Google Calendar URL
  const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
  googleCalendarUrl.searchParams.append('action', 'TEMPLATE');
  googleCalendarUrl.searchParams.append('text', event.title);
  googleCalendarUrl.searchParams.append('details', event.description);
  googleCalendarUrl.searchParams.append('location', event.location);
  googleCalendarUrl.searchParams.append('dates', `${startDateTime}/${endDateTime}`);
  googleCalendarUrl.searchParams.append('ctz', 'Europe/Sofia');
  
  // Отваряне на Google Calendar в нов таб
  window.open(googleCalendarUrl.toString(), '_blank');
};

// Функция за абониране за всички събития (iCal feed)
const handleSubscribeToCalendar = async () => {
  if (!user) {
    navigate('/login', {
      state: {
        redirectTo: '/',
        message: 'Моля, влезте в профила си, за да се абонирате за календара.'
      }
    });
    return;
  }
  
  try {
    // Създаване на iCal файл със събитията
    const icalContent = generateICalContent(events);
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    
    // Сваляне на файла
    const link = document.createElement('a');
    link.href = url;
    link.download = 'library-events.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Календарът е изтеглен. Можете да го импортирате във вашия Google Calendar.');
  } catch (error) {
    console.error('Грешка при генериране на календар:', error);
    alert('Възникна грешка при генериране на календара.');
  }
};
console.log(handleSubscribeToCalendar);

// Помощна функция за генериране на iCal съдържание
const generateICalContent = (events: Event[]) => {
  const now = new Date();
  const icalHeader = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//School Library//Events Calendar//BG',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:School Library Events',
    'X-WR-TIMEZONE:Europe/Sofia',
    'X-WR-CALDESC:Предстоящи събития в училищната библиотека'
  ].join('\n');
  
  const icalEvents = events.map(event => {
    const startDate = parseEventDate(event.date, event.time);
    const endDate = parseEventDate(event.date, event.endTime);
    
    return [
      'BEGIN:VEVENT',
      `UID:${event.id}@school-library.bg`,
      `DTSTAMP:${formatICalDate(now)}`,
      `DTSTART:${formatICalDate(startDate)}`,
      `DTEND:${formatICalDate(endDate)}`,
      `SUMMARY:${escapeICalText(event.title)}`,
      `DESCRIPTION:${escapeICalText(event.description)}`,
      `LOCATION:${escapeICalText(event.location)}`,
      `ORGANIZER:CN=${escapeICalText(event.organizer)}`,
      `URL:${window.location.origin}/events/${event.id}`,
      'END:VEVENT'
    ].join('\n');
  }).join('\n');
  
  return `${icalHeader}\n${icalEvents}\nEND:VCALENDAR`;
};

// Помощна функция за форматиране на дати за iCal
const formatICalDate = (date: Date) => {
  return date.toISOString()
    .replace(/-/g, '')
    .replace(/:/g, '')
    .replace(/\.\d+/, '');
};

// Помощна функция за екраниране на текст за iCal
const escapeICalText = (text: string) => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
};

  const handleOpenNewsModal = (newsItem: News) => {
    incrementViews(newsItem.id);
    setSelectedNews(newsItem);
  };

  const handleCloseNewsModal = () => {
    setSelectedNews(null);
  };

  const incrementViews = async (newsId: string) => {
    try {
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { ...item, views: (item.views || 0) + 1 }
            : item
        )
      );
      
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

  const handleLike = async (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      setNews(prevNews => 
        prevNews.map(item => 
          item.id === newsId 
            ? { ...item, likes: (item.likes || 0) + 1 }
            : item
        )
      );
      
      if (selectedNews?.id === newsId) {
        setSelectedNews(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      }
      
      const newsRef = doc(db, "news", newsId);
      await updateDoc(newsRef, {
        likes: (selectedNews?.likes || news.find(n => n.id === newsId)?.likes || 0) + 1
      });
    } catch (error) {
      console.error("Грешка при харесване:", error);
    }
  };

  const toggleShowAllNews = () => {
    setShowAllNews(!showAllNews);
  };

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
    const colorVariants = ['calendarGreen', 'calendarYellow', 'calendarRed', 'calendarBlue'];
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
  const displayedNews = showAllNews ? news : news.slice(0, 8);

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
      <div className={testimonialsStyles.testimonialStars}>
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`${testimonialsStyles.testimonialStar} ${
              index < rating 
                ? testimonialsStyles.starFilled 
                : testimonialsStyles.starEmpty
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
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={heroStyles.heroSection}>
        <div className={heroStyles.heroBackground}>
          <img 
            src={libraryImage} 
            alt="Училищна библиотека" 
            className={heroStyles.heroBgImage}
          />
          <div className={heroStyles.heroOverlay}></div>
        </div>
        
        <div className={heroStyles.heroContent}>
          <div className={heroStyles.heroBlurBox}>
            <h1 className={heroStyles.heroTitle}>
              <span className={typographyStyles.handwrittenHero}>{heroData.title}</span>
              <p></p>
              <span className={typographyStyles.handwrittenHeroSub}>{heroData.subtitle}</span>
            </h1>

            <p className={heroStyles.heroDescription}>
              {heroData.description}
            </p>

            <div className={heroStyles.searchContainer}>
              <div className={heroStyles.searchBar}>
                <Search className={heroStyles.searchIcon} />
                <input
                  type="text"
                  placeholder={heroData.searchPlaceholder}
                  className={heroStyles.searchInput}
                />
              </div>
            </div>

            <div className={heroStyles.heroButtons}>
              <button 
                className={`${buttonStyles.btn} ${buttonStyles.btnPrimary}`}
                onClick={() => navigate('/catalog')}
              >
                <span>Разгледай каталога</span>
                <ArrowRight className={buttonStyles.btnIcon} />
              </button>
              
              <button 
                className={`${buttonStyles.btn} ${buttonStyles.btnSecondary}`}
                onClick={handleBecomeReader}
              >
                <BookOpen className={buttonStyles.btnIcon} />
                <span>Стани читател</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
<section className={featuresStyles.featuresSection}>
  <div className={styles.container}>
    <div className={featuresStyles.featuresContainer}>
      <div className={featuresStyles.featuresBackground}></div>
      <div className={styles.sectionHeader}>
        <h2 className={typographyStyles.handwrittenTitle}>Защо да изберете нашата библиотека?</h2>
        <p className={styles.sectionSubtitle}>
          Предлагаме модерни услуги и богата колекция, които правят четенето 
          удоволствие за всеки ученик и учител.
        </p>
      </div>
      <div className={featuresStyles.featuresGrid}>
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <div key={index} className={featuresStyles.featureCard}>
              <span className={featuresStyles.featureNumber}></span>
              <div className={featuresStyles.featureIconWrapper}>
                <IconComponent className={featuresStyles.featureIconSvg} />
              </div>
              
              <div className={featuresStyles.featureContent}>
                <h3 className={featuresStyles.featureTitle}>{feature.title}</h3>
                <p className={featuresStyles.featureDescription}>{feature.description}</p>
              </div>
              
              <button className={featuresStyles.featureLink}>
                <span>Научете повече</span>
                <ArrowRight className={featuresStyles.featureLinkIcon} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</section>
      {/* Book Catalog Section */}
<section className={catalogStyles.catalogSection}>
  <div className={styles.container}>
    <div className={styles.sectionHeader}>
      <h2 className={typographyStyles.handwrittenTitle}>
        {user ? 'Препоръчани за вас' : 'Препоръчани книги'}
      </h2>
      <p className={styles.sectionSubtitle}>
        {user 
          ? 'Книги, подбрани специално за вас въз основа на читателският рейтинг' 
          : 'Най-популярните и нови заглавия в нашата библиотека'}
      </p>
    </div>

    {loadingRecs ? (
      <div className={catalogStyles.loadingState}>
        <div className={catalogStyles.spinner}></div>
        <p>Зареждане на препоръките...</p>
      </div>
    ) : recommendations.length > 0 ? (
      <div className={catalogStyles.booksGrid}>
        {recommendations.map((rec) => {
          const book = rec.bookDetails;
          const coverUrl = book?.coverUrl || rec.coverUrl;
          const available = book?.availableCopies && book.availableCopies > 0;
          
          return (
            <div key={rec.bookId} className={catalogStyles.bookCard}>
              <div className={catalogStyles.bookContent}>
                <div className={catalogStyles.bookCoverContainer}>
  {coverUrl ? (
    <img 
      src={coverUrl} 
      alt={rec.title}
      className={catalogStyles.bookCoverImage}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove(catalogStyles.hidden);
      }}
    />
  ) : null}
  <div className={`${catalogStyles.bookCoverFallback} ${coverUrl ? catalogStyles.hidden : ''}`}>
    <BookOpen className={catalogStyles.bookCoverIcon} />
    <span className={catalogStyles.bookCoverFallbackText}>Няма снимка</span>
  </div>
  <div className={catalogStyles.recommendationBadge}>
    <span>{rec.score} точки</span>
  </div>
</div>
                
                <div className={catalogStyles.bookDetails}>
                  <h3 className={catalogStyles.bookTitle}>{rec.title}</h3>
                  <p className={catalogStyles.bookAuthor}>{rec.author}</p>
                  <p className={catalogStyles.bookReason}>{rec.reason}</p>
                  
                  {book && (
                    <div className={catalogStyles.bookMeta}>
                      <span className={catalogStyles.bookCategory}>
                        {book.genres?.[0] || 'Без категория'}
                      </span>
                      <span className={`${catalogStyles.availability} ${available ? catalogStyles.available : catalogStyles.unavailable}`}>
                        {available ? 'Налична' : 'Заета'}
                      </span>
                    </div>
                  )}
                  
                  <button 
                    className={catalogStyles.reserveBtn}
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
      <div className={catalogStyles.emptyState}>
        <BookOpen size={48} />
        <p>Няма налични препоръки в момента</p>
        <p className={catalogStyles.emptySubtext}>
          {user 
            ? 'Разгледайте повече книги, за да получите персонализирани препоръки' 
            : 'Влезте в профила си за персонализирани препоръки'}
        </p>
      </div>
    )}

    <div className={catalogStyles.catalogFooter}>
      <button 
        className={`${buttonStyles.btn} ${buttonStyles.btnOutline} ${catalogStyles.catalogBtn}`}
        onClick={() => navigate('/books')}
      >
        Виж всички книги
      </button>
    </div>
  </div>
</section>
      {/* News Section */}
      <section className={newsStyles.newsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={typographyStyles.sectionHeaderTop}>
              <Newspaper className={typographyStyles.sectionTitleIcon} />
              <h2 className={typographyStyles.handwrittenTitle}>Новини и Събития</h2>
            </div>
            <p className={styles.sectionSubtitle}>
              Най-новите актуализации и събития от библиотеката
            </p>
          </div>

          {news.length > 0 ? (
            <>
              {news.filter(newsItem => newsItem.featured).length > 0 && (
                <div className={newsStyles.featuredNewsSection}>
                  <h3 className={newsStyles.featuredNewsTitle}>
                    <Star size={20} />
                    Препоръчани новини
                  </h3>
                  <div className={newsStyles.featuredNewsGrid}>
                    {news
                      .filter(newsItem => newsItem.featured)
                      .map((newsItem) => (
                        <article 
                          key={newsItem.id} 
                          className={`${newsStyles.newsCard} ${newsStyles.featuredNewsCard}`}
                          onClick={() => handleOpenNewsModal(newsItem)}
                        >
                          <div className={newsStyles.featuredBadge}>
                            <Star size={12} />
                            <span>Препоръчана</span>
                          </div>
                          <div className={newsStyles.newsImageContainer}>
                            <img 
                              src={newsItem.image || '/api/placeholder/400/250'} 
                              alt={newsItem.title}
                              className={newsStyles.newsImage}
                              onError={(e) => {
                                e.currentTarget.src = '/api/placeholder/400/250';
                              }}
                            />
                            <div className={newsStyles.newsCategoryTag}>
                              <Tag className={newsStyles.tagIcon} />
                              <span>{newsItem.category || 'Общи'}</span>
                            </div>
                          </div>
                          
                          <div className={newsStyles.newsContent}>
                            <div className={newsStyles.newsMeta}>
                              <span className={newsStyles.newsDate}>{formatNewsDate(newsItem.date)}</span>
                              <span className={newsStyles.newsAuthor}>от {newsItem.author || 'Администратор'}</span>
                            </div>
                            
                            <h3 className={newsStyles.newsTitle}>{newsItem.title}</h3>
                            <p className={newsStyles.newsExcerpt}>{newsItem.excerpt}</p>
                            
                            <div className={newsStyles.newsStats}>
                              <div className={newsStyles.newsStat}>
                                <Eye className={newsStyles.statIcon} />
                                <span>{newsItem.views || 0} преглеждания</span>
                              </div>
                              <div className={newsStyles.newsStat}>
                                <button 
                                  className={newsStyles.likeButton}
                                  onClick={(e) => handleLike(newsItem.id, e)}
                                >
                                  <Heart className={`${newsStyles.statIcon} ${newsItem.likes > 0 ? newsStyles.liked : ''}`} />
                                  <span>{newsItem.likes || 0} харесвания</span>
                                </button>
                              </div>
                            </div>
                            
                            {newsItem.tags && newsItem.tags.length > 0 && (
                              <div className={newsStyles.newsTags}>
                                {newsItem.tags.slice(0, 3).map((tag, tagIndex) => (
                                  <span key={tagIndex} className={newsStyles.newsTag}>#{tag}</span>
                                ))}
                              </div>
                            )}
                            
                            <button 
                              className={newsStyles.newsReadMore} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenNewsModal(newsItem);
                              }}
                            >
                              <span>Прочети повече</span>
                              <ArrowRight className={newsStyles.readMoreIcon} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              )}

              <div className={newsStyles.newsGrid}>
                {displayedNews
                  .filter(newsItem => !newsItem.featured)
                  .map((newsItem) => (
                    <article 
                      key={newsItem.id} 
                      className={newsStyles.newsCard}
                      onClick={() => handleOpenNewsModal(newsItem)}
                    >
                      <div className={newsStyles.newsImageContainer}>
                        <img 
                          src={newsItem.image || '/api/placeholder/400/250'} 
                          alt={newsItem.title}
                          className={newsStyles.newsImage}
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/400/250';
                          }}
                        />
                        <div className={newsStyles.newsCategoryTag}>
                          <Tag className={newsStyles.tagIcon} />
                          <span>{newsItem.category || 'Общи'}</span>
                        </div>
                      </div>

                      <div className={newsStyles.newsContent}>
                        <div className={newsStyles.newsMeta}>
                          <span className={newsStyles.newsDate}>{formatNewsDate(newsItem.date)}</span>
                          <span className={newsStyles.newsAuthor}>от {newsItem.author || 'Администратор'}</span>
                        </div>

                        <h3 className={newsStyles.newsTitle}>{newsItem.title}</h3>
                        <p className={newsStyles.newsExcerpt}>{newsItem.excerpt}</p>

                        <div className={newsStyles.newsStats}>
                          <div className={newsStyles.newsStat}>
                            <Eye className={newsStyles.statIcon} />
                            <span>{newsItem.views || 0} преглеждания</span>
                          </div>
                          <div className={newsStyles.newsStat}>
                            <button 
                              className={newsStyles.likeButton}
                              onClick={(e) => handleLike(newsItem.id, e)}
                            >
                              <Heart className={`${newsStyles.statIcon} ${newsItem.likes > 0 ? newsStyles.liked : ''}`} />
                              <span>{newsItem.likes || 0} харесвания</span>
                            </button>
                          </div>
                        </div>

                        {newsItem.tags && newsItem.tags.length > 0 && (
                          <div className={newsStyles.newsTags}>
                            {newsItem.tags.slice(0, 2).map((tag, tagIndex) => (
                              <span key={tagIndex} className={newsStyles.newsTag}>#{tag}</span>
                            ))}
                          </div>
                        )}

                        <button 
                          className={newsStyles.newsReadMore} 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNewsModal(newsItem);
                          }}
                        >
                          <span>Прочети повече</span>
                          <ArrowRight className={newsStyles.readMoreIcon} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          ) : (
            <div className={newsStyles.noNews}>
              <Newspaper size={48} />
              <p>Няма новини за показване в момента</p>
            </div>
          )}

          {news.length > 4 && (
            <div className={newsStyles.newsToggleContainer}>
              <button 
                className={newsStyles.newsToggleBtn}
                onClick={toggleShowAllNews}
              >
                {showAllNews ? (
                  <>
                    <ChevronUp className={newsStyles.toggleIcon} />
                    <span>Покажи по-малко новини</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className={newsStyles.toggleIcon} />
                    <span>Покажи всички новини ({news.length})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Book Animation Section */}
      <section className={`${bookAnimationStyles.homeBookAnimationSection} ${aboutStyles.darkThemeCompatible}`}>
        <div className="home-bookshelf-container">
          <div className={bookAnimationStyles.homeBookshelf}>
            <div className={bookAnimationStyles.homeBooks}>
              <div 
                className={bookAnimationStyles.homeBook} 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1581128232l/50214741.jpg)' } as any}
              ></div>
              <div 
                className={bookAnimationStyles.homeBook} 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1544204706l/42505366.jpg)' } as any}
              ></div>
              <div 
                className={bookAnimationStyles.homeBook} 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1541621322l/42201395.jpg)' } as any}
              ></div>
              <div 
                className={bookAnimationStyles.homeBook} 
                style={{ '--bg-image': 'url(https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1548518877l/43263520._SY475_.jpg)' } as any}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Events Section */}
<section className={eventsStyles.eventsSection}>
  <div className={styles.container}>
    <div className={styles.sectionHeader}>
      <div className={typographyStyles.sectionHeaderTop}>
        <Calendar className={typographyStyles.sectionTitleIcon} />
        <h2 className={typographyStyles.handwrittenTitle}>Предстоящи Събития</h2>
      </div>
      <p className={styles.sectionSubtitle}>
        Присъединете се към различни дискусии и организирани културни събития.
      </p>
    </div>
    <div className={eventsStyles.calendarEventsGrid}>
      {displayedEvents.map((event, index) => {
        const calendarDate = formatDateForCalendar(event.date);
        const colorVariants = [eventsStyles.calendarGreen, eventsStyles.calendarYellow, eventsStyles.calendarRed, eventsStyles.calendarBlue];
        const colorClass = colorVariants[index % colorVariants.length];
        
        return (
          <div key={event.id} className={eventsStyles.calendarEventCard}>
            <div className={`${eventsStyles.calendarDate} ${colorClass}`}>
              <div className={eventsStyles.calendarDay}>{calendarDate.day}</div>
              <div className={eventsStyles.calendarMonth}>{calendarDate.month}</div>
              <div className={eventsStyles.calendarWeekday}>{calendarDate.weekday}</div>
            </div>

            <div className={eventsStyles.calendarEventContent}>
              <div className={eventsStyles.eventHeaderCalendar}>
                <h3 className={eventsStyles.eventTitleCalendar}>{event.title}</h3>
                <div className={eventsStyles.eventTimeBadge}>
                  <Clock className={eventsStyles.timeBadgeIcon} />
                  <span>{event.time} - {event.endTime}</span>
                </div>
              </div>

              <div className={eventsStyles.eventDescriptionContainer}>
                <div 
                  className={`${eventsStyles.eventDescriptionCalendar} ${eventsStyles.truncatedDescription}`}
                >
                  {truncateText(event.description, 150)}
                </div>
                <div className={eventsStyles.viewMoreContainer}>
                  <button 
                    className={`${eventsStyles.viewMoreBtn} ${colorClass}`}
                    onClick={() => handleViewEventDetails(event, index)}
                  >
                    <EyeIcon className={eventsStyles.viewMoreIcon} />
                    <span>Виж повече</span>
                  </button>
                </div>
              </div>

              <div className={eventsStyles.eventDetailsCalendar}>
                <div className={eventsStyles.eventDetailRow}>
                  <MapPin className={eventsStyles.detailIconCalendar} />
                  <span className={eventsStyles.detailTextCalendar}>{event.location}</span>
                </div>
                <div className={eventsStyles.eventDetailRow}>
                  <User className={eventsStyles.detailIconCalendar} />
                  <span className={eventsStyles.detailTextCalendar}>{event.organizer}</span>
                </div>
              </div>

              <div className={eventsStyles.eventFooterCalendar}>
                <div className={eventsStyles.participantsSection}>
                  <div className={eventsStyles.participantsInfo}>
                    <Users className={eventsStyles.participantsIcon} />
                    <span className={eventsStyles.participantsText}>
                      {event.currentParticipants} / {event.maxParticipants} записани
                    </span>
                    {getAvailableSpots(event) > 0 && (
                      <span className={eventsStyles.spotsAvailable}>
                        {getAvailableSpots(event)} свободни места
                      </span>
                    )}
                  </div>
                </div>

                <div className={eventsStyles.eventActions}>
                  <button 
                    className={`${eventsStyles.eventRegisterBtn} ${colorClass} ${
                      isEventFull(event) ? eventsStyles.eventBtnDisabled : ''
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
                    {!isEventFull(event) && <ArrowRight className={eventsStyles.registerIcon} />}
                  </button>
                  
                  <button 
                    className={eventsStyles.addToCalendarBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToGoogleCalendar(event);
                    }}
                    title="Добави в Google Calendar"
                  >
                    <img 
                      src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                      alt="Google Calendar" 
                      className={eventsStyles.calendarBtnIcon}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    {events.length === 0 && (
      <div className={eventsStyles.noEvents}>
        <Calendar className={eventsStyles.noEventsIcon} />
        <p>В момента няма предстоящи събития</p>
      </div>
    )}

    {events.length > 4 && (
      <div className={eventsStyles.eventsToggleContainer}>
        <button 
          className={eventsStyles.eventsToggleBtn}
          onClick={toggleShowAllEvents}
        >
          {showAllEvents ? (
            <>
              <ChevronUp className={eventsStyles.toggleIcon} />
              <span>Покажи по-малко събития</span>
            </>
          ) : (
            <>
              <ChevronDown className={eventsStyles.toggleIcon} />
              <span>Покажи всички събития ({events.length})</span>
            </>
          )}
        </button>
      </div>
    )}
  </div>
</section>

      {/* Testimonials Section */}
      <section className={testimonialsStyles.testimonialsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={typographyStyles.handwrittenTitle}>Какво казват нашите читатели?</h2>
            <p className={styles.sectionSubtitle}>
              Отзиви от ученици, учители и родители
            </p>
          </div>

          <div className={testimonialsStyles.testimonialsGrid}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className={testimonialsStyles.testimonialCard}>
                <Quote className={testimonialsStyles.testimonialQuote} />
                {renderTestimonialStars(testimonial.rating)}
                <p className={testimonialsStyles.testimonialContent}>
                  "{testimonial.content}"
                </p>
                <div className={testimonialsStyles.testimonialAuthor}>
                  <div className={testimonialsStyles.authorName}>{testimonial.name}</div>
                  <div className={testimonialsStyles.authorRole}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className={`${aboutStyles.aboutSection} ${aboutStyles.darkThemeCompatible}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={typographyStyles.handwrittenTitle}>За библиотеката</h2>
            <p className={styles.sectionSubtitle}>
              Нашата мисия е да осигурим среда, в която учениците да учат и да откриват нови светове чрез книгите.
            </p>
          </div>

          <div className={aboutStyles.aboutContent}>
            <div className={aboutStyles.aboutText}>
              <div className={aboutStyles.aboutHeader}>
                <h3 className={aboutStyles.aboutSubtitle}>История и мисия</h3>
              </div>
              
              <div className={aboutStyles.aboutDescription}>
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
            
              <div className={aboutStyles.aboutButtons}>
                <button className={`${buttonStyles.btn} ${buttonStyles.btnPrimary} ${aboutStyles.aboutBtn}`}>
                  <Users className={buttonStyles.btnIcon} />
                  <span>Запознай се с екипа</span>
                </button>
                <button className={`${buttonStyles.btn} ${buttonStyles.btnOutline} ${aboutStyles.aboutBtn}`}>
                  <MapPin className={buttonStyles.btnIcon} />
                  <span>Свържи се с нас</span>
                </button>
              </div>
            </div>
            
            <div className={aboutStyles.aboutVisual}>
              <div className={aboutStyles.imageContainer}>
                <img 
                  src={library} 
                  alt="Библиотеката" 
                  className={aboutStyles.aboutImage}
                />
                <div className={aboutStyles.imageOverlay}>
                  <div className={aboutStyles.overlayContent}>
                    <BookOpen className={aboutStyles.overlayIcon} />
                    <span>Вашата библиотека</span>
                  </div>
                </div>
              </div>
              <div className={aboutStyles.visualStats}>
                <div className={aboutStyles.visualStat}>
                  <div className={aboutStyles.statNumber}>20+</div>
                  <div className={aboutStyles.statLabel}>Години опит</div>
                </div>
                <div className={aboutStyles.visualStat}>
                  <div className={aboutStyles.statNumber}>10k+</div>
                  <div className={aboutStyles.statLabel}>Книги</div>
                </div>
                <div className={aboutStyles.visualStat}>
                  <div className={aboutStyles.statNumber}>2.5k+</div>
                  <div className={aboutStyles.statLabel}>Читатели</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Event Details Modal */}
      {selectedEventModal && (
        <div className={modalStyles.eventModalOverlay} onClick={handleCloseEventModal}>
          <div className={modalStyles.eventModal} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.eventModalHeader}>
              <div className={modalStyles.eventModalTitle}>
                <div className={`${modalStyles.eventModalDateBadge} ${selectedEventModal.colorClass}`}>
                  <div className={modalStyles.eventModalDateDay}>{selectedEventModal.calendarDate.day}</div>
                  <div className={modalStyles.eventModalDateMonth}>{selectedEventModal.calendarDate.month}</div>
                  <div className={modalStyles.eventModalDateWeekday}>{selectedEventModal.calendarDate.weekday}</div>
                </div>
                <div className={modalStyles.eventModalTitleText}>
                  <h3>{selectedEventModal.event.title}</h3>
                  <div className={modalStyles.eventModalTime}>
                    <Clock size={16} />
                    <span>{selectedEventModal.event.time} - {selectedEventModal.event.endTime}</span>
                  </div>
                </div>
              </div>
              <button 
                className={modalStyles.eventModalClose}
                onClick={handleCloseEventModal}
              >
                <X size={24} />
              </button>
            </div>

            <div className={modalStyles.eventModalContent}>
              <div className={modalStyles.eventModalDetailsGrid}>
                <div className={modalStyles.eventModalDetail}>
                  <MapPin className={modalStyles.eventModalDetailIcon} />
                  <div className={modalStyles.eventModalDetailContent}>
                    <div className={modalStyles.eventModalDetailLabel}>Място</div>
                    <div className={modalStyles.eventModalDetailValue}>{selectedEventModal.event.location}</div>
                  </div>
                </div>

                <div className={modalStyles.eventModalDetail}>
                  <User className={modalStyles.eventModalDetailIcon} />
                  <div className={modalStyles.eventModalDetailContent}>
                    <div className={modalStyles.eventModalDetailLabel}>Организатор</div>
                    <div className={modalStyles.eventModalDetailValue}>{selectedEventModal.event.organizer}</div>
                  </div>
                </div>

                <div className={modalStyles.eventModalDetail}>
                  <Users className={modalStyles.eventModalDetailIcon} />
                  <div className={modalStyles.eventModalDetailContent}>
                    <div className={modalStyles.eventModalDetailLabel}>Участници</div>
                    <div className={modalStyles.eventModalDetailValue}>
                      {selectedEventModal.event.currentParticipants} / {selectedEventModal.event.maxParticipants} записани
                      {getAvailableSpots(selectedEventModal.event) > 0 && (
                        <span className={modalStyles.eventModalAvailableSpots}>
                          ({getAvailableSpots(selectedEventModal.event)} свободни места)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={modalStyles.eventModalDetail}>
                  <Calendar className={modalStyles.eventModalDetailIcon} />
                  <div className={modalStyles.eventModalDetailContent}>
                    <div className={modalStyles.eventModalDetailLabel}>Дата</div>
                    <div className={modalStyles.eventModalDetailValue}>{formatFullDate(selectedEventModal.event.date)}</div>
                  </div>
                </div>
              </div>

              <div className={modalStyles.eventModalDescription}>
                <h4 className={modalStyles.eventModalDescriptionTitle}>Описание на събитието</h4>
                <div 
                  className={modalStyles.eventModalDescriptionContent}
                  dangerouslySetInnerHTML={{ __html: selectedEventModal.event.description }}
                />
              </div>

              <div className={modalStyles.eventModalRequirements}>
                <h4 className={modalStyles.eventModalRequirementsTitle}>
                  <Info size={20} />
                  <span>Изисквания и информация</span>
                </h4>
                <div className={modalStyles.eventModalRequirementsList}>
                  <div className={modalStyles.eventModalRequirement}>
                    <CheckCircle size={16} />
                    <span>Подходящо за: {selectedEventModal.event.allowedRoles.join(', ')}</span>
                  </div>
                  <div className={modalStyles.eventModalRequirement}>
                    <AlertCircle size={16} />
                    <span>Записването се извършва в библиотеката или чрез системата</span>
                  </div>
                </div>
              </div>

              <div className={modalStyles.eventModalFooter}>
                <button 
                  className={modalStyles.eventModalCloseBtn}
                  onClick={handleCloseEventModal}
                >
                  Затвори
                </button>
                <button 
                  className={`${modalStyles.eventModalRegisterBtn} ${selectedEventModal.colorClass} ${
                    !user || isEventFull(selectedEventModal.event) ? modalStyles.disabled : ''
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
        <div className={modalStyles.eventModalOverlay} onClick={handleCloseNewsModal}>
          <div className={`${modalStyles.eventModal} ${modalStyles.newsModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.eventModalHeader}>
              <div className={modalStyles.eventModalTitle}>
                <div className={modalStyles.newsModalCategoryBadge}>
                  <Tag size={16} />
                  <span>{selectedNews.category}</span>
                </div>
                <div className={modalStyles.eventModalTitleText}>
                  <h3>{selectedNews.title}</h3>
                  <div className={modalStyles.eventModalTime}>
                    <Calendar size={16} />
                    <span>{formatNewsDate(selectedNews.date)}</span>
                  </div>
                </div>
              </div>
              <button 
                className={modalStyles.eventModalClose}
                onClick={handleCloseNewsModal}
              >
                <X size={24} />
              </button>
            </div>

            <div className={modalStyles.eventModalContent}>
              {(() => {
                const allImages = [
                  selectedNews.image,
                  ...(selectedNews.images || [])
                ].filter(img => img && img.trim() !== "");
                
                if (allImages.length > 0) {
                  return (
                    <div className={modalStyles.newsGallery}>
                      <h4 className={modalStyles.galleryTitle}>
                        <ImageIcon size={20} />
                        <span>Галерия</span>
                      </h4>
                      <div className={modalStyles.galleryContainer}>
                        <div className={modalStyles.galleryGrid}>
                          {allImages.map((image, index) => (
                            <div key={index} className={modalStyles.galleryItem}>
                              <img 
                                src={image} 
                                alt={`${selectedNews.title} - снимка ${index + 1}`}
                                className={modalStyles.galleryImage}
                                onError={(e) => {
                                  e.currentTarget.src = '/api/placeholder/400/250';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className={modalStyles.eventModalDescription}>
                <h4 className={modalStyles.eventModalDescriptionTitle}>Съдържание</h4>
                <div className={modalStyles.eventModalDescriptionContent}>
                  <div dangerouslySetInnerHTML={{ __html: selectedNews.content }} />
                </div>
              </div>
              
              <div className={modalStyles.newsStatsModal}>
                <div className={modalStyles.newsStatModal}>
                  <Eye className={modalStyles.statIcon} />
                  <span>{selectedNews.views || 0} преглеждания</span>
                </div>
                <div className={modalStyles.newsStatModal}>
                  <button 
                    className={modalStyles.likeButtonModal}
                    onClick={(e) => handleLike(selectedNews.id, e)}
                  >
                    <Heart className={`${modalStyles.statIcon} ${selectedNews.likes > 0 ? modalStyles.liked : ''}`} />
                    <span>{selectedNews.likes || 0} харесвания</span>
                  </button>
                </div>
              </div>
              
              {selectedNews.tags && selectedNews.tags.length > 0 && (
                <div className={modalStyles.newsTagsModal}>
                  <div className={modalStyles.tagsTitle}>
                    <Tag size={16} />
                    <span>Тагове:</span>
                  </div>
                  <div className={modalStyles.tagsList}>
                    {selectedNews.tags.map((tag, index) => (
                      <span key={index} className={modalStyles.newsTagModal}>#{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className={modalStyles.eventModalFooter}>
                <button 
                  className={modalStyles.eventModalCloseBtn}
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