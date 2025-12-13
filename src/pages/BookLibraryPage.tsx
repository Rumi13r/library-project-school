import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Book, 
  Search, 
  Filter, 
  Eye, 
  Heart, 
  Share2,
  Star,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Globe,
  Award,
  TrendingUp,
  Calendar,
  BookOpen,
  MapPin,
  Copy,
  CheckCircle,
  Users,
  Home,
  Library,
  Download,
  FileText,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './BookLibraryPage.css';

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  isbn: string;
  publisher: string;
  year: number;
  pages: number;
  language: string;
  edition: string;
  coverType: 'hard' | 'soft';
  location: string;
  shelfNumber: string;
  callNumber: string;
  copies: number;
  availableCopies: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  status: 'available' | 'borrowed' | 'reserved' | 'maintenance';
  rating: number;
  ratingsCount: number;
  views: number;
  featured: boolean;
  createdAt: any;
  lastUpdated: any;
  genres: string[];
  ageRecommendation?: string;
  awards?: string[];
  summary?: string;
  tableOfContents?: string[];
  relatedBooks?: string[];
  digitalVersion?: {
    available: boolean;
    format?: string;
    url?: string;
  };
  borrowPeriod: number; // в дни
  maxRenewals: number;
  reservationQueue: number;
  waitingList: number[];
}

interface Reservation {
  bookId: string;
  userId: string;
  reservedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'fulfilled';
}

const BookLibraryPage: React.FC = () => {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showMapView, setShowMapView] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchLibraryBooks();
    if (user) {
      fetchUserReservations();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, categoryFilter, statusFilter, languageFilter, genreFilter, conditionFilter, sortBy, showOnlyAvailable, locationFilter]);

  const fetchLibraryBooks = async () => {
    try {
      setLoading(true);
      const booksQuery = query(
        collection(db, "libraryBooks"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(booksQuery);
      const booksData: LibraryBook[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as LibraryBook));

      setBooks(booksData);
      extractFiltersData(booksData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching library books:", error);
      // Fallback данни за демонстрация
      const fallbackBooks: LibraryBook[] = [
        {
          id: '1',
          title: 'Под игото',
          author: 'Иван Вазов',
          description: 'Класическият български роман за Априлското въстание. История за българския народ по време на Османското владичество.',
          category: 'Българска литература',
          subcategory: 'Исторически роман',
          tags: ['класика', 'история', 'българска литература', 'вазов', 'роман'],
          isbn: '9789540912345',
          publisher: 'Български писател',
          year: 1894,
          pages: 450,
          language: 'Български',
          edition: '12-то издание',
          coverType: 'hard',
          location: 'Основен отдел',
          shelfNumber: 'БГ ЛИТ A3',
          callNumber: '891.811 V39',
          copies: 5,
          availableCopies: 2,
          condition: 'good',
          status: 'available',
          rating: 4.8,
          ratingsCount: 345,
          views: 1250,
          featured: true,
          createdAt: new Date('2024-01-01'),
          lastUpdated: new Date('2024-02-01'),
          genres: ['роман', 'исторически', 'класика'],
          ageRecommendation: '14+',
          awards: ['Национална награда за литература'],
          summary: 'Романът разказва за подготовката и провеждането на Априлското въстание през 1876 г.',
          tableOfContents: ['Пролог', 'Подготовка', 'Въстание', 'Последици', 'Епилог'],
          relatedBooks: ['Немили-недраги', 'Една българка'],
          digitalVersion: {
            available: true,
            format: 'PDF',
            url: 'https://chitanka.info/book/1'
          },
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 3,
          waitingList: []
        },
        {
          id: '2',
          title: 'Железният светилник',
          author: 'Димитър Талев',
          description: 'Епична сага за българския народ през вековете. Първа част от тетралогията "Български хроники".',
          category: 'Българска литература',
          subcategory: 'Исторически роман',
          tags: ['талев', 'сага', 'история', 'български хроники', 'роман'],
          isbn: '9789540912352',
          publisher: 'Народна култура',
          year: 1952,
          pages: 680,
          language: 'Български',
          edition: '8-мо издание',
          coverType: 'hard',
          location: 'Основен отдел',
          shelfNumber: 'БГ ЛИТ A4',
          callNumber: '891.811 T34',
          copies: 4,
          availableCopies: 1,
          condition: 'fair',
          status: 'available',
          rating: 4.9,
          ratingsCount: 420,
          views: 1800,
          featured: true,
          createdAt: new Date('2024-01-15'),
          lastUpdated: new Date('2024-02-15'),
          genres: ['роман', 'исторически', 'сага'],
          ageRecommendation: '16+',
          awards: ['Димитровска награда'],
          summary: 'Първа част от известната тетралогия, проследяваща историята на българския народ.',
          borrowPeriod: 21,
          maxRenewals: 1,
          reservationQueue: 5,
          waitingList: []
        },
        {
          id: '3',
          title: 'Тютюн',
          author: 'Димитър Димов',
          description: 'Социален роман за живота на тютюневите работници в България преди Втората световна война.',
          category: 'Българска литература',
          subcategory: 'Социален роман',
          tags: ['димов', 'социален роман', 'тютюн', 'работически клас'],
          isbn: '9789540912369',
          publisher: 'Български писател',
          year: 1951,
          pages: 520,
          language: 'Български',
          edition: '6-то издание',
          coverType: 'soft',
          location: 'Основен отдел',
          shelfNumber: 'БГ ЛИТ A5',
          callNumber: '891.811 D56',
          copies: 3,
          availableCopies: 0,
          condition: 'good',
          status: 'borrowed',
          rating: 4.7,
          ratingsCount: 310,
          views: 950,
          featured: false,
          createdAt: new Date('2024-01-20'),
          lastUpdated: new Date('2024-02-20'),
          genres: ['роман', 'социален'],
          ageRecommendation: '16+',
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 2,
          waitingList: []
        },
        {
          id: '4',
          title: 'Време разделно',
          author: 'Антон Дончев',
          description: 'Исторически роман за насилственото покръстване на българите през 17 век.',
          category: 'Българска литература',
          subcategory: 'Исторически роман',
          tags: ['дончев', 'исторически', 'покръстване', 'религия'],
          isbn: '9789540912376',
          publisher: 'Народна култура',
          year: 1964,
          pages: 380,
          language: 'Български',
          edition: '10-то издание',
          coverType: 'hard',
          location: 'Основен отдел',
          shelfNumber: 'БГ ЛИТ A6',
          callNumber: '891.811 D66',
          copies: 6,
          availableCopies: 4,
          condition: 'new',
          status: 'available',
          rating: 4.6,
          ratingsCount: 280,
          views: 820,
          featured: true,
          createdAt: new Date('2024-02-01'),
          lastUpdated: new Date('2024-03-01'),
          genres: ['роман', 'исторически'],
          ageRecommendation: '15+',
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 1,
          waitingList: []
        },
        {
          id: '5',
          title: '1984',
          author: 'Джордж Оруел',
          description: 'Дистопичен роман за тоталитарно общество, цензура и контрол над мисълта.',
          category: 'Чуждоезична литература',
          subcategory: 'Дистопия',
          tags: ['оруел', 'дистопия', 'тоталитаризъм', 'класика'],
          isbn: '9780141036144',
          publisher: 'Penguin Books',
          year: 1949,
          pages: 328,
          language: 'Английски',
          edition: 'Първо издание на български',
          coverType: 'soft',
          location: 'Чуждестранна литература',
          shelfNumber: 'EN LIT B2',
          callNumber: '823.912 O79',
          copies: 8,
          availableCopies: 5,
          condition: 'good',
          status: 'available',
          rating: 4.8,
          ratingsCount: 560,
          views: 2100,
          featured: true,
          createdAt: new Date('2024-01-10'),
          lastUpdated: new Date('2024-02-10'),
          genres: ['роман', 'дистопия', 'политически'],
          ageRecommendation: '16+',
          digitalVersion: {
            available: true,
            format: 'EPUB',
            url: 'https://gutenberg.org/ebooks/1984'
          },
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 4,
          waitingList: []
        },
        {
          id: '6',
          title: 'Гордост и предразсъдъци',
          author: 'Джейн Остин',
          description: 'Класически английски роман за любовта, социалния статус и семейните отношения.',
          category: 'Чуждоезична литература',
          subcategory: 'Класика',
          tags: ['остин', 'романтичен', 'класика', 'английска литература'],
          isbn: '9780141439518',
          publisher: 'Penguin Classics',
          year: 1813,
          pages: 432,
          language: 'Английски',
          edition: 'Илюстрирано издание',
          coverType: 'hard',
          location: 'Чуждестранна литература',
          shelfNumber: 'EN LIT B3',
          callNumber: '823.7 A93',
          copies: 5,
          availableCopies: 3,
          condition: 'good',
          status: 'available',
          rating: 4.7,
          ratingsCount: 490,
          views: 1750,
          featured: false,
          createdAt: new Date('2024-01-25'),
          lastUpdated: new Date('2024-02-25'),
          genres: ['роман', 'романтичен', 'класика'],
          ageRecommendation: '14+',
          borrowPeriod: 21,
          maxRenewals: 1,
          reservationQueue: 2,
          waitingList: []
        },
        {
          id: '7',
          title: 'Физика за 10. клас',
          author: 'Проф. Иван Петров',
          description: 'Пълен учебник по физика за средното образование, съответстващ на държавните образователни стандарти.',
          category: 'Учебна литература',
          subcategory: 'Физика',
          tags: ['учебник', 'физика', '10 клас', 'образование'],
          isbn: '9789540123456',
          publisher: 'Просвета',
          year: 2023,
          pages: 280,
          language: 'Български',
          edition: '2023 издание',
          coverType: 'soft',
          location: 'Учебен отдел',
          shelfNumber: 'УЧЕБНИЦИ F1',
          callNumber: '530 P48',
          copies: 15,
          availableCopies: 8,
          condition: 'new',
          status: 'available',
          rating: 4.5,
          ratingsCount: 180,
          views: 750,
          featured: false,
          createdAt: new Date('2024-02-10'),
          lastUpdated: new Date('2024-03-10'),
          genres: ['учебник', 'наука'],
          borrowPeriod: 30,
          maxRenewals: 0,
          reservationQueue: 12,
          waitingList: []
        },
        {
          id: '8',
          title: 'Математика за матура',
          author: 'Колектив',
          description: 'Изчерпателен сборник задачи и решения за матура по математика.',
          category: 'Учебна литература',
          subcategory: 'Математика',
          tags: ['математика', 'матура', 'задачи', 'подготовка'],
          isbn: '9789540123463',
          publisher: 'Образователни ресурси',
          year: 2023,
          pages: 210,
          language: 'Български',
          edition: 'Обновено издание',
          coverType: 'soft',
          location: 'Учебен отдел',
          shelfNumber: 'УЧЕБНИЦИ M2',
          callNumber: '510 M38',
          copies: 12,
          availableCopies: 4,
          condition: 'good',
          status: 'available',
          rating: 4.4,
          ratingsCount: 190,
          views: 680,
          featured: true,
          createdAt: new Date('2024-02-15'),
          lastUpdated: new Date('2024-03-15'),
          genres: ['учебник', 'задачи'],
          borrowPeriod: 21,
          maxRenewals: 1,
          reservationQueue: 8,
          waitingList: []
        },
        {
          id: '9',
          title: 'Немили-недраги',
          author: 'Иван Вазов',
          description: 'Разказ за братя, разделени от различното си отношение към освободителните борби.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'братя', 'освобождение'],
          isbn: '9789540912383',
          publisher: 'Българска класика',
          year: 1884,
          pages: 52,
          language: 'Български',
          edition: 'Съвременно издание',
          coverType: 'soft',
          location: 'Кратка проза',
          shelfNumber: 'БГ РАЗКАЗИ V1',
          callNumber: '891.811 V39r',
          copies: 7,
          availableCopies: 5,
          condition: 'fair',
          status: 'available',
          rating: 4.6,
          ratingsCount: 156,
          views: 890,
          featured: false,
          createdAt: new Date('2024-02-20'),
          lastUpdated: new Date('2024-03-20'),
          genres: ['разказ', 'исторически'],
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 0,
          waitingList: []
        },
        {
          id: '10',
          title: 'Гръмна гръм',
          author: 'Рей Бредбъри',
          description: 'Класически научнофантастичен разказ за пътуване във времето.',
          category: 'Чуждоезична литература',
          subcategory: 'Фантастика',
          tags: ['бредбъри', 'фантастика', 'времеви пътувания'],
          isbn: '9789540912390',
          publisher: 'Наука и изкуство',
          year: 1952,
          pages: 12,
          language: 'Български',
          edition: 'Сборник',
          coverType: 'soft',
          location: 'Фантастика',
          shelfNumber: 'ФАНТАСТИКА B1',
          callNumber: '813.54 B81',
          copies: 6,
          availableCopies: 3,
          condition: 'good',
          status: 'available',
          rating: 4.9,
          ratingsCount: 1240,
          views: 5120,
          featured: true,
          createdAt: new Date('2024-03-01'),
          lastUpdated: new Date('2024-04-01'),
          genres: ['разказ', 'фантастика', 'научна фантастика'],
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 2,
          waitingList: []
        }
      ];
      
      setBooks(fallbackBooks);
      extractFiltersData(fallbackBooks);
      setLoading(false);
    }
  };

  const fetchUserReservations = async () => {
    if (!user) return;
    
    try {
      // Имитация на заявка за резервации
      const mockReservations: Reservation[] = [
        {
          bookId: '3',
          userId: user.uid,
          reservedAt: new Date('2024-03-20'),
          expiresAt: new Date('2024-04-03'),
          status: 'active'
        },
        {
          bookId: '8',
          userId: user.uid,
          reservedAt: new Date('2024-03-25'),
          expiresAt: new Date('2024-04-08'),
          status: 'active'
        }
      ];
      
      setUserReservations(mockReservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const extractFiltersData = (booksData: LibraryBook[]) => {
    const categories = new Set<string>();
    const languages = new Set<string>();
    const genres = new Set<string>();
    const locations = new Set<string>();
    
    booksData.forEach(book => {
      categories.add(book.category);
      languages.add(book.language);
      locations.add(book.location);
      book.genres?.forEach(genre => genres.add(genre));
    });
    
    setAvailableCategories(Array.from(categories).sort());
    setAvailableLanguages(Array.from(languages).sort());
    setAvailableGenres(Array.from(genres).sort());
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        book.isbn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(book => book.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(book => book.status === statusFilter);
    }

    // Language filter
    if (languageFilter !== 'all') {
      filtered = filtered.filter(book => book.language === languageFilter);
    }

    // Genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(book => book.genres.includes(genreFilter));
    }

    // Condition filter
    if (conditionFilter !== 'all') {
      filtered = filtered.filter(book => book.condition === conditionFilter);
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(book => book.location === locationFilter);
    }

    // Show only available
    if (showOnlyAvailable) {
      filtered = filtered.filter(book => book.availableCopies > 0);
    }

    // Sorting
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
      case 'author':
        filtered.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'year':
        filtered.sort((a, b) => b.year - a.year);
        break;
      case 'available':
        filtered.sort((a, b) => b.availableCopies - a.availableCopies);
        break;
    }

    setFilteredBooks(filtered);
  };

  const handleBookClick = (book: LibraryBook) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const handleReserveBook = async (book: LibraryBook) => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/library',
          message: 'Моля, влезте в профила си, за да резервирате книга.' 
        }
      });
      return;
    }

    if (book.availableCopies === 0) {
      alert('Няма налични копия за резервация. Можете да се запишете в списъка за изчакване.');
      return;
    }

    try {
      // Тук ще бъде логиката за резервация в базата данни
      alert(`Книгата "${book.title}" е резервирана успешно!`);
      
      // Обновяваме резервациите на потребителя
      const newReservation: Reservation = {
        bookId: book.id,
        userId: user.uid,
        reservedAt: new Date(),
        expiresAt: new Date(Date.now() + book.borrowPeriod * 24 * 60 * 60 * 1000),
        status: 'active'
      };
      
      setUserReservations(prev => [...prev, newReservation]);
      
      // Обновяваме наличните копия (в реално приложение това ще е в базата данни)
      setBooks(prev => prev.map(b => 
        b.id === book.id 
          ? { ...b, availableCopies: b.availableCopies - 1, reservationQueue: b.reservationQueue + 1 }
          : b
      ));
      
    } catch (error) {
      console.error("Error reserving book:", error);
      alert('Възникна грешка при резервацията. Моля, опитайте отново.');
    }
  };

  const handleAddToWishlist = (book: LibraryBook) => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/library',
          message: 'Моля, влезте в профила си, за да добавите книга в списъка с желания.' 
        }
      });
      return;
    }

    alert(`Книгата "${book.title}" е добавена към списъка с желания!`);
    // Тук ще бъде логиката за добавяне в базата данни
  };

  const handleShareBook = (book: LibraryBook) => {
    if (navigator.share) {
      navigator.share({
        title: `${book.title} - ${book.author}`,
        text: `Намерих тази книга в библиотеката: ${book.title} от ${book.author}`,
        url: window.location.href
      });
    } else {
      const shareText = `${book.title} от ${book.author}\n\n${book.description.substring(0, 150)}...\n\nСвободни копия: ${book.availableCopies}\nМестоположение: ${book.location}, Рафт: ${book.shelfNumber}`;
      navigator.clipboard.writeText(shareText);
      alert('Информацията за книгата е копирана в клипборда!');
    }
  };

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBookId(expandedBookId === bookId ? null : bookId);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'borrowed': return '#f59e0b';
      case 'reserved': return '#3b82f6';
      case 'maintenance': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCoverTypeText = (coverType: string) => {
    return coverType === 'hard' ? 'Твърди корици' : 'Меки корици';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setLanguageFilter('all');
    setGenreFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
    setShowOnlyAvailable(false);
    setSortBy('newest');
  };

  const getReservationStatus = (bookId: string) => {
    const reservation = userReservations.find(r => r.bookId === bookId);
    if (!reservation) return null;
    
    const now = new Date();
    if (reservation.expiresAt < now) return 'expired';
    return reservation.status;
  };
console.log(getReservationStatus);
  const isBookReservedByUser = (bookId: string) => {
    return userReservations.some(r => r.bookId === bookId && r.status === 'active');
  };

  const copyCallNumber = (callNumber: string) => {
    navigator.clipboard.writeText(callNumber);
    alert(`Сигнатурата ${callNumber} е копирана в клипборда!`);
  };

  if (loading) {
    return (
      <div className="book-library-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на библиотеката...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="book-library-page">
      <div className="book-library-container">
        {/* Header */}
        <div className="book-library-header">
          <div className="book-library-title-section">
            <div className="title-icon-wrapper library">
              <Library className="book-library-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Библиотека - Физически книги</h1>
              <p className="book-library-subtitle">
                Разгледайте, резервирайте и вземайте книги от нашата физическа библиотека
              </p>
            </div>
          </div>

          <div className="book-library-stats">
            <div className="stat-item">
              <div className="stat-info">
                <span className="stat-number">{books.length}</span>
                <span className="stat-label">Общо книги</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-info">
                <span className="stat-number">
                  {books.reduce((sum, book) => sum + book.availableCopies, 0)}
                </span>
                <span className="stat-label">Налични копия</span>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-info">
                <span className="stat-number">
                  {books.reduce((sum, book) => sum + book.reservationQueue, 0)}
                </span>
                <span className="stat-label">Активни резервации</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Reservations */}
        {user && userReservations.length > 0 && (
          <div className="user-reservations">
            <h3 className="reservations-title">
              <Calendar className="title-icon" />
              Вашите активни резервации
            </h3>
            <div className="reservations-grid">
              {userReservations.map((reservation, index) => {
                const book = books.find(b => b.id === reservation.bookId);
                if (!book) return null;
                
                return (
                  <div key={index} className="reservation-card">
                    <div className="reservation-book-info">
                      <h4>{book.title}</h4>
                      <p className="reservation-author">{book.author}</p>
                    </div>
                    <div className="reservation-details">
                      <div className="reservation-date">
                        <Calendar size={14} />
                        <span>
                          Резервирана: {reservation.reservedAt.toLocaleDateString('bg-BG')}
                        </span>
                      </div>
                      <div className="reservation-expiry">
                        <Clock size={14} />
                        <span>
                          Изтича: {reservation.expiresAt.toLocaleDateString('bg-BG')}
                        </span>
                      </div>
                    </div>
                    <div className="reservation-actions">
                      <button className="view-book-btn" onClick={() => handleBookClick(book)}>
                        Виж детайли
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="book-library-filters">
          <div className="main-search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсете книги, автори, ISBN, теми..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-info">
              <Book size={16} />
              <span>{books.length} книги в библиотеката</span>
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
                <CheckCircle size={16} />
                Статус
              </label>
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Всички статуси</option>
                <option value="available">Налични</option>
                <option value="borrowed">Взети</option>
                <option value="reserved">Резервирани</option>
                <option value="maintenance">В ремонт</option>
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
                <Tag size={16} />
                Жанр
              </label>
              <select 
                className="filter-select"
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
              >
                <option value="all">Всички жанрове</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <MapPin size={16} />
                Местоположение
              </label>
              <select 
                className="filter-select"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="all">Всички локации</option>
                <option value="Основен отдел">Основен отдел</option>
                <option value="Чуждестранна литература">Чуждестранна литература</option>
                <option value="Учебен отдел">Учебен отдел</option>
                <option value="Кратка проза">Кратка проза</option>
                <option value="Фантастика">Фантастика</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <TrendingUp size={16} />
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
                <option value="year">Година (ново-старо)</option>
                <option value="available">Наличност</option>
              </select>
            </div>

            <div className="filter-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className="availability-checkbox"
                />
                <span className="checkbox-text">Покажи само налични</span>
              </label>
            </div>

            {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || 
              languageFilter !== 'all' || genreFilter !== 'all' || 
              conditionFilter !== 'all' || locationFilter !== 'all' || 
              showOnlyAvailable || sortBy !== 'newest') && (
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Изчисти всички филтри
              </button>
            )}
          </div>
        </div>

        {/* Map View Toggle */}
        <div className="view-toggle">
          <button 
            className={`view-toggle-btn ${!showMapView ? 'active' : ''}`}
            onClick={() => setShowMapView(false)}
          >
            <Book className="view-icon" />
            <span>Списък</span>
          </button>
          <button 
            className={`view-toggle-btn ${showMapView ? 'active' : ''}`}
            onClick={() => setShowMapView(true)}
          >
            <MapPin className="view-icon" />
            <span>Карта на библиотеката</span>
          </button>
        </div>

        {/* Books Content */}
        <div className="book-library-content">
          {!showMapView ? (
            <>
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
                  </div>

                  <div className="books-grid">
                    {filteredBooks.map((book) => {
                      const isExpanded = expandedBookId === book.id;
                      const isReserved = isBookReservedByUser(book.id);
                      
                      return (
                        <div 
                          key={book.id} 
                          className={`book-card ${book.featured ? 'featured' : ''}`}
                        >
                          {/* Book Header */}
                          <div className="book-header">
                            <div className="book-thumbnail">
                              <div className="book-image-fallback">
                                <Book className="fallback-icon" />
                                {book.featured && (
                                  <div className="featured-badge">
                                    <Award size={14} />
                                    <span>Препоръчано</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="book-main-info">
                              <div className="book-title-section">
                                <h3 
                                  className="book-title"
                                  onClick={() => handleBookClick(book)}
                                >
                                  {book.title}
                                </h3>
                                <p className="book-author">{book.author}</p>
                              </div>

                              <div className="book-meta">
                                <div className="book-status" style={{ color: getStatusColor(book.status) }}>
                                  <CheckCircle size={14} />
                                  <span>
                                    {book.status === 'available' && 'Налична'}
                                    {book.status === 'borrowed' && 'Взета'}
                                    {book.status === 'reserved' && 'Резервирана'}
                                    {book.status === 'maintenance' && 'В ремонт'}
                                  </span>
                                </div>
                                
                                <div className="book-availability">
                                  <Copy size={14} />
                                  <span>{book.availableCopies}/{book.copies} копия</span>
                                </div>

                                <div className="book-location">
                                  <MapPin size={14} />
                                  <span>{book.location}</span>
                                </div>

                                <div className="book-condition" style={{ color: getConditionColor(book.condition) }}>
                                  <span>
                                    {book.condition === 'new' && 'Нова'}
                                    {book.condition === 'good' && 'Добра'}
                                    {book.condition === 'fair' && 'Задоволителна'}
                                    {book.condition === 'poor' && 'Лоша'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Book Description */}
                          <div className="book-description">
                            <p>{book.description}</p>
                          </div>

                          {/* Book Details (Expandable) */}
                          {isExpanded && (
                            <div className="book-details-expanded">
                              <div className="details-grid">
                                <div className="book-detail">
                                  <span className="detail-label">ISBN:</span>
                                  <span className="detail-value">{book.isbn}</span>
                                </div>
                                <div className="book-detail">
                                  <span className="detail-label">Издател:</span>
                                  <span className="detail-value">{book.publisher}</span>
                                </div>
                                <div className="book-detail">
                                  <span className="detail-label">Година:</span>
                                  <span className="detail-value">{book.year}</span>
                                </div>
                                <div className="book-detail">
                                  <span className="detail-label">Страници:</span>
                                  <span className="detail-value">{book.pages}</span>
                                </div>
                                <div className="book-detail">
                                  <span className="detail-label">Издание:</span>
                                  <span className="detail-value">{book.edition}</span>
                                </div>
                                <div className="book-detail">
                                  <span className="detail-label">Корици:</span>
                                  <span className="detail-value">{getCoverTypeText(book.coverType)}</span>
                                </div>
                              </div>
                              
                              <div className="library-location">
                                <h4>Местоположение в библиотеката:</h4>
                                <div className="location-details">
                                  <div className="location-item">
                                    <MapPin size={16} />
                                    <span>Отдел: {book.location}</span>
                                  </div>
                                  <div className="location-item">
                                    <Home size={16} />
                                    <span>Рафт: {book.shelfNumber}</span>
                                  </div>
                                  <div className="location-item call-number">
                                    <Library size={16} />
                                    <span>Сигнатура: {book.callNumber}</span>
                                    <button 
                                      className="copy-call-number"
                                      onClick={() => copyCallNumber(book.callNumber)}
                                    >
                                      <Copy size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>

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

                          {/* Book Stats */}
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
                              <Users size={14} />
                              <span>{book.reservationQueue} чакащи</span>
                            </div>
                          </div>

                          {/* Book Actions */}
                          <div className="book-actions">
                            {isReserved ? (
                              <div className="reserved-status">
                                <CheckCircle size={16} />
                                <span>Вече сте резервирали</span>
                              </div>
                            ) : book.availableCopies > 0 ? (
                              <button 
                                className="reserve-btn"
                                onClick={() => handleReserveBook(book)}
                              >
                                <Calendar size={16} />
                                <span>Резервирай ({book.borrowPeriod} дни)</span>
                              </button>
                            ) : (
                              <button 
                                className="waitlist-btn"
                                onClick={() => {
                                  if (user) {
                                    // Логика за записване в списъка за изчакване
                                    alert(`Записахте се в списъка за изчакване за "${book.title}"`);
                                  } else {
                                    navigate('/login');
                                  }
                                }}
                              >
                                <Users size={16} />
                                <span>Запиши се в списъка ({book.reservationQueue} чакащи)</span>
                              </button>
                            )}

                            <div className="action-buttons">
                              <button 
                                className="action-btn"
                                onClick={() => toggleBookExpansion(book.id)}
                                title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              
                              <button 
                                className="action-btn"
                                onClick={() => handleShareBook(book)}
                                title="Сподели местоположение"
                              >
                                <Share2 size={16} />
                              </button>
                              
                              {user && (
                                <button 
                                  className="action-btn"
                                  title="Добави в списък с желания"
                                  onClick={() => handleAddToWishlist(book)}
                                >
                                  <Heart size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Digital Version */}
                          {book.digitalVersion?.available && (
                            <div className="digital-version">
                              <a 
                                href={book.digitalVersion.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="digital-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText size={14} />
                                <span>Налична и дигитална версия ({book.digitalVersion.format})</span>
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
                    {searchTerm ? 'Няма намерени книги' : 'Няма книги с тези филтри'}
                  </h3>
                  <p>
                    {searchTerm 
                      ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                      : 'Променете филтрите или изчистете всички за да видите всички книги.'
                    }
                  </p>
                  {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || 
                    languageFilter !== 'all' || genreFilter !== 'all' || 
                    conditionFilter !== 'all' || locationFilter !== 'all' || 
                    showOnlyAvailable || sortBy !== 'newest') && (
                    <button 
                      className="clear-filters-btn"
                      onClick={clearFilters}
                    >
                      Изчисти филтрите
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Library Map View */
            <div className="library-map-view">
              <h3 className="map-title">Карта на библиотеката</h3>
              <p className="map-subtitle">Кликнете върху отдел за да видите книгите там</p>
              
              <div className="map-container">
                <div className="map-grid">
                  {['Основен отдел', 'Чуждестранна литература', 'Учебен отдел', 'Кратка проза', 'Фантастика'].map((location) => {
                    const locationBooks = books.filter(b => b.location === location);
                    const availableBooks = locationBooks.filter(b => b.availableCopies > 0);
                    
                    return (
                      <div 
                        key={location}
                        className="map-location"
                        onClick={() => {
                          setLocationFilter(location);
                          setShowMapView(false);
                        }}
                      >
                        <div className="location-header">
                          <MapPin size={20} />
                          <h4>{location}</h4>
                        </div>
                        <div className="location-stats">
                          <span>{locationBooks.length} книги</span>
                          <span className="available-count">
                            {availableBooks.length} налични
                          </span>
                        </div>
                        <div className="location-books">
                          {locationBooks.slice(0, 3).map(book => (
                            <div key={book.id} className="mini-book">
                              <Book size={12} />
                              <span>{book.title.substring(0, 20)}...</span>
                            </div>
                          ))}
                          {locationBooks.length > 3 && (
                            <div className="more-books">
                              +{locationBooks.length - 3} още...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="book-library-info">
          <div className="info-card">
            <div className="info-icon">
              <Calendar size={24} />
            </div>
            <div className="info-content">
              <h4>Как да вземете книга?</h4>
              <ol className="steps-list">
                <li>Резервирайте книгата онлайн</li>
                <li>Получете потвърждение по имейл</li>
                <li>Вземете книгата от библиотеката в рамките на 24 часа</li>
                <li>Максимален период на ползване: 14-21 дни</li>
                <li>Възможност за удължаване: 1-2 пъти</li>
              </ol>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Award size={24} />
            </div>
            <div className="info-content">
              <h4>Нашата колекция</h4>
              <ul className="collection-list">
                <li>10,000+ физически книги</li>
                <li>Класическа и съвременна литература</li>
                <li>Учебници и учебни помагала</li>
                <li>Специални колекции и рядки издания</li>
                <li>Книги на различни езици</li>
              </ul>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Users size={24} />
            </div>
            <div className="info-content">
              <h4>Условия за ползване</h4>
              <ul className="terms-list">
                <li>Необходима регистрация в системата</li>
                <li>Максимум 3 книги едновременно</li>
                <li>Задължително връщане в срок</li>
                <li>Глоба за забавяне: 1 лв/ден</li>
                <li>Загуба на книга: пълна стойност + административна такса</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div 
          className="book-modal-overlay"
          onClick={() => setShowBookDetails(false)}
        >
          <div 
            className="book-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="book-modal-content">
              <div className="book-modal-header">
                <div className="book-modal-thumbnail">
                  <div className="book-modal-image-fallback">
                    <Book className="modal-fallback-icon" />
                  </div>
                </div>
                <div className="book-modal-info">
                  <h2>{selectedBook.title}</h2>
                  <p className="book-modal-author">от {selectedBook.author}</p>
                  <div className="book-modal-meta">
                    <span className="book-modal-category">{selectedBook.category}</span>
                    <span 
                      className="book-modal-status"
                      style={{ color: getStatusColor(selectedBook.status) }}
                    >
                      {selectedBook.status === 'available' ? 'Налична' : 
                       selectedBook.status === 'borrowed' ? 'Взета' : 
                       selectedBook.status === 'reserved' ? 'Резервирана' : 'В ремонт'}
                    </span>
                    <span className="book-modal-year">{selectedBook.year}</span>
                  </div>
                  <div className="book-modal-rating">
                    {renderStars(selectedBook.rating)}
                    <span>{selectedBook.ratingsCount} оценки</span>
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
                  {selectedBook.summary && (
                    <div className="book-summary">
                      <h4>Резюме:</h4>
                      <p>{selectedBook.summary}</p>
                    </div>
                  )}
                </div>
                
                <div className="book-modal-details">
                  <h3>Технически детайли</h3>
                  <div className="details-grid modal">
                    <div className="detail-item">
                      <span className="detail-label">ISBN:</span>
                      <span className="detail-value">{selectedBook.isbn}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Издател:</span>
                      <span className="detail-value">{selectedBook.publisher}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Издание:</span>
                      <span className="detail-value">{selectedBook.edition}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Страници:</span>
                      <span className="detail-value">{selectedBook.pages}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Език:</span>
                      <span className="detail-value">{selectedBook.language}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Корици:</span>
                      <span className="detail-value">{getCoverTypeText(selectedBook.coverType)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Състояние:</span>
                      <span 
                        className="detail-value"
                        style={{ color: getConditionColor(selectedBook.condition) }}
                      >
                        {selectedBook.condition === 'new' ? 'Нова' :
                         selectedBook.condition === 'good' ? 'Добра' :
                         selectedBook.condition === 'fair' ? 'Задоволителна' : 'Лоша'}
                      </span>
                    </div>
                    {selectedBook.ageRecommendation && (
                      <div className="detail-item">
                        <span className="detail-label">Възраст:</span>
                        <span className="detail-value">{selectedBook.ageRecommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="book-modal-location">
                  <h3>Местоположение в библиотеката</h3>
                  <div className="location-info">
                    <div className="location-item">
                      <MapPin size={18} />
                      <span><strong>Отдел:</strong> {selectedBook.location}</span>
                    </div>
                    <div className="location-item">
                      <Home size={18} />
                      <span><strong>Рафт:</strong> {selectedBook.shelfNumber}</span>
                    </div>
                    <div className="location-item call-number">
                      <Library size={18} />
                      <span><strong>Сигнатура:</strong> {selectedBook.callNumber}</span>
                      <button 
                        className="copy-call-number"
                        onClick={() => copyCallNumber(selectedBook.callNumber)}
                      >
                        <Copy size={16} />
                        Копирай
                      </button>
                    </div>
                  </div>
                </div>

                <div className="book-modal-availability">
                  <h3>Наличност</h3>
                  <div className="availability-info">
                    <div className="availability-item">
                      <span className="availability-label">Общо копия:</span>
                      <span className="availability-value">{selectedBook.copies}</span>
                    </div>
                    <div className="availability-item">
                      <span className="availability-label">Налични сега:</span>
                      <span 
                        className="availability-value"
                        style={{ color: selectedBook.availableCopies > 0 ? '#10b981' : '#ef4444' }}
                      >
                        {selectedBook.availableCopies}
                      </span>
                    </div>
                    <div className="availability-item">
                      <span className="availability-label">В списък за изчакване:</span>
                      <span className="availability-value">{selectedBook.reservationQueue}</span>
                    </div>
                    <div className="availability-item">
                      <span className="availability-label">Период на ползване:</span>
                      <span className="availability-value">{selectedBook.borrowPeriod} дни</span>
                    </div>
                    <div className="availability-item">
                      <span className="availability-label">Удължавания:</span>
                      <span className="availability-value">{selectedBook.maxRenewals} пъти</span>
                    </div>
                  </div>
                </div>

                {selectedBook.digitalVersion?.available && (
                  <div className="book-modal-digital">
                    <h3>Дигитална версия</h3>
                    <div className="digital-info">
                      <FileText size={18} />
                      <span>
                        Налична дигитална версия във формат {selectedBook.digitalVersion.format}
                      </span>
                      <a 
                        href={selectedBook.digitalVersion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="digital-link-btn"
                      >
                        <Download size={16} />
                        <span>Свали</span>
                      </a>
                    </div>
                  </div>
                )}

                {selectedBook.awards && selectedBook.awards.length > 0 && (
                  <div className="book-modal-awards">
                    <h3>Награди и отличия</h3>
                    <div className="awards-list">
                      {selectedBook.awards.map((award, index) => (
                        <div key={index} className="award-item">
                          <Award size={16} />
                          <span>{award}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="book-modal-footer">
                {isBookReservedByUser(selectedBook.id) ? (
                  <div className="already-reserved">
                    <CheckCircle size={20} />
                    <span>Вече сте резервирали тази книга</span>
                  </div>
                ) : selectedBook.availableCopies > 0 ? (
                  <button 
                    className="modal-reserve-btn"
                    onClick={() => {
                      handleReserveBook(selectedBook);
                      setShowBookDetails(false);
                    }}
                  >
                    <Calendar size={18} />
                    <span>Резервирай сега ({selectedBook.borrowPeriod} дни)</span>
                  </button>
                ) : (
                  <button 
                    className="modal-waitlist-btn"
                    onClick={() => {
                      if (user) {
                        alert(`Записахте се в списъка за изчакване за "${selectedBook.title}"`);
                        setShowBookDetails(false);
                      } else {
                        navigate('/login');
                      }
                    }}
                  >
                    <Users size={18} />
                    <span>Запиши се в списъка ({selectedBook.reservationQueue} чакащи)</span>
                  </button>
                )}
                
                <button 
                  className="modal-share-btn"
                  onClick={() => handleShareBook(selectedBook)}
                >
                  <Share2 size={18} />
                  <span>Сподели</span>
                </button>
                
                {user && (
                  <button 
                    className="modal-wishlist-btn"
                    onClick={() => handleAddToWishlist(selectedBook)}
                  >
                    <Heart size={18} />
                    <span>Добави в желания</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookLibraryPage;