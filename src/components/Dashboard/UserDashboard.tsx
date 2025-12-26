// src/components/Dashboard/UserDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from "firebase/firestore";
import { 
  BookOpen, Calendar, Search, Clock, CheckCircle, Ticket, History, Heart, Bookmark, RotateCcw, XCircle, Eye, MapPin, X, Printer, Book, Sparkles,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import EventTicketModal from "../EventTicketModal";
import EventDetailsModal from "../../pages/EventDetailsModal";
import { v4 as uuidv4 } from 'uuid';
import './UserDashboard.css';

// Импорт на новите услуги и типове
import * as bookService from "../../lib/services/bookService";
import * as reservationService from "../../lib/services/reservationService";
import type { Reservation } from "../../lib/services/reservationService";
import * as userService from "../../lib/services/userService";
import * as wishlistService from "../../lib/services/wishlistService";
import type { BookLibrary } from "../../lib/services/bookTypes";

// Типове специфични за UserDashboard
interface UserBook {
  bookId: string;
  bookDetails: BookLibrary;
  status: 'borrowed' | 'reserved' | 'wishlist' | 'viewed' | 'available';
  borrowedDate?: string;
  dueDate?: string;
  reservationExpiresAt?: string;
  borrowedRecord?: any;
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
  participants: string[];
  imageUrl?: string;
  tickets?: {
    [userId: string]: {
      ticketId: string;
      registrationDate: any;
      checkedIn: boolean;
      checkedInTime?: any;
    }
  };
}

interface UserTicket {
  eventId: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  endTime: string;
  eventLocation: string;
  registrationDate: string;
  checkedIn: boolean;
  checkedInTime?: string;
  eventImageUrl?: string; 
  isPast?: boolean;
}

interface Recommendation {
  bookId: string;
  title: string;
  author: string;
  reason: string;
  score: number;
  coverUrl?: string;
  bookDetails?: BookLibrary;
}

interface UserData {
  role?: 'admin' | 'librarian' | 'reader';
  profile?: {
    displayName?: string;
  };
}
const UserDashboard: React.FC = () => {
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [allBooks, setAllBooks] = useState<BookLibrary[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [viewedBooks, setViewedBooks] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState({
    borrowedBooks: 0,
    reservedBooks: 0,
    wishlistCount: 0,
    activeTickets: 0,
    pastTickets: 0
  });
  const [userData] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"overview" | "books" | "reservations" | "wishlist" | "activeEvents" | "pastEvents" | "tickets" | "recommendations">("overview");
  const [loading, setLoading] = useState(true);
  const [processingBook, setProcessingBook] = useState<string | null>(null);
  const [processingEvent, setProcessingEvent] = useState<string | null>(null);
  
  const [showTicket, setShowTicket] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<UserTicket | null>(null);
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  const { user } = useAuth();
  
  const navigate = useNavigate();
  const getUserDisplayName = useCallback((): string => {
      if (userData?.profile?.displayName) {
        return userData.profile.displayName;
      }
      return user?.email?.split('@')[0] || 'Потребител';
    }, [user, userData]);

  // Изчисляване на активни и изтекли събития
  const { activeEvents, pastEvents } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const active = allEvents
      .filter(event => event.date && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const past = allEvents
      .filter(event => event.date && event.date < today)
      .sort((b) => b.date.localeCompare(b.date));

    return { activeEvents: active, pastEvents: past };
  }, [allEvents]);

  // Зареждане на всички данни
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // 1. Зареждане на всички книги
        const booksData = await bookService.fetchAllBooks();
        setAllBooks(booksData);
        
        // 2. Зареждане на събития
        await fetchEvents();
        
        // 3. Зареждане на резервации
        const userReservations = await reservationService.getUserActiveReservations(user.uid);
        setReservations(userReservations);
        
        // 4. Зареждане на списък с желания
        const userWishlist = await wishlistService.getUserWishlist(user.uid);
        setWishlist(userWishlist);
        
        // 5. Зареждане на прегледани книги
        const viewed = await userService.getUserViewedBooks(user.uid);
        setViewedBooks(viewed);
        
        // 6. Подготовка на книгите на потребителя
        await prepareUserBooks(booksData, userReservations, userWishlist, viewed);
        
        // 7. Генериране на препоръки
        await generateRecommendations(booksData, viewed, userWishlist);
        
        // 8. Обновяване на статистики
        updateStats();
        
      } catch (error) {
        console.error("Грешка при зареждане на данни:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  // Обновяване на статистики
  const updateStats = () => {
    const borrowedBooks = userBooks.filter(b => b.status === 'borrowed').length;
    const reservedBooks = userBooks.filter(b => b.status === 'reserved').length;
    const wishlistCount = wishlist.length;
    const activeTickets = userTickets.filter(t => !t.isPast).length;
    const pastTickets = userTickets.filter(t => t.isPast).length;
    
    setStats({
      borrowedBooks,
      reservedBooks,
      wishlistCount,
      activeTickets,
      pastTickets
    });
  };

  // Подготовка на книгите на потребителя
  const prepareUserBooks = async (
    books: BookLibrary[], 
    reservations: Reservation[], 
    wishlistItems: string[], 
    viewed: string[]
  ) => {
    if (!user) return;
    
    const userBooksData: UserBook[] = [];
    
    // 1. Заети книги (от borrowedBy полето)
    books.forEach(book => {
      const borrowedRecord = book.borrowedBy?.find(b => 
        b.userId === user.uid && !b.returned
      );
      
      if (borrowedRecord) {
        userBooksData.push({
          bookId: book.id,
          bookDetails: book,
          status: 'borrowed',
          borrowedDate: borrowedRecord.borrowedDate,
          dueDate: borrowedRecord.dueDate,
          borrowedRecord
        });
      }
    });
    
    // 2. Резервирани книги
    reservations.forEach(reservation => {
      const book = books.find(b => b.id === reservation.bookId);
      if (book) {
        userBooksData.push({
          bookId: book.id,
          bookDetails: book,
          status: 'reserved',
          reservationExpiresAt: (reservation.expiresAt as any)?.toDate?.()?.toISOString()?.split('T')[0]
        });
      }
    });
    
    // 3. Книги в списъка с желания
    wishlistItems.forEach(bookId => {
      const book = books.find(b => b.id === bookId);
      if (book) {
        userBooksData.push({
          bookId: book.id,
          bookDetails: book,
          status: 'wishlist'
        });
      }
    });
    
    // 4. Прегледани книги (само ако не са в други списъци)
    viewed.forEach(bookId => {
      const alreadyInList = userBooksData.some(ub => ub.bookId === bookId);
      if (!alreadyInList) {
        const book = books.find(b => b.id === bookId);
        if (book) {
          userBooksData.push({
            bookId: book.id,
            bookDetails: book,
            status: 'viewed'
          });
        }
      }
    });
    
    setUserBooks(userBooksData);
  };

  // Генериране на препоръки
  const generateRecommendations = async (
    books: BookLibrary[], 
    viewed: string[], 
    wishlist: string[]
  ) => {
    try {
      const recs: Recommendation[] = [];
      const today = new Date();
      
      // 1. По жанр (ако има прегледани книги)
      if (viewed.length > 0) {
        const viewedBooks = books.filter(b => viewed.includes(b.id));
        const userGenres = new Set<string>();
        
        viewedBooks.forEach(book => {
          book.genres?.forEach(genre => userGenres.add(genre));
        });
        
        // Намиране на книги със същите жанрове
        books.forEach(book => {
          if (!viewed.includes(book.id) && !wishlist.includes(book.id)) {
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
      }
      
      // 2. Популярни книги (по прегледи)
      const popularBooks = books
        .filter(b => !viewed.includes(b.id) && !wishlist.includes(b.id) && b.views && b.views > 50)
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
      
      // 3. Нови книги (публикувани през последните 2 години)
      const newBooks = books
        .filter(b => !viewed.includes(b.id) && !wishlist.includes(b.id) && b.year >= today.getFullYear() - 2)
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
      
      // 4. Книги от същия автор
      if (viewed.length > 0) {
        const viewedBooks = books.filter(b => viewed.includes(b.id));
        const userAuthors = new Set<string>();
        
        viewedBooks.forEach(book => {
          userAuthors.add(book.author);
        });
        
        books.forEach(book => {
          if (!viewed.includes(book.id) && !wishlist.includes(book.id) && userAuthors.has(book.author)) {
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
      
      // Сортиране по score и вземане на топ 6
      const sortedRecs = recs
        .filter((rec, index, self) => 
          index === self.findIndex(r => r.bookId === rec.bookId)
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
      
      setRecommendations(sortedRecs);
    } catch (error) {
      console.error("Грешка при генериране на препоръки:", error);
    }
  };

  // Зареждане на реални събития от Firestore
  const fetchEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const eventsData: Event[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          endTime: data.endTime || '',
          location: data.location || '',
          maxParticipants: data.maxParticipants || 0,
          currentParticipants: data.currentParticipants || 0,
          allowedRoles: data.allowedRoles || [],
          organizer: data.organizer || '',
          participants: data.participants || [],
          imageUrl: data.imageUrl || '',
          tickets: data.tickets || {}
        };
      });
      
      setAllEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  // Извличане на билетите на потребителя
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user) return;
      
      try {
        const userTicketsData: UserTicket[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        for (const event of allEvents) {
          if (event.tickets && event.tickets[user.uid]) {
            const ticket = event.tickets[user.uid];
            const isPast = event.date < today;
            
            userTicketsData.push({
              eventId: event.id,
              ticketId: ticket.ticketId,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              endTime: event.endTime,
              eventLocation: event.location,
              registrationDate: ticket.registrationDate?.toDate?.().toLocaleDateString('bg-BG') || new Date().toLocaleDateString('bg-BG'),
              checkedIn: ticket.checkedIn || false,
              checkedInTime: ticket.checkedInTime?.toDate?.().toLocaleString('bg-BG'),
              eventImageUrl: event.imageUrl,
              isPast
            });
          }
        }
        
        // Сортиране: активни първи, след това изтекли
        userTicketsData.sort((a, b) => {
          if (a.isPast && !b.isPast) return 1;
          if (!a.isPast && b.isPast) return -1;
          return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
        });
        
        setUserTickets(userTicketsData);
        updateStats();
        
      } catch (error) {
        console.error("Error fetching user tickets:", error);
      }
    };

    fetchUserTickets();
  }, [allEvents, user]);

  // 🔥 НОВИ ФУНКЦИИ ЗА КНИГИ

  // Резервиране на книга
  const reserveBook = async (bookId: string) => {
    if (!user || !user.email || !user.displayName) {
      alert('Моля, влезте в профила си!');
      return;
    }

    try {
      setProcessingBook(bookId);
      
      const book = allBooks.find(b => b.id === bookId);
      if (!book) {
        alert('Книгата не е намерена!');
        return;
      }

      // Проверка за налични копия
      if (book.availableCopies <= 0) {
        alert('Няма налични копия от тази книга!');
        return;
      }

      // Проверка дали вече е резервирана
      const alreadyReserved = await reservationService.checkUserReservationForBook(user.uid, bookId);
      if (alreadyReserved) {
        alert('Вече имате активна резервация за тази книга!');
        return;
      }

      // Създаване на резервация
      const reservationData = {
        bookId,
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        borrowPeriod: book.borrowPeriod || 14
      };

      await reservationService.createReservation(reservationData);
      
      // Обновяване на наличните копия
      await bookService.updateBookAvailableCopies(bookId, -1);
      
      // Обновяване на данните
      const updatedReservations = await reservationService.getUserActiveReservations(user.uid);
      setReservations(updatedReservations);
      
      await prepareUserBooks(allBooks, updatedReservations, wishlist, viewedBooks);
      updateStats();
      
      alert(`Успешно резервирахте "${book.title}"! Имате ${book.borrowPeriod || 14} дни да я вземете.`);
      
    } catch (error) {
      console.error("Грешка при резервиране:", error);
      alert("Възникна грешка при резервирането. Опитайте отново.");
    } finally {
      setProcessingBook(null);
    }
  };

  // Отмяна на резервация
  const cancelReservation = async (reservationId: string, bookId: string) => {
    if (!user) return;

    try {
      setProcessingBook(bookId);
      
      await reservationService.cancelReservation(reservationId);
      
      // Връщане на копието
      await bookService.updateBookAvailableCopies(bookId, 1);
      
      // Обновяване на данните
      const updatedReservations = await reservationService.getUserActiveReservations(user.uid);
      setReservations(updatedReservations);
      
      await prepareUserBooks(allBooks, updatedReservations, wishlist, viewedBooks);
      updateStats();
      
      alert("Резервацията е отменена успешно!");
      
    } catch (error) {
      console.error("Грешка при отмяна на резервация:", error);
      alert("Възникна грешка при отмяната. Опитайте отново.");
    } finally {
      setProcessingBook(null);
    }
  };

  // Добавяне/премахване от списъка с желания
  const toggleWishlist = async (bookId: string) => {
    if (!user) {
      alert('Моля, влезте в профила си!');
      return;
    }

    try {
      setProcessingBook(bookId);
      
      const isInWishlist = await wishlistService.isBookInWishlist(user.uid, bookId);
      
      if (isInWishlist) {
        await wishlistService.removeFromWishlist(user.uid, bookId);
      } else {
        await wishlistService.addToWishlist(user.uid, bookId);
      }
      
      // Обновяване на списъка
      const updatedWishlist = await wishlistService.getUserWishlist(user.uid);
      setWishlist(updatedWishlist);
      
      await prepareUserBooks(allBooks, reservations, updatedWishlist, viewedBooks);
      updateStats();
      
    } catch (error) {
      console.error("Грешка при промяна на списъка с желания:", error);
      alert("Възникна грешка. Опитайте отново.");
    } finally {
      setProcessingBook(null);
    }
  };

  // Връщане на книга
  const returnBook = async (bookId: string) => {
    if (!user) return;

    try {
      setProcessingBook(bookId);
      
      await bookService.returnBook(bookId, user.uid);
      
      // Обновяване на всички данни
      const updatedBooks = await bookService.fetchAllBooks();
      setAllBooks(updatedBooks);
      await prepareUserBooks(updatedBooks, reservations, wishlist, viewedBooks);
      updateStats();
      
      alert("Книгата е върната успешно!");
      
    } catch (error) {
      console.error("Грешка при връщане на книга:", error);
      alert("Възникна грешка при връщането. Опитайте отново.");
    } finally {
      setProcessingBook(null);
    }
  };

  // Удължаване на заемане
  const renewBook = async (bookId: string) => {
    if (!user) return;

    try {
      setProcessingBook(bookId);
      
      const book = allBooks.find(b => b.id === bookId);
      if (!book) {
        alert('Книгата не е намерена!');
        return;
      }

      // Проверка за максимален брой удължавания
      const borrowedRecord = book.borrowedBy?.find(b => b.userId === user.uid && !b.returned);
      if (!borrowedRecord) {
        alert('Не сте взели тази книга!');
        return;
      }

      // Удължаване с още 14 дни
      const newDueDate = new Date(borrowedRecord.dueDate);
      newDueDate.setDate(newDueDate.getDate() + 14);
      
      // Актуализиране на записа
      const updatedBorrowedBy = book.borrowedBy?.map(record => {
        if (record.userId === user.uid && !record.returned) {
          return {
            ...record,
            dueDate: newDueDate.toISOString().split('T')[0]
          };
        }
        return record;
      });

      await updateDoc(doc(db, "books", bookId), {
        borrowedBy: updatedBorrowedBy,
        lastUpdated: Timestamp.now()
      });
      
      // Обновяване на данните
      const updatedBooks = await bookService.fetchAllBooks();
      setAllBooks(updatedBooks);
      await prepareUserBooks(updatedBooks, reservations, wishlist, viewedBooks);
      
      alert(`Заемът е удължен до ${formatDate(newDueDate.toISOString().split('T')[0])}.`);
      
    } catch (error) {
      console.error("Грешка при удължаване:", error);
      alert("Възникна грешка. Опитайте отново.");
    } finally {
      setProcessingBook(null);
    }
  };

  // Филтрирани данни
  const filteredUserBooks = useMemo(() => {
    return userBooks.filter(book =>
      book.bookDetails.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.bookDetails.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.bookDetails.genres?.some(g => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
      book.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userBooks, searchTerm]);

  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      const book = allBooks.find(b => b.id === reservation.bookId);
      return book && (
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [reservations, allBooks, searchTerm]);

  const filteredWishlist = useMemo(() => {
    return wishlist
      .map(bookId => allBooks.find(b => b.id === bookId))
      .filter((book): book is BookLibrary => 
        book !== undefined && (
          book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          book.author.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
  }, [wishlist, allBooks, searchTerm]);

  const filteredActiveEvents = activeEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPastEvents = pastEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTickets = userTickets.filter(ticket =>
    ticket.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.eventLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.ticketId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecommendations = recommendations.filter(rec =>
    rec.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Помощни функции
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrowed': return '#10b981';
      case 'reserved': return '#f59e0b';
      case 'wishlist': return '#ec4899';
      case 'viewed': return '#8b5cf6';
      case 'available': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'borrowed': return 'Заета';
      case 'reserved': return 'Резервирана';
      case 'wishlist': return 'Желана';
      case 'viewed': return 'Прегледана';
      case 'available': return 'Налична';
      default: return 'Неизвестен';
    }
  };

  const getAvailableSpots = (event: Event) => {
    return Math.max(0, event.maxParticipants - event.currentParticipants);
  };

  const isEventFull = (event: Event) => {
    return getAvailableSpots(event) <= 0;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'short'
    })} ${timeString}`;
  };

  // Проверка дали потребителят е записан за събитие
  const isUserRegistered = (event: Event): boolean => {
    return user && event.participants ? event.participants.includes(user.uid) : false;
  };

  // Регистриране за събитие
  const registerForEvent = async (eventId: string) => {
    if (!user) {
      alert('Моля, влезте в профила си!');
      return;
    }

    try {
      setProcessingEvent(eventId);
      
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        alert("Събитието не е намерено!");
        return;
      }

      const eventData = eventSnap.data() as Event;

      // Проверка дали вече е записан
      if (isUserRegistered(eventData)) {
        alert("Вече сте записани за това събитие!");
        return;
      }

      // Проверка дали събитието е активно
      const today = new Date().toISOString().split('T')[0];
      if (eventData.date < today) {
        alert("Това събитие е вече изтекло и не можете да се запишете за него!");
        return;
      }

      // Проверка за свободни места
      if (eventData.currentParticipants >= eventData.maxParticipants) {
        alert("Събитието е пълно!");
        return;
      }

      // Генериране на уникален ticket ID
      const ticketId = `TICKET-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      // Подготовка на данни за билета
      const ticketData = {
        ticketId,
        registrationDate: new Date(),
        checkedIn: false
      };

      // Актуализиране на събитието в Firestore с информация за билета
      await updateDoc(eventRef, {
        currentParticipants: eventData.currentParticipants + 1,
        participants: arrayUnion(user.uid),
        [`tickets.${user.uid}`]: ticketData
      });

      // Актуализиране на локалното състояние
      setAllEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                currentParticipants: event.currentParticipants + 1,
                participants: [...(event.participants || []), user.uid],
                tickets: {
                  ...event.tickets,
                  [user.uid]: ticketData
                }
              } 
            : event
        )
      );

      // Актуализиране на билетите на потребителя
      const newTicket: UserTicket = {
        eventId: eventId,
        ticketId: ticketId,
        eventTitle: eventData.title,
        eventDate: eventData.date,
        eventTime: eventData.time,
        endTime: eventData.endTime,
        eventLocation: eventData.location,
        registrationDate: new Date().toLocaleDateString('bg-BG'),
        checkedIn: false,
        eventImageUrl: eventData.imageUrl
      };
      setUserTickets(prev => [...prev, newTicket]);
      updateStats();

      // Показване на билета
      setCurrentTicket(newTicket);
      setShowTicket(true);
      
    } catch (error) {
      console.error("Грешка при записване:", error);
      alert("Възникна грешка при записването. Опитайте отново.");
    } finally {
      setProcessingEvent(null);
    }
  };

  // Отказване от събитие
  const unregisterFromEvent = async (eventId: string) => {
    if (!user) {
      alert('Моля, влезте в профила си!');
      return;
    }

    try {
      setProcessingEvent(eventId);
      
      const eventRef = doc(db, "events", eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        alert("Събитието не е намерено!");
        return;
      }

      const eventData = eventSnap.data() as Event;

      // Проверка дали е записан
      if (!isUserRegistered(eventData)) {
        alert("Не сте записани за това събитие!");
        return;
      }
      
      // Изтриване на билета от локалното състояние
      setUserTickets(prev => prev.filter(ticket => ticket.eventId !== eventId));

      // Подготовка на новия обект за билетите
      let updatedTickets = eventData.tickets ? { ...eventData.tickets } : {};
      
      // Изтриване на билета на потребителя
      if (updatedTickets[user.uid]) {
        delete updatedTickets[user.uid];
      }

      // Актуализиране на събитието в Firestore
      await updateDoc(eventRef, {
        currentParticipants: Math.max(0, eventData.currentParticipants - 1),
        participants: arrayRemove(user.uid),
        tickets: updatedTickets
      });

      // Актуализиране на локалното състояние за събития
      setAllEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { 
                ...event, 
                currentParticipants: Math.max(0, event.currentParticipants - 1),
                participants: event.participants?.filter(uid => uid !== user.uid) || [],
                tickets: updatedTickets
              } 
            : event
        )
      );

      updateStats();
      alert(`Успешно се отписахте от "${eventData.title}"! Билетът ви беше изтрит.`);
      
    } catch (error: any) {
      console.error("Грешка при отписване:", error);
      alert("Възникна грешка при отписването. Опитайте отново.");
    } finally {
      setProcessingEvent(null);
    }
  };

  // Показване на билет за събитие
  const showEventTicket = (ticket: UserTicket) => {
    setCurrentTicket(ticket);
    setShowTicket(true);
  };



  // Принтиране на билет
  const printTicket = () => {
    window.print();
  };

  return (
    <div className="user-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Моят Профил</h1>
          <p>Управление на книги, резервации, събития и билети</p>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder={`Търсене по ${
                activeTab === "overview" ? "всичко" :
                activeTab === "books" ? "заглавие, автор или жанр" : 
                activeTab === "reservations" ? "заглавие или автор (резервации)" : 
                activeTab === "wishlist" ? "заглавие или автор (желани)" : 
                activeTab === "recommendations" ? "заглавие, автор или причина" : 
                activeTab === "activeEvents" ? "заглавие или описание (активни)" : 
                activeTab === "pastEvents" ? "заглавие или описание (изтекли)" : 
                "заглавие, място или ID (билети)"
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <button 
            className={`tab-button ${activeTab === "books" ? "active" : ""}`}
            onClick={() => setActiveTab("books")}
          >
            <BookOpen size={18} />
            Книги ({stats.borrowedBooks})
          </button>
          <button 
            className={`tab-button ${activeTab === "reservations" ? "active" : ""}`}
            onClick={() => setActiveTab("reservations")}
          >
            <Bookmark size={18} />
            Резервации ({stats.reservedBooks})
          </button>
          <button 
            className={`tab-button ${activeTab === "wishlist" ? "active" : ""}`}
            onClick={() => setActiveTab("wishlist")}
          >
            <Heart size={18} />
            Желани ({stats.wishlistCount})
          </button>
          <button 
            className={`tab-button ${activeTab === "recommendations" ? "active" : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            <Sparkles size={18} />
            Препоръки ({recommendations.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "activeEvents" ? "active" : ""}`}
            onClick={() => setActiveTab("activeEvents")}
          >
            <Calendar size={18} />
            Активни събития ({activeEvents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "pastEvents" ? "active" : ""}`}
            onClick={() => setActiveTab("pastEvents")}
          >
            <History size={18} />
            Изтекли събития ({pastEvents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <Ticket size={18} />
            Билети ({userTickets.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="content-section">
            <h2>Добре дошъл, {getUserDisplayName()}!</h2>


            {/* Статистики */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                  <BookOpen size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.borrowedBooks}</div>
                  <div className="stat-label">Заети книги</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                  <Bookmark size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.reservedBooks}</div>
                  <div className="stat-label">Резервации</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#ec489920', color: '#ec4899' }}>
                  <Heart size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.wishlistCount}</div>
                  <div className="stat-label">Желани книги</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}>
                  <Ticket size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.activeTickets}</div>
                  <div className="stat-label">Активни билети</div>
                </div>
              </div>
            </div>

            {/* Препоръки (мини) */}
            {recommendations.length > 0 && (
              <div className="mini-recommendations">
                <h3>Препоръчани за вас</h3>
                <div className="recommendations-mini-grid">
                  {recommendations.slice(0, 3).map(rec => (
                    <div key={rec.bookId} className="mini-rec-card">
                      {rec.coverUrl ? (
                        <img src={rec.coverUrl} alt={rec.title} className="mini-rec-cover" />
                      ) : (
                        <div className="mini-rec-cover-placeholder">
                          <Book size={20} />
                        </div>
                      )}
                      <div className="mini-rec-info">
                        <div className="mini-rec-title">{rec.title}</div>
                        <div className="mini-rec-author">{rec.author}</div>
                        <div className="mini-rec-reason">{rec.reason}</div>
                      </div>
                      <button 
                        className="mini-rec-action"
                        onClick={() => navigate(`/books/${rec.bookId}`)}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Предстоящи събития (мини) */}
            {activeEvents.length > 0 && (
              <div className="upcoming-events">
                <h3>Предстоящи събития</h3>
                <div className="events-mini-list">
                  {activeEvents.slice(0, 3).map(event => {
                    const userRegistered = isUserRegistered(event);
                    return (
                      <div key={event.id} className="mini-event-card">
                        <div className="mini-event-info">
                          <div className="mini-event-title">{event.title}</div>
                          <div className="mini-event-date">
                            <Clock size={12} />
                            {formatDateTime(event.date, event.time)}
                          </div>
                          <div className="mini-event-location">
                            <MapPin size={12} />
                            {event.location}
                          </div>
                        </div>
                        <button
                          className={`register-btn ${userRegistered ? 'unregister-btn' : ''}`}
                          onClick={() => userRegistered ? unregisterFromEvent(event.id) : registerForEvent(event.id)}
                          disabled={processingEvent === event.id}
                        >
                          {processingEvent === event.id ? '...' : userRegistered ? 'Откажи' : 'Запиши се'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Books Tab */}
        {activeTab === "books" && (
          <div className="content-section">
            <h2>Моите Книги</h2>
            <p className="tickets-subtitle">Всички ваши заети, резервирани, желани и прегледани книги</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на книгите...</p>
              </div>
            ) : (
              <>
                {filteredUserBooks.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Книга</th>
                          <th>Автор</th>
                          <th>Статус</th>
                          <th>Срок</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUserBooks.map(userBook => {
                          const book = userBook.bookDetails;
                          const isProcessing = processingBook === book.id;
                          const statusColor = getStatusColor(userBook.status);
                          
                          return (
                            <tr key={book.id}>
                              <td>
                                <div className="book-title">
                                  <BookOpen className="book-icon" />
                                  <div>
                                    <div className="event-title-text">{book.title}</div>
                                    {book.genres && book.genres.length > 0 && (
                                      <div className="book-genres">
                                        {book.genres.slice(0, 2).map(genre => (
                                          <span key={genre} className="genre-tag">{genre}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="book-author">{book.author}</div>
                              </td>
                              <td>
                                <span 
                                  className="status-badge"
                                  style={{
                                    background: `${statusColor}20`,
                                    color: statusColor,
                                    border: `1px solid ${statusColor}40`
                                  }}
                                >
                                  {getStatusText(userBook.status)}
                                </span>
                              </td>
                              <td>
                                {userBook.dueDate && (
                                  <div className="due-date">
                                    <Clock size={14} style={{ marginRight: '8px', color: '#6b7280' }} />
                                    {formatDate(userBook.dueDate)}
                                  </div>
                                )}
                                {userBook.reservationExpiresAt && (
                                  <div className="due-date">
                                    <Bookmark size={14} style={{ marginRight: '8px', color: '#6b7280' }} />
                                    {formatDate(userBook.reservationExpiresAt)}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {userBook.status === 'borrowed' && (
                                    <>
                                      <button
                                        onClick={() => renewBook(book.id)}
                                        className="btn return-btn"
                                        disabled={isProcessing}
                                        title="Удължи заема с 14 дни"
                                      >
                                        <RotateCcw size={16} />
                                        <span>Удължи</span>
                                      </button>
                                      <button
                                        onClick={() => returnBook(book.id)}
                                        className="btn delete-btn"
                                        disabled={isProcessing}
                                        title="Върни книгата"
                                      >
                                        <CheckCircle size={16} />
                                        <span>Върни</span>
                                      </button>
                                    </>
                                  )}
                                  
                                  {userBook.status === 'reserved' && (
                                    <button
                                      onClick={() => {
                                        const reservation = reservations.find(r => r.bookId === book.id);
                                        if (reservation) {
                                          cancelReservation(reservation.id, book.id);
                                        }
                                      }}
                                      className="btn delete-btn"
                                      disabled={isProcessing}
                                      title="Откажи резервацията"
                                    >
                                      <XCircle size={16} />
                                      <span>Откажи</span>
                                    </button>
                                  )}
                                  
                                  {userBook.status === 'wishlist' && (
                                    <button
                                      onClick={() => toggleWishlist(book.id)}
                                      className="btn delete-btn"
                                      disabled={isProcessing}
                                      title="Премахни от желани"
                                    >
                                      <Heart size={16} fill="currentColor" />
                                      <span>Премахни</span>
                                    </button>
                                  )}
                                  
                                  {userBook.status === 'viewed' && (
                                    <>
                                      <button
                                        onClick={() => toggleWishlist(book.id)}
                                        className="btn return-btn"
                                        disabled={isProcessing}
                                        title="Добави в желани"
                                      >
                                        <Heart size={16} />
                                        <span>Желая</span>
                                      </button>
                                      <button
                                        onClick={() => reserveBook(book.id)}
                                        className="btn return-btn"
                                        disabled={isProcessing || book.availableCopies <= 0}
                                        title="Резервирай книгата"
                                      >
                                        <Bookmark size={16} />
                                        <span>Резервирай</span>
                                      </button>
                                    </>
                                  )}
                                  
                                  <button
                                    onClick={() => navigate(`/books/${book.id}`)}
                                    className="btn return-btn"
                                    title="Виж пълна информация"
                                  >
                                    <Eye size={16} />
                                    <span>Детайли</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <BookOpen size={48} />
                    <p>Няма намерени книги</p>
                    <p className="empty-subtext">
                      {searchTerm ? 'Променете критериите за търсене' : 'Запишете или резервирайте книги, за да се появят тук'}
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className="register-btn"
                      style={{ marginTop: '16px' }}
                    >
                      <Book size={16} />
                      Прегледайте каталога
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Active Events Tab */}
        {activeTab === "activeEvents" && (
          <div className="content-section">
            <h2>Активни Събития</h2>
            <p className="tickets-subtitle">Предстоящи събития, за които можете да се запишете</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на събитията...</p>
              </div>
            ) : (
              <>
                {filteredActiveEvents.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table events-table">
                      <thead>
                        <tr>
                          <th className="event-title-header">Събитие</th>
                          <th className="event-desc-header">Описание</th>
                          <th className="event-date-header">Дата и час</th>
                          <th className="event-location-header">Място</th>
                          <th className="event-spots-header">Свободни места</th>
                          <th className="event-status-header">Статус</th>
                          <th className="event-actions-header">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredActiveEvents.map(event => {
                          const userRegistered = isUserRegistered(event);
                          const availableSpots = getAvailableSpots(event);
                          const isFull = isEventFull(event);
                          
                          return (
                            <tr key={event.id}>
                              <td className="event-title-cell">
                                <div className="event-title-content dashboard-event-title">
                                  {event.title}
                                </div>
                              </td>
                              <td className="event-desc-cell">
                                <div 
                                  className="event-description"
                                  dangerouslySetInnerHTML={{ __html: event.description }}
                                />
                              </td>
                              <td className="event-date-cell">
                                <div className="event-date-content">
                                  <Calendar className="date-icon" />
                                  <div>
                                    <div className="event-date-text">{formatDate(event.date)}</div>
                                    <div className="event-time">{event.time} - {event.endTime}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="event-location-cell">
                                <div className="event-location-content">
                                  <MapPin className="location-icon" />
                                  {event.location}
                                </div>
                              </td>
                              <td className="event-spots-cell">
                                <div className="event-spots-content">
                                  <span className={`spots-count ${isFull ? 'spots-full' : ''}`}>
                                    {availableSpots} / {event.maxParticipants}
                                  </span>
                                </div>
                              </td>
                              <td className="event-status-cell">
                                {userRegistered ? (
                                  <span className="status-badge status-active">Записан</span>
                                ) : isFull ? (
                                  <span className="status-badge status-expiring">Пълно</span>
                                ) : (
                                  <span className="status-badge status-returned">Свободно</span>
                                )}
                              </td>
                              <td className="event-actions-cell">
                                <div className="action-buttons">
                                  <button
                                    onClick={() => {
                                      setSelectedEventId(event.id);
                                      setShowEventModal(true);
                                    }}
                                    className="btn return-btn"
                                    title="Виж детайли"
                                  >
                                    <Eye size={16} />
                                    <span>Детайли</span>
                                  </button>
                                  {userRegistered ? (
                                    <button
                                      onClick={() => unregisterFromEvent(event.id)}
                                      className="btn delete-btn"
                                      disabled={processingEvent === event.id}
                                    >
                                      {processingEvent === event.id ? '...' : 'Откажи'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => registerForEvent(event.id)}
                                      className="register-btn"
                                      disabled={processingEvent === event.id || isFull}
                                    >
                                      {processingEvent === event.id ? '...' : 'Запиши се'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Calendar size={48} />
                    <p>Няма активни събития</p>
                    <p className="empty-subtext">
                      {searchTerm ? 'Променете критериите за търсене' : 'В момента няма предстоящи събития'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Past Events Tab */}
        {activeTab === "pastEvents" && (
          <div className="content-section">
            <h2>Изтекли Събития</h2>
            <p className="tickets-subtitle">Събития, които са се състояли вече</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на събитията...</p>
              </div>
            ) : (
              <>
                {filteredPastEvents.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table events-table">
                      <thead>
                        <tr>
                          <th className="event-title-header">Събитие</th>
                          <th className="event-desc-header">Описание</th>
                          <th className="event-date-header">Дата и час</th>
                          <th className="event-location-header">Място</th>
                          <th className="event-spots-header">Участници</th>
                          <th className="event-status-header">Статус</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPastEvents.map(event => {
                          const userRegistered = isUserRegistered(event);
                          
                          return (
                            <tr key={event.id} className="past-event-row">
                              <td className="event-title-cell">
                                <div className="event-title-content dashboard-event-title">
                                  {event.title}
                                  <span className="past-event-badge">Изтекло</span>
                                </div>
                              </td>
                              <td className="event-desc-cell">
                                <div 
                                  className="event-description"
                                  dangerouslySetInnerHTML={{ __html: event.description }}
                                />
                              </td>
                              <td className="event-date-cell">
                                <div className="event-date-content">
                                  <Calendar className="date-icon" />
                                  <div>
                                    <div className="event-date-text">{formatDate(event.date)}</div>
                                    <div className="event-time">{event.time} - {event.endTime}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="event-location-cell">
                                <div className="event-location-content">
                                  <MapPin className="location-icon" />
                                  {event.location}
                                </div>
                              </td>
                              <td className="event-participants-cell">
                                <span className="participants-count">
                                  {event.currentParticipants} / {event.maxParticipants}
                                </span>
                              </td>
                              <td className="event-status-cell">
                                {userRegistered ? (
                                  <span className="status-badge status-past">Участвахте</span>
                                ) : (
                                  <span className="status-badge status-default">Не сте участвали</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <History size={48} />
                    <p>Няма изтекли събития</p>
                    <p className="empty-subtext">
                      {searchTerm ? 'Променете критериите за търсене' : 'Все още няма изтекли събития в системата'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="content-section">
            <div className="section-header">
              <div>
                <h2>Моите Билети</h2>
                <p className="tickets-subtitle">Всички ваши билети за активни и изтекли събития</p>
              </div>
              <div className="ticket-stats">
                <span className="active-tickets">Активни: {stats.activeTickets}</span>
                <span className="past-tickets">Изтекли: {stats.pastTickets}</span>
              </div>
            </div>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на билетите...</p>
              </div>
            ) : (
              <>
                {filteredTickets.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table tickets-table">
                      <thead>
                        <tr>
                          <th>ID на билет</th>
                          <th>Събитие</th>
                          <th>Дата и час</th>
                          <th>Място</th>
                          <th>Регистрация</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map(ticket => (
                          <tr key={ticket.ticketId} className={ticket.isPast ? "past-event-row" : ""}>
                            <td className="ticket-id-cell">
                              <Ticket className="ticket-icon" />
                              <span className="ticket-id">{ticket.ticketId}</span>
                              {ticket.isPast && (
                                <span className="past-indicator">Изтекъл</span>
                              )}
                            </td>
                            <td className="ticket-event-cell">
                              <div className="dashboard-event-title">{ticket.eventTitle}</div>
                            </td>
                            <td className="ticket-date-cell">
                              <div className="ticket-date">{formatDate(ticket.eventDate)}</div>
                              <div className="ticket-time">{ticket.eventTime} - {ticket.endTime}</div>
                            </td>
                            <td className="ticket-location-cell">
                              {ticket.eventLocation}
                            </td>
                            <td className="ticket-registration-cell">
                              {ticket.registrationDate}
                            </td>
                            <td className="ticket-status-cell">
                              {ticket.isPast ? (
                                <span className="status-badge status-past">Изтекъл</span>
                              ) : ticket.checkedIn ? (
                                <span className="status-badge status-active">Проверен</span>
                              ) : (
                                <span className="status-badge status-returned">Очаква се</span>
                              )}
                            </td>
                            <td className="ticket-actions-cell">
                              <div className="action-buttons">
                                <button
                                  onClick={() => showEventTicket(ticket)}
                                  className="view-ticket-btn"
                                >
                                  <Ticket size={14} />
                                  <span>Виж билет</span>
                                </button>
                                
                                {!ticket.isPast && (
                                  <button
                                    onClick={() => {
                                      const event = allEvents.find(e => e.id === ticket.eventId);
                                      if (event) {
                                        unregisterFromEvent(event.id);
                                      }
                                    }}
                                    className="btn delete-btn"
                                    title="Откажи участие"
                                  >
                                    <X size={14} />
                                    <span>Откажи</span>
                                  </button>
                                )}
                                
                                <button
                                  onClick={printTicket}
                                  className="btn return-btn"
                                  title="Принтирай билет"
                                >
                                  <Printer size={14} />
                                  <span>Принтирай</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Ticket size={48} />
                    <p>Нямате билети за събития</p>
                    <p className="empty-subtext">
                      Запишете се за събитие, за да генерирате билет
                    </p>
                    <button
                      onClick={() => navigate('/events')}
                      className="register-btn"
                      style={{ marginTop: '16px' }}
                    >
                      <Calendar size={16} />
                      Вижте предстоящи събития
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === "reservations" && (
          <div className="content-section">
            <h2>Моите Резервации</h2>
            <p className="tickets-subtitle">Активни резервации на книги</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на резервациите...</p>
              </div>
            ) : (
              <>
                {filteredReservations.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Книга</th>
                          <th>Автор</th>
                          <th>Изтича на</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReservations.map(reservation => {
                          const book = allBooks.find(b => b.id === reservation.bookId);
                          if (!book) return null;
                          
                          const isProcessing = processingBook === book.id;
                          const expiresAt = (reservation.expiresAt as any)?.toDate?.()?.toISOString()?.split('T')[0];
                          
                          return (
                            <tr key={reservation.id}>
                              <td>
                                <div className="book-title">
                                  <BookOpen className="book-icon" />
                                  <div className="event-title-text">{book.title}</div>
                                </div>
                              </td>
                              <td>
                                <div className="book-author">{book.author}</div>
                              </td>
                              <td>
                                {expiresAt && (
                                  <div className="due-date">
                                    <Clock size={14} style={{ marginRight: '8px', color: '#6b7280' }} />
                                    {formatDate(expiresAt)}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span className="status-badge status-expiring">Резервирана</span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    onClick={() => cancelReservation(reservation.id, book.id)}
                                    className="btn delete-btn"
                                    disabled={isProcessing}
                                  >
                                    <XCircle size={16} />
                                    <span>Откажи</span>
                                  </button>
                                  <button
                                    onClick={() => navigate(`/books/${book.id}`)}
                                    className="btn return-btn"
                                  >
                                    <Eye size={16} />
                                    <span>Детайли</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Bookmark size={48} />
                    <p>Нямате активни резервации</p>
                    <p className="empty-subtext">
                      Резервирайте книги от каталога, за да се появят тук
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className="register-btn"
                      style={{ marginTop: '16px' }}
                    >
                      <Book size={16} />
                      Прегледайте каталога
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === "wishlist" && (
          <div className="content-section">
            <h2>Желани Книги</h2>
            <p className="tickets-subtitle">Книги, които сте добавили в списъка с желания</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на списъка с желания...</p>
              </div>
            ) : (
              <>
                {filteredWishlist.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Книга</th>
                          <th>Автор</th>
                          <th>Налични копия</th>
                          <th>Статус</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWishlist.map(book => {
                          const isProcessing = processingBook === book.id;
                          
                          return (
                            <tr key={book.id}>
                              <td>
                                <div className="book-title">
                                  <BookOpen className="book-icon" />
                                  <div className="event-title-text">{book.title}</div>
                                </div>
                              </td>
                              <td>
                                <div className="book-author">{book.author}</div>
                              </td>
                              <td>
                                <span className={`spots-count ${book.availableCopies <= 0 ? 'spots-full' : ''}`}>
                                  {book.availableCopies} налични
                                </span>
                              </td>
                              <td>
                                <span 
                                  className="status-badge"
                                  style={{
                                    background: '#ec489920',
                                    color: '#ec4899',
                                    border: '1px solid #ec489940'
                                  }}
                                >
                                  В желани
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  <button
                                    onClick={() => toggleWishlist(book.id)}
                                    className="btn delete-btn"
                                    disabled={isProcessing}
                                  >
                                    <Heart size={16} fill="currentColor" />
                                    <span>Премахни</span>
                                  </button>
                                  {book.availableCopies > 0 && (
                                    <button
                                      onClick={() => reserveBook(book.id)}
                                      className="btn return-btn"
                                      disabled={isProcessing}
                                    >
                                      <Bookmark size={16} />
                                      <span>Резервирай</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`/books/${book.id}`)}
                                    className="btn return-btn"
                                  >
                                    <Eye size={16} />
                                    <span>Детайли</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Heart size={48} />
                    <p>Нямате книги в списъка с желания</p>
                    <p className="empty-subtext">
                      Добавете книги в списъка с желания, за да ги следите
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className="register-btn"
                      style={{ marginTop: '16px' }}
                    >
                      <Book size={16} />
                      Прегледайте каталога
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === "recommendations" && (
          <div className="content-section">
            <h2>Препоръчани Книги</h2>
            <p className="tickets-subtitle">Книги, които може да ви харесат</p>

            {loading ? (
              <div className="loading-cell">
                <div className="spinner"></div>
                <p>Зареждане на препоръките...</p>
              </div>
            ) : (
              <>
                {filteredRecommendations.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Книга</th>
                          <th>Автор</th>
                          <th>Причина</th>
                          <th>Точки</th>
                          <th>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRecommendations.map(rec => (
                          <tr key={rec.bookId}>
                            <td>
                              <div className="book-title">
                                <BookOpen className="book-icon" />
                                <div className="event-title-text">{rec.title}</div>
                              </div>
                            </td>
                            <td>
                              <div className="book-author">{rec.author}</div>
                            </td>
                            <td>
                              <div className="book-reason">{rec.reason}</div>
                            </td>
                            <td>
                              <span className="spots-count">
                                {rec.score} точки
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => navigate(`/books/${rec.bookId}`)}
                                  className="btn return-btn"
                                >
                                  <Eye size={16} />
                                  <span>Детайли</span>
                                </button>
                                {rec.bookDetails?.availableCopies && rec.bookDetails.availableCopies > 0 ? (
                                  <button
                                    onClick={() => reserveBook(rec.bookId)}
                                    className="btn return-btn"
                                  >
                                    <Bookmark size={16} />
                                    <span>Резервирай</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleWishlist(rec.bookId)}
                                    className="btn return-btn"
                                  >
                                    <Heart size={16} />
                                    <span>Желая</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <Sparkles size={48} />
                    <p>Няма препоръки в момента</p>
                    <p className="empty-subtext">
                      Разгледайте повече книги, за да получавате по-точни препоръки
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className="register-btn"
                      style={{ marginTop: '16px' }}
                    >
                      <Book size={16} />
                      Прегледайте каталога
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Модален прозорец за билет */}
      {showTicket && currentTicket && (
        <EventTicketModal
          ticketId={currentTicket.ticketId}
          eventTitle={currentTicket.eventTitle}
          eventDate={currentTicket.eventDate}
          eventTime={currentTicket.eventTime}
          endTime={currentTicket.endTime}
          eventLocation={currentTicket.eventLocation}
          userEmail={user?.email || ""}
          eventImageUrl={currentTicket.eventImageUrl}
          onClose={() => {
            setShowTicket(false);
            setCurrentTicket(null);
          }}
        />
      )}

      {/* Модален прозорец за детайли на събитие */}
      {showEventModal && (
        <EventDetailsModal
          eventId={selectedEventId}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEventId(null);
          }}
          onRegistrationSuccess={(ticketData) => {
            const newUserTicket: UserTicket = {
              eventId: selectedEventId || '',
              ticketId: ticketData.ticketId,
              eventTitle: ticketData.eventTitle,
              eventDate: ticketData.eventDate,
              eventTime: ticketData.eventTime,
              endTime: ticketData.endTime,
              eventLocation: ticketData.eventLocation,
              registrationDate: new Date().toLocaleDateString('bg-BG'),
              checkedIn: false,
              eventImageUrl: ticketData.eventImageUrl
            };
            setUserTickets(prev => [...prev, newUserTicket]);
            updateStats();
            
            setCurrentTicket(newUserTicket);
            setTimeout(() => {
              setShowTicket(true);
            }, 500);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;