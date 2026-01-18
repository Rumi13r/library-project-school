// src/components/Dashboard/LibrarianDashboard.tsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from "firebase/firestore";
import { 
  Calendar, Trash2, Plus, Search, Clock, 
  MapPin, User, Edit, X, Save, Book, UserCheck, 
  Bookmark, Tag, Copy
} from "lucide-react";
import styles from './LibrarianDashboard.module.css';

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
  createdAt: any;
  imageUrl?: string;
  participants: string[];
}

interface BookLibrary {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  description: string;
  copies: number;
  availableCopies: number;
  publishedYear?: number;
  publisher?: string;
  language: string;
  coverUrl: string;
  createdAt: any;
  tags: string[];
  rating: number;
  genres: string[];
  pages?: number;
  location: string;
  condition?: string;
  ageRecommendation?: string;
  featured?: boolean;
  status: string;
  shelfNumber?: string;
  callNumber?: string;
}

interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userEmail: string;
  reservedAt: any;
  status: 'active' | 'completed' | 'cancelled';
  pickupDate?: string;
  returnDate?: string;
}

const LibrarianDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [books, setBooks] = useState<BookLibrary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [activeTab, setActiveTab] = useState<"books" | "events" | "reservations">("books");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Модални прозорци
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Данни за модален прозорец на книга
  const [modalBookData, setModalBookData] = useState<Partial<BookLibrary>>({
    title: "",
    author: "",
    isbn: "",
    category: "",
    description: "",
    copies: 1,
    availableCopies: 1,
    publishedYear: new Date().getFullYear(),
    publisher: "",
    language: "български",
    coverUrl: "",
    tags: [],
    rating: 0,
    genres: [],
    pages: 0,
    location: "Библиотека",
    condition: "good",
    ageRecommendation: "",
    featured: false,
    status: "available"
  });
  
  // Данни за модален прозорец на събитие
  const [modalEventData, setModalEventData] = useState<Partial<Event>>({
    title: "",
    description: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    maxParticipants: 20,
    allowedRoles: ["reader", "librarian"],
    organizer: "",
    imageUrl: "",
    currentParticipants: 0,
    participants: []
  });

  const locationOptions = [
    "1303", "3310", "3301-EOП", "3305-АНП", "библиотека", "Зала Европа", "Комп.каб.-ТЧ", 
    "Физкултура3", "1201", "1202", "1203", "1206", "1408-КК", "1308-КК", 
    "1101", "1102", "1103", "1104", "1105", "1106", "1204", "1205", "1207", 
    "1209", "1301", "1302", "1304", "1305", "1307", "1309", "1401", "1402", 
    "1403", "1404", "1405", "1406", "1407", "1409", "1306"
  ];

  const bookCategories = [
    "Българска класика", "Световна класика", "Съвременна литература", 
    "Исторически романи", "Фантастика", "Фентъзи", "Трилъри", 
    "Романси", "Биографии", "Наука", "Образование", "Детски книги",
    "Поезия", "Драма", "Пътеписи", "Философия", "Психология"
  ];

  const bookGenres = [
    "Роман", "Поезия", "Драма", "Разказ", "Есе", "Биография", "Автобиография",
    "Исторически", "Фантастика", "Фентъзи", "Трилър", "Мистъри", "Романтика",
    "Приключенски", "Хорър", "Научна литература", "Образователна литература",
    "Детска литература", "Младежка литература", "Класика", "Съвременна литература"
  ];
console.log(bookGenres);
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptionsWithMinutes = generateTimeOptions();

  // Зареждане на данни
  const fetchEvents = async () => {
    const snapshot = await getDocs(collection(db, "events"));
    const eventsData: Event[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Event));
    setEvents(eventsData);
  };

  const fetchBooks = async () => {
    const snapshot = await getDocs(collection(db, "books"));
    const booksData: BookLibrary[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as BookLibrary));
    setBooks(booksData);
  };

  const fetchReservations = async () => {
    const snapshot = await getDocs(collection(db, "reservations"));
    const reservationsData: Reservation[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Reservation));
    setReservations(reservationsData);
  };

  useEffect(() => {
    fetchEvents();
    fetchBooks();
    fetchReservations();
  }, []);

  // Модални функции за книги
  const openCreateBookModal = () => {
    setModalMode('create');
    setModalBookData({
      title: "",
      author: "",
      isbn: "",
      category: "",
      description: "",
      copies: 1,
      availableCopies: 1,
      publishedYear: new Date().getFullYear(),
      publisher: "",
      language: "български",
      coverUrl: "",
      tags: [],
      rating: 0,
      genres: [],
      pages: 0,
      location: "Библиотека",
      condition: "good",
      ageRecommendation: "",
      featured: false,
      status: "available"
    });
    setShowBookModal(true);
  };

  const openEditBookModal = (book: BookLibrary) => {
    setModalMode('edit');
    setModalBookData({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      description: book.description,
      copies: book.copies,
      availableCopies: book.availableCopies,
      publishedYear: book.publishedYear,
      publisher: book.publisher,
      language: book.language,
      coverUrl: book.coverUrl,
      tags: book.tags || [],
      rating: book.rating,
      genres: book.genres || [],
      pages: book.pages,
      location: book.location,
      condition: book.condition,
      ageRecommendation: book.ageRecommendation,
      featured: book.featured,
      status: book.status
    });
    setShowBookModal(true);
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setModalBookData({});
  };

  const handleCreateBook = async () => {
    if (!modalBookData.title?.trim() || !modalBookData.author?.trim() || !modalBookData.category) {
      alert("Моля, попълнете заглавие, автор и категория!");
      return;
    }

    try {
      const bookData = {
        ...modalBookData,
        availableCopies: modalBookData.copies || 1,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "books"), bookData);
      
      closeBookModal();
      fetchBooks();
      alert("Книгата е добавена успешно!");
      
    } catch (error) {
      console.error("Грешка при добавяне на книга:", error);
      alert("Грешка при добавяне на книга!");
    }
  };

  const handleUpdateBook = async () => {
    if (!modalBookData.id) return;
    
    if (!modalBookData.title?.trim() || !modalBookData.author?.trim() || !modalBookData.category) {
      alert("Моля, попълнете заглавие, автор и категория!");
      return;
    }

    try {
      await updateDoc(doc(db, "books", modalBookData.id), {
        ...modalBookData,
        updatedAt: Timestamp.now()
      });
      
      closeBookModal();
      fetchBooks();
      alert("Книгата е обновена успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на книга:", error);
      alert("Грешка при обновяване на книга!");
    }
  };

  // Модални функции за събития
  const openCreateEventModal = () => {
    setModalMode('create');
    setModalEventData({
      title: "",
      description: "",
      date: "",
      time: "",
      endTime: "",
      location: "",
      maxParticipants: 20,
      allowedRoles: ["reader", "librarian"],
      organizer: "",
      imageUrl: "",
      currentParticipants: 0,
      participants: []
    });
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    setModalMode('edit');
    setModalEventData({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      endTime: event.endTime,
      location: event.location,
      maxParticipants: event.maxParticipants,
      allowedRoles: event.allowedRoles,
      organizer: event.organizer,
      imageUrl: event.imageUrl || "",
      currentParticipants: event.currentParticipants,
      participants: event.participants || []
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setModalEventData({});
  };

  const handleCreateEvent = async () => {
    if (!modalEventData.title?.trim() || !modalEventData.date || 
        !modalEventData.time || !modalEventData.endTime || !modalEventData.location) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }
    
    try {
      const eventData = {
        ...modalEventData,
        currentParticipants: 0,
        participants: [],
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "events"), eventData);
      
      closeEventModal();
      fetchEvents();
      alert("Събитието е създадено успешно!");
      
    } catch (error) {
      console.error("Грешка при създаване на събитие:", error);
      alert("Грешка при създаване на събитие!");
    }
  };

  const handleUpdateEvent = async () => {
    if (!modalEventData.id) return;
    
    if (!modalEventData.title?.trim() || !modalEventData.date || 
        !modalEventData.time || !modalEventData.endTime || !modalEventData.location) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }

    try {
      await updateDoc(doc(db, "events", modalEventData.id), {
        ...modalEventData,
        updatedAt: Timestamp.now()
      });
      
      closeEventModal();
      fetchEvents();
      alert("Събитието е обновено успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на събитие:", error);
      alert("Грешка при обновяване на събитие!");
    }
  };

  // Други функции
  const deleteBook = async (bookId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете книгата?")) return;
    await deleteDoc(doc(db, "books", bookId));
    fetchBooks();
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете събитието?")) return;
    await deleteDoc(doc(db, "events", eventId));
    fetchEvents();
  };

  const updateReservationStatus = async (reservationId: string, status: Reservation['status']) => {
    await updateDoc(doc(db, "reservations", reservationId), {
      status,
      updatedAt: Timestamp.now()
    });
    fetchReservations();
  };

  // Филтрирани данни
  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      (book.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (book.author?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (book.category?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredEvents = events.filter(event =>
    (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredReservations = reservations.filter(reservation =>
    (reservation.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (reservation.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Helper functions
  const getAvailableSpots = (event: Event) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const isEventFull = (event: Event) => {
    return event.currentParticipants >= event.maxParticipants;
  };

  const getBookReservations = (bookId: string) => {
    return reservations.filter(r => r.bookId === bookId && r.status === 'active');
  };
console.log(getBookReservations);
  return (
    <div className={styles.container}>
      <div className={styles.dashboardContainer}>
        {/* Header */}
        <div className={styles.header}>
          <h1>Библиотекарски Панел</h1>
          <p>Управление на книги, събития и резервации</p>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Търсене по заглавие, автор, име..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsSection}>
          <button 
            className={`${styles.tabButton} ${activeTab === "books" ? styles.active : ""}`}
            onClick={() => setActiveTab("books")}
          >
            <Book size={18} />
            Книги ({books.length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "events" ? styles.active : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Calendar size={18} />
            Събития ({events.length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "reservations" ? styles.active : ""}`}
            onClick={() => setActiveTab("reservations")}
          >
            <Bookmark size={18} />
            Резервации ({reservations.filter(r => r.status === 'active').length})
          </button>
        </div>

        {/* Books Tab */}
        {activeTab === "books" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Управление на Книги</h2>
              <button 
                onClick={openCreateBookModal}
                className={styles.primaryBtn}
              >
                <Plus size={16} />
                Добави Нова Книга
              </button>
            </div>

            {/* Books Grid */}
            <div className={styles.booksGridAdmin}>
              {filteredBooks.map((book) => (
                <div key={book.id} className={styles.bookCardAdmin}>
                  {/* Book Header */}
                  <div className={styles.bookHeaderAdmin}>
                    <div className={styles.bookThumbnailAdmin}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className={styles.bookCoverAdmin} />
                      ) : (
                        <div className={styles.bookImageFallbackAdmin}>
                          <Book className={styles.fallbackIconAdmin} />
                        </div>
                      )}
                    </div>

                    <div className={styles.bookMainInfoAdmin}>
                      <div className={styles.bookTitleSectionAdmin}>
                        <h3 className={styles.bookTitleAdmin}>
                          {book.title}
                        </h3>
                        <p className={styles.bookAuthorAdmin}>{book.author}</p>
                      </div>

                      <div className={styles.bookMetaAdmin}>
                        <div className={styles.bookCategoryAdmin}>
                          <Tag size={14} />
                          <span>{book.category}</span>
                        </div>
                        
                        <div className={styles.bookAvailabilityAdmin}>
                          <Copy size={14} />
                          <span>{book.availableCopies}/{book.copies} копия</span>
                        </div>

                        <div className={styles.bookLocationAdmin}>
                          <MapPin size={14} />
                          <span>{book.location}</span>
                        </div>

                        <div className={styles.bookIsbnAdmin}>
                          <span>ISBN: {book.isbn}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Book Description */}
                  {book.description && (
                    <div className={styles.bookDescriptionAdmin}>
                      <p>{book.description.substring(0, 150)}...</p>
                    </div>
                  )}

                  {/* Book Details */}
                  <div className={styles.bookDetailsAdmin}>
                    <div className={styles.detailsGridAdmin}>
                      <div className={styles.bookDetailAdmin}>
                        <span className={styles.detailLabelAdmin}>Издател:</span>
                        <span className={styles.detailValueAdmin}>{book.publisher || "Няма информация"}</span>
                      </div>
                      <div className={styles.bookDetailAdmin}>
                        <span className={styles.detailLabelAdmin}>Година:</span>
                        <span className={styles.detailValueAdmin}>{book.publishedYear}</span>
                      </div>
                      {book.pages && (
                        <div className={styles.bookDetailAdmin}>
                          <span className={styles.detailLabelAdmin}>Страници:</span>
                          <span className={styles.detailValueAdmin}>{book.pages}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Book Actions */}
                  <div className={styles.bookActionsAdmin}>
                    <div className={styles.adminActionButtons}>
                      <button
                        onClick={() => openEditBookModal(book)}
                        className={styles.editBookBtn}
                        title="Редактирай книга"
                      >
                        <Edit size={16} />
                        <span>Редактирай</span>
                      </button>
                      
                      <button
                        onClick={() => deleteBook(book.id)}
                        className={styles.deleteBookBtn}
                        title="Изтрий книга"
                      >
                        <Trash2 size={16} />
                        <span>Изтрий</span>
                      </button>
                    </div>
                    <div className={styles.bookStatsAdmin}>
                      <div className={styles.statGroupAdmin}>
                        <Book size={14} />
                        <span>ID: {book.id.substring(0, 8)}...</span>
                      </div>
                      <div className={styles.statGroupAdmin}>
                        <Calendar size={14} />
                        <span>Добавена: {
                          book.createdAt
                            ? book.createdAt.toDate().toLocaleDateString('bg-BG')
                            : "Няма дата"
                        }</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredBooks.length === 0 && (
                <div className={styles.emptyState}>
                  <Book size={48} />
                  <p>Няма намерени книги</p>
                  <button 
                    onClick={openCreateBookModal}
                    className={styles.primaryBtn}
                  >
                    <Plus size={16} />
                    Добави първата книга
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Управление на Събития</h2>
              <button 
                onClick={openCreateEventModal}
                className={styles.primaryBtn}
              >
                <Plus size={16} />
                Създай Ново Събитие
              </button>
            </div>

            {/* Events Grid */}
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Заглавие</th>
                    <th>Дата и час</th>
                    <th>Място</th>
                    <th>Участници</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => (
                    <tr key={event.id} className={isEventFull(event) ? styles.eventFull : ''}>
                      <td className={styles.eventInfoCell}>
                        <div className={styles.eventTitleSection}>
                          <div className={styles.eventTitle}>
                            {event.title || "Без заглавие"}
                          </div>
                          <div className={styles.eventDesc}>{event.description || "Без описание"}</div>
                        </div>
                      </td>
                      <td className={styles.eventTimeCell}>
                        <div className={styles.eventTimeDisplay}>
                          <div className={styles.eventDate}>
                            <Calendar size={14} />
                            {event.date ? new Date(event.date).toLocaleDateString('bg-BG') : "Без дата"}
                          </div>
                          <div className={styles.eventTimeRange}>
                            <Clock size={14} />
                            {event.time || "Без час"} - {event.endTime || "Без край"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.eventLocation}>
                          <MapPin size={14} />
                          {event.location || "Без място"}
                        </div>
                      </td>
                      <td>
                        <div className={styles.participantsInfo}>
                          <div className={styles.participantsCount}>
                            <User size={14} />
                            {event.currentParticipants} / {event.maxParticipants}
                          </div>
                          <div className={styles.availableSpots}>
                            Свободни: {getAvailableSpots(event)}
                          </div>
                          {isEventFull(event) && (
                            <div className={styles.fullBadge}>Пълно</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => openEditEventModal(event)}
                            className={styles.editBtn}
                            title="Редактирай"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className={styles.deleteBtn}
                            title="Изтрий"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length === 0 && (
                <div className={styles.emptyState}>
                  <Calendar size={32} />
                  <p>Няма намерени събития</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === "reservations" && (
          <div className={styles.contentSection}>
            <h2>Управление на Резервации</h2>
            
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.activeReservations}`}>
                  <Bookmark size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>
                    {reservations.filter(r => r.status === 'active').length}
                  </div>
                  <div className={styles.statLabel}>Активни резервации</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.completedReservations}`}>
                  <UserCheck size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>
                    {reservations.filter(r => r.status === 'completed').length}
                  </div>
                  <div className={styles.statLabel}>Завършени</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.totalReservations}`}>
                  <Book size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{reservations.length}</div>
                  <div className={styles.statLabel}>Общо резервации</div>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Книга</th>
                    <th>Потребител</th>
                    <th>Дата на резервация</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(reservation => {
                    const book = books.find(b => b.id === reservation.bookId);
                    return (
                      <tr key={reservation.id}>
                        <td>
                          <div className={styles.bookInfo}>
                            <div className={styles.bookTitle}>{book?.title || "Неизвестна книга"}</div>
                            <div className={styles.bookAuthor}>{book?.author || "Неизвестен автор"}</div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.userInfo}>
                            <div className={styles.userName}>{reservation.userName || "Без име"}</div>
                            <div className={styles.userEmail}>{reservation.userEmail || "Без имейл"}</div>
                          </div>
                        </td>
                        <td>
                          {reservation.reservedAt?.toDate 
                            ? new Date(reservation.reservedAt.toDate()).toLocaleDateString('bg-BG')
                            : "Няма дата"
                          }
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}`]}`}>
                            {reservation.status === 'active' ? 'Активна' : 
                             reservation.status === 'completed' ? 'Завършена' : 'Отменена'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            {reservation.status === 'active' && (
                              <>
                                <button
                                  onClick={() => updateReservationStatus(reservation.id, 'completed')}
                                  className={styles.completeBtn}
                                  title="Маркирай като завършена"
                                >
                                  <UserCheck size={16} />
                                </button>
                                <button
                                  onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                                  className={styles.cancelBtn}
                                  title="Откажи резервация"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredReservations.length === 0 && (
                <div className={styles.emptyState}>
                  <Bookmark size={32} />
                  <p>Няма намерени резервации</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Book Modal */}
        {showBookModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.largeModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Добавяне на нова книга' : 'Редактиране на книга'}
                </h3>
                <button onClick={closeBookModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      type="text"
                      placeholder="Заглавие на книгата"
                      value={modalBookData.title || ""}
                      onChange={(e) => setModalBookData({...modalBookData, title: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Автор *</label>
                    <input
                      type="text"
                      placeholder="Автор на книгата"
                      value={modalBookData.author || ""}
                      onChange={(e) => setModalBookData({...modalBookData, author: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Категория *</label>
                    <select
                      value={modalBookData.category || ""}
                      onChange={(e) => setModalBookData({...modalBookData, category: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете категория</option>
                      {bookCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>ISBN</label>
                    <input
                      type="text"
                      placeholder="ISBN номер"
                      value={modalBookData.isbn || ""}
                      onChange={(e) => setModalBookData({...modalBookData, isbn: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Брой копия *</label>
                    <input
                      type="number"
                      min="1"
                      value={modalBookData.copies || 1}
                      onChange={(e) => setModalBookData({
                        ...modalBookData, 
                        copies: parseInt(e.target.value) || 1,
                        availableCopies: parseInt(e.target.value) || 1
                      })}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Година на издаване</label>
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={modalBookData.publishedYear || new Date().getFullYear()}
                      onChange={(e) => setModalBookData({...modalBookData, publishedYear: parseInt(e.target.value)})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Издател</label>
                    <input
                      type="text"
                      placeholder="Издателство"
                      value={modalBookData.publisher || ""}
                      onChange={(e) => setModalBookData({...modalBookData, publisher: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Език</label>
                    <input
                      type="text"
                      placeholder="Напр. Български"
                      value={modalBookData.language || "български"}
                      onChange={(e) => setModalBookData({...modalBookData, language: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Жанрове (разделени със запетая)</label>
                    <input
                      type="text"
                      placeholder="Напр. Фантастика, Приключенски роман"
                      value={modalBookData.genres ? modalBookData.genres.join(', ') : ""}
                      onChange={(e) => setModalBookData({
                        ...modalBookData, 
                        genres: e.target.value.split(',').map(g => g.trim()).filter(g => g)
                      })}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Тагове (разделени със запетая)</label>
                    <input
                      type="text"
                      placeholder="Напр. популярна, бестселър, нова"
                      value={modalBookData.tags ? modalBookData.tags.join(', ') : ""}
                      onChange={(e) => setModalBookData({
                        ...modalBookData, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Брой страници</label>
                    <input
                      type="number"
                      min="1"
                      value={modalBookData.pages || 0}
                      onChange={(e) => setModalBookData({...modalBookData, pages: parseInt(e.target.value) || 0})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Местоположение</label>
                    <input
                      type="text"
                      placeholder="Напр. Основен отдел, Рафт А1"
                      value={modalBookData.location || "Библиотека"}
                      onChange={(e) => setModalBookData({...modalBookData, location: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Състояние</label>
                    <select
                      value={modalBookData.condition || "good"}
                      onChange={(e) => setModalBookData({...modalBookData, condition: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="new">Нова</option>
                      <option value="good">Добра</option>
                      <option value="fair">Задоволителна</option>
                      <option value="poor">Лоша</option>
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Възрастова препоръка</label>
                    <input
                      type="text"
                      placeholder="Напр. 12+"
                      value={modalBookData.ageRecommendation || ""}
                      onChange={(e) => setModalBookData({...modalBookData, ageRecommendation: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Линк към корица</label>
                    <input
                      type="url"
                      placeholder="https://example.com/cover.jpg"
                      value={modalBookData.coverUrl || ""}
                      onChange={(e) => setModalBookData({...modalBookData, coverUrl: e.target.value})}
                      className={styles.modalFormInput}
                    />
                    {modalBookData.coverUrl && (
                      <div className={styles.imagePreview}>
                        <p>Преглед на корицата:</p>
                        <img 
                          src={modalBookData.coverUrl} 
                          alt="Preview" 
                          className={styles.previewImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Описание</label>
                    <textarea
                      placeholder="Описание на книгата"
                      value={modalBookData.description || ""}
                      onChange={(e) => setModalBookData({...modalBookData, description: e.target.value})}
                      className={styles.modalFormInput}
                      rows={4}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <div className={styles.checkboxGroup}>
                      <input
                        type="checkbox"
                        id="featured"
                        checked={modalBookData.featured || false}
                        onChange={(e) => setModalBookData({...modalBookData, featured: e.target.checked})}
                        className={styles.checkboxInput}
                      />
                      <label htmlFor="featured" className={styles.checkboxLabel}>
                        Препоръчана книга
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateBook : handleUpdateBook}
                    disabled={!modalBookData.title?.trim() || !modalBookData.author?.trim() || !modalBookData.category}
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Добави Книга' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeBookModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Modal */}
        {showEventModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.largeModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Създаване на ново събитие' : 'Редактиране на събитие'}
                </h3>
                <button onClick={closeEventModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      type="text"
                      placeholder="Заглавие на събитието"
                      value={modalEventData.title || ""}
                      onChange={(e) => setModalEventData({...modalEventData, title: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Дата *</label>
                    <input
                      type="date"
                      value={modalEventData.date || ""}
                      onChange={(e) => setModalEventData({...modalEventData, date: e.target.value})}
                      className={styles.modalFormInput}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Начален час *</label>
                    <select
                      value={modalEventData.time || ""}
                      onChange={(e) => setModalEventData({...modalEventData, time: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете начален час</option>
                      {timeOptionsWithMinutes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Краен час *</label>
                    <select
                      value={modalEventData.endTime || ""}
                      onChange={(e) => setModalEventData({...modalEventData, endTime: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете краен час</option>
                      {timeOptionsWithMinutes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Място *</label>
                    <select
                      value={modalEventData.location || ""}
                      onChange={(e) => setModalEventData({...modalEventData, location: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете място</option>
                      {locationOptions.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Брой места</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={modalEventData.maxParticipants || 20}
                      onChange={(e) => setModalEventData({
                        ...modalEventData, 
                        maxParticipants: parseInt(e.target.value) || 20
                      })}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Организатор</label>
                    <input
                      type="text"
                      placeholder="Име на организатора"
                      value={modalEventData.organizer || ""}
                      onChange={(e) => setModalEventData({...modalEventData, organizer: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Линк към картинка</label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={modalEventData.imageUrl || ""}
                      onChange={(e) => setModalEventData({...modalEventData, imageUrl: e.target.value})}
                      className={styles.modalFormInput}
                    />
                    {modalEventData.imageUrl && (
                      <div className={styles.imagePreview}>
                        <p>Преглед на картинката:</p>
                        <img 
                          src={modalEventData.imageUrl} 
                          alt="Preview" 
                          className={styles.previewImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Описание</label>
                    <textarea
                      placeholder="Описание на събитието"
                      value={modalEventData.description || ""}
                      onChange={(e) => setModalEventData({...modalEventData, description: e.target.value})}
                      className={styles.modalFormInput}
                      rows={5}
                    />
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateEvent : handleUpdateEvent}
                    disabled={
                      !modalEventData.title?.trim() || 
                      !modalEventData.date || 
                      !modalEventData.time || 
                      !modalEventData.endTime || 
                      !modalEventData.location
                    }
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Създай Събитие' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeEventModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianDashboard;