import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Calendar, Clock, MapPin, User, Users, X, BookOpen,
  LogIn, CheckCircle, Sparkles, Ticket,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import './EventDetailsModal.css';

interface TicketData {
  ticketId:         string;
  eventTitle:       string;
  eventDate:        string;
  eventTime:        string;
  endTime:          string;
  eventLocation:    string;
  eventImageUrl?:   string;
}

interface AppEvent {
  id:                  string;
  title:               string;
  description:         string;
  date:                string;
  time:                string;
  endTime:             string;
  location:            string;
  maxParticipants:     number;
  currentParticipants: number;
  allowedRoles:        string[];
  organizer:           string;
  participants:        string[];
  imageUrl?:           string;
  tickets?: {
    [userId: string]: {
      ticketId:         string;
      registrationDate: Date;
      checkedIn:        boolean;
    }
  };
}

interface EventDetailsModalProps {
  eventId:                 string | null;
  onClose:                 () => void;
  onRegistrationSuccess?:  (ticketData: TicketData) => void;  // was any
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  eventId, onClose, onRegistrationSuccess,
}) => {
  const [event,               setEvent]               = useState<AppEvent | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [registering,         setRegistering]         = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const { user }  = useAuth();
  const navigate  = useNavigate();

  // ── fetchEventDetails — declared before the useEffect ──────────────────────
  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const snap = await getDoc(doc(db, "events", eventId));
      if (snap.exists()) setEvent({ id:snap.id, ...snap.data() } as AppEvent);
      else console.error("Event not found");
    } catch (e) {
      console.error("Error fetching event:", e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) fetchEventDetails();
    else setEvent(null);
  }, [eventId, fetchEventDetails]);

  const handleRegister = async () => {
    if (!user) {
      navigate('/login', { state:{ redirectTo:'/dashboard', message:'Моля, влезте за да се запишете.' } });
      onClose(); return;
    }
    if (!event) return;
    try {
      setRegistering(true);
      const ref  = doc(db, "events", event.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) { alert("Събитието не е намерено!"); return; }
      const ev   = snap.data() as AppEvent;
      if (ev.participants?.includes(user.uid)) { alert("Вече сте записани!"); return; }
      if (ev.currentParticipants >= ev.maxParticipants) { alert("Събитието е пълно!"); return; }
      const ticketId   = `TICKET-${uuidv4().substring(0,8).toUpperCase()}`;
      const ticketData = { ticketId, registrationDate:new Date(), checkedIn:false };
      await updateDoc(ref, {
        currentParticipants: ev.currentParticipants+1,
        participants: arrayUnion(user.uid),
        [`tickets.${user.uid}`]: ticketData,
      });
      setEvent(prev => prev ? {
        ...prev,
        currentParticipants: prev.currentParticipants+1,
        participants: [...(prev.participants||[]), user.uid],
        tickets: { ...(prev.tickets||{}), [user.uid]:ticketData },
      } : null);
      setRegistrationSuccess(true);
      onRegistrationSuccess?.({
        ticketId, eventTitle:event.title, eventDate:event.date,
        eventTime:event.time, endTime:event.endTime,
        eventLocation:event.location, eventImageUrl:event.imageUrl,
      });
      setTimeout(() => onClose(), 2000);
    } catch (e) {
      console.error("Error registering:", e);
      alert('Грешка при записването. Опитайте отново.');
    } finally { setRegistering(false); }
  };

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const getAvailableSpots = () => !event ? 0 : event.maxParticipants - event.currentParticipants;
  const isEventFull       = () => !event ? false : event.currentParticipants >= event.maxParticipants;
  const isUserRegistered  = () => !event||!user ? false : event.participants?.includes(user.uid)||false;

  if (!eventId) return null;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-container" onClick={e=>e.stopPropagation()}>
        <div className="event-modal-header">
          <button className="close-modal-btn" onClick={onClose}><X size={24}/></button>
          <h2 className="modal-title">Детайли за събитието</h2>
          <Sparkles className="modal-sparkle-icon"/>
        </div>

        <div className="event-modal-content">
          {loading ? (
            <div className="modal-loading"><div className="spinner"/><span>Зареждане...</span></div>
          ) : event ? (
            <>
              {registrationSuccess && (
                <div className="registration-success-modal">
                  <CheckCircle size={24}/>
                  <h3>Успешно записване! 🎉</h3>
                  <p>Записахте се за "{event.title}". Вашият билет е генериран.</p>
                  <Ticket size={20} className="ticket-icon"/>
                </div>
              )}

              <div className="modal-event-title-section">
                <h1>{event.title}</h1>
                <div className="event-meta-row">
                  <div className="meta-item"><Calendar size={16}/><span>{formatDate(event.date)}</span></div>
                  <div className="meta-item"><Clock size={16}/><span>{event.time} - {event.endTime}</span></div>
                  <div className="meta-item"><MapPin size={16}/><span>{event.location}</span></div>
                  <div className="meta-item"><User size={16}/><span>Организатор: {event.organizer}</span></div>
                </div>
              </div>

              <div className="modal-description-section">
                <h3>📝 Описание</h3>
                <div className="modal-description-content" dangerouslySetInnerHTML={{__html:event.description}}/>
              </div>

              <div className="modal-participants-section">
                <h3>👥 Участници</h3>
                <div className="participants-info-modal">
                  <div className="participants-stats-modal">
                    <Users size={20}/>
                    <div className="stats-numbers-modal">
                      <span className="current">{event.currentParticipants}</span>
                      <span className="separator">/</span>
                      <span className="max">{event.maxParticipants}</span>
                    </div>
                  </div>
                  <div className="availability-info-modal">
                    {isEventFull() ? (
                      <div className="full-warning-modal"><span className="status-badge-modal full">Пълно</span><p>Събитието е пълно.</p></div>
                    ) : (
                      <div className="available-info-modal"><span className="status-badge-modal available">Свободни места</span><p>Има <strong>{getAvailableSpots()}</strong> свободни места.</p></div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-registration-section">
                {!user ? (
                  <div className="login-required-modal">
                    <div className="login-icon-text"><LogIn size={20}/><span>Изисква се вписване</span></div>
                    <p>Моля, влезте в профила си.</p>
                    <button onClick={()=>{navigate('/login',{state:{redirectTo:'/dashboard'}});onClose();}} className="login-btn-modal">Вход в профил</button>
                  </div>
                ) : isUserRegistered() ? (
                  <div className="already-registered-modal">
                    <CheckCircle size={20}/>
                    <h4>🎫 Вече сте записани</h4>
                    <button onClick={onClose} className="close-success-btn">Затвори</button>
                  </div>
                ) : (
                  <div className="registration-form-modal">
                    <div className="user-info-modal"><span>Като: <strong>{user.email}</strong></span></div>
                    <div className="registration-summary-modal">
                      <div className="summary-item-modal"><span className="label">📅 Дата:</span><span className="value">{formatDate(event.date)}</span></div>
                      <div className="summary-item-modal"><span className="label">🕐 Час:</span><span className="value">{event.time} - {event.endTime}</span></div>
                      <div className="summary-item-modal"><span className="label">🎟️ Места:</span><span className={`value ${isEventFull()?'full':'available'}`}>{isEventFull()?'0 (Пълно)':`${getAvailableSpots()} свободни`}</span></div>
                    </div>
                    <button onClick={handleRegister} disabled={registering||isEventFull()} className={`register-btn-modal ${isEventFull()?'disabled':''}`}>
                      {registering?<><div className="spinner-small"/><span>Записване...</span></>:isEventFull()?<span>Пълно</span>:<><BookOpen size={18}/><span>Запиши се</span></>}
                    </button>
                    <div className="registration-note-modal"><p>💡 Ако не можете да присъствате, моля отпишете се от таба "Събития".</p></div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="modal-no-event">
              <h3>Събитието не беше намерено</h3>
              <button onClick={onClose} className="close-btn-modal">Затвори</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;