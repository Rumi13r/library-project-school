// src/components/Dashboard/UserDashboard.tsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { BookOpen, Calendar, Search, Trash2, Clock, CheckCircle, User, Ticket } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import EventTicketModal from "../EventTicketModal";
import { v4 as uuidv4 } from 'uuid';
import './UserDashboard.css';

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
  imageUrl?: string; // Добавете това
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
  const [events, setEvents] = useState<Event[]>([]);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"books" | "events" | "tickets">("events"); // Променено на "events" по подразбиране
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
  eventImageUrl?: string; // Добавете това
} | null>(null);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
    imageUrl: data.imageUrl || '', // Добавете това
    tickets: data.tickets || {}
        };
      });
      
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  // Извличане на билетите на потребителя
  useEffect(() => {
    if (user && events.length > 0) {
      const tickets: UserTicket[] = [];
      events.forEach(event => {
        if (event.tickets && event.tickets[user.uid]) {
          const ticket = event.tickets[user.uid];
          tickets.push({
  eventId: event.id,
  ticketId: ticket.ticketId,
  eventTitle: event.title,
  eventDate: event.date,
  eventTime: event.time,
  endTime: event.endTime,
  eventLocation: event.location,
  registrationDate: ticket.registrationDate?.toDate?.().toLocaleDateString('bg-BG') || new Date().toLocaleDateString('bg-BG'),
  checkedIn: ticket.checkedIn || false,
  eventImageUrl: event.imageUrl // Добавете това
});
        }
      });
      setUserTickets(tickets);
    }
  }, [events, user]);

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
      setEvents(prevEvents => 
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
        checkedIn: false
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
  eventImageUrl: eventData.imageUrl // Добавете това
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

      // Вземане на ID на билета
      const ticketId = eventData.tickets?.[user.uid]?.ticketId;
console.log("Unregistering Ticket ID:", ticketId);
      // ПЪРВО: Изтриване на билета от локалното състояние
      setUserTickets(prev => prev.filter(ticket => ticket.eventId !== eventId));

      // ВТОРО: Подготовка на новия обект за билетите
      let updatedTickets = eventData.tickets ? { ...eventData.tickets } : {};
      
      // Изтриване на билета на потребителя
      if (updatedTickets[user.uid]) {
        delete updatedTickets[user.uid];
      }

      // ТРЕТО: Актуализиране на събитието в Firestore
      await updateDoc(eventRef, {
        currentParticipants: Math.max(0, eventData.currentParticipants - 1),
        participants: arrayRemove(user.uid),
        tickets: updatedTickets
      });

      // ЧЕТВЪРТО: Актуализиране на локалното състояние за събития
      setEvents(prevEvents => 
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
    const event = events.find(e => e.id === eventId);
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

  // Автоматично записване при пренасочване от EventsPage
  useEffect(() => {
    const { eventId, action } = location.state || {};
    
    if (eventId && action === 'register' && user) {
      console.log('Auto-registering for event:', eventId);
      
      const autoRegister = async () => {
        // Проверка дали вече е записан
        const eventToRegister = events.find(event => event.id === eventId);
        if (eventToRegister && !isUserRegistered(eventToRegister)) {
          await registerForEvent(eventId);
        }
        
        // Премахване на state от history
        navigate('/dashboard', { replace: true, state: {} });
      };

      if (events.length > 0) {
        autoRegister();
      }
    }
  }, [location.state, user, events, navigate]);

  // Автоматично превключване към таба "Събития" ако идваме от EventsPage
  useEffect(() => {
    if (location.state?.fromEventsPage) {
      setActiveTab("events");
      // Премахваме флага
      navigate('/dashboard', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

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

  // Филтрирани данни
  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvents = events.filter(event =>
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

  // Променихме и бутона за записване в EventsPage да изпраща флаг
  // update в EventsPage компонента:
  const handleEventRegistration = (event: Event) => {
    navigate('/dashboard', { 
      state: { 
        eventId: event.id,
        action: 'register',
        fromEventsPage: true // ДОБАВЕНО: Флаг, че идваме от EventsPage
      }
    });
  };
console.log("Rendering UserDashboard with:", { handleEventRegistration});  
  return (
    <div className="user-dashboard">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Моят Профил</h1>
          
          {/* Банер за успешно записване */}
          {showRegistrationSuccess && (
            <div className="registration-success-banner">
              <CheckCircle size={20} />
              <span>Успешно се записахте за събитие! Вашият билет е готов.</span>
              <button 
                onClick={() => setShowRegistrationSuccess(false)}
                className="close-banner-btn"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder={`Търсене по ${
                activeTab === "books" ? "заглавие или автор" : 
                activeTab === "events" ? "заглавие или описание" : 
                "заглавие или място"
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
            Моите Книги ({books.length})
          </button>
          <button 
            className={`tab-button ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Calendar size={18} />
            Събития ({events.length})
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

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="content-section">
            <h2>Събития</h2>
            <p className="events-subtitle">Тук можете да се записвате за събития и да управлявате вашите регистрации</p>

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
                    filteredEvents.map(event => {
                      const userRegistered = isUserRegistered(event);
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      const isProcessing = processingEvent === event.id;
                      
                      return (
                        <tr key={event.id}>
                          <td className="event-title-cell">
                            <div className="event-title-content">
                              <strong>{event.title}</strong>
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
                              <span className="event-date-text">{event.date}</span>
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
              {!loading && filteredEvents.length === 0 && (
                <div className="empty-state">
                  <Calendar size={32} />
                  <p>Няма намерени събития</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === "tickets" && (
          <div className="content-section">
            <h2>Моите Билети</h2>
            <p className="tickets-subtitle">Всички ваши билети за предстоящи събития</p>

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
                    filteredTickets.map(ticket => (
                      <tr key={ticket.ticketId}>
                        <td className="ticket-id-cell">
                          <Ticket className="ticket-icon" />
                          <span className="ticket-id">{ticket.ticketId}</span>
                        </td>
                        <td className="ticket-event-cell">
                          <strong>{ticket.eventTitle}</strong>
                        </td>
                        <td className="ticket-date-cell">
                          <div className="ticket-date">{ticket.eventDate}</div>
                          <div className="ticket-time">{ticket.eventTime} - {ticket.endTime}</div>
                        </td>
                        <td className="ticket-location-cell">
                          {ticket.eventLocation}
                        </td>
                        <td className="ticket-registration-cell">
                          {ticket.registrationDate}
                        </td>
                        <td className="ticket-status-cell">
                          <span className={`status-badge ${ticket.checkedIn ? 'status-active' : 'status-default'}`}>
                            {ticket.checkedIn ? 'Проверен' : 'Чака проверка'}
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
  eventImageUrl: ticket.eventImageUrl // Добавете това
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
                    ))
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
    userName={user.displayName || "Потребител"}
    userEmail={user.email || ""}
    eventImageUrl={currentTicket.eventImageUrl} // Това вече ще има стойност
    onClose={() => {
      setShowTicket(false);
      setCurrentTicket(null);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;