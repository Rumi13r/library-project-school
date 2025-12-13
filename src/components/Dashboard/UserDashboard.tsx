// src/components/Dashboard/UserDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { BookOpen, Calendar, Search, Trash2, Clock, CheckCircle, User, Ticket, History, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import EventTicketModal from "../EventTicketModal";
import EventDetailsModal from "../../pages/EventDetailsModal";
import { v4 as uuidv4 } from 'uuid';
import './UserDashboard.css';
import '../../pages/EventsPage.css';

interface Book {
  id: string;
  title: string;
  author: string;
  status: 'active' | 'expiring' | 'returned';
  dueDate?: string;
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
  eventImageUrl?: string; 
}

const UserDashboard: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"books" | "activeEvents" | "pastEvents" | "tickets">("activeEvents");
  const [loading, setLoading] = useState(true);
  const [processingEvent, setProcessingEvent] = useState<string | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<{
    ticketId: string;
    eventTitle: string;
    eventDate: string;
    eventTime: string;
    endTime: string;
    eventLocation: string;
    eventImageUrl?: string;
  } | null>(null);
  const [_showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [_newTicket, setNewTicket] = useState<any>(null);
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Изчисляване на активни и изтекли събития
  const { activeEvents, pastEvents } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const active = allEvents
      .filter(event => event.date && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const past = allEvents
      .filter(event => event.date && event.date < today)
      .sort((a, b) => b.date.localeCompare(a.date)); // Най-скорошни първи

    return { activeEvents: active, pastEvents: past };
  }, [allEvents]);

  // Зареждане на книги
  const fetchBooks = async () => {
    const booksData: Book[] = [
      {
        id: '1',
        title: 'Името на вятъра',
        author: 'Патрик Ротфус',
        status: 'active',
        dueDate: '2024-03-15'
      },
      {
        id: '2',
        title: 'Хобитът',
        author: 'Дж. Р. Р. Толкин',
        status: 'expiring',
        dueDate: '2024-02-20'
      },
      {
        id: '3',
        title: 'Уловка-22',
        author: 'Джоузеф Хелър',
        status: 'returned'
      }
    ];
    setBooks(booksData);
  };

  // Зареждане на реални събития от Firestore
  const fetchEvents = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // Извличане на билетите на потребителя
  useEffect(() => {
    const fetchUserTickets = async () => {
      if (!user) return;
      
      try {
        const userTicketsData: UserTicket[] = [];
        for (const event of allEvents) {
          if (event.tickets && event.tickets[user.uid]) {
            const ticket = event.tickets[user.uid];
            userTicketsData.push({
              eventId: event.id,
              ticketId: ticket.ticketId,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              endTime: event.endTime,
              eventLocation: event.location,
              registrationDate: ticket.registrationDate?.toDate().toLocaleDateString('bg-BG') || new Date().toLocaleDateString('bg-BG'),
              checkedIn: ticket.checkedIn,
              eventImageUrl: event.imageUrl
            });
          }
        }
        setUserTickets(userTicketsData);
      } catch (error) {
        console.error("Error fetching user tickets:", error);
      }
    };

    fetchUserTickets();
  }, [allEvents, user]);

  // Автоматично отваряне на модалния прозорец при пренасочване от EventsPage
  useEffect(() => {
    const { eventId, action, fromHomePage, fromEventsPage } = location.state || {};
    console.log('Homepage:', fromHomePage, fromEventsPage);
    if (eventId && action === 'register' && user) {
      console.log('Opening event details modal for event:', eventId);
      
      // Отваряме модалния прозорец с детайли за събитието
      setSelectedEventId(eventId);
      setShowEventModal(true);
      
      // Премахваме state от history
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.state, user, navigate]);

  // Автоматично превключване към таба "Активни събития" ако идваме от EventsPage
  useEffect(() => {
    const { fromEventsPage, fromHomePage } = location.state || {};
    
    if (fromEventsPage || fromHomePage) {
      setActiveTab("activeEvents"); // Автоматично към активни събития
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Проверка дали потребителят е записан за събитие
  const isUserRegistered = (event: Event): boolean => {
    return user && event.participants ? event.participants.includes(user.uid) : false;
  };

  // Регистриране за събитие (само за активни)
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
      setCurrentTicket({
        ticketId,
        eventTitle: eventData.title,
        eventDate: eventData.date,
        eventTime: eventData.time,
        endTime: eventData.endTime,
        eventLocation: eventData.location,
        eventImageUrl: eventData.imageUrl
      });
      setShowTicket(true);
      setShowRegistrationSuccess(true);
      
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

      // Проверка дали събитието е изтекло
      const today = new Date().toISOString().split('T')[0];
      if (eventData.date < today) {
        alert("Това събитие е вече изтекло. Моля, свържете се с организатора за отписване.");
        return;
      }

      // Вземане на ID на билета
      const ticketId = eventData.tickets?.[user.uid]?.ticketId;
      console.log("Ticket ID за изтриване:", ticketId);
      // Първо: Изтриване на билета от локалното състояние
      setUserTickets(prev => prev.filter(ticket => ticket.eventId !== eventId));

      // Второ: Подготовка на новия обект за билетите
      let updatedTickets = eventData.tickets ? { ...eventData.tickets } : {};
      
      // Изтриване на билета на потребителя
      if (updatedTickets[user.uid]) {
        delete updatedTickets[user.uid];
      }

      // Трето: Актуализиране на събитието в Firestore
      await updateDoc(eventRef, {
        currentParticipants: Math.max(0, eventData.currentParticipants - 1),
        participants: arrayRemove(user.uid),
        tickets: updatedTickets
      });

      // Четвърто: Актуализиране на локалното състояние за събития
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
      console.error("Детайли на грешката:", error.message, error.code);
      
      // В случай на грешка, рефрешваме данните
      await fetchEvents();
      alert("Възникна грешка при отписването. Опитайте отново.");
    } finally {
      setProcessingEvent(null);
    }
  };

  // Показване на билет за събитие
  const showEventTicket = (eventId: string) => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event || !user || !event.tickets || !event.tickets[user.uid]) {
      alert("Нямате билет за това събитие!");
      return;
    }

    const ticket = event.tickets[user.uid];
    setCurrentTicket({
      ticketId: ticket.ticketId,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      endTime: event.endTime,
      eventLocation: event.location,
      eventImageUrl: event.imageUrl 
    });
    setShowTicket(true);
  };

  // Обработка на успешно записване от модалния прозорец
  const handleRegistrationSuccess = (ticketData: any) => {
    setNewTicket(ticketData);
    // Обновяваме билетите на потребителя
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
    setShowRegistrationSuccess(true);
    
    // Също така показваме билета
    setCurrentTicket({
      ticketId: ticketData.ticketId,
      eventTitle: ticketData.eventTitle,
      eventDate: ticketData.eventDate,
      eventTime: ticketData.eventTime,
      endTime: ticketData.endTime,
      eventLocation: ticketData.eventLocation,
      eventImageUrl: ticketData.eventImageUrl
    });
    setTimeout(() => {
      setShowTicket(true);
    }, 500);
  };

  useEffect(() => {
    fetchBooks();
    fetchEvents();
  }, []);

  // Връщане на книга
  const returnBook = async (bookId: string) => {
    const updatedBooks = books.map(book => 
      book.id === bookId ? { ...book, status: 'returned' as const, dueDate: undefined } : book
    );
    setBooks(updatedBooks);
  };

  // Филтрирани данни за различните табове
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    ticket.eventLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'expiring': return 'status-expiring';
      case 'returned': return 'status-returned';
      default: return 'status-default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Активна';
      case 'expiring': return 'Изтича скоро';
      case 'returned': return 'Върната';
      default: return 'Неизвестен';
    }
  };

  // Функция за налични места
  const getAvailableSpots = (event: Event) => {
    return Math.max(0, event.maxParticipants - event.currentParticipants);
  };

  // Функция за проверка дали събитието е пълно
  const isEventFull = (event: Event) => {
    return getAvailableSpots(event) <= 0;
  };

  // Функция за форматиране на датата
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="user-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="events-header"> 
          <div className="events-title-section">
            <div className="title-icon-wrapper">
              <User className="events-title-icon" /> 
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Моят Профил</h1> 
              <p className="events-subtitle">
                Управление на книги, събития и билети
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder={`Търсене по ${
                activeTab === "books" ? "заглавие или автор" : 
                activeTab === "activeEvents" ? "заглавие или описание (активни)" : 
                activeTab === "pastEvents" ? "заглавие или описание (изтекли)" : 
                "заглавие или място (билети)"
              }...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Tabs - Променени с нови табове */}
        <div className="tabs-section">
          <button 
            className={`tab-button ${activeTab === "books" ? "active" : ""}`}
            onClick={() => setActiveTab("books")}
          >
            <BookOpen size={18} />
            Моите Книги ({books.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "activeEvents" ? "active" : ""}`}
            onClick={() => setActiveTab("activeEvents")}
          >
            <Calendar size={18} />
            Активни Събития ({activeEvents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "pastEvents" ? "active" : ""}`}
            onClick={() => setActiveTab("pastEvents")}
          >
            <History size={18} />
            Изтекли Събития ({pastEvents.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <Ticket size={18} />
            Моите Билети ({userTickets.length})
          </button>
        </div>

        {/* Books Tab */}
        {activeTab === "books" && (
          <div className="content-section">
            <h2>Моите Книги</h2>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Заглавие</th>
                    <th>Автор</th>
                    <th>Статус</th>
                    <th>Краен срок</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map(book => (
                    <tr key={book.id}>
                      <td className="book-title">
                        <BookOpen className="book-icon" />
                        {book.title}
                      </td>
                      <td className="book-author">{book.author}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(book.status)}`}>
                          {getStatusText(book.status)}
                        </span>
                      </td>
                      <td className="due-date">
                        {book.dueDate || 'Няма'}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {book.status !== 'returned' && (
                            <button
                              onClick={() => returnBook(book.id)}
                              className="return-btn"
                              title="Върни книга"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            className="delete-btn"
                            title="Преглед"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBooks.length === 0 && (
                <div className="empty-state">
                  <BookOpen size={32} />
                  <p>Няма намерени книги</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Активни събития Tab */}
        {activeTab === "activeEvents" && (
          <div className="content-section">
            <h2>Активни Събития</h2>
            <p className="events-subtitle">Тук можете да се записвате за предстоящи събития и да управлявате вашите регистрации</p>

            <div className="table-container">
              <table className="data-table events-table">
                <thead>
                  <tr>
                    <th className="event-title-header">Заглавие</th>
                    <th className="event-desc-header">Описание</th>
                    <th className="event-date-header">Дата и час</th>
                    <th className="event-location-header">Място</th>
                    <th className="event-spots-header">Места</th>
                    <th className="event-status-header">Статус</th>
                    <th className="event-actions-header">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="loading-cell">
                        Зареждане на събития...
                      </td>
                    </tr>
                  ) : (
                    filteredActiveEvents.map(event => {
                      const userRegistered = isUserRegistered(event);
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      const isProcessing = processingEvent === event.id;
                      
                      return (
                        <tr key={event.id}>
                          <td className="event-title-cell">
                            <div className="event-title-content">
                              <strong className="event-title-text">{event.title}</strong>
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
                              <Clock className="date-icon" />
                              <span className="event-date-text">{formatDate(event.date)}</span>
                            </div>
                            <div className="event-time">
                              {event.time} - {event.endTime}
                            </div>
                          </td>
                          <td className="event-location-cell">
                            <div className="event-location-content">
                              <User className="location-icon" />
                              <span>{event.location}</span>
                            </div>
                          </td>
                          <td className="event-spots-cell">
                            <div className="event-spots-content">
                              <span className={`spots-count ${isFull ? 'spots-full' : ''}`}>
                                {availableSpots} свободни от {event.maxParticipants}
                              </span>
                            </div>
                          </td>
                          <td className="event-status-cell">
                            <span className={`status-badge ${userRegistered ? 'status-active' : isFull ? 'status-expiring' : 'status-default'}`}>
                              {userRegistered ? 'Записан' : isFull ? 'Пълно' : 'Свободно'}
                            </span>
                          </td>
                          <td className="event-actions-cell">
                            <div className="action-buttons">
                              {userRegistered ? (
                                <>
                                  <button
                                    onClick={() => showEventTicket(event.id)}
                                    className="view-ticket-btn"
                                    title="Виж билет"
                                  >
                                    Виж билет
                                  </button>
                                  <button
                                    onClick={() => unregisterFromEvent(event.id)}
                                    className="unregister-btn"
                                    disabled={isProcessing}
                                    title="Откажи записването"
                                  >
                                    {isProcessing ? '...' : 'Откажи'}
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => registerForEvent(event.id)}
                                  className="register-btn"
                                  disabled={isFull || isProcessing}
                                  title={isFull ? 'Събитието е пълно' : 'Запиши се'}
                                >
                                  {isProcessing ? '...' : isFull ? 'Пълно' : 'Запиши се'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {!loading && filteredActiveEvents.length === 0 && (
                <div className="empty-state">
                  <Calendar size={32} />
                  <p>Няма активни събития в момента</p>
                  <p className="empty-subtext">Проверете отново по-късно за нови събития</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Изтекли събития Tab */}
        {activeTab === "pastEvents" && (
          <div className="content-section">
            <h2>Изтекли Събития</h2>
            <p className="events-subtitle">История на минали събития, за които не можете да се записвате</p>

            <div className="table-container">
              <table className="data-table events-table">
                <thead>
                  <tr>
                    <th className="event-title-header">Заглавие</th>
                    <th className="event-desc-header">Описание</th>
                    <th className="event-date-header">Дата и час</th>
                    <th className="event-location-header">Място</th>
                    <th className="event-participants-header">Участници</th>
                    <th className="event-status-header">Статус</th>
                    <th className="event-actions-header">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="loading-cell">
                        Зареждане на събития...
                      </td>
                    </tr>
                  ) : (
                    filteredPastEvents.map(event => {
                      const userRegistered = isUserRegistered(event);
                      const today = new Date().toISOString().split('T')[0];
                      const isPast = event.date < today;
                      
                      return (
                        <tr key={event.id}>
                          <td className="event-title-cell">
                            <div className="event-title-content">
                              <strong className="event-title-text">{event.title}</strong>
                              {isPast && (
                                <div className="past-event-badge">
                                  <History size={12} />
                                  <span>Изтекло</span>
                                </div>
                              )}
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
                              <Clock className="date-icon" />
                              <span className="event-date-text">{formatDate(event.date)}</span>
                            </div>
                            <div className="event-time">
                              {event.time} - {event.endTime}
                            </div>
                          </td>
                          <td className="event-location-cell">
                            <div className="event-location-content">
                              <User className="location-icon" />
                              <span>{event.location}</span>
                            </div>
                          </td>
                          <td className="event-participants-cell">
                            <div className="participants-info">
                              <span className="participants-count">
                                {event.currentParticipants} / {event.maxParticipants}
                              </span>
                            </div>
                          </td>
                          <td className="event-status-cell">
                            <span className={`status-badge ${userRegistered ? 'status-active' : 'status-past'}`}>
                              {userRegistered ? 'Участвал' : 'Неуспешен'}
                            </span>
                          </td>
                          <td className="event-actions-cell">
                            <div className="action-buttons">
                              {userRegistered ? (
                                <button
                                  onClick={() => showEventTicket(event.id)}
                                  className="view-ticket-btn"
                                  title="Виж билет"
                                >
                                  Виж билет
                                </button>
                              ) : (
                                <button
                                  className="disabled-btn"
                                  disabled
                                  title="Събитието е изтекло"
                                >
                                  <AlertCircle size={14} />
                                  <span>Изтекло</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {!loading && filteredPastEvents.length === 0 && (
                <div className="empty-state">
                  <History size={32} />
                  <p>Няма изтекли събития</p>
                  <p className="empty-subtext">Всички събития са активни</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="content-section">
            <h2>Моите Билети</h2>
            <p className="tickets-subtitle">Всички ваши билети за активни и изтекли събития</p>

            <div className="table-container">
              <table className="data-table tickets-table">
                <thead>
                  <tr>
                    <th>Билет №</th>
                    <th>Събитие</th>
                    <th>Дата и час</th>
                    <th>Място</th>
                    <th>Дата на регистрация</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {userTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-tickets">
                        <div className="empty-state">
                          <Ticket size={32} />
                          <p>Нямате билети за събития</p>
                          <p className="empty-subtext">Запишете се за събитие, за да генерирате билет</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map(ticket => {
                      const today = new Date().toISOString().split('T')[0];
                      const isPast = ticket.eventDate < today;
                      
                      return (
                        <tr key={ticket.ticketId}>
                          <td className="ticket-id-cell">
                            <Ticket className="ticket-icon" />
                            <span className="ticket-id">{ticket.ticketId}</span>
                          </td>
                          <td className="ticket-event-cell">
                            <strong className="event-title-text">{ticket.eventTitle}</strong>
                            {isPast && (
                              <div className="past-indicator">
                                <History size={10} />
                                <span>Изтекло</span>
                              </div>
                            )}
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
                            <span className={`status-badge ${ticket.checkedIn ? 'status-active' : isPast ? 'status-past' : 'status-default'}`}>
                              {ticket.checkedIn ? 'Проверен' : isPast ? 'Изтекло' : 'Чака проверка'}
                            </span>
                          </td>
                          <td className="ticket-actions-cell">
                            <div className="action-buttons">
                              <button
                                onClick={() => {
                                  setCurrentTicket({
                                    ticketId: ticket.ticketId,
                                    eventTitle: ticket.eventTitle,
                                    eventDate: ticket.eventDate,
                                    eventTime: ticket.eventTime,
                                    endTime: ticket.endTime,
                                    eventLocation: ticket.eventLocation,
                                    eventImageUrl: ticket.eventImageUrl
                                  });
                                  setShowTicket(true);
                                }}
                                className="view-ticket-btn"
                                title="Виж билет"
                              >
                                Виж билет
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {showTicket && currentTicket && user && (
        <EventTicketModal
          ticketId={currentTicket.ticketId}
          eventTitle={currentTicket.eventTitle}
          eventDate={currentTicket.eventDate}
          eventTime={currentTicket.eventTime}
          endTime={currentTicket.endTime}
          eventLocation={currentTicket.eventLocation}
          userEmail={user.email || ""} 
          eventImageUrl={currentTicket.eventImageUrl}
          onClose={() => {
            setShowTicket(false);
            setCurrentTicket(null);
          }}
        />
      )}

      {/* Event Details Modal */}
      {showEventModal && (
        <EventDetailsModal
          eventId={selectedEventId}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEventId(null);
          }}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  );
};

export default UserDashboard;