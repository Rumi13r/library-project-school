// src/components/Dashboard/EventsTab.tsx
import React from 'react';
import {
  Calendar, Edit, Trash2, Clock, MapPin, User,
  Plus, Users, Archive,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

// Firestore timestamp shape (same pattern as AdminDashboard/LibrarianDashboard)
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface LibraryEvent {
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
  createdAt:           FSDate;   
  imageUrl?:           string;
  participants:        string[];
}

interface EventsTabProps {
  events:    LibraryEvent[];
  searchTerm:string;
  onEdit:    (event: LibraryEvent) => void;
  onDelete:  (eventId: string) => void;
  onAdd:     () => void;
}

// ── Helper ────────────────────────────────────────────────────────────────────

const formatEventDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('bg-BG', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

// ── Component ─────────────────────────────────────────────────────────────────

const EventsTab: React.FC<EventsTabProps> = ({
  events, searchTerm, onEdit, onDelete, onAdd,
}) => {

  const filtered = events.filter(e => {
    const q = searchTerm.toLowerCase();
    return (
      e.title?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.organizer?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q)
    );
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [...filtered]
    .filter(e => new Date(e.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = [...filtered]
    .filter(e => new Date(e.date) < today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isEventFull = (e: LibraryEvent) => e.currentParticipants >= e.maxParticipants;
  const getAvailable = (e: LibraryEvent) => e.maxParticipants - e.currentParticipants;

  const isSoon = (dateStr: string) => {
    const d = new Date(dateStr);
    const week = new Date(); week.setDate(week.getDate() + 7);
    return d >= today && d <= week;
  };

  if (filtered.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <div className={styles.headerLeft}>
            <h2>Управление на събития</h2>
            <span className={styles.eventCount}>{events.length} общо</span>
          </div>
          <button onClick={onAdd} className={styles.primaryBtn}>
            <Plus size={16}/> Създай събитие
          </button>
        </div>
        <div className={styles.emptyState}>
          <Calendar size={48}/>
          <h3>Няма намерени събития</h3>
          <p>{searchTerm ? `Няма резултати за "${searchTerm}"` : 'Все още няма създадени събития'}</p>
          <button onClick={onAdd} className={styles.primaryBtn}>
            <Plus size={16}/> Създай първото събитие
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.tabHeader}>
        <div className={styles.headerLeft}>
          <h2>Управление на събития</h2>
          <div className={styles.eventCounts}>
            <span className={styles.upcomingCount}>{upcoming.length} предстоящи</span>
            <span className={styles.pastCount}>{past.length} минали</span>
          </div>
        </div>
        <button onClick={onAdd} className={styles.primaryBtn}>
          <Plus size={16}/> Създай събитие
        </button>
      </div>

      {/* Предстоящи */}
      {upcoming.length > 0 && (
        <div className={styles.eventsSection}>
          <h3 className={styles.sectionTitle}><Calendar size={18}/>Предстоящи събития</h3>
          <div className={styles.eventsGrid}>
            {upcoming.map(event => (
              <div
                key={event.id}
                className={`${styles.eventCard} ${isSoon(event.date) ? styles.soon : ''}`}
              >
                <div className={styles.eventDateBadge}>
                  <span className={styles.eventDay}>{new Date(event.date).getDate()}</span>
                  <span className={styles.eventMonth}>
                    {new Date(event.date).toLocaleDateString('bg-BG', { month: 'short' })}
                  </span>
                </div>

                <div className={styles.eventMainInfo}>
                  <div className={styles.eventHeader}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    {isSoon(event.date) && <span className={styles.soonBadge}>Скоро</span>}
                  </div>

                  {event.description && (
                    <p className={styles.eventDescription}>
                      {event.description.length > 100
                        ? `${event.description.substring(0, 100)}...`
                        : event.description}
                    </p>
                  )}

                  <div className={styles.eventDetails}>
                    <div className={styles.eventDetail}><Clock size={14}/><span>{event.time} - {event.endTime}</span></div>
                    <div className={styles.eventDetail}><MapPin size={14}/><span>{event.location}</span></div>
                    <div className={styles.eventDetail}><User size={14}/><span>{event.organizer || 'Организатор'}</span></div>
                  </div>

                  <div className={styles.eventParticipants}>
                    <div className={styles.participantsBar}>
                      <div className={styles.participantsFill}
                        style={{ width:`${(event.currentParticipants/event.maxParticipants)*100}%` }} />
                    </div>
                    <div className={styles.participantsInfo}>
                      <Users size={14}/>
                      <span>{event.currentParticipants} / {event.maxParticipants}</span>
                      {isEventFull(event)
                        ? <span className={styles.fullBadge}>Пълно</span>
                        : <span className={styles.availableSpots}>({getAvailable(event)} свободни)</span>
                      }
                    </div>
                  </div>
                </div>

                <div className={styles.eventActions}>
                  <button onClick={() => onEdit(event)} className={styles.editBtn} title="Редактирай"><Edit size={16}/></button>
                  <button onClick={() => onDelete(event.id)} className={styles.deleteBtn} title="Изтрий"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Минали */}
      {past.length > 0 && (
        <div className={styles.eventsSection}>
          <h3 className={styles.sectionTitle}><Archive size={18}/>Минали събития</h3>
          <div className={styles.pastEventsGrid}>
            {past.map(event => (
              <div key={event.id} className={`${styles.eventCard} ${styles.pastEvent}`}>
                <div className={styles.eventDateCompact}>
                  <span className={styles.eventDateNum}>{new Date(event.date).getDate()}</span>
                  <span className={styles.eventDateMonth}>
                    {new Date(event.date).toLocaleDateString('bg-BG', { month: 'short' })}
                  </span>
                </div>

                <div className={styles.eventCompactInfo}>
                  <h4 className={styles.eventTitle}>{event.title}</h4>
                  <div className={styles.eventMeta}>
                    <span className={styles.eventLocation}><MapPin size={12}/>{event.location}</span>
                    <span className={styles.eventAttendance}><User size={12}/>{event.currentParticipants}/{event.maxParticipants}</span>
                  </div>
                  <p className={styles.eventDateText}>{formatEventDate(event.date)}</p>
                </div>

                <div className={styles.eventActions}>
                  <button onClick={() => onEdit(event)} className={styles.editBtn} title="Редактирай"><Edit size={16}/></button>
                  <button onClick={() => onDelete(event.id)} className={styles.deleteBtn} title="Изтрий"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsTab;