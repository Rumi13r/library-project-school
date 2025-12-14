import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Calendar, Clock, MapPin, User, Users, X, BookOpen, LogIn, CheckCircle, Sparkles, Ticket } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './EventDetailsModal.css';

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

interface EventDetailsModalProps {
  eventId: string | null;
  onClose: () => void;
  onRegistrationSuccess?: (ticketData: any) => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ 
  eventId, 
  onClose,
  onRegistrationSuccess 
}) => {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    } else {
      setEvent(null);
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      if (!eventId) return;
      
      const eventDoc = await getDoc(doc(db, "events", eventId));
      if (eventDoc.exists()) {
        const data = eventDoc.data();
        setEvent({
          id: eventDoc.id,
          ...data
        } as Event);
      } else {
        console.error("Event not found");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching event details:", error);
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login', {
        state: {
          redirectTo: '/dashboard',
          message: 'Моля, влезте в профила си, за да се запишете за това събитие.'
        }
      });
      onClose();
      return;
    }

    if (!event) return;

    try {
      setRegistering(true);
      
      const eventRef = doc(db, "events", event.id);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        alert("Събитието не е намерено!");
        return;
      }

      const eventData = eventSnap.data() as Event;

      // Проверка дали вече е записан
      if (eventData.participants?.includes(user.uid)) {
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

      // Актуализиране на събитието в Firestore
      await updateDoc(eventRef, {
        currentParticipants: eventData.currentParticipants + 1,
        participants: arrayUnion(user.uid),
        [`tickets.${user.uid}`]: ticketData
      });

      // Обновяваме локалния state
      setEvent(prev => prev ? {
        ...prev,
        currentParticipants: prev.currentParticipants + 1,
        participants: [...(prev.participants || []), user.uid],
        tickets: {
          ...(prev.tickets || {}),
          [user.uid]: ticketData
        }
      } : null);

      // Показваме успешно съобщение
      setRegistrationSuccess(true);

      // Изпращаме данните за билета към родителския компонент
      if (onRegistrationSuccess) {
        onRegistrationSuccess({
          ticketId,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          endTime: event.endTime,
          eventLocation: event.location,
          eventImageUrl: event.imageUrl
        });
      }

      // Автоматично затваряне след 2 секунди
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error("Error registering for event:", error);
      alert('Възникна грешка при записването. Моля, опитайте отново.');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getAvailableSpots = () => {
    if (!event) return 0;
    return event.maxParticipants - event.currentParticipants;
  };

  const isEventFull = () => {
    if (!event) return false;
    return event.currentParticipants >= event.maxParticipants;
  };

  const isUserRegistered = () => {
    if (!event || !user) return false;
    return event.participants?.includes(user.uid) || false;
  };

  if (!eventId) return null;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="event-modal-header">
          <button className="close-modal-btn" onClick={onClose}>
            <X size={24} />
          </button>
          <h2 className="modal-title">Детайли за събитието</h2>
          <Sparkles className="modal-sparkle-icon" />
        </div>

        <div className="event-modal-content">
          {loading ? (
            <div className="modal-loading">
              <div className="spinner"></div>
              <span>Зареждане на детайли...</span>
            </div>
          ) : event ? (
            <>
              {/* Success Message */}
              {registrationSuccess && (
                <div className="registration-success-modal">
                  <CheckCircle size={24} />
                  <h3>Успешно записване! 🎉</h3>
                  <p>Записахте се за "{event.title}". Вашият билет е генериран в профила ви.</p>
                  <Ticket size={20} className="ticket-icon" />
                </div>
              )}

              {/* Event Title */}
              <div className="modal-event-title-section">
                <h1>{event.title}</h1>
                <div className="event-meta-row">
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>{event.time} - {event.endTime}</span>
                  </div>
                  <div className="meta-item">
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                  <div className="meta-item">
                    <User size={16} />
                    <span>Организатор: {event.organizer}</span>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              <div className="modal-description-section">
                <h3>📝 Описание</h3>
                <div 
                  className="modal-description-content"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>

              {/* Participants Info */}
              <div className="modal-participants-section">
                <h3>👥 Участници</h3>
                <div className="participants-info-modal">
                  <div className="participants-stats-modal">
                    <Users size={20} />
                    <div className="stats-numbers-modal">
                      <span className="current">{event.currentParticipants}</span>
                      <span className="separator">/</span>
                      <span className="max">{event.maxParticipants}</span>
                    </div>
                  </div>
                  
                  <div className="availability-info-modal">
                    {isEventFull() ? (
                      <div className="full-warning-modal">
                        <span className="status-badge-modal full">Пълно</span>
                        <p>Това събитие е пълно. Можете да се запишете в списъка за изчакване.</p>
                      </div>
                    ) : (
                      <div className="available-info-modal">
                        <span className="status-badge-modal available">Свободни места</span>
                        <p>Има <strong>{getAvailableSpots()}</strong> свободни места за това събитие.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Registration Section */}
              <div className="modal-registration-section">
                {!user ? (
                  <div className="login-required-modal">
                    <div className="login-icon-text">
                      <LogIn size={20} />
                      <span>Изисква се вписване</span>
                    </div>
                    <p>Моля, влезте в профила си, за да се запишете за това събитие.</p>
                    <button 
                      onClick={() => {
                        navigate('/login', { 
                          state: { 
                            redirectTo: '/dashboard',
                            message: 'Моля, влезте в профила си, за да се запишете за събитие.' 
                          }
                        });
                        onClose();
                      }}
                      className="login-btn-modal"
                    >
                      Вход в профил
                    </button>
                  </div>
                ) : isUserRegistered() ? (
                  <div className="already-registered-modal">
                    <CheckCircle size={20} />
                    <h4>🎫 Вече сте записани за това събитие</h4>
                    <p>Можете да видите билета си в таба "Моите Билети".</p>
                    <button 
                      onClick={onClose}
                      className="close-success-btn"
                    >
                      Затвори
                    </button>
                  </div>
                ) : (
                  <div className="registration-form-modal">
                    <div className="user-info-modal">
                      <span>Ще се запишете като: <strong>{user.email}</strong></span>
                    </div>
                    
                    <div className="registration-summary-modal">
                      <div className="summary-item-modal">
                        <span className="label">📅 Дата:</span>
                        <span className="value">{formatDate(event.date)}</span>
                      </div>
                      <div className="summary-item-modal">
                        <span className="label">🕐 Час:</span>
                        <span className="value">{event.time} - {event.endTime}</span>
                      </div>
                      <div className="summary-item-modal">
                        <span className="label">🎟️ Места:</span>
                        <span className={`value ${isEventFull() ? 'full' : 'available'}`}>
                          {isEventFull() ? '0 (Пълно)' : `${getAvailableSpots()} свободни`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleRegister}
                      disabled={registering || isEventFull()}
                      className={`register-btn-modal ${isEventFull() ? 'disabled' : ''}`}
                    >
                      {registering ? (
                        <>
                          <div className="spinner-small"></div>
                          <span>Записване...</span>
                        </>
                      ) : isEventFull() ? (
                        <span>Събитието е пълно</span>
                      ) : (
                        <>
                          <BookOpen size={18} />
                          <span>Запиши се за събитието</span>
                        </>
                      )}
                    </button>

                    <div className="registration-note-modal">
                      <p>💡 Забележка: Записването е задължително. Ако не можете да присъствате, моля отпишете се от таба "Събития".</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="modal-no-event">
              <h3>Събитието не беше намерено</h3>
              <p>Събитието, което търсите, не съществува или е било премахнато.</p>
              <button onClick={onClose} className="close-btn-modal">
                Затвори
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;