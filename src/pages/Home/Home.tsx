import React, { useEffect, useState, useCallback } from 'react';
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
import { recommendationService, type Recommendation } from "../../lib/services/recommendationService";
import { createReservation, checkUserReservationForBook } from "../../lib/services/reservationService";

// CSS modules
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
  // FIX: typed as FirestoreTimestamp | Date | string instead of any
  date: { toDate?: () => Date } | Date | string;
  author: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  featured?: boolean;
}

interface EventModalData {
  event: Event;
  colorClass: string;
  calendarDate: { day: number; month: string; weekday: string };
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
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Google Calendar ─────────────────────────────────────────────────────────
  const handleAddToGoogleCalendar = (event: Event) => {
    const eventDate = parseEventDate(event.date, event.time);
    const endDate   = parseEventDate(event.date, event.endTime);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.append('action', 'TEMPLATE');
    url.searchParams.append('text', event.title);
    url.searchParams.append('details', event.description);
    url.searchParams.append('location', event.location);
    url.searchParams.append('dates', `${fmt(eventDate)}/${fmt(endDate)}`);
    url.searchParams.append('ctz', 'Europe/Sofia');
    window.open(url.toString(), '_blank');
  };

  // ── News modal ───────────────────────────────────────────────────────────────
  const handleOpenNewsModal  = (item: News) => { void incrementViews(item.id); setSelectedNews(item); };
  const handleCloseNewsModal = () => setSelectedNews(null);

  const incrementViews = async (newsId: string) => {
    try {
      setNews(prev => prev.map(item => item.id === newsId ? { ...item, views: (item.views || 0) + 1 } : item));
      if (user) {
        const ref = doc(db, "news", newsId);
        const current = news.find(n => n.id === newsId)?.views ?? 0;
        await updateDoc(ref, { views: current + 1 });
      }
    } catch (e) { console.error("Error incrementing views:", e); }
  };

  const handleLike = async (newsId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      setNews(prev => prev.map(item => item.id === newsId ? { ...item, likes: (item.likes || 0) + 1 } : item));
      if (selectedNews?.id === newsId) {
        setSelectedNews(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
      }
      const ref     = doc(db, "news", newsId);
      const current = news.find(n => n.id === newsId)?.likes ?? 0;
      await updateDoc(ref, { likes: current + 1 });
    } catch (e) { console.error("Error liking:", e); }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const parseEventDate = (dateString: string, timeString = "00:00"): Date => {
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes]   = timeString.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    }
    const months: Record<string, number> = {
      'януари':0,'февруари':1,'март':2,'април':3,'май':4,'юни':5,
      'юли':6,'август':7,'септември':8,'октомври':9,'ноември':10,'декември':11
    };
    const parts = dateString.split(' ');
    if (parts.length === 2) {
      const day   = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase()];
      if (day && month !== undefined) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return new Date(new Date().getFullYear(), month, day, hours, minutes);
      }
    }
    return new Date();
  };

  const formatDateForCalendar = (dateString: string) => {
    const date = parseEventDate(dateString);
    return {
      day:     date.getDate(),
      month:   date.toLocaleDateString('bg-BG', { month: 'short' }),
      weekday: date.toLocaleDateString('bg-BG', { weekday: 'short' })
    };
  };

  const formatFullDate = (dateString: string): string =>
    parseEventDate(dateString).toLocaleDateString('bg-BG', {
      day:'numeric', month:'long', year:'numeric', weekday:'long'
    });

  const truncateText = (html: string, maxChars = 200): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const plain = div.textContent || div.innerText || '';
    return plain.length <= maxChars ? plain : plain.substring(0, maxChars) + '...';
  };

  // FIX: typed date param as News['date'] instead of any
  const formatNewsDate = (dateInput: News['date']): string => {
    let date: Date;
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      date = new Date();
    }
    return date.toLocaleDateString('bg-BG', { day:'numeric', month:'long', year:'numeric' });
  };

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const eventsData: Event[] = snapshot.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, timestamp: parseEventDate(data.date as string, data.time as string) } as Event;
      });
      const now     = new Date();
      const future  = eventsData.filter(ev => ev.date && parseEventDate(ev.date, ev.endTime) >= now);
      future.sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));
      setEvents(future);
    } catch (e) { console.error("Error fetching events:", e); }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, "news"));
      const newsData: News[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, ...data,
          image:    data.image    || '',
          images:   data.images   || [],
          date:     data.date?.toDate ? data.date.toDate() : new Date(data.date || Date.now()),
          tags:     data.tags     || [],
          views:    data.views    || 0,
          likes:    data.likes    || 0,
          featured: data.featured || false
        } as News;
      });
      newsData.sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(String(a.date));
        const db2 = b.date instanceof Date ? b.date : new Date(String(b.date));
        return db2.getTime() - da.getTime();
      });
      setNews(newsData);
    } catch (e) { console.error("Error fetching news:", e); }
  }, []);

  // ── Recommendations ──────────────────────────────────────────────────────────
  const loadRecommendations = useCallback(async (uid: string | null) => {
    setLoadingRecs(true);
    try {
      const recs = await recommendationService.getRecommendations(uid, 6);
      setRecommendations(recs);
    } catch (e) {
      console.error("Error loading recommendations:", e);
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => { void fetchEvents(); void fetchNews(); }, [fetchEvents, fetchNews]);
  // FIX: include loadRecommendations in deps array
  useEffect(() => { void loadRecommendations(user?.uid ?? null); }, [user, loadRecommendations]);

  // ── Book reservation ─────────────────────────────────────────────────────────
  const handleReserveBook = async (bookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { navigate('/register', { state: { from: `/books/${bookId}` } }); return; }
    try {
      const book = await bookService.fetchBookById(bookId);
      if (!book) { alert('Книгата не е намерена'); return; }
      if (book.availableCopies <= 0) { alert('Книгата не е налична'); return; }
      const has = await checkUserReservationForBook(user.uid, bookId);
      if (has) { alert('Вече имате активна резервация'); return; }
      await createReservation({
        bookId,
        userId:    user.uid,
        userName:  user.displayName || user.email || 'Потребител',
        userEmail: user.email || '',
        borrowPeriod: book.borrowPeriod || 14
      });
      await bookService.updateBookAvailableCopies(bookId, -1);
      alert('Успешна резервация!');
      void loadRecommendations(user.uid);
    } catch (e) { console.error('Error reserving:', e); alert('Грешка при резервация'); }
  };

  const handleBookDetails = (bookId: string) => navigate(`/books/${bookId}`);

  // ── Events ───────────────────────────────────────────────────────────────────
  const handleBecomeReader = () => navigate(user ? '/dashboard' : '/register');

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  }, [navigate, searchQuery]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleEventRegistration = (event: Event) => {
    if (!user) { navigate('/login', { state: { redirectTo: '/dashboard', eventId: event.id } }); return; }
    if (isEventFull(event)) { alert('Събитието е пълно!'); return; }
    navigate('/dashboard', { state: { eventId: event.id, action: 'register', fromHomePage: true } });
  };

  const handleViewEventDetails = (event: Event, index: number) => {
    const calendarDate   = formatDateForCalendar(event.date);
    const colorVariants  = ['calendarGreen','calendarYellow','calendarRed','calendarBlue'];
    const colorClass     = colorVariants[index % colorVariants.length];
    setSelectedEventModal({ event, colorClass, calendarDate });
  };

  const getAvailableSpots = (event: Event) => Math.max(0, event.maxParticipants - event.currentParticipants);
  const isEventFull       = (event: Event) => getAvailableSpots(event) <= 0;

  const displayedEvents = showAllEvents ? events : events.slice(0, 6);
  const displayedNews   = showAllNews   ? news   : news.slice(0, 8);

  // ── Static data ──────────────────────────────────────────────────────────────
  const features = [
    { icon: BookOpen, title: 'Богата колекция',    description: 'Над 10,000 книги и учебници за всички специалности',                         path: "/catalog",      requiresAuth: false },
    { icon: Users,    title: 'Читателски клубове', description: 'Регулярни срещи и дискусии за любители на четенето',                          path: "/readersClub",  requiresAuth: false },
    { icon: Clock,    title: 'Онлайн резервации',  description: 'Резервирайте книги онлайн и ги вземете в удобно за Вас време',               path: "/reservations", requiresAuth: true  },
  ];

  const testimonials = [
    { name:'Мария Иванова',   role:'Ученичка, 11 клас',      content:'Библиотеката е моят втори дом! Намирам всички необходими учебни материали и участвам в читателския клуб.',                   rating:5 },
    { name:'Петър Георгиев',  role:'Учител по литература',   content:'Професионално обслужване и богата колекция. Прекрасно място, където учениците развиват любов към книгата.',                   rating:5 },
    { name:'Анна Димитрова',  role:'Родител',                content:'Дъщеря ми обича да посещава библиотеката. Персоналът е много любезен и винаги помагат с избора на книги.',                    rating:4 },
  ];

  const renderStars = (rating: number) => (
    <div className={testimonialsStyles.testimonialStars}>
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`${testimonialsStyles.testimonialStar} ${i < rating ? testimonialsStyles.starFilled : testimonialsStyles.starEmpty}`} />
      ))}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className={styles.homeContainer}>

      {/* ── Hero ── */}
      <section className={heroStyles.heroSection}>
        <div className={heroStyles.heroBackground}>
          <img src={libraryImage} alt="Училищна библиотека" className={heroStyles.heroBgImage} />
          <div className={heroStyles.heroOverlay}></div>
        </div>
        <div className={heroStyles.heroContent}>
          <div className={heroStyles.heroBlurBox}>
            <h1 className={heroStyles.heroTitle}>
              <span className={typographyStyles.handwrittenHero}>Smart School Library</span>
              <p></p>
            </h1>
            <h2 className={heroStyles.heroSubtitle}>
              Училищна библиотека
            </h2>
            <p className={heroStyles.heroDescription}>
              Място за знания и вдъхновение. Нашата библиотека предлага богата колекция от книги, учебни помагала и ресурси за всички ученици и учители.
            </p>
            <div className={heroStyles.searchContainer}>
              <div className={heroStyles.searchBar}>
                <Search className={heroStyles.searchIcon} onClick={() => handleSearch()} style={{cursor:'pointer'}} />
                <input
                  type="text"
                  placeholder="Търсете книги, автори или теми..."
                  className={heroStyles.searchInput}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
                {searchQuery && (
                  <button className={heroStyles.searchClearBtn} onClick={() => setSearchQuery('')} aria-label="Изчисти">✕</button>
                )}
                <button className={heroStyles.searchSubmitBtn} onClick={() => handleSearch()} aria-label="Търси">
                  Търси
                </button>
              </div>
            </div>
            <div className={heroStyles.heroButtons}>
              <button className={`${buttonStyles.btn} ${buttonStyles.btnPrimary}`} onClick={() => navigate('/catalog')}>
                <span>Разгледай каталога</span><ArrowRight className={buttonStyles.btnIcon} />
              </button>
              <button className={`${buttonStyles.btn} ${buttonStyles.btnSecondary}`} onClick={handleBecomeReader}>
                <BookOpen className={buttonStyles.btnIcon} /><span>Стани читател</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={featuresStyles.featuresSection}>
        <div className={styles.container}>
          <div className={featuresStyles.featuresContainer}>
            <div className={featuresStyles.featuresBackground}></div>
            <div className={styles.sectionHeader}>
              <h2 className={typographyStyles.handwrittenTitle}>Защо да изберете нашата библиотека?</h2>
              <p className={styles.sectionSubtitle}>Предлагаме модерни услуги и богата колекция, които правят четенето удоволствие.</p>
            </div>
            <div className={featuresStyles.featuresGrid}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className={featuresStyles.featureCard}>
                    <span className={featuresStyles.featureNumber}></span>
                    <div className={featuresStyles.featureIconWrapper}><Icon className={featuresStyles.featureIconSvg} /></div>
                    <div className={featuresStyles.featureContent}>
                      <h3 className={featuresStyles.featureTitle}>{feature.title}</h3>
                      <p className={featuresStyles.featureDescription}>{feature.description}</p>
                    </div>
                    <button className={featuresStyles.featureLink} onClick={() => {
                      if (feature.requiresAuth && !user) navigate('/auth', { state: { from: feature.path } });
                      else if (feature.requiresAuth && user) navigate('/reservations');
                      else navigate(feature.path);
                    }}>
                      <span>Научете повече</span><ArrowRight className={featuresStyles.featureLinkIcon} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Book Catalog / Recommendations ── */}
      <section className={catalogStyles.catalogSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={typographyStyles.handwrittenTitle}>{user ? 'Препоръчани за вас' : 'Препоръчани книги'}</h2>
            <p className={styles.sectionSubtitle}>
              {user ? 'Книги, подбрани специално за вас въз основа на вашите предпочитания' : 'Най-популярните и нови заглавия в нашата библиотека'}
            </p>
          </div>

          {loadingRecs ? (
            <div className={catalogStyles.loadingState}><div className={catalogStyles.spinner}></div><p>Зареждане...</p></div>
          ) : recommendations.length > 0 ? (
            <div className={catalogStyles.booksGrid}>
              {recommendations.map((rec) => {
                const book      = rec.bookDetails;
                const coverUrl  = book?.coverUrl || rec.coverUrl;
                const available = (book?.availableCopies ?? 0) > 0;
                return (
                  <div key={rec.bookId} className={catalogStyles.bookCard} onClick={() => handleBookDetails(rec.bookId)} style={{cursor:'pointer'}}>
                    <div className={catalogStyles.bookContent}>
                      <div className={catalogStyles.bookCoverContainer}>
                        {coverUrl
                          ? <img src={coverUrl} alt={rec.title} className={catalogStyles.bookCoverImage} onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextElementSibling?.classList.remove(catalogStyles.hidden); }} />
                          : null}
                        <div className={`${catalogStyles.bookCoverFallback} ${coverUrl ? catalogStyles.hidden : ''}`}>
                          <BookOpen className={catalogStyles.bookCoverIcon} /><span className={catalogStyles.bookCoverFallbackText}>Няма снимка</span>
                        </div>
                        <div className={catalogStyles.recommendationBadge}><span>{Math.round(rec.score)}% съвпадение</span></div>
                      </div>
                      <div className={catalogStyles.bookDetails}>
                        <h3 className={catalogStyles.bookTitle}>{rec.title}</h3>
                        <p className={catalogStyles.bookAuthor}>{rec.author}</p>
                        <p className={catalogStyles.bookReason}>{rec.reason}</p>
                        {book && (
                          <div className={catalogStyles.bookMeta}>
                            <span className={catalogStyles.bookCategory}>{book.genres?.[0] || 'Без категория'}</span>
                            <span className={`${catalogStyles.availability} ${available ? catalogStyles.available : catalogStyles.unavailable}`}>{available ? 'Налична' : 'Заета'}</span>
                          </div>
                        )}
                        <div className={catalogStyles.bookActions}>
                          <button className={catalogStyles.reserveBtn} onClick={(e) => void handleReserveBook(rec.bookId, e)}>Резервирай</button>
                        </div>
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
              <p className={catalogStyles.emptySubtext}>{user ? 'Разгледайте повече книги за персонализирани препоръки' : 'Влезте в профила си за персонализирани препоръки'}</p>
            </div>
          )}
          <div className={catalogStyles.catalogFooter}>
            <button className={`${buttonStyles.btn} ${buttonStyles.btnOutline} ${catalogStyles.catalogBtn}`} onClick={() => navigate('/catalog')}>Виж всички книги</button>
          </div>
        </div>
      </section>

      {/* ── News ── */}
      <section className={newsStyles.newsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={typographyStyles.sectionHeaderTop}>
              <Newspaper className={typographyStyles.sectionTitleIcon} />
              <h2 className={typographyStyles.handwrittenTitle}>Новини и Събития</h2>
            </div>
            <p className={styles.sectionSubtitle}>Най-новите актуализации и събития от библиотеката</p>
          </div>

          {news.length > 0 ? (
            <>
              {news.some(n => n.featured) && (
                <div className={newsStyles.featuredNewsSection}>
                  <h3 className={newsStyles.featuredNewsTitle}><Star size={20} />Препоръчани новини</h3>
                  <div className={newsStyles.featuredNewsGrid}>
                    {news.filter(n => n.featured).map(item => (
                      <article key={item.id} className={`${newsStyles.newsCard} ${newsStyles.featuredNewsCard}`} onClick={() => handleOpenNewsModal(item)}>
                        <div className={newsStyles.featuredBadge}><Star size={12}/><span>Препоръчана</span></div>
                        <div className={newsStyles.newsImageContainer}>
                          <img src={item.image || '/api/placeholder/400/250'} alt={item.title} className={newsStyles.newsImage} onError={e => { e.currentTarget.src = '/api/placeholder/400/250'; }} />
                          <div className={newsStyles.newsCategoryTag}><Tag className={newsStyles.tagIcon}/><span>{item.category || 'Общи'}</span></div>
                        </div>
                        <div className={newsStyles.newsContent}>
                          <div className={newsStyles.newsMeta}>
                            <span className={newsStyles.newsDate}>{formatNewsDate(item.date)}</span>
                            <span className={newsStyles.newsAuthor}>от {item.author || 'Администратор'}</span>
                          </div>
                          <h3 className={newsStyles.newsTitle}>{item.title}</h3>
                          <p className={newsStyles.newsExcerpt}>{item.excerpt}</p>
                          <div className={newsStyles.newsStats}>
                            <div className={newsStyles.newsStat}><Eye className={newsStyles.statIcon}/><span>{item.views || 0} преглеждания</span></div>
                            <div className={newsStyles.newsStat}>
                              <button className={newsStyles.likeButton} onClick={(e) => void handleLike(item.id, e)}>
                                <Heart className={`${newsStyles.statIcon} ${(item.likes || 0) > 0 ? newsStyles.liked : ''}`}/><span>{item.likes || 0} харесвания</span>
                              </button>
                            </div>
                          </div>
                          {item.tags?.length > 0 && <div className={newsStyles.newsTags}>{item.tags.slice(0, 3).map((t, i) => <span key={i} className={newsStyles.newsTag}>#{t}</span>)}</div>}
                          <button className={newsStyles.newsReadMore} onClick={e => { e.stopPropagation(); handleOpenNewsModal(item); }}>
                            <span>Прочети повече</span><ArrowRight className={newsStyles.readMoreIcon}/>
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              <div className={newsStyles.newsGrid}>
                {displayedNews.filter(n => !n.featured).map(item => (
                  <article key={item.id} className={newsStyles.newsCard} onClick={() => handleOpenNewsModal(item)}>
                    <div className={newsStyles.newsImageContainer}>
                      <img src={item.image || '/api/placeholder/400/250'} alt={item.title} className={newsStyles.newsImage} onError={e => { e.currentTarget.src = '/api/placeholder/400/250'; }} />
                      <div className={newsStyles.newsCategoryTag}><Tag className={newsStyles.tagIcon}/><span>{item.category || 'Общи'}</span></div>
                    </div>
                    <div className={newsStyles.newsContent}>
                      <div className={newsStyles.newsMeta}>
                        <span className={newsStyles.newsDate}>{formatNewsDate(item.date)}</span>
                        <span className={newsStyles.newsAuthor}>от {item.author || 'Администратор'}</span>
                      </div>
                      <h3 className={newsStyles.newsTitle}>{item.title}</h3>
                      <p className={newsStyles.newsExcerpt}>{item.excerpt}</p>
                      <div className={newsStyles.newsStats}>
                        <div className={newsStyles.newsStat}><Eye className={newsStyles.statIcon}/><span>{item.views || 0} преглеждания</span></div>
                        <div className={newsStyles.newsStat}>
                          <button className={newsStyles.likeButton} onClick={(e) => void handleLike(item.id, e)}>
                            <Heart className={`${newsStyles.statIcon} ${(item.likes || 0) > 0 ? newsStyles.liked : ''}`}/><span>{item.likes || 0} харесвания</span>
                          </button>
                        </div>
                      </div>
                      {item.tags?.length > 0 && <div className={newsStyles.newsTags}>{item.tags.slice(0, 2).map((t, i) => <span key={i} className={newsStyles.newsTag}>#{t}</span>)}</div>}
                      <button className={newsStyles.newsReadMore} onClick={e => { e.stopPropagation(); handleOpenNewsModal(item); }}>
                        <span>Прочети повече</span><ArrowRight className={newsStyles.readMoreIcon}/>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className={newsStyles.noNews}><Newspaper size={48}/><p>Няма новини за показване</p></div>
          )}

          {news.length > 4 && (
            <div className={newsStyles.newsToggleContainer}>
              <button className={newsStyles.newsToggleBtn} onClick={() => setShowAllNews(v => !v)}>
                {showAllNews ? <><ChevronUp className={newsStyles.toggleIcon}/><span>Покажи по-малко</span></> : <><ChevronDown className={newsStyles.toggleIcon}/><span>Покажи всички ({news.length})</span></>}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Book Animation ── */}
      <section className={`${bookAnimationStyles.homeBookAnimationSection} ${aboutStyles.darkThemeCompatible}`}>
        <div className="home-bookshelf-container">
          <div className={bookAnimationStyles.homeBookshelf}>
            <div className={bookAnimationStyles.homeBooks}>
              {[
                { url: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1581128232l/50214741.jpg',  title: 'Book 1' },
                { url: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1544204706l/42505366.jpg',  title: 'Book 2' },
                { url: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1541621322l/42201395.jpg',  title: 'Book 3' },
                { url: 'https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/1548518877l/43263520._SY475_.jpg', title: 'Book 4' },
              ].map((book, i) => (
                <div key={i} className={bookAnimationStyles.homeBook}>
                  <img
                    src={book.url}
                    alt={book.title}
                    className={bookAnimationStyles.homeBookImg}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Events ── */}
      <section className={eventsStyles.eventsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={typographyStyles.sectionHeaderTop}>
              <Calendar className={typographyStyles.sectionTitleIcon} />
              <h2 className={typographyStyles.handwrittenTitle}>Предстоящи Събития</h2>
            </div>
            <p className={styles.sectionSubtitle}>Присъединете се към различни дискусии и организирани културни събития.</p>
          </div>
          <div className={eventsStyles.calendarEventsGrid}>
            {displayedEvents.map((event, index) => {
              const calDate      = formatDateForCalendar(event.date);
              const colorVariants = [eventsStyles.calendarGreen, eventsStyles.calendarYellow, eventsStyles.calendarRed, eventsStyles.calendarBlue];
              const colorClass   = colorVariants[index % colorVariants.length];
              return (
                <div key={event.id} className={eventsStyles.calendarEventCard}>
                  <div className={`${eventsStyles.calendarDate} ${colorClass}`}>
                    <div className={eventsStyles.calendarDay}>{calDate.day}</div>
                    <div className={eventsStyles.calendarMonth}>{calDate.month}</div>
                    <div className={eventsStyles.calendarWeekday}>{calDate.weekday}</div>
                  </div>
                  <div className={eventsStyles.calendarEventContent}>
                    <div className={eventsStyles.eventHeaderCalendar}>
                      <h3 className={eventsStyles.eventTitleCalendar}>{event.title}</h3>
                      <div className={eventsStyles.eventTimeBadge}><Clock className={eventsStyles.timeBadgeIcon}/><span>{event.time} - {event.endTime}</span></div>
                    </div>
                    <div className={eventsStyles.eventDescriptionContainer}>
                      <div className={`${eventsStyles.eventDescriptionCalendar} ${eventsStyles.truncatedDescription}`}>{truncateText(event.description, 150)}</div>
                      <div className={eventsStyles.viewMoreContainer}>
                        <button className={`${eventsStyles.viewMoreBtn} ${colorClass}`} onClick={() => handleViewEventDetails(event, index)}>
                          <EyeIcon className={eventsStyles.viewMoreIcon}/><span>Виж повече</span>
                        </button>
                      </div>
                    </div>
                    <div className={eventsStyles.eventDetailsCalendar}>
                      <div className={eventsStyles.eventDetailRow}><MapPin className={eventsStyles.detailIconCalendar}/><span className={eventsStyles.detailTextCalendar}>{event.location}</span></div>
                      <div className={eventsStyles.eventDetailRow}><User className={eventsStyles.detailIconCalendar}/><span className={eventsStyles.detailTextCalendar}>{event.organizer}</span></div>
                    </div>
                    <div className={eventsStyles.eventFooterCalendar}>
                      <div className={eventsStyles.participantsSection}>
                        <div className={eventsStyles.participantsInfo}>
                          <Users className={eventsStyles.participantsIcon}/>
                          <span className={eventsStyles.participantsText}>{event.currentParticipants} / {event.maxParticipants} записани</span>
                          {getAvailableSpots(event) > 0 && <span className={eventsStyles.spotsAvailable}>{getAvailableSpots(event)} свободни места</span>}
                        </div>
                      </div>
                      <div className={eventsStyles.eventActions}>
                        <button className={`${eventsStyles.eventRegisterBtn} ${colorClass} ${isEventFull(event) ? eventsStyles.eventBtnDisabled : ''}`} disabled={isEventFull(event)} onClick={() => handleEventRegistration(event)}>
                          <span>{isEventFull(event) ? 'Събитието е пълно' : 'Запиши се'}</span>
                          {!isEventFull(event) && <ArrowRight className={eventsStyles.registerIcon}/>}
                        </button>
                        <button className={eventsStyles.addToCalendarBtn} onClick={e => { e.stopPropagation(); handleAddToGoogleCalendar(event); }} title="Добави в Google Calendar">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className={eventsStyles.calendarBtnIcon}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {events.length === 0 && <div className={eventsStyles.noEvents}><Calendar className={eventsStyles.noEventsIcon}/><p>В момента няма предстоящи събития</p></div>}

          {events.length > 4 && (
            <div className={eventsStyles.eventsToggleContainer}>
              <button className={eventsStyles.eventsToggleBtn} onClick={() => setShowAllEvents(v => !v)}>
                {showAllEvents ? <><ChevronUp className={eventsStyles.toggleIcon}/><span>Покажи по-малко</span></> : <><ChevronDown className={eventsStyles.toggleIcon}/><span>Покажи всички ({events.length})</span></>}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={testimonialsStyles.testimonialsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={typographyStyles.handwrittenTitle}>Какво казват нашите читатели?</h2>
            <p className={styles.sectionSubtitle}>Отзиви от ученици, учители и родители</p>
          </div>
          <div className={testimonialsStyles.testimonialsGrid}>
            {testimonials.map((t, i) => (
              <div key={i} className={testimonialsStyles.testimonialCard}>
                <Quote className={testimonialsStyles.testimonialQuote}/>
                {renderStars(t.rating)}
                <p className={testimonialsStyles.testimonialContent}>"{t.content}"</p>
                <div className={testimonialsStyles.testimonialAuthor}>
                  <div className={testimonialsStyles.authorName}>{t.name}</div>
                  <div className={testimonialsStyles.authorRole}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className={`${aboutStyles.aboutSection} ${aboutStyles.darkThemeCompatible}`}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <h2 className={typographyStyles.handwrittenTitle}>За библиотеката</h2>
            <p className={styles.sectionSubtitle}>Нашата мисия е да осигурим среда, в която учениците да учат и да откриват нови светове.</p>
          </div>
          <div className={aboutStyles.aboutContent}>
            <div className={aboutStyles.aboutText}>
              <div className={aboutStyles.aboutHeader}><h3 className={aboutStyles.aboutSubtitle}>История и мисия</h3></div>
              <div className={aboutStyles.aboutDescription}>
                <p>Нашата библиотека е информационен и административен център на ПГЕЕ-гр. Пловдив, предоставящ модерни ресурси и подкрепа.</p>
                <p>Основана преди 20 години, тази институция се превърна в любимо място за ученици и учители. Постоянно обогатяваме колекцията с нови заглавия и съвременни ресурси.</p>
                <p>Организираме редовни събития, литературни четения и работилници, вдъхновяващи любопитството и насърчаващи любовта към книгата.</p>
                <p>Вярваме, че всяка книга е врата към нов свят, и нашата мисия е да помагаме на всеки ученик да открие своя път към знанието.</p>
              </div>
              <div className={aboutStyles.aboutButtons}>
                <button className={`${buttonStyles.btn} ${buttonStyles.btnPrimary} ${aboutStyles.aboutBtn}`}><Users className={buttonStyles.btnIcon}/><span>Запознай се с екипа</span></button>
                <button className={`${buttonStyles.btn} ${buttonStyles.btnOutline} ${aboutStyles.aboutBtn}`}><MapPin className={buttonStyles.btnIcon}/><span>Свържи се с нас</span></button>
              </div>
            </div>
            <div className={aboutStyles.aboutVisual}>
              <div className={aboutStyles.imageContainer}>
                <img src={library} alt="Библиотеката" className={aboutStyles.aboutImage}/>
                <div className={aboutStyles.imageOverlay}><div className={aboutStyles.overlayContent}><BookOpen className={aboutStyles.overlayIcon}/><span>Вашата библиотека</span></div></div>
              </div>
              <div className={aboutStyles.visualStats}>
                {[{n:'20+',l:'Години опит'},{n:'10k+',l:'Книги'},{n:'2.5k+',l:'Читатели'}].map((s,i)=>(
                  <div key={i} className={aboutStyles.visualStat}>
                    <div className={aboutStyles.statNumber}>{s.n}</div>
                    <div className={aboutStyles.statLabel}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Event Modal ── */}
      {selectedEventModal && (
        <div className={modalStyles.eventModalOverlay} onClick={() => setSelectedEventModal(null)}>
          <div className={modalStyles.eventModal} onClick={e => e.stopPropagation()}>
            <div className={modalStyles.eventModalHeader}>
              <div className={modalStyles.eventModalTitle}>
                <div className={`${modalStyles.eventModalDateBadge} ${selectedEventModal.colorClass}`}>
                  <div className={modalStyles.eventModalDateDay}>{selectedEventModal.calendarDate.day}</div>
                  <div className={modalStyles.eventModalDateMonth}>{selectedEventModal.calendarDate.month}</div>
                  <div className={modalStyles.eventModalDateWeekday}>{selectedEventModal.calendarDate.weekday}</div>
                </div>
                <div className={modalStyles.eventModalTitleText}>
                  <h3>{selectedEventModal.event.title}</h3>
                  <div className={modalStyles.eventModalTime}><Clock size={16}/><span>{selectedEventModal.event.time} - {selectedEventModal.event.endTime}</span></div>
                </div>
              </div>
              <button className={modalStyles.eventModalClose} onClick={() => setSelectedEventModal(null)}><X size={24}/></button>
            </div>
            <div className={modalStyles.eventModalContent}>
              <div className={modalStyles.eventModalDetailsGrid}>
                {[
                  { Icon:MapPin,   label:'Място',      value:selectedEventModal.event.location },
                  { Icon:User,     label:'Организатор', value:selectedEventModal.event.organizer },
                  { Icon:Calendar, label:'Дата',        value:formatFullDate(selectedEventModal.event.date) },
                ].map(({Icon,label,value}) => (
                  <div key={label} className={modalStyles.eventModalDetail}>
                    <Icon className={modalStyles.eventModalDetailIcon}/>
                    <div className={modalStyles.eventModalDetailContent}>
                      <div className={modalStyles.eventModalDetailLabel}>{label}</div>
                      <div className={modalStyles.eventModalDetailValue}>{value}</div>
                    </div>
                  </div>
                ))}
                <div className={modalStyles.eventModalDetail}>
                  <Users className={modalStyles.eventModalDetailIcon}/>
                  <div className={modalStyles.eventModalDetailContent}>
                    <div className={modalStyles.eventModalDetailLabel}>Участници</div>
                    <div className={modalStyles.eventModalDetailValue}>
                      {selectedEventModal.event.currentParticipants} / {selectedEventModal.event.maxParticipants}
                      {getAvailableSpots(selectedEventModal.event) > 0 && <span className={modalStyles.eventModalAvailableSpots}>({getAvailableSpots(selectedEventModal.event)} свободни)</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className={modalStyles.eventModalDescription}>
                <h4 className={modalStyles.eventModalDescriptionTitle}>Описание</h4>
                <div className={modalStyles.eventModalDescriptionContent} dangerouslySetInnerHTML={{ __html: selectedEventModal.event.description }}/>
              </div>
              <div className={modalStyles.eventModalRequirements}>
                <h4 className={modalStyles.eventModalRequirementsTitle}><Info size={20}/><span>Изисквания</span></h4>
                <div className={modalStyles.eventModalRequirementsList}>
                  <div className={modalStyles.eventModalRequirement}><CheckCircle size={16}/><span>Подходящо за: {selectedEventModal.event.allowedRoles.join(', ')}</span></div>
                  <div className={modalStyles.eventModalRequirement}><AlertCircle size={16}/><span>Записването се извършва в библиотеката или чрез системата</span></div>
                </div>
              </div>
              <div className={modalStyles.eventModalFooter}>
                <button className={modalStyles.eventModalCloseBtn} onClick={() => setSelectedEventModal(null)}>Затвори</button>
                <button
                  className={`${modalStyles.eventModalRegisterBtn} ${selectedEventModal.colorClass} ${!user || isEventFull(selectedEventModal.event) ? modalStyles.disabled : ''}`}
                  disabled={!user || isEventFull(selectedEventModal.event)}
                  onClick={() => handleEventRegistration(selectedEventModal.event)}
                >
                  {!user ? 'Влезте, за да се запишете' : isEventFull(selectedEventModal.event) ? 'Събитието е пълно' : 'Запиши се'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── News Modal ── */}
      {selectedNews && (
        <div className={modalStyles.eventModalOverlay} onClick={handleCloseNewsModal}>
          <div className={`${modalStyles.eventModal} ${modalStyles.newsModal}`} onClick={e => e.stopPropagation()}>
            <div className={modalStyles.eventModalHeader}>
              <div className={modalStyles.eventModalTitle}>
                <div className={modalStyles.newsModalCategoryBadge}><Tag size={16}/><span>{selectedNews.category}</span></div>
                <div className={modalStyles.eventModalTitleText}>
                  <h3>{selectedNews.title}</h3>
                  <div className={modalStyles.eventModalTime}><Calendar size={16}/><span>{formatNewsDate(selectedNews.date)}</span></div>
                </div>
              </div>
              <button className={modalStyles.eventModalClose} onClick={handleCloseNewsModal}><X size={24}/></button>
            </div>
            <div className={modalStyles.eventModalContent}>
              {(() => {
                const imgs = [selectedNews.image, ...(selectedNews.images || [])].filter(Boolean);
                return imgs.length > 0 ? (
                  <div className={modalStyles.newsGallery}>
                    <h4 className={modalStyles.galleryTitle}><ImageIcon size={20}/><span>Галерия</span></h4>
                    <div className={modalStyles.galleryContainer}>
                      <div className={modalStyles.galleryGrid}>
                        {imgs.map((img, i) => (
                          <div key={i} className={modalStyles.galleryItem}>
                            <img src={img} alt={`${selectedNews.title} - ${i + 1}`} className={modalStyles.galleryImage} onError={e => { e.currentTarget.src = '/api/placeholder/400/250'; }}/>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className={modalStyles.eventModalDescription}>
                <h4 className={modalStyles.eventModalDescriptionTitle}>Съдържание</h4>
                <div className={modalStyles.eventModalDescriptionContent} dangerouslySetInnerHTML={{ __html: selectedNews.content }}/>
              </div>
              <div className={modalStyles.newsStatsModal}>
                <div className={modalStyles.newsStatModal}><Eye className={modalStyles.statIcon}/><span>{selectedNews.views || 0} преглеждания</span></div>
                <div className={modalStyles.newsStatModal}>
                  <button className={modalStyles.likeButtonModal} onClick={(e) => void handleLike(selectedNews.id, e)}>
                    <Heart className={`${modalStyles.statIcon} ${(selectedNews.likes || 0) > 0 ? modalStyles.liked : ''}`}/><span>{selectedNews.likes || 0} харесвания</span>
                  </button>
                </div>
              </div>
              {selectedNews.tags?.length > 0 && (
                <div className={modalStyles.newsTagsModal}>
                  <div className={modalStyles.tagsTitle}><Tag size={16}/><span>Тагове:</span></div>
                  <div className={modalStyles.tagsList}>{selectedNews.tags.map((t, i) => <span key={i} className={modalStyles.newsTagModal}>#{t}</span>)}</div>
                </div>
              )}
              <div className={modalStyles.eventModalFooter}>
                <button className={modalStyles.eventModalCloseBtn} onClick={handleCloseNewsModal}>Затвори</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;