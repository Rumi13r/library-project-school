import React, { useState, useEffect } from 'react';
import { 
  Book, Search, Filter, Heart, Share2, Star, Clock, Tag, ChevronDown, 
  ChevronUp, Globe, Award, TrendingUp, Calendar, BookOpen, MapPin, Copy, Users, Home, Library, Download, FileText, X, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchAllBooks, 
  addToWaitingList, 
  incrementBookViews,
  updateBookAvailableCopies,
  checkUserInWaitingList,
  removeFromWaitingList 
} from '../lib/services/bookService';
import { 
  createReservation, 
  cancelReservation, 
  getUserActiveReservations,
  checkUserReservationForBook 
} from '../lib/services/reservationService';
import { rateBook } from '../lib/services/ratingService';
import { 
  addToWishlist, 
  getUserWishlist,
  removeFromWishlist 
} from '../lib/services/wishlistService';
import { 
  addToViewedBooks, 
  getUserViewedBooks, 
  getUserRatings 
} from '../lib/services/userService';
import styles from './BookLibraryPage.module.css';
import type { BookLibrary } from '../lib/services/bookTypes';
import type { Reservation } from '../lib/services/reservationService';

const BookLibraryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [userRating, setUserRating] = useState<{[key: string]: number}>({});
  const [hoverRating, setHoverRating] = useState<{[key: string]: number}>({});
  const [viewedBooks, setViewedBooks] = useState<string[]>([]);
  const [selectedShelf, setSelectedShelf] = useState<string>('all');
  const [showShelvesView, setShowShelvesView] = useState(false);
  const [availableShelves, setAvailableShelves] = useState<string[]>([]);
  const [shelfTypes, setShelfTypes] = useState<{[key: string]: string}>({});
  const [selectedShelfType, setSelectedShelfType] = useState<string>('all');
  const [books, setBooks] = useState<BookLibrary[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookLibrary[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookLibrary | null>(null);
  const [userReservations, setUserReservations] = useState<Reservation[]>([]);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchLibraryBooks();
    if (user) {
      fetchUserReservations();
      fetchUserRatings();
      fetchUserWishlist();
      fetchViewedBooks();
    }
  }, [user]);

  const fetchUserWishlist = async () => {
    if (!user) return;
    
    try {
      const wishlistItems = await getUserWishlist(user.uid);
      setWishlist(wishlistItems);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    }
  };

  const fetchViewedBooks = async () => {
    if (!user) return;
    
    try {
      const viewed = await getUserViewedBooks(user.uid);
      setViewedBooks(viewed);
    } catch (error) {
      console.error("Error fetching viewed books:", error);
    }
  };

  const fetchUserRatings = async () => {
    if (!user) return;
    
    try {
      const ratings = await getUserRatings(user.uid);
      setUserRating(ratings);
    } catch (error) {
      console.error("Error fetching user ratings:", error);
    }
  };

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, categoryFilter, statusFilter, languageFilter, 
      genreFilter, conditionFilter, sortBy, showOnlyAvailable, 
      locationFilter, selectedShelf, selectedShelfType]);

  const fetchLibraryBooks = async () => {
    try {
      setLoading(true);

      const booksData = await fetchAllBooks();
      setBooks(booksData);
      extractFiltersData(booksData);

      const shelves = Array.from(
        new Set(
          booksData
            .map(book => book.shelfNumber?.trim())
            .filter((shelf): shelf is string => !!shelf)
        )
      );
      setAvailableShelves(shelves);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching library books:", error);

      const fallbackBooks: BookLibrary[] = [
        {
          id: '1',
          title: '100 книги, които трябва да прочетете',
          author: 'Христо Блажев',
          description: 'Тест',
          category: 'Българска литература',
          isbn: '2365326',
          publisher: 'Сиела',
          year: 2025,
          pages: 200,
          language: 'Български',
          edition: 'Първо издание',
          coverType: 'soft',
          location: 'Библиотека',
          shelfNumber: 'сдсзф',
          callNumber: '54543',
          copies: 3,
          availableCopies: 1,
          condition: 'good',
          status: 'available',
          rating: 4,
          ratingsCount: 1,
          views: 1,
          featured: false,
          createdAt: new Date(),
          lastUpdated: new Date(),
          genres: [],
          ageRecommendation: '13',
          borrowPeriod: 14,
          maxRenewals: 2,
          reservationQueue: 0,
          waitingList: [],
          coverUrl: 'https://www.book.store.bg/prdimg/467590253/100-knigi-koito-triabva-da-prochetete.avif',
          tags: ['литература'],
          summary: '',
          tableOfContents: [],
          relatedBooks: [],
          awards: [],
          digitalVersion: { available: false, format: "", url: "" },
          isActive: true,
          underMaintenance: false
        } as BookLibrary,
      ];

      setBooks(fallbackBooks);
      extractFiltersData(fallbackBooks);

      const shelves = Array.from(
        new Set(
          fallbackBooks
            .map(book => book.shelfNumber)
            .filter((shelf): shelf is string => !!shelf)
        )
      );

      setAvailableShelves(shelves);
      setLoading(false);
    }
  };

  const fetchUserReservations = async () => {
    if (!user) return;
    
    try {
      const reservationsData = await getUserActiveReservations(user.uid);
      setUserReservations(reservationsData);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const extractFiltersData = (booksData: BookLibrary[]) => {
    const categories = new Set<string>();
    const languages = new Set<string>();
    const genres = new Set<string>();
    const locations = new Set<string>();
    const shelves = new Set<string>();
    const shelfTypesMap: {[key: string]: string} = {};
    
    booksData.forEach(book => {
      categories.add(book.category);
      languages.add(book.language || 'Български');
      locations.add(book.location);
      if (book.shelfNumber) shelves.add(book.shelfNumber);
      
      if (book.category.includes('Научна') || book.category.includes('Учебна')) {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Научна литература';
      } else if (book.category.includes('Художествена') || book.category.includes('Романи')) {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Художествена литература';
      } else if (book.category.includes('Детска') || book.ageRecommendation) {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Детска литература';
      } else if (book.category.includes('Справочна') || book.category.includes('Енциклопедия')) {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Справочна литература';
      } else if (book.language && book.language !== 'Български') {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Чуждестранна литература';
      } else {
        if (book.shelfNumber) shelfTypesMap[book.shelfNumber] = 'Обща литература';
      }
      
      book.genres?.forEach(genre => genres.add(genre));
    });
    
    setAvailableCategories(Array.from(categories).sort());
    setAvailableLanguages(Array.from(languages).sort());
    setAvailableGenres(Array.from(genres).sort());
    setAvailableShelves(Array.from(shelves).sort());
    setShelfTypes(shelfTypesMap);
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        book.isbn.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(book => book.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(book => book.status === statusFilter);
    }

    if (languageFilter !== 'all') {
      filtered = filtered.filter(book => book.language === languageFilter);
    }

    if (genreFilter !== 'all') {
      filtered = filtered.filter(book => book.genres?.includes(genreFilter));
    }

    if (conditionFilter !== 'all') {
      filtered = filtered.filter(book => book.condition === conditionFilter);
    }

    if (locationFilter !== 'all') {
      filtered = filtered.filter(book => book.location === locationFilter);
    }

    if (selectedShelf !== 'all') {
      filtered = filtered.filter(book => book.shelfNumber === selectedShelf);
    }

    if (selectedShelfType !== 'all') {
      filtered = filtered.filter(book => {
        const shelfType = getShelfType(book.shelfNumber || '');
        return shelfType === selectedShelfType;
      });
    }

    if (showOnlyAvailable) {
      filtered = filtered.filter(book => book.availableCopies > 0);
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt.toString()).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt.toString()).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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

  const getShelfType = (shelfNumber: string) => {
    return shelfTypes[shelfNumber] || 'Обща литература';
  };

  const handleBookClick = async (book: BookLibrary) => {
    setSelectedBook(book);
    setShowBookDetails(true);
    
    if (user && !viewedBooks.includes(book.id)) {
      try {
        await incrementBookViews(book.id);
        await addToViewedBooks(user.uid, book.id);
        
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === book.id ? { ...b, views: (b.views || 0) + 1 } : b
          )
        );
        
        setViewedBooks(prev => [...prev, book.id]);
        
        setSelectedBook(prev => {
          if (!prev) return null;
          return { ...prev, views: (prev.views || 0) + 1 };
        });
        
      } catch (error) {
        console.error('❌ Грешка при увеличаване на views:', error);
        const newViews = (book.views || 0) + 1;
        
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === book.id ? { ...b, views: newViews } : b
          )
        );
      }
    }
  };

  // Проверка дали книгата е заета от текущия потребител
const isBookBorrowedByUser = (book: BookLibrary) => {
  if (!user) return false;
  return book.borrowedBy?.some(b => b.userId === user.uid && !b.returned) || false;
};

  const handleReserveBook = async (book: BookLibrary) => {
    if (!user) {
    navigate('/login', {
      state: {
        redirectTo: '/library',
        message: 'Моля, влезте в профила си, за да резервирате книга.'
      }
    });
    return;
  }

  // Проверка дали книгата вече е заета от потребителя
  if (isBookBorrowedByUser(book)) {
    alert('Вече сте взели тази книга!');
    return;
  }

    try {
      const hasExistingReservation = await checkUserReservationForBook(user.uid, book.id);
      if (hasExistingReservation) {
        alert('Вече сте резервирали тази книга.');
        return;
      }

      const isInWaitingList = await checkUserInWaitingList(book.id, user.uid);
      if (isInWaitingList) {
        alert('Вече сте записани в списъка на чакащите за тази книга.');
        return;
      }

      if (book.availableCopies <= 0) {
        await addToWaitingList(book.id, user.uid);
        
        setBooks(prevBooks => 
          prevBooks.map(b => 
            b.id === book.id 
              ? { 
                  ...b, 
                  waitingList: [...(b.waitingList || []), user.uid],
                  reservationQueue: (b.reservationQueue || 0) + 1
                } 
              : b
          )
        );

        if (selectedBook?.id === book.id) {
          setSelectedBook(prev => prev ? {
            ...prev,
            waitingList: [...(prev.waitingList || []), user.uid],
            reservationQueue: (prev.reservationQueue || 0) + 1
          } : null);
        }

        alert(`Записахте се в списъка на чакащите за "${book.title}". Имате номер ${(book.reservationQueue || 0) + 1} в опашката.`);
        return;
      }

      const reservationData = {
        bookId: book.id,
        userId: user.uid,
        userName: user.displayName || 'Потребител',
        userEmail: user.email || '',
        borrowPeriod: book.borrowPeriod || 14
      };

      await createReservation(reservationData);
      await updateBookAvailableCopies(book.id, -1);

      const updatedBooks = books.map(b => 
        b.id === book.id 
          ? { 
              ...b, 
              availableCopies: Math.max(0, b.availableCopies - 1),
              status: b.availableCopies - 1 === 0 ? 'reserved' as const : 'available' as const
            } 
          : b
      );
      
      setBooks(updatedBooks);
      
      if (selectedBook?.id === book.id) {
        setSelectedBook(prev => prev ? {
          ...prev,
          availableCopies: Math.max(0, prev.availableCopies - 1),
          status: prev.availableCopies - 1 === 0 ? 'reserved' as const : 'available' as const
        } : null);
      }

      await fetchUserReservations();
      alert(`Книгата "${book.title}" е резервирана успешно!`);

    } catch (error: any) {
      console.error('Error reserving book:', error);
      
      if (error.message === 'User already in waiting list') {
        alert('Вече сте записани в списъка на чакащите за тази книга.');
      } else {
        alert('Възникна грешка при резервацията. Моля, опитайте отново.');
      }
    }
  };

  const handleCancelReservation = async (bookId: string) => {
    if (!user) return;

    try {
      const userReservation = userReservations.find(r => r.bookId === bookId);
      if (!userReservation) {
        alert('Няма активна резервация за тази книга.');
        return;
      }

      const confirmCancel = window.confirm(
        'Сигурни ли сте, че искате да откажете резервацията на тази книга?'
      );

      if (!confirmCancel) return;

      await cancelReservation(userReservation.id);
      await updateBookAvailableCopies(bookId, 1);

      try {
        await removeFromWaitingList(bookId, user.uid);
      } catch (error) {
        console.log("Потребителят не беше в списъка на чакащите или вече е премахнат");
      }
      
      const updatedBooks = books.map(book =>
        book.id === bookId
          ? {
              ...book,
              availableCopies: book.availableCopies + 1,
              status: book.availableCopies + 1 > 0 ? 'available' as const : 'reserved' as const,
              waitingList: book.waitingList?.filter(id => id !== user.uid) || [],
              reservationQueue: Math.max(0, (book.reservationQueue || 0) - 1)
            }
          : book
      );

      setBooks(updatedBooks);
      
      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => prev ? {
          ...prev,
          availableCopies: prev.availableCopies + 1,
          status: prev.availableCopies + 1 > 0 ? 'available' as const : 'reserved' as const,
          waitingList: prev.waitingList?.filter(id => id !== user.uid) || [],
          reservationQueue: Math.max(0, (prev.reservationQueue || 0) - 1)
        } : null);
      }

      await fetchUserReservations();
      alert('Резервацията е отменена успешно!');
      setShowBookDetails(false);

    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Възникна грешка при отказване на резервацията.');
    }
  };

  const handleAddToWishlist = async (book: BookLibrary) => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/library',
          message: 'Моля, влезте в профила си, за да добавите книга в списъка с желания.' 
        }
      });
      return;
    }

    try {
      await addToWishlist(user.uid, book.id);
      setWishlist(prev => [...prev, book.id]);
      alert(`Книгата "${book.title}" е добавена към списъка с желания!`);
    } catch (error) {
      console.error("Грешка при добавяне към wishlist:", error);
      alert('Възникна грешка при добавянето към списъка с желания.');
    }
  };

  const removeFromWishlistHandler = async (bookId: string) => {
    if (!user) return;
    
    try {
      await removeFromWishlist(user.uid, bookId);
      setWishlist(prev => prev.filter(id => id !== bookId));
      alert('Книгата е премахната от списъка с желания!');
    } catch (error) {
      console.error("Грешка при премахване от wishlist:", error);
      alert('Възникна грешка при премахването.');
    }
  };

  const handleRateBook = async (bookId: string, rating: number) => {
    if (!user) {
      navigate('/login', {
        state: {
          redirectTo: '/library',
          message: 'Моля, влезте в профила си, за да оцените книга.'
        }
      });
      return;
    }

    try {
      const userOldRating = userRating[bookId] || 0;
      const result = await rateBook(bookId, user.uid, rating, userOldRating);
      
      setUserRating(prev => ({ ...prev, [bookId]: rating }));
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === bookId 
            ? { 
                ...book, 
                rating: result.newRating, 
                ratingsCount: result.newCount 
              } 
            : book
        )
      );

      if (selectedBook?.id === bookId) {
        setSelectedBook(prev => prev ? {
          ...prev,
          rating: result.newRating,
          ratingsCount: result.newCount
        } : null);
      }

      alert(`Оценихте книгата с ${rating} звезди!`);
    } catch (error) {
      console.error("Error rating book:", error);
      alert('Възникна грешка при оценяването.');
    }
  };

  const handleShareBook = (book: BookLibrary) => {
    if (navigator.share) {
      navigator.share({
        title: `${book.title} - ${book.author}`,
        text: `Намерих тази книга в библиотеката: ${book.title} от ${book.author}\nПрегледи: ${book.views || 0}`,
        url: window.location.href
      });
    } else {
      const shareText = `${book.title} от ${book.author}\n\n${book.description.substring(0, 150)}...\n\nСвободни копия: ${book.availableCopies}\nМестоположение: ${book.location}, Рафт: ${book.shelfNumber}\nПрегледи: ${book.views || 0}`;
      navigator.clipboard.writeText(shareText);
      alert('Информацията за книгата е копирана в клипборда!');
    }
  };

  const isInWishlist = (bookId: string) => {
    return wishlist.includes(bookId);
  };

  const isBookReservedByUser = (bookId: string) => {
    return userReservations.some(r => r.bookId === bookId);
  };

  const isUserInWaitingListLocal = (book: BookLibrary) => {
    if (!user) return false;
    return (book.waitingList || []).includes(user.uid);
  };

  const clearFiltersHandler = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setLanguageFilter('all');
    setGenreFilter('all');
    setConditionFilter('all');
    setLocationFilter('all');
    setShowOnlyAvailable(false);
    setSortBy('newest');
    setSelectedShelf('all');
    setSelectedShelfType('all');
  };

  const renderStars = (bookId: string, rating: number, interactive = false) => {
    const currentRating = hoverRating[bookId] || userRating[bookId] || rating;
    
    return (
      <div className={styles['stars-container']}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentRating;
          const isHalf = star - 0.5 === currentRating;
          
          return (
            <button
              key={star}
              className={`${styles['star-button']} ${interactive ? styles['interactive'] : ''}`}
              onClick={() => interactive && handleRateBook(bookId, star)}
              onMouseEnter={() => interactive && setHoverRating(prev => ({ ...prev, [bookId]: star }))}
              onMouseLeave={() => interactive && setHoverRating(prev => ({ ...prev, [bookId]: 0 }))}
              disabled={!interactive}
              title={interactive ? `Оцени с ${star} звезди` : undefined}
            >
              <Star 
                className={`${styles['star-icon']} ${isFilled ? styles['star-filled'] : ''} ${isHalf ? styles['star-half'] : ''}`}
                size={interactive ? 20 : 16}
                fill={isFilled ? "currentColor" : "none"}
              />
            </button>
          );
        })}
        <span className={styles['rating-number']}>{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'borrowed': return '#f59e0b';
      case 'reserved': return '#3b82f6';
      case 'maintenance': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConditionColor = (condition: string | undefined) => {
    switch (condition) {
      case 'new': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCoverTypeText = (coverType: string | undefined) => {
    return coverType === 'hard' ? 'Твърди корици' : 'Меки корици';
  };

  const formatDate = (date: any) => {
    if (!date) return 'Няма дата';
    
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('bg-BG');
      } else if (date instanceof Date) {
        return date.toLocaleDateString('bg-BG');
      } else if (typeof date === 'string') {
        return new Date(date).toLocaleDateString('bg-BG');
      }
      return new Date(date).toLocaleDateString('bg-BG');
    } catch (error) {
      return 'Невалидна дата';
    }
  };

  const getRandomSpinePattern = () => {
    const patterns = [styles['spine-pattern-1'], styles['spine-pattern-2'], styles['spine-pattern-3'], styles['spine-pattern-4']];
    return patterns[Math.floor(Math.random() * patterns.length)];
  };

  const getRandomSpineColor = () => {
    const colors = [
      styles['spine-color-maroon'],
      styles['spine-color-darkgreen'],
      styles['spine-color-darkolivegreen'],
      styles['spine-color-brown'],
      styles['spine-color-saddlebrown'],
      styles['spine-color-sienna'],
      styles['spine-color-midnightblue'],
      styles['spine-color-darkred'],
      styles['spine-color-darkblue'],
      styles['spine-color-darkgoldenrod']
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const renderBookshelf = () => {
    let filteredByShelf = filteredBooks;
    
    if (selectedShelf !== 'all') {
      filteredByShelf = filteredByShelf.filter(book => book.shelfNumber === selectedShelf);
    }
    
    if (selectedShelfType !== 'all') {
      filteredByShelf = filteredByShelf.filter(book => getShelfType(book.shelfNumber || '') === selectedShelfType);
    }
    
    const booksByShelf: {[key: string]: BookLibrary[]} = {};
    filteredByShelf.forEach(book => {
      const shelf = book.shelfNumber || 'без рафт';
      if (!booksByShelf[shelf]) {
        booksByShelf[shelf] = [];
      }
      booksByShelf[shelf].push(book);
    });
    
    if (Object.keys(booksByShelf).length === 0) {
      return (
        <div className={styles['empty-shelf']}>
          <Library size={48} color="#fff8e1" />
          <p>Няма книги на тези рафтове</p>
          <button 
            className={styles['clear-filters-btn']}
            onClick={() => {
              setSelectedShelf('all');
              setSelectedShelfType('all');
            }}
            style={{ marginTop: '20px' }}
          >
            Покажи всички рафтове
          </button>
        </div>
      );
    }
    
    return (
      <div className={styles['bookshelf-view-container']}>
        {Object.entries(booksByShelf).map(([shelfNumber, shelfBooks]) => {
          const shelfType = getShelfType(shelfNumber);
          
          return (
            <div key={shelfNumber} className={styles['shelf-section']}>
              <div className={styles['shelf-header']}>
                <div className={styles['shelf-title-container']}>
                  <Library size={18} color="#fff8e1" />
                  <h4 className={styles['shelf-title']}>Рафт {shelfNumber}</h4>
                  <span className={styles['shelf-type-badge']}>{shelfType}</span>
                </div>
                <div className={styles['shelf-count']}>
                  <Book size={14} color="#fff8e1" />
                  <span>{shelfBooks.length} книги</span>
                </div>
              </div>
              
              <div className={`${styles['bookshelf-container']} ${styles['compact']}`}>
                {shelfBooks.map((book) => {
                  const spinePattern = getRandomSpinePattern();
                  const spineColor = getRandomSpineColor();
                  const bookHeight = 200 + Math.floor(Math.random() * 60);
                  const topPosition = 230 - bookHeight;
                  
                  return (
             <div 
    key={book.id}
    className={`${styles['book-3d']} ${styles['compact']}`}
    onClick={() => handleBookClick(book)}
    style={{ 
      height: `${bookHeight}px`,
      top: `${topPosition + 20}px`
    }}
  >
    <div className={`${styles['book-side']} ${styles['book-spine']} ${styles['compact']} ${spinePattern} ${spineColor}`}>
      <span className={styles['spine-title']}>
        {book.title.length > 12 ? book.title.substring(0, 12) + '...' : book.title}
      </span>
      <span className={styles['spine-author']}>
        {book.author.length > 10 ? book.author.substring(0, 10) + '...' : book.author}
      </span>
    </div>
    <div className={`${styles['book-side']} ${styles['book-top']} ${styles['compact']}`}></div>
    <div 
      className={`${styles['book-side']} ${styles['book-cover']} ${styles['compact']}`}
      style={{
        backgroundImage: book.coverUrl 
          ? `url("${book.coverUrl}")` 
          : 'none',
        backgroundColor: book.coverUrl ? 'transparent' : '#f5f5f5'
      }}
    ></div>
  </div>
);
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const copyCallNumber = (callNumber: string | undefined) => {
    if (!callNumber) {
      alert('Няма сигнатура за копиране!');
      return;
    }
    navigator.clipboard.writeText(callNumber);
    alert(`Сигнатурата ${callNumber} е копирана в клипборда!`);
  };

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBookId(expandedBookId === bookId ? null : bookId);
  };

  if (loading) {
    return (
      <div className={styles['book-library-page']}>
        <div className={styles['loading-spinner']}>
          <div className={styles['spinner']}></div>
          <span>Зареждане на библиотеката...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['book-library-page']}>
      <div className={styles['book-library-container']}>
        {/* Header */}
        <div className={styles['book-library-header']}>
          <div className={styles['book-library-title-section']}>
            <div className={`${styles['title-icon-wrapper']} ${styles['library']}`}>
              <Library className={styles['book-library-title-icon']} />
            </div>
            <div className={styles['title-content']}>
              <h1 className={styles['handwritten-title']}>Библиотека - Физически книги</h1>
              <p className={styles['book-library-subtitle']}>
                Разгледайте, резервирайте и вземате книги от нашата физическа библиотека
              </p>
            </div>
          </div>

          <div className={styles['book-library-stats']}>
  <div className={styles['stat-item']}>
    <div className={styles['stat-info']}>
      <span className={styles['stat-number']}>{books.length}</span>
      <span className={styles['book-library-subtitle']}>Общо книги</span>
    </div>
  </div>
  <div className={styles['stat-item']}>
    <div className={styles['stat-info']}>
      <span className={styles['stat-number']}>
        {books.reduce((sum, book) => sum + book.availableCopies, 0)}
      </span>
      <span className={styles['book-library-subtitle']}>Налични копия</span>
    </div>
  </div>
  {/* Показвай статистиката за резервации само за логнати потребители */}
  {user && (
    <div className={styles['stat-item']}>
      <div className={styles['stat-info']}>
        <span className={styles['stat-number']}>
          {userReservations.length}
        </span>
        <span className={styles['book-library-subtitle']}>Активни резервации</span>
      </div>
    </div>
  )}
</div>
          <div className={styles['decorative-line']}>
          </div>
        </div>

        {/* User Reservations */}
        {user && userReservations.length > 0 && (
  <div className={styles['user-reservations']}>
    <h3 className={styles['reservations-title']}>
      <Calendar className={styles['title-icon']} />
      Вашите активни резервации
    </h3>
    <div className={styles['reservations-grid']}>
      {userReservations.map((reservation, index) => {
                const book = books.find(b => b.id === reservation.bookId);
                if (!book) return null;
                
                return (
                  <div key={index} className={styles['reservation-card']}>
                    <div className={styles['reservation-book-info']}>
                      <h4>{book.title}</h4>
                      <p className={styles['reservation-author']}>{book.author}</p>
                    </div>
                    <div className={styles['reservation-details']}>
                      <div className={styles['reservation-date']}>
                        <Calendar size={14} />
                        <span>
                          Резервирана: {formatDate(reservation.reservedAt)}
                        </span>
                      </div>
                      <div className={styles['reservation-expiry']}>
                        <Clock size={14} />
                        <span>
                          Изтича: {formatDate(reservation.expiresAt)}
                        </span>
                      </div>
                    </div>
                    <div className={styles['reservation-actions']}>
                      <button 
                        className={styles['view-book-btn']} 
                        onClick={() => handleBookClick(book)}
                      >
                        Виж детайли
                      </button>
                      <p>или</p>
                      <button 
                        className={styles['cancel-btn']}
                        onClick={() => handleCancelReservation(book.id)}
                        style={{ marginLeft: '10px' }}
                      >
                        Откажи
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className={styles['book-library-filters']}>
          <div className={styles['main-search-box']}>
            <Search className={styles['search-icon']} />
            <input
              type="text"
              placeholder="Търсете книги, автори, ISBN, теми..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles['search-input']}
            />
            <div className={styles['search-info']}>
              <Book size={16} />
              <span>{books.length} книги в библиотеката</span>
            </div>
          </div>

          <div className={styles['filters-grid']}>
            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <Filter size={16} />
                Категория
              </label>
              <select 
                className={styles['filter-select']}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Всички категории</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <CheckCircle size={16} />
                Статус
              </label>
              <select 
                className={styles['filter-select']}
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

            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <Globe size={16} />
                Език
              </label>
              <select 
                className={styles['filter-select']}
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <option value="all">Всички езици</option>
                {availableLanguages.map(language => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>

            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <Tag size={16} />
                Жанр
              </label>
              <select 
                className={styles['filter-select']}
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
              >
                <option value="all">Всички жанрове</option>
                {availableGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>

            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <MapPin size={16} />
                Местоположение
              </label>
              <select 
                className={styles['filter-select']}
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

            <div className={styles['filter-group']}>
              <label className={styles['filter-label']}>
                <TrendingUp size={16} />
                Подреди по
              </label>
              <select 
                className={styles['filter-select']}
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

            <div className={styles['checkbox-group']}>
              <label className={styles['checkbox-label']}>
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  className={styles['availability-checkbox']}
                />
                <span className={styles['checkbox-text']}>Покажи само налични</span>
              </label>
            </div>

            {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' || 
              languageFilter !== 'all' || genreFilter !== 'all' || 
              conditionFilter !== 'all' || locationFilter !== 'all' || 
              showOnlyAvailable || sortBy !== 'newest') && (
              <button 
                className={styles['clear-filters-btn']}
                onClick={clearFiltersHandler}
              >
                Изчисти всички филтри
              </button>
            )}
          </div>
        </div>

        {/* View Toggle */}
        <div className={styles['view-toggle']}>
          <button 
            className={`${styles['view-toggle-btn']} ${!showShelvesView ? styles['active'] : ''}`}
            onClick={() => setShowShelvesView(false)}
          >
            <Book className={styles['view-icon']} />
            <span>Списък</span>
          </button>
          <button 
            className={`${styles['view-toggle-btn']} ${showShelvesView ? styles['active'] : ''}`}
            onClick={() => setShowShelvesView(true)}
          >
            <Library className={styles['view-icon']} />
            <span>Визуален каталог</span>
          </button>
        </div>

        {/* Books Content */}
        <div className={styles['book-library-content']}>
          {!showShelvesView ? (
            <>
              {filteredBooks.length > 0 ? (
                <>
                  <div className={styles['books-stats']}>
                    <BookOpen className={styles['stats-icon']} />
                    <span className={styles['books-count']}>
                      Намерени {filteredBooks.length} книги
                    </span>
                    {searchTerm && (
                      <span className={styles['search-results']}>
                        Резултати за "{searchTerm}"
                      </span>
                    )}
                  </div>

                  <div className={styles['books-grid']}>
                    {filteredBooks.map((book) => {
                      const isExpanded = expandedBookId === book.id;
                      const isReserved = isBookReservedByUser(book.id);
                      const inWaitingList = isUserInWaitingListLocal(book);
                      
                      return (
                        <div 
                          key={book.id} 
                          className={`${styles['book-card']} ${book.featured ? styles['featured'] : ''}`}
                        >
                          {/* Book Header */}
                          <div className={styles['book-header']}>
                            <div className={styles['book-thumbnail']}>
                              {book.coverUrl ? (
                                <img 
                                  src={book.coverUrl} 
                                  alt={book.title}
                                  className={styles['book-cover-image']}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.parentElement?.querySelector(`.${styles['book-image-fallback']}`);
                                    if (fallback) {
                                      fallback.classList.remove(styles['hidden']);
                                    }
                                  }}
                                />
                              ) : null}
                              
                              <div className={`${styles['book-image-fallback']} ${book.coverUrl ? styles['hidden'] : ''}`}>
                                <Book className={styles['fallback-icon']} />
                                {book.featured && (
                                  <div className={styles['featured-badge']}>
                                    <Award size={14} />
                                    <span>Препоръчано</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={styles['book-main-info']}>
                              <div className={styles['book-title-section']}>
                                <h3 
                                  className={styles['book-title']}
                                  onClick={() => handleBookClick(book)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {book.title}
                                </h3>
                                <p className={styles['book-author']}>{book.author}</p>
                              </div>

                              <div className={styles['book-meta']}>
                                <div className={styles['book-status']} style={{ color: getStatusColor(book.status) }}>
                                  <CheckCircle size={14} />
                                  <span>
                                    {book.status === 'available' && 'Налична'}
                                    {book.status === 'borrowed' && 'Взета'}
                                    {book.status === 'reserved' && 'Резервирана'}
                                    {book.status === 'maintenance' && 'В ремонт'}
                                  </span>
                                </div>
                                
                                <div className={styles['book-availability']}>
                                  <Copy size={14} />
                                  <span>{book.availableCopies}/{book.copies} копия</span>
                                </div>

                                <div className={styles['book-location']}>
                                  <MapPin size={14} />
                                  <span>{book.location}</span>
                                </div>

                                <div className={styles['book-condition']} style={{ color: getConditionColor(book.condition) }}>
                                  <span>
                                    {book.condition === 'new' && '🆕 Нова'}
                                    {book.condition === 'good' && '✅ Добра'}
                                    {book.condition === 'fair' && '⚠️ Задоволителна'}
                                    {book.condition === 'poor' && '❌ Лоша'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Book Description */}
                          <div className={styles['book-description']}>
                            <p>{book.description}</p>
                          </div>

                          {/* Book Details (Expandable) */}
                          {isExpanded && (
                            <div className={styles['book-details-expanded']}>
                              <div className={styles['details-grid']}>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>ISBN:</span>
                                  <span className={styles['detail-value']}>{book.isbn}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Издател:</span>
                                  <span className={styles['detail-value']}>{book.publisher}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Година:</span>
                                  <span className={styles['detail-value']}>{book.year}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Страници:</span>
                                  <span className={styles['detail-value']}>{book.pages}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Издание:</span>
                                  <span className={styles['detail-value']}>{book.edition}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Корици:</span>
                                  <span className={styles['detail-value']}>{getCoverTypeText(book.coverType)}</span>
                                </div>
                                <div className={styles['book-detail']}>
                                  <span className={styles['detail-label']}>Състояние:</span>
                                  <span className={styles['detail-value']} style={{ color: getConditionColor(book.condition) }}>
                                    {book.condition === 'new' && 'Нова'}
                                    {book.condition === 'good' && 'Добра'}
                                    {book.condition === 'fair' && 'Задоволителна'}
                                    {book.condition === 'poor' && 'Лоша'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className={styles['library-location']}>
                                <h4>Местоположение в библиотеката:</h4>
                                <div className={styles['location-details']}>
                                  <div className={styles['location-item']}>
                                    <MapPin size={16} />
                                    <span>Отдел: {book.location}</span>
                                  </div>
                                  <div className={styles['location-item']}>
                                    <Home size={16} />
                                    <span>Рафт: {book.shelfNumber}</span>
                                  </div>
                                  <div className={`${styles['location-item']} ${styles['call-number']}`}>
                                    <Library size={16} />
                                    <span>Сигнатура: {book.callNumber}</span>
                                    <button 
                                      className={styles['copy-call-number']}
                                      onClick={() => copyCallNumber(book.callNumber)}
                                    >
                                      <Copy size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {book.tags && book.tags.length > 0 && (
                                <div className={styles['book-tags']}>
                                  {book.tags.map((tag, index) => (
                                    <span key={index} className={styles['book-tag']}>
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Book Stats */}
                          <div className={styles['book-stats']}>
                            <div className={styles['stat-group']}>
                              {renderStars(book.id, book.rating ?? 0, true)}
                              <span className={styles['ratings-count']}>({book.ratingsCount})</span>
                            </div>
                            <div className={styles['stat-group']}>
                              <span>{book.views || 0} прегледа</span>
                            </div>
                            <div className={styles['stat-group']}>
                              <span>{book.reservationQueue} чакащи</span>
                            </div>
                          </div>

                          {/* Book Actions */}
                          <div className={styles['book-actions']}>
  {isBookBorrowedByUser(book) ? (
    <div className={styles['borrowed-status']}>
      <CheckCircle size={16} />
      <span>Книгата е взета от вас</span>
    </div>
  ) : isReserved ? (
    <div className={styles['reserved-status']}>
      <CheckCircle size={16} />
      <span>Вече сте резервирали</span>
      <button 
        className={styles['cancel-small-btn']}
        onClick={() => handleCancelReservation(book.id)}
        style={{ marginLeft: '10px', fontSize: '12px', padding: '2px 6px' }}
      >
        Откажи
      </button>
    </div>
  ) : inWaitingList ? (
    <div className={styles['waiting-list-status']}>
      <Clock size={16} />
      <span>Чакате в опашката ({book.reservationQueue} чакащи)</span>
    </div>
  ) : book.availableCopies > 0 ? (
    <button 
      className={styles['reserve-btn']}
      onClick={() => handleReserveBook(book)}
    >
      <Calendar size={16} />
      <span>Резервирай ({book.borrowPeriod} дни)</span>
    </button>
  ) : (
    <button 
      className={styles['waitlist-btn']}
      onClick={() => handleReserveBook(book)}
    >
      <Users size={16} />
      <span>Запиши се в списъка ({book.reservationQueue} чакащи)</span>
    </button>
  )}
                            <div className={styles['action-buttons']}>
                              <button 
                                className={styles['action-btn']}
                                onClick={() => toggleBookExpansion(book.id)}
                                title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              
                              <button 
                                className={styles['action-btn']}
                                onClick={() => handleShareBook(book)}
                                title="Сподели местоположение"
                              >
                                <Share2 size={16} />
                              </button>
                              
                              {user ? (
                                isInWishlist(book.id) ? (
                                  <button 
                                    className={styles['action-btn']}
                                    title="Премахни от желания"
                                    onClick={() => removeFromWishlistHandler(book.id)}
                                  >
                                    <Heart size={16} fill="red" />
                                  </button>
                                ) : (
                                  <button 
                                    className={styles['action-btn']}
                                    title="Добави в желания"
                                    onClick={() => handleAddToWishlist(book)}
                                  >
                                    <Heart size={16} />
                                  </button>
                                )
                              ) : (
                                <button 
                                  className={styles['action-btn']}
                                  title="Влезте в профила си за да добавите в желания"
                                  onClick={() => navigate('/login')}
                                >
                                  <Heart size={16} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Digital Version */}
                          {book.digitalVersion?.available && (
                            <div className={styles['digital-version']}>
                              <a 
                                href={book.digitalVersion.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles['digital-link']}
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
                <div className={styles['no-books-found']}>
                  <Book size={80} className={styles['no-books-icon']} />
                  <h3 className={styles['handwritten-title-small']}>
                    {searchTerm ? 'Няма намерени книги' : 'Няма книги с тези филтри'}
                  </h3>
                  <p>
                    {searchTerm 
                      ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                      : 'Променете филтрите или изчистете всички за да видите всички книги.'
                    }
                  </p>
                  <button 
                    className={styles['clear-filters-btn']}
                    onClick={clearFiltersHandler}
                  >
                    Изчисти филтрите
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles['bookshelf-view']}>
              <h3 className={styles['bookshelf-title']} style={{ color: '#333', marginBottom: '10px' }}>
                <Library style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                Визуален каталог на рафтовете
              </h3>
              <div className={`${styles['shelf-options']} ${styles['expanded']}`}>
                <div className={styles['filter-group']}>
                  <label className={styles['filter-label']} style={{ color: '#333' }}>
                    <Library size={16} />
                    Избери рафт
                  </label>
                  <select 
                    className={styles['shelf-select']}
                    value={selectedShelf}
                    onChange={(e) => setSelectedShelf(e.target.value)}
                    style={{ border: '1px solid #ccc', background: 'white' }}
                  >
                    <option value="all">Всички рафтове</option>
                    {availableShelves.map(shelf => (
                      <option key={shelf} value={shelf}>Рафт {shelf}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles['filter-group']}>
                  <label className={styles['filter-label']} style={{ color: '#333' }}>
                    <Tag size={16} />
                    Тип литература
                  </label>
                  <select 
                    className={styles['shelf-select']}
                    value={selectedShelfType}
                    onChange={(e) => setSelectedShelfType(e.target.value)}
                    style={{ border: '1px solid #ccc', background: 'white' }}
                  >
                    <option value="all">Всички типове</option>
                    <option value="Научна литература">Научна литература</option>
                    <option value="Художествена литература">Художествена литература</option>
                    <option value="Детска литература">Детска литература</option>
                    <option value="Справочна литература">Справочна литература</option>
                    <option value="Чуждестранна литература">Чуждестранна литература</option>
                    <option value="Обща литература">Обща литература</option>
                  </select>
                </div>
                
                <div className={styles['filter-group']}>
                  <label className={styles['filter-label']} style={{ color: '#333' }}>
                    <Book size={16} />
                    Брой книги
                  </label>
                  <div className={styles['stat-number']} style={{ 
                    fontSize: '16px', 
                    padding: '8px 12px',
                    background: '#f0f0f0',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    color: '#333'
                  }}>
                    {selectedShelf === 'all' 
                      ? filteredBooks.length 
                      : filteredBooks.filter(b => b.shelfNumber === selectedShelf).length} книги
                  </div>
                </div>
                
                {(selectedShelf !== 'all' || selectedShelfType !== 'all') && (
                  <button 
                    className={styles['clear-filters-btn']}
                    onClick={() => {
                      setSelectedShelf('all');
                      setSelectedShelfType('all');
                    }}
                    style={{ 
                      alignSelf: 'center',
                      background: '#826c59',
                      color: 'white',
                      border: '1px solid #6b5746'
                    }}
                  >
                    Изчисти филтри
                  </button>
                )}
              </div>
              
              {renderBookshelf()}
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className={styles['book-library-info']}>
          <div className={styles['info-card']}>
            <div className={styles['info-icon']}>
              <Calendar size={24} />
            </div>
            <div className={styles['info-content']}>
              <h4>Как да вземете книга?</h4>
              <ol className={styles['steps-list']}>
                <li>Резервирайте книгата онлайн</li>
                <li>Получете потвърждение по имейл</li>
                <li>Вземете книгата от библиотеката в рамките на 24 часа</li>
                <li>Максимален период на ползване:  
                  <strong> 14 или 30 дни</strong> в зависимост от категорията
                </li>
                <li>Възможност за удължаване: 1-2 пъти</li>
              </ol>
            </div>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['info-icon']}>
              <Award size={24} />
            </div>
            <div className={styles['info-content']}>
              <h4>Нашата колекция</h4>
              <ul className={styles['collection-list']}>
                <li>10,000+ физически книги</li>
                <li>Класическа и съвременна литература</li>
                <li>Учебници и учебни помагала</li>
                <li>Специални колекции и рядки издания</li>
                <li>Книги на различни езици</li>
              </ul>
            </div>
          </div>

          <div className={styles['info-card']}>
            <div className={styles['info-icon']}>
              <Users size={24} />
            </div>
            <div className={styles['info-content']}>
              <h4>Условия за ползване</h4>
              <ul className={styles['terms-list']}>
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
          className={styles['book-modal-overlay']}
          onClick={() => setShowBookDetails(false)}
        >
          <div 
            className={styles['book-modal']}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['book-modal-content']}>
              <div className={styles['book-modal-header']}>
                <div className={styles['book-modal-thumbnail']}>
                  <div className={styles['book-modal-image-fallback']}>
                    <Book className={styles['modal-fallback-icon']} />
                  </div>
                </div>
                <div className={styles['book-modal-info']}>
                  <h2>{selectedBook.title}</h2>
                  <p className={styles['book-modal-author']}>от {selectedBook.author}</p>
                  <div className={styles['book-modal-meta']}>
                    <span className={styles['book-modal-category']}>{selectedBook.category}</span>
                    <span 
                      className={styles['book-modal-status']}
                      style={{ color: getStatusColor(selectedBook.status) }}
                    >
                      {selectedBook.status === 'available' ? 'Налична' : 
                       selectedBook.status === 'borrowed' ? 'Взета' : 
                       selectedBook.status === 'reserved' ? 'Резервирана' : 'В ремонт'}
                    </span>
                    <span className={styles['book-modal-year']}>{selectedBook.year}</span>
                  </div>
                  <div className={styles['book-modal-rating']}>
                    {renderStars(selectedBook.id, selectedBook.rating ?? 0, false)}
                    <span>{selectedBook.ratingsCount} оценки</span>
                  </div>
                </div>
                <button 
                  className={styles['close-modal-btn']}
                  onClick={() => setShowBookDetails(false)}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className={styles['book-modal-body']}>
                <div className={styles['book-modal-description']}>
                  <h3>Описание</h3>
                  <p>{selectedBook.description}</p>
                </div>
                
                <div className={styles['book-modal-details']}>
                  <h3>Технически детайли</h3>
                  <div className={`${styles['details-grid']} ${styles['modal']}`}>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>ISBN:</span>
                      <span className={styles['detail-value']}>{selectedBook.isbn}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Издател:</span>
                      <span className={styles['detail-value']}>{selectedBook.publisher}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Издание:</span>
                      <span className={styles['detail-value']}>{selectedBook.edition}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Страници:</span>
                      <span className={styles['detail-value']}>{selectedBook.pages}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Език:</span>
                      <span className={styles['detail-value']}>{selectedBook.language}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Корици:</span>
                      <span className={styles['detail-value']}>{getCoverTypeText(selectedBook.coverType)}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>Състояние:</span>
                      <span 
                        className={styles['detail-value']}
                        style={{ color: getConditionColor(selectedBook.condition) }}
                      >
                        {selectedBook.condition === 'new' ? 'Нова' :
                         selectedBook.condition === 'good' ? 'Добра' :
                         selectedBook.condition === 'fair' ? 'Задоволителна' : 'Лоша'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className={styles['book-modal-location']}>
                  <h3>Местоположение в библиотеката</h3>
                  <div className={styles['location-info']}>
                    <div className={styles['location-item']}>
                      <MapPin size={18} />
                      <span><strong>Отдел:</strong> {selectedBook.location}</span>
                    </div>
                    <div className={styles['location-item']}>
                      <Home size={18} />
                      <span><strong>Рафт:</strong> {selectedBook.shelfNumber}</span>
                    </div>
                    <div className={`${styles['location-item']} ${styles['call-number']}`}>
                      <Library size={18} />
                      <span><strong>Сигнатура:</strong> {selectedBook.callNumber}</span>
                      <button 
                        className={styles['copy-call-number']}
                        onClick={() => copyCallNumber(selectedBook.callNumber)}
                      >
                        <Copy size={16} />
                        Копирай
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles['book-modal-availability']}>
                  <h3>Наличност</h3>
                  <div className={styles['availability-info']}>
                    <div className={styles['availability-item']}>
                      <span className={styles['availability-label']}>Общо копия:</span>
                      <span className={styles['availability-value']}>{selectedBook.copies}</span>
                    </div>
                    <div className={styles['availability-item']}>
                      <span className={styles['availability-label']}>Налични сега:</span>
                      <span 
                        className={styles['availability-value']}
                        style={{ color: selectedBook.availableCopies > 0 ? '#10b981' : '#ef4444' }}
                      >
                        {selectedBook.availableCopies}
                      </span>
                    </div>
                    <div className={styles['availability-item']}>
                      <span className={styles['availability-label']}>В списък за изчакване:</span>
                      <span className={styles['availability-value']}>{selectedBook.reservationQueue}</span>
                    </div>
                    <div className={styles['availability-item']}>
                      <span className={styles['availability-label']}>Период на ползване:</span>
                      <span className={styles['availability-value']}>{selectedBook.borrowPeriod} дни</span>
                    </div>
                    <div className={styles['availability-item']}>
                      <span className={styles['availability-label']}>Удължавания:</span>
                      <span className={styles['availability-value']}>{selectedBook.maxRenewals} пъти</span>
                    </div>
                  </div>
                </div>

                {selectedBook.digitalVersion?.available && (
                  <div className={styles['book-modal-digital']}>
                    <h3>Дигитална версия</h3>
                    <div className={styles['digital-info']}>
                      <FileText size={18} />
                      <span>
                        Налична дигитална версия във формат {selectedBook.digitalVersion.format}
                      </span>
                      <a 
                        href={selectedBook.digitalVersion.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles['digital-link-btn']}
                      >
                        <Download size={16} />
                        <span>Свали</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              <div className={styles['book-modal-footer']}>
                {isBookReservedByUser(selectedBook.id) ? (
                  <div className={styles['already-reserved']}>
                    <CheckCircle size={20} />
                    <span>Вече сте резервирали тази книга</span>
                    <button 
                      className={styles['cancel-reservation-btn']}
                      onClick={() => handleCancelReservation(selectedBook.id)}
                    >
                      Откажи резервация
                    </button>
                  </div>
                ) : isUserInWaitingListLocal(selectedBook) ? (
                  <div className={styles['waiting-status']}>
                    <Clock size={20} />
                    <span>В списъка на чакащите</span>
                  </div>
                ) : selectedBook.availableCopies > 0 ? (
                  <button 
                    className={styles['modal-reserve-btn']}
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
                    className={styles['modal-waitlist-btn']}
                    onClick={() => {
                      handleReserveBook(selectedBook);
                      setShowBookDetails(false);
                    }}
                  >
                    <Users size={18} />
                    <span>Запиши се в списъка ({selectedBook.reservationQueue} чакащи)</span>
                  </button>
                )}
                
                <button 
                  className={styles['modal-share-btn']}
                  onClick={() => handleShareBook(selectedBook)}
                >
                  <Share2 size={18} />
                  <span>Сподели</span>
                </button>
                
                {user && (
                  <button 
                    className={`${styles['modal-wishlist-btn']} ${isInWishlist(selectedBook.id) ? styles['active'] : ''}`}
                    onClick={() => isInWishlist(selectedBook.id) 
                      ? removeFromWishlistHandler(selectedBook.id) 
                      : handleAddToWishlist(selectedBook)
                    }
                  >
                    <Heart size={18} fill={isInWishlist(selectedBook.id) ? "red" : "none"} />
                    <span>{isInWishlist(selectedBook.id) ? 'В желания' : 'Добави в желания'}</span>
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