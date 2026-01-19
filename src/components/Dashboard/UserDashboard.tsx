// src/components/Dashboard/UserDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from "firebase/firestore";
import { 
  BookOpen, Calendar, Search, Clock, CheckCircle, Ticket, History, Heart, Bookmark, 
  RotateCcw, XCircle, Eye, MapPin, X, Printer, Book, Sparkles, Loader2, Home, Bell,
  ArrowRight, ChevronRight, User, Library, Star
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import EventTicketModal from "../EventTicketModal";
import EventDetailsModal from "../../pages/EventDetailsModal";
import { v4 as uuidv4 } from 'uuid';
import styles from './UserDashboard.module.css';

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
    pastTickets: 0,
    totalTickets: 0
  });
  const [userData] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"home" | "books" | "reservations" | "wishlist" | "activeEvents" | "pastEvents" | "tickets" | "recommendations">("home");
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
      .sort((a, b) => b.date.localeCompare(a.date));

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
    
    // ДЕБЪГ: Провери кои книги са заети от този потребител
    const borrowedBooks = booksData.filter(book => 
      book.borrowedBy?.some(b => b.userId === user.uid && !b.returned)
    );
    console.log("📚 Заети книги от потребителя:", borrowedBooks.map(b => ({
      title: b.title,
      borrowedBy: b.borrowedBy?.filter(bb => bb.userId === user.uid && !bb.returned)
    })));
    
    // 2. Зареждане на събития
    await fetchEvents();
    
    // 3. Зареждане на резервации
    const userReservations = await reservationService.getUserActiveReservations(user.uid);
    console.log("📋 Резервации на потребителя:", {
      count: userReservations.length,
      active: userReservations.filter(r => r.status === 'active'),
      fulfilled: userReservations.filter(r => r.status === 'fulfilled')
    });
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
    
  } catch (error) {
    console.error("Грешка при зареждане на данни:", error);
  } finally {
    setLoading(false);
  }
};

    loadAllData();
  }, [user]);

  // Добавете тази функция в компонента:
const debugReservations = () => {
  console.log("🔍 ДЕБЪГ - Резервации:", {
    allReservations: reservations,
    filteredReservations: filteredReservations,
    userBooks: userBooks.filter(b => b.status === 'reserved'),
    user: user?.uid
  });
  
  if (reservations.length > 0) {
    reservations.forEach((res, index) => {
      const book = allBooks.find(b => b.id === res.bookId);
      console.log(`📋 Резервация ${index + 1}:`, {
        reservationId: res.id,
        bookId: res.bookId,
        bookTitle: book?.title || 'Неизвестна книга',
        status: res.status,
        expiresAt: res.expiresAt,
        expiresAtRaw: res.expiresAt,
        userMatch: res.userId === user?.uid
      });
    });
  } else {
    console.log("⚠️ Няма резервации за този потребител");
  }
};

// И извикайте я в useEffect за статистиките:
useEffect(() => {
  const updateStats = () => {
    const borrowedBooks = userBooks.filter(b => b.status === 'borrowed').length;
    const reservedBooks = userBooks.filter(b => b.status === 'reserved').length;
    const wishlistCount = wishlist.length;
    const activeTickets = userTickets.filter(t => !t.isPast).length;
    const pastTickets = userTickets.filter(t => t.isPast).length;
    const totalTickets = userTickets.length;
    
    console.log("📊 Статистики:", {
      borrowedBooks,
      reservedBooks,
      wishlistCount,
      userBooksReserved: userBooks.filter(b => b.status === 'reserved')
    });
    
    // ДЕБЪГ - покажете резервациите
    debugReservations();
    
    setStats({
      borrowedBooks,
      reservedBooks,
      wishlistCount,
      activeTickets,
      pastTickets,
      totalTickets
    });
  };

  updateStats();
}, [userBooks, wishlist, userTickets]);

  // Подготовка на книгите на потребителя
  const prepareUserBooks = async (
  books: BookLibrary[], 
  reservations: Reservation[], 
  wishlistItems: string[], 
  viewed: string[]
) => {
  if (!user) return;
  
  const userBooksData: UserBook[] = [];
  
  // 1. Заети книги (от borrowedBy полето) - ПРОВЕРКА ПЪРВА
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
  
  // 2. Резервирани книги - САМО АКО НЕ СА ВЕЧЕ ЗАЕТИ
  reservations.forEach(reservation => {
    // Първо провери дали книгата вече е добавена като заета
    const alreadyBorrowed = userBooksData.some(ub => 
      ub.bookId === reservation.bookId && ub.status === 'borrowed'
    );
    
    if (alreadyBorrowed) {
      // Ако вече е заета, не я добавяй като резервирана
      return;
    }
    
    const book = books.find(b => b.id === reservation.bookId);
    if (book && reservation.status === 'active') {
      let expiresAtString = '';
      
      // Безопасна обработка на дати
      if (reservation.expiresAt) {
        const expiresAt = reservation.expiresAt as any;
        if (expiresAt.toDate && typeof expiresAt.toDate === 'function') {
          expiresAtString = expiresAt.toDate().toISOString().split('T')[0];
        } else if (expiresAt.seconds) {
          expiresAtString = new Date(expiresAt.seconds * 1000).toISOString().split('T')[0];
        } else if (typeof expiresAt === 'string') {
          expiresAtString = expiresAt;
        } else if (expiresAt instanceof Date) {
          expiresAtString = expiresAt.toISOString().split('T')[0];
        }
      }
      
      userBooksData.push({
        bookId: book.id,
        bookDetails: book,
        status: 'reserved',
        reservationExpiresAt: expiresAtString
      });
    }
  });
  
  // 3. Книги в списъка с желания (само ако не са заети или резервирани)
  wishlistItems.forEach(bookId => {
    // Проверка дали книгата вече е в списъка като заета или резервирана
    const alreadyInList = userBooksData.some(ub => 
      ub.bookId === bookId && (ub.status === 'borrowed' || ub.status === 'reserved')
    );
    
    if (!alreadyInList) {
      const book = books.find(b => b.id === bookId);
      if (book) {
        // Проверка дали книгата вече е в списъка като wishlist
        const alreadyWishlist = userBooksData.some(ub => 
          ub.bookId === bookId && ub.status === 'wishlist'
        );
        
        if (!alreadyWishlist) {
          userBooksData.push({
            bookId: book.id,
            bookDetails: book,
            status: 'wishlist'
          });
        }
      }
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
  
  console.log("📋 Подготвени книги на потребителя:", {
    total: userBooksData.length,
    borrowed: userBooksData.filter(b => b.status === 'borrowed'),
    reserved: userBooksData.filter(b => b.status === 'reserved'),
    wishlist: userBooksData.filter(b => b.status === 'wishlist'),
    viewed: userBooksData.filter(b => b.status === 'viewed'),
    allBooks: userBooksData.map(b => ({
      title: b.bookDetails.title,
      status: b.status,
      bookId: b.bookId
    }))
  });
  
  setUserBooks(userBooksData);
};
// Заемане на вече резервирана книга
const borrowReservedBook = async (bookId: string, reservationId: string) => {
  if (!user) return;

  try {
    setProcessingBook(bookId);
    
    // 1. Намерете книгата и резервацията
    const book = allBooks.find(b => b.id === bookId);
    const reservation = reservations.find(r => r.id === reservationId);
    
    if (!book || !reservation) {
      alert('Грешка при намиране на данните!');
      return;
    }

    // 2. Променете статуса на резервацията на "fulfilled"
    await updateDoc(doc(db, "reservations", reservationId), {
  status: 'fulfilled',
  lastUpdated: Timestamp.now()
});
    
    // 3. Добавете запис за заемане
    const borrowedRecord = {
      userId: user.uid,
      userName: user.displayName || user.email || 'Потребител',
      userEmail: user.email || '',
      borrowedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + (book.borrowPeriod || 14) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      returned: false,
      renewed: false,
      renewalCount: 0
    };

    const updatedBorrowedBy = [...(book.borrowedBy || []), borrowedRecord];
    
    // 4. Актуализирайте книгата в базата данни
    await updateDoc(doc(db, "books", bookId), {
      borrowedBy: updatedBorrowedBy,
      availableCopies: Math.max(0, book.availableCopies - 1),
      lastUpdated: Timestamp.now()
    });

    // 5. Обновете всички данни
    const updatedBooks = await bookService.fetchAllBooks();
    setAllBooks(updatedBooks);
    
    const updatedReservations = await reservationService.getUserActiveReservations(user.uid);
    setReservations(updatedReservations);
    
    await prepareUserBooks(updatedBooks, updatedReservations, wishlist, viewedBooks);
    
    alert(`Книгата "${book.title}" е взета успешно! Върнете я до ${formatDate(borrowedRecord.dueDate)}.`);
    
  } catch (error) {
    console.error("Грешка при заемане на резервирана книга:", error);
    alert("Възникна грешка при заемането. Опитайте отново.");
  } finally {
    setProcessingBook(null);
  }
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
        
      } catch (error) {
        console.error("Error fetching user tickets:", error);
      }
    };

    if (allEvents.length > 0) {
      fetchUserTickets();
    }
  }, [allEvents, user]);

  // Обновяване на статистиките при промяна на данните
  useEffect(() => {
    const updateStats = () => {
      const borrowedBooks = userBooks.filter(b => b.status === 'borrowed').length;
      const reservedBooks = userBooks.filter(b => b.status === 'reserved').length;
      const wishlistCount = wishlist.length;
      const activeTickets = userTickets.filter(t => !t.isPast).length;
      const pastTickets = userTickets.filter(t => t.isPast).length;
      const totalTickets = userTickets.length;
      
      setStats({
        borrowedBooks,
        reservedBooks,
        wishlistCount,
        activeTickets,
        pastTickets,
        totalTickets
      });
    };

    updateStats();
  }, [userBooks, wishlist, userTickets]);

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
console.log(formatDateTime);
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
    <div className={styles.userDashboard}>
      <div className={styles.container}>
        {/* Красив хедър */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.titleIconWrapper}>
              <User className={styles.titleIcon} size={32} />
            </div>
            <div className={styles.titleContent}>
              <h1 className={styles.handwrittenTitle}>Добре дошъл, {getUserDisplayName()}!</h1>
              <p className={styles.subtitle}>
                Управлявайте книгите, резервациите и събитията си на едно място.
              </p>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.suggestBtn}>
              <Sparkles size={18} />
              <span>Предложи подобрение</span>
            </button>
          </div>
        </div>

        {/* Статистики */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <BookOpen size={24} />
            </div>
            <div className={styles.statInfo}>
              <h3>Заети книги</h3>
              <div className={styles.statNumber}>{stats.borrowedBooks}</div>
              <div className={styles.statLabel}>В момента</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <Bookmark size={24} />
            </div>
            <div className={styles.statInfo}>
              <h3>Резервации</h3>
              <div className={styles.statNumber}>{stats.reservedBooks}</div>
              <div className={styles.statLabel}>Изчакващи</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <Heart size={24} />
            </div>
            <div className={styles.statInfo}>
              <h3>Желани книги</h3>
              <div className={styles.statNumber}>{stats.wishlistCount}</div>
              <div className={styles.statLabel}>В списъка</div>
            </div>
          </div>
          
          <div className={styles.statItem}>
            <div className={styles.statIcon}>
              <Ticket size={24} />
            </div>
            <div className={styles.statInfo}>
              <h3>Активни билети</h3>
              <div className={styles.statNumber}>{stats.activeTickets}</div>
              <div className={styles.statLabel}>За събития</div>
            </div>
          </div>
        </div>

        {/* Търсене */}
        <div className={styles.search}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={`Търсене по ${
                activeTab === "home" ? "всичко" :
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
              className={styles.searchInput}
            />
            <div className={styles.searchInfo}>
              <Clock size={14} />
              <span>Реално време</span>
            </div>
          </div>
        </div>

        {/* Табове */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === "home" ? styles.active : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <Home className={styles.tabIcon} size={18} />
            <span>Начало</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "books" ? styles.active : ""}`}
            onClick={() => setActiveTab("books")}
          >
            <BookOpen className={styles.tabIcon} size={18} />
            <span>Книги</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "reservations" ? styles.active : ""}`}
            onClick={() => setActiveTab("reservations")}
          >
            <Bookmark className={styles.tabIcon} size={18} />
            <span>Резервации</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "wishlist" ? styles.active : ""}`}
            onClick={() => setActiveTab("wishlist")}
          >
            <Heart className={styles.tabIcon} size={18} />
            <span>Желани</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "recommendations" ? styles.active : ""}`}
            onClick={() => setActiveTab("recommendations")}
          >
            <Sparkles className={styles.tabIcon} size={18} />
            <span>Препоръки</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "activeEvents" ? styles.active : ""}`}
            onClick={() => setActiveTab("activeEvents")}
          >
            <Calendar className={styles.tabIcon} size={18} />
            <span>Събития</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "pastEvents" ? styles.active : ""}`}
            onClick={() => setActiveTab("pastEvents")}
          >
            <History className={styles.tabIcon} size={18} />
            <span>Изтекли събития</span>
          </button>
          <button 
            className={`${styles.tab} ${activeTab === "tickets" ? styles.active : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <Ticket className={styles.tabIcon} size={18} />
            <span>Билети</span>
          </button>
        </div>

        {/* Home/Overview Tab */}
        {activeTab === "home" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Общ Преглед</h2>
              <p className={styles.sectionSubtitle}>Всичко на едно място за вашата библиотека</p>
            </div>

            {/* Бързи действия */}
            <div className={styles.quickActions}>
              <div className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Library size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Разгледайте каталога</h3>
                  <p>Открийте нови книги и запазете любимите си</p>
                  <button 
                    className={styles.quickActionBtn}
                    onClick={() => navigate('/books')}
                  >
                    <span>Прегледайте</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              
              <div className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Calendar size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Предстоящи събития</h3>
                  <p>Запишете се за интересни библиотечни мероприятия</p>
                  <button 
                    className={styles.quickActionBtn}
                    onClick={() => navigate('/events')}
                  >
                    <span>Вижте всички</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              
              <div className={styles.quickActionCard}>
                <div className={styles.quickActionIcon}>
                  <Star size={24} />
                </div>
                <div className={styles.quickActionContent}>
                  <h3>Препоръки</h3>
                  <p>Книги, които може да харесате</p>
                  <button 
                    className={styles.quickActionBtn}
                    onClick={() => setActiveTab("recommendations")}
                  >
                    <span>Вижте всички</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Препоръки (мини) */}
            {recommendations.length > 0 && (
              <div className={styles.miniRecommendations}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Препоръчани за вас</h3>
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => setActiveTab("recommendations")}
                  >
                    <span>Вижте всички</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className={styles.recommendationsGrid}>
                  {recommendations.slice(0, 3).map(rec => (
                    <div key={rec.bookId} className={styles.miniRecCard}>
                      {rec.coverUrl ? (
                        <img src={rec.coverUrl} alt={rec.title} className={styles.miniRecCover} />
                      ) : (
                        <div className={styles.miniRecCoverPlaceholder}>
                          <Book size={20} />
                        </div>
                      )}
                      <div className={styles.miniRecInfo}>
                        <div className={styles.miniRecTitle}>{rec.title}</div>
                        <div className={styles.miniRecAuthor}>{rec.author}</div>
                        <div className={styles.miniRecReason}>{rec.reason}</div>
                      </div>
                      <button 
                        className={styles.miniRecAction}
                        onClick={() => navigate(`/books/${rec.bookId}`)}
                        title="Виж детайли"
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
              <div className={styles.upcomingEvents}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Предстоящи събития</h3>
                  <button 
                    className={styles.viewAllBtn}
                    onClick={() => setActiveTab("activeEvents")}
                  >
                    <span>Вижте всички</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className={styles.eventsList}>
                  {activeEvents.slice(0, 3).map(event => {
                    const userRegistered = isUserRegistered(event);
                    const availableSpots = getAvailableSpots(event);
                    const isFull = isEventFull(event);
                    
                    return (
                      <div key={event.id} className={styles.miniEventCard}>
                        <div className={styles.miniEventInfo}>
                          <div className={styles.miniEventTitle}>{event.title}</div>
                          <div className={styles.miniEventDateTime}>
                            <div className={styles.miniEventDate}>
                              <Calendar size={14} />
                              <span>{formatDate(event.date)}</span>
                            </div>
                            <div className={styles.eventTime}>{event.time}</div>
                          </div>
                          <div className={styles.miniEventDetails}>
                            <div className={styles.miniEventLocation}>
                              <MapPin size={14} />
                              <span>{event.location}</span>
                            </div>
                            <div className={styles.eventSpots}>
                              <span className={`${styles.spotsCount} ${isFull ? styles.spotsFull : ''}`}>
                                {availableSpots} свободни места
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          className={`${styles.miniEventButton} ${userRegistered ? styles.unregister : ''}`}
                          onClick={() => userRegistered ? unregisterFromEvent(event.id) : registerForEvent(event.id)}
                          disabled={processingEvent === event.id || (!userRegistered && isFull)}
                        >
                          {processingEvent === event.id ? (
                            <>
                              <Loader2 size={16} className={styles.spinner} />
                              <span>Зареждане...</span>
                            </>
                          ) : isFull && !userRegistered ? (
                            <>
                              <XCircle size={16} />
                              <span>Пълно</span>
                            </>
                          ) : userRegistered ? (
                            <>
                              <XCircle size={16} />
                              <span>Откажи</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              <span>Запиши се</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Информационна секция */}
            <div className={styles.infoSection}>
              <div className={styles.infoCard}>
                <div className={styles.infoCardIcon}>
                  <BookOpen size={24} />
                </div>
                <div className={styles.infoCardContent}>
                  <h4>Бързи съвети</h4>
                  <p>Резервирайте книги предварително, за да гарантирате достъп до тях. Удължавайте заемите своевременно.</p>
                </div>
              </div>
              
              <div className={styles.infoCard}>
                <div className={styles.infoCardIcon}>
                  <Calendar size={24} />
                </div>
                <div className={styles.infoCardContent}>
                  <h4>Събития</h4>
                  <p>Записвайте се предварително за събития. Билетите се генерират автоматично след регистрация.</p>
                </div>
              </div>
              
              <div className={styles.infoCard}>
                <div className={styles.infoCardIcon}>
                  <Bell size={24} />
                </div>
                <div className={styles.infoCardContent}>
                  <h4>Нотификации</h4>
                  <p>Получавайте известия за изтичащи заеми и предстоящи събития. Винаги сте в крак с всичко.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Books Tab */}
        {activeTab === "books" && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Моите Книги</h2>
              <p className={styles.sectionSubtitle}>Всички ваши заети, резервирани, желани и прегледани книги</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на книгите...</p>
              </div>
            ) : (
              <>
                {filteredUserBooks.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
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
  console.log(statusColor);
  // Проверка дали има активна резервация за тази книга
  const activeReservation = reservations.find(r => 
    r.bookId === book.id && r.status === 'active'
  );
  
  // Проверка дали книгата е заета от този потребител
  const isBorrowedByUser = book.borrowedBy?.some(b => 
    b.userId === user?.uid && !b.returned
  );
  
  // Актуализиран статус - ако е заета, покажи "заета", а не "резервирана"
  const displayStatus = isBorrowedByUser ? 'borrowed' : userBook.status;
  const displayStatusText = isBorrowedByUser ? 'Заета' : getStatusText(userBook.status);
  
  return (
    <tr key={book.id}>
      <td>
        <div className={styles.bookTitle}>
          <BookOpen className={styles.bookIcon} />
          <div>
            <div className={styles.eventTitleText}>{book.title}</div>
            {book.genres && book.genres.length > 0 && (
              <div className={styles.bookGenres}>
                {book.genres.slice(0, 2).map(genre => (
                  <span key={genre} className={styles.genreTag}>{genre}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </td>
      <td>
        <div className={styles.bookAuthor}>{book.author}</div>
      </td>
      <td>
        <span 
          className={`${styles.badge} ${styles.activeBadge}`}
          style={{
            background: `${getStatusColor(displayStatus)}20`,
            color: getStatusColor(displayStatus),
            border: `1px solid ${getStatusColor(displayStatus)}40`
          }}
        >
          {displayStatusText}
        </span>
      </td>
      <td>
        {/* Покажи датата на връщане, ако книгата е заета */}
        {isBorrowedByUser && book.borrowedBy && (
          <div className={styles.dueDate}>
            <Clock size={14} />
            {(() => {
              const borrowedRecord = book.borrowedBy.find(b => 
                b.userId === user?.uid && !b.returned
              );
              return borrowedRecord?.dueDate 
                ? formatDate(borrowedRecord.dueDate)
                : 'Няма дата';
            })()}
          </div>
        )}
        
        {/* Покажи срока на резервация, ако има активна резервация */}
        {!isBorrowedByUser && activeReservation && userBook.reservationExpiresAt && (
          <div className={styles.dueDate}>
            <Bookmark size={14} />
            {formatDate(userBook.reservationExpiresAt)}
          </div>
        )}
      </td>
      <td>
        <div className={styles.actionButtons}>
          {/* АКО Е ЗАЕТА */}
          {isBorrowedByUser && (
            <>
              <button
                onClick={() => renewBook(book.id)}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={isProcessing}
                title="Удължи заема с 14 дни"
              >
                <RotateCcw size={16} />
                <span>Удължи</span>
              </button>
              <button
                onClick={() => returnBook(book.id)}
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={isProcessing}
                title="Върни книгата"
              >
                <CheckCircle size={16} />
                <span>Върни</span>
              </button>
            </>
          )}
          
          {/* АКО Е РЕЗЕРВИРАНА (И НЕ Е ЗАЕТА) */}
          {!isBorrowedByUser && userBook.status === 'reserved' && activeReservation && (
            <>
              <button
                onClick={() => borrowReservedBook(book.id, activeReservation.id)}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={isProcessing}
                title="Вземи резервираната книга"
              >
                <BookOpen size={16} />
                <span>Вземи</span>
              </button>
              <button
                onClick={() => cancelReservation(activeReservation.id, book.id)}
                className={`${styles.btn} ${styles.btnDanger}`}
                disabled={isProcessing}
                title="Откажи резервацията"
              >
                <XCircle size={16} />
                <span>Откажи</span>
              </button>
            </>
          )}
          
          {/* АКО Е В ЖЕЛАНИ */}
          {!isBorrowedByUser && userBook.status === 'wishlist' && (
            <button
              onClick={() => toggleWishlist(book.id)}
              className={`${styles.btn} ${styles.btnDanger}`}
              disabled={isProcessing}
              title="Премахни от желани"
            >
              <Heart size={16} fill="currentColor" />
              <span>Премахни</span>
            </button>
          )}
          
          {/* АКО Е ПРЕГЛЕДАНА */}
          {!isBorrowedByUser && userBook.status === 'viewed' && (
            <>
              <button
                onClick={() => toggleWishlist(book.id)}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={isProcessing}
                title="Добави в желани"
              >
                <Heart size={16} />
                <span>Желая</span>
              </button>
              <button
                onClick={() => reserveBook(book.id)}
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={isProcessing || book.availableCopies <= 0}
                title="Резервирай книгата"
              >
                <Bookmark size={16} />
                <span>Резервирай</span>
              </button>
            </>
          )}
          
          {/* ВИНАГИ ПОКАЗВАЙ БУТОН ЗА ДЕТАЙЛИ */}
          <button
            onClick={() => navigate(`/books/${book.id}`)}
            className={`${styles.btn} ${styles.btnPrimary}`}
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
                  <div className={styles.empty}>
                    <BookOpen className={styles.emptyIcon} size={48} />
                    <p>Няма намерени книги</p>
                    <p className={styles.emptySubtext}>
                      {searchTerm ? 'Променете критериите за търсене' : 'Запишете или резервирайте книги, за да се появят тук'}
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className={styles.registerBtn}
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Активни Събития</h2>
              <p className={styles.sectionSubtitle}>Предстоящи събития, за които можете да се запишете</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на събитията...</p>
              </div>
            ) : (
              <>
                {filteredActiveEvents.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={`${styles.table} events-table`}>
                      <thead>
                        <tr>
                          <th>Събитие</th>
                          <th>Описание</th>
                          <th>Дата и час</th>
                          <th>Място</th>
                          <th>Свободни места</th>
                          <th>Статус</th>
                          <th>Действия</th>
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
                              <td>
                                <div className={styles.eventDateContent}>
                                  <Calendar className={styles.dateIcon} />
                                  <div>
                                    <div className={styles.eventDateText}>{formatDate(event.date)}</div>
                                    <div className={styles.eventTime}>{event.time} - {event.endTime}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.eventLocationContent}>
                                  <MapPin className={styles.locationIcon} />
                                  {event.location}
                                </div>
                              </td>
                              <td>
                                <div className={styles.eventSpotsContent}>
                                  <span className={`${styles.spotsCount} ${isFull ? styles.spotsFull : ''}`}>
                                    {availableSpots} / {event.maxParticipants}
                                  </span>
                                </div>
                              </td>
                              <td>
                                {userRegistered ? (
                                  <span className={`${styles.badge} ${styles.activeBadge}`}>Записан</span>
                                ) : isFull ? (
                                  <span className={`${styles.badge} ${styles.expiringBadge}`}>Пълно</span>
                                ) : (
                                  <span className={`${styles.badge} ${styles.returnedBadge}`}>Свободно</span>
                                )}
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
                                  <button
                                    onClick={() => {
                                      setSelectedEventId(event.id);
                                      setShowEventModal(true);
                                    }}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    title="Виж детайли"
                                  >
                                    <Eye size={16} />
                                    <span>Детайли</span>
                                  </button>
                                  {userRegistered ? (
                                    <button
                                      onClick={() => unregisterFromEvent(event.id)}
                                      className={`${styles.btn} ${styles.btnDanger}`}
                                      disabled={processingEvent === event.id}
                                    >
                                      {processingEvent === event.id ? '...' : 'Откажи'}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => registerForEvent(event.id)}
                                      className={styles.registerBtn}
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
                  <div className={styles.empty}>
                    <Calendar className={styles.emptyIcon} size={48} />
                    <p>Няма активни събития</p>
                    <p className={styles.emptySubtext}>
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Изтекли Събития</h2>
              <p className={styles.sectionSubtitle}>Събития, които са се състояли вече</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на събитията...</p>
              </div>
            ) : (
              <>
                {filteredPastEvents.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={`${styles.table} events-table`}>
                      <thead>
                        <tr>
                          <th>Събитие</th>
                          <th>Описание</th>
                          <th>Дата и час</th>
                          <th>Място</th>
                          <th>Участници</th>
                          <th>Статус</th>
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
                              <td>
                                <div className={styles.eventDateContent}>
                                  <Calendar className={styles.dateIcon} />
                                  <div>
                                    <div className={styles.eventDateText}>{formatDate(event.date)}</div>
                                    <div className={styles.eventTime}>{event.time} - {event.endTime}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.eventLocationContent}>
                                  <MapPin className={styles.locationIcon} />
                                  {event.location}
                                </div>
                              </td>
                              <td className="event-participants-cell">
                                <span className={styles.participantsCount}>
                                  {event.currentParticipants} / {event.maxParticipants}
                                </span>
                              </td>
                              <td>
                                {userRegistered ? (
                                  <span className={`${styles.badge} ${styles.pastBadge}`}>Участвахте</span>
                                ) : (
                                  <span className={`${styles.badge} ${styles.returnedBadge}`}>Не сте участвали</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.empty}>
                    <History className={styles.emptyIcon} size={48} />
                    <p>Няма изтекли събития</p>
                    <p className={styles.emptySubtext}>
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Моите Билети</h2>
                <p className={styles.sectionSubtitle}>Всички ваши билети за активни и изтекли събития</p>
              </div>
              <div className={styles.ticketStats}>
                <span className={styles.activeTickets}>Активни: {stats.activeTickets}</span>
                <span className={styles.pastTickets}>Изтекли: {stats.pastTickets}</span>
              </div>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на билетите...</p>
              </div>
            ) : (
              <>
                {filteredTickets.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={`${styles.table} tickets-table`}>
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
                          <tr key={ticket.ticketId} className={ticket.isPast ? styles.pastEventRow : ""}>
                            <td className={styles.ticketIdCell}>
                              <Ticket className={styles.ticketIcon} />
                              <span className={styles.ticketId}>{ticket.ticketId}</span>
                              {ticket.isPast && (
                                <span className={styles.pastIndicator}>Изтекъл</span>
                              )}
                            </td>
                            <td className={styles.ticketEventCell}>
                              <div className="dashboard-event-title">{ticket.eventTitle}</div>
                            </td>
                            <td className={styles.ticketDateCell}>
                              <div className={styles.ticketDate}>{formatDate(ticket.eventDate)}</div>
                              <div className={styles.ticketTime}>{ticket.eventTime} - {ticket.endTime}</div>
                            </td>
                            <td className={styles.ticketLocationCell}>
                              {ticket.eventLocation}
                            </td>
                            <td className={styles.ticketRegistrationCell}>
                              {ticket.registrationDate}
                            </td>
                            <td>
                              {ticket.isPast ? (
                                <span className={`${styles.badge} ${styles.pastBadge}`}>Изтекъл</span>
                              ) : ticket.checkedIn ? (
                                <span className={`${styles.badge} ${styles.activeBadge}`}>Проверен</span>
                              ) : (
                                <span className={`${styles.badge} ${styles.returnedBadge}`}>Очаква се</span>
                              )}
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button
                                  onClick={() => showEventTicket(ticket)}
                                  className={`${styles.btn} ${styles.btnPrimary}`}
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
                                    className={`${styles.btn} ${styles.btnDanger}`}
                                    title="Откажи участие"
                                  >
                                    <X size={14} />
                                    <span>Откажи</span>
                                  </button>
                                )}
                                
                                <button
                                  onClick={printTicket}
                                  className={`${styles.btn} ${styles.btnPrimary}`}
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
                  <div className={styles.empty}>
                    <Ticket className={styles.emptyIcon} size={48} />
                    <p>Нямате билети за събития</p>
                    <p className={styles.emptySubtext}>
                      Запишете се за събитие, за да генерирате билет
                    </p>
                    <button
                      onClick={() => navigate('/events')}
                      className={styles.registerBtn}
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Моите Резервации</h2>
              <p className={styles.sectionSubtitle}>Активни резервации на книги</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на резервациите...</p>
              </div>
            ) : (
              <>
                {filteredReservations.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
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
  let expiresAtString = '';
  
  // БЕЗОПАСНА ОБРАБОТКА НА ДАТИ
  if (reservation.expiresAt) {
    // Проверка за Timestamp
    if ('toDate' in reservation.expiresAt && typeof reservation.expiresAt.toDate === 'function') {
      expiresAtString = reservation.expiresAt.toDate().toISOString().split('T')[0];
    } 
    // Проверка за seconds (Firestore Timestamp)
    else if ('seconds' in reservation.expiresAt && reservation.expiresAt.seconds) {
      expiresAtString = new Date(reservation.expiresAt.seconds * 1000).toISOString().split('T')[0];
    }
    // Проверка за ISO стринг
    else if (typeof reservation.expiresAt === 'string') {
      expiresAtString = reservation.expiresAt;
    }
    // Проверка за Date обект
    else if (reservation.expiresAt instanceof Date) {
      expiresAtString = reservation.expiresAt.toISOString().split('T')[0];
    }
  }
  
  return (
    <tr key={reservation.id}>
      <td>
        <div className={styles.bookTitle}>
          <BookOpen className={styles.bookIcon} />
          <div className={styles.eventTitleText}>{book.title}</div>
        </div>
      </td>
      <td>
        <div className={styles.bookAuthor}>{book.author}</div>
      </td>
      <td>
        {expiresAtString ? (
          <div className={styles.dueDate}>
            <Clock size={14} />
            {formatDate(expiresAtString)}
          </div>
        ) : (
          <div className={styles.dueDate}>Няма срок</div>
        )}
      </td>
      <td>
        <span className={`${styles.badge} ${styles.expiringBadge}`}>
          Резервирана
        </span>
      </td>
      <td>
        <div className={styles.actionButtons}>
          <button
            onClick={() => cancelReservation(reservation.id, book.id)}
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={isProcessing}
          >
            <XCircle size={16} />
            <span>Откажи</span>
          </button>
          <button
            onClick={() => navigate(`/books/${book.id}`)}
            className={`${styles.btn} ${styles.btnPrimary}`}
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
                  <div className={styles.empty}>
                    <Bookmark className={styles.emptyIcon} size={48} />
                    <p>Нямате активни резервации</p>
                    <p className={styles.emptySubtext}>
                      Резервирайте книги от каталога, за да се появят тук
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className={styles.registerBtn}
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Желани Книги</h2>
              <p className={styles.sectionSubtitle}>Книги, които сте добавили в списъка с желания</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на списъка с желания...</p>
              </div>
            ) : (
              <>
                {filteredWishlist.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
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
                                <div className={styles.bookTitle}>
                                  <BookOpen className={styles.bookIcon} />
                                  <div className={styles.eventTitleText}>{book.title}</div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.bookAuthor}>{book.author}</div>
                              </td>
                              <td>
                                <span className={`${styles.spotsCount} ${book.availableCopies <= 0 ? styles.spotsFull : ''}`}>
                                  {book.availableCopies} налични
                                </span>
                              </td>
                              <td>
                                <span 
                                  className={`${styles.badge} ${styles.wishlistBadge}`}
                                >
                                  В желани
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
                                  <button
                                    onClick={() => toggleWishlist(book.id)}
                                    className={`${styles.btn} ${styles.btnDanger}`}
                                    disabled={isProcessing}
                                  >
                                    <Heart size={16} fill="currentColor" />
                                    <span>Премахни</span>
                                  </button>
                                  {book.availableCopies > 0 && (
                                    <button
                                      onClick={() => reserveBook(book.id)}
                                      className={`${styles.btn} ${styles.btnPrimary}`}
                                      disabled={isProcessing}
                                    >
                                      <Bookmark size={16} />
                                      <span>Резервирай</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => navigate(`/books/${book.id}`)}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
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
                  <div className={styles.empty}>
                    <Heart className={styles.emptyIcon} size={48} />
                    <p>Нямате книги в списъка с желания</p>
                    <p className={styles.emptySubtext}>
                      Добавете книги в списъка с желания, за да ги следите
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className={styles.registerBtn}
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
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Препоръчани Книги</h2>
              <p className={styles.sectionSubtitle}>Книги, които може да ви харесат</p>
            </div>

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Зареждане на препоръките...</p>
              </div>
            ) : (
              <>
                {filteredRecommendations.length > 0 ? (
                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
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
                              <div className={styles.bookTitle}>
                                <BookOpen className={styles.bookIcon} />
                                <div className={styles.eventTitleText}>{rec.title}</div>
                              </div>
                            </td>
                            <td>
                              <div className={styles.bookAuthor}>{rec.author}</div>
                            </td>
                            <td>
                              <div className={styles.bookReason}>{rec.reason}</div>
                            </td>
                            <td>
                              <span className={styles.spotsCount}>
                                {rec.score} точки
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button
                                  onClick={() => navigate(`/books/${rec.bookId}`)}
                                  className={`${styles.btn} ${styles.btnPrimary}`}
                                >
                                  <Eye size={16} />
                                  <span>Детайли</span>
                                </button>
                                {rec.bookDetails?.availableCopies && rec.bookDetails.availableCopies > 0 ? (
                                  <button
                                    onClick={() => reserveBook(rec.bookId)}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                  >
                                    <Bookmark size={16} />
                                    <span>Резервирай</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleWishlist(rec.bookId)}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
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
                  <div className={styles.empty}>
                    <Sparkles className={styles.emptyIcon} size={48} />
                    <p>Няма препоръки в момента</p>
                    <p className={styles.emptySubtext}>
                      Разгледайте повече книги, за да получавате по-точни препоръки
                    </p>
                    <button
                      onClick={() => navigate('/books')}
                      className={styles.registerBtn}
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