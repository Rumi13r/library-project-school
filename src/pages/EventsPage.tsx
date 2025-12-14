import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Search, 
  Filter,
  BookOpen,
  LogIn,
  ArrowRight,
  Phone,
  Mail,
  AlertCircle,
  ChevronRight,
  X,
  Info,
  Plus,
  Sparkles,
  Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EventsPage.css';
import { useAuth } from '../contexts/AuthContext';

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
  contactEmail?: string;
  contactPhone?: string;
  requirements?: string;
  category?: string;
}

interface EventModalData {
  event: Event;
  colorClass: string;
  calendarDate: {
    day: number;
    month: string;
    weekday: string;
    year: number;
  };
}

interface EventModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onRegister: (event: Event) => void;
  user: any;
  colorClass: string;
  calendarDate: {
    day: number;
    month: string;
    weekday: string;
    year: number;
  };
}

const EventModal: React.FC<EventModalProps> = ({ 
  event, 
  isOpen, 
  onClose, 
  onRegister, 
  user,
  colorClass,
  calendarDate 
}) => {
  if (!isOpen) return null;

  const formatFullDate = (dateString: string) => {
    const months: { [key: string]: number } = {
      'януари': 0, 'февруари': 1, 'март': 2, 'април': 3,
      'май': 4, 'юни': 5, 'юли': 6, 'август': 7,
      'септември': 8, 'октомври': 9, 'ноември': 10, 'декември': 11
    };
    
    const parts = dateString.split(' ');
    if (parts.length === 2) {
      const day = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase()];
      if (day && month !== undefined) {
        const currentYear = new Date().getFullYear();
        const date = new Date(currentYear, month, day);
        return date.toLocaleDateString('bg-BG', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    
    // Fallback за ISO формат
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('bg-BG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    return dateString;
  };

  const getAvailableSpots = (event: Event) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const isFull = event.currentParticipants >= event.maxParticipants;
  const availableSpots = getAvailableSpots(event);

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={e => e.stopPropagation()}>
        <div className="event-modal-header">
          <div className="event-modal-title">
            <div className={`event-modal-date-badge ${colorClass}`}>
              <div className="event-modal-date-day">{calendarDate.day}</div>
              <div className="event-modal-date-month">{calendarDate.month}</div>
              <div className="event-modal-date-weekday">{calendarDate.weekday}</div>
            </div>
            <div className="event-modal-title-text">
              <h3>{event.title}</h3>
              <div className="event-modal-time">
                <Clock size={16} />
                <span>{event.time} - {event.endTime}</span>
              </div>
            </div>
          </div>
          <button 
            className="event-modal-close"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="event-modal-content">
          <div className="event-modal-details-grid">
            <div className="event-modal-detail">
              <MapPin className="event-modal-detail-icon" />
              <div className="event-modal-detail-content">
                <div className="event-modal-detail-label">Място</div>
                <div className="event-modal-detail-value">{event.location}</div>
              </div>
            </div>

            <div className="event-modal-detail">
              <User className="event-modal-detail-icon" />
              <div className="event-modal-detail-content">
                <div className="event-modal-detail-label">Организатор</div>
                <div className="event-modal-detail-value">{event.organizer || "Учебна библиотека"}</div>
              </div>
            </div>

            <div className="event-modal-detail">
              <Users className="event-modal-detail-icon" />
              <div className="event-modal-detail-content">
                <div className="event-modal-detail-label">Участници</div>
                <div className="event-modal-detail-value">
                  {event.currentParticipants} / {event.maxParticipants} записани
                  {availableSpots > 0 && (
                    <span className="event-modal-available-spots">
                      ({availableSpots} свободни места)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="event-modal-detail">
              <Calendar className="event-modal-detail-icon" />
              <div className="event-modal-detail-content">
                <div className="event-modal-detail-label">Дата</div>
                <div className="event-modal-detail-value">{formatFullDate(event.date)}</div>
              </div>
            </div>

            {event.contactEmail && (
              <div className="event-modal-detail">
                <Mail className="event-modal-detail-icon" />
                <div className="event-modal-detail-content">
                  <div className="event-modal-detail-label">Имейл за контакт</div>
                  <div className="event-modal-detail-value">{event.contactEmail}</div>
                </div>
              </div>
            )}

            {event.contactPhone && (
              <div className="event-modal-detail">
                <Phone className="event-modal-detail-icon" />
                <div className="event-modal-detail-content">
                  <div className="event-modal-detail-label">Телефон за контакт</div>
                  <div className="event-modal-detail-value">{event.contactPhone}</div>
                </div>
              </div>
            )}
          </div>

          <div className="event-modal-description">
            <h4 className="event-modal-description-title">Описание на събитието</h4>
            <div 
              className="event-modal-description-content"
              dangerouslySetInnerHTML={{ __html: event.description || '<p>Няма описание</p>' }}
            />
          </div>

          {event.requirements && (
            <div className="event-modal-requirements">
              <h4 className="event-modal-requirements-title">
                <Info size={20} />
                <span>Изисквания и информация</span>
              </h4>
              <div className="event-modal-requirements-content">
                {event.requirements}
              </div>
            </div>
          )}

          <div className="event-modal-footer">
            <button 
              className="event-modal-close-btn"
              onClick={onClose}
            >
              Затвори
            </button>
            <button 
              className={`event-modal-register-btn ${colorClass} ${
                !user || isFull ? 'disabled' : ''
              }`}
              disabled={!user || isFull}
              onClick={() => {
                if (user && !isFull) {
                  onRegister(event);
                }
              }}
            >
              {!user 
                ? 'Влезте, за да се запишете' 
                : isFull 
                  ? 'Събитието е пълно' 
                  : 'Запиши се за събитието'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'full'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [organizerFilter, setOrganizerFilter] = useState<string>('all');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableOrganizers, setAvailableOrganizers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEventModal, setSelectedEventModal] = useState<EventModalData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, statusFilter, monthFilter, organizerFilter]);

  const fetchEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const eventsData: Event[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Event));

      const today = new Date().toISOString().split('T')[0];
      const futureEvents = eventsData
        .filter(event => event.date && event.date >= today)
        .sort((a, b) => {
          if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
          }
          return a.time.localeCompare(b.time);
        });
      
      setEvents(futureEvents);
      extractFiltersData(futureEvents);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
      setLoading(false);
    }
  };

  const extractFiltersData = (events: Event[]) => {
    const months = new Set<string>();
    const organizers = new Set<string>();
    
    events.forEach(event => {
      const date = parseEventDate(event.date);
      const month = date.getMonth();
      const monthName = getMonthName(month);
      months.add(`${month}-${monthName}`);
      
      if (event.organizer) {
        organizers.add(event.organizer);
      }
    });
    
    setAvailableMonths(Array.from(months).sort((a, b) => {
      const [aMonth] = a.split('-').map(Number);
      const [bMonth] = b.split('-').map(Number);
      return aMonth - bMonth;
    }));
    
    setAvailableOrganizers(Array.from(organizers).sort());
  };

  const parseEventDate = (dateString: string): Date => {
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    
    const months: { [key: string]: number } = {
      'януари': 0, 'февруари': 1, 'март': 2, 'април': 3,
      'май': 4, 'юни': 5, 'юли': 6, 'август': 7,
      'септември': 8, 'октомври': 9, 'ноември': 10, 'декември': 11
    };
    
    const parts = dateString.split(' ');
    if (parts.length === 2) {
      const day = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase()];
      if (day && month !== undefined) {
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month, day);
      }
    }
    
    return new Date();
  };

  const getMonthName = (monthNumber: number) => {
    const months = [
      'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
      'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
    ];
    return months[monthNumber];
  };

  const filterEvents = () => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter === 'available') {
      filtered = filtered.filter(event => event.currentParticipants < event.maxParticipants);
    } else if (statusFilter === 'full') {
      filtered = filtered.filter(event => event.currentParticipants >= event.maxParticipants);
    }

    if (monthFilter !== 'all') {
      filtered = filtered.filter(event => {
        const date = parseEventDate(event.date);
        return date.getMonth().toString() === monthFilter;
      });
    }

    if (organizerFilter !== 'all') {
      filtered = filtered.filter(event => event.organizer === organizerFilter);
    }

    setFilteredEvents(filtered);
  };

  const getAvailableSpots = (event: Event) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const isEventFull = (event: Event) => {
    return event.currentParticipants >= event.maxParticipants;
  };

  const formatCalendarDate = (dateString: string) => {
    const date = parseEventDate(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('bg-BG', { month: 'short' }),
      weekday: date.toLocaleDateString('bg-BG', { weekday: 'short' }),
      year: date.getFullYear()
    };
  };

  const formatFullDate = (dateString: string) => {
    const date = parseEventDate(dateString);
    return date.toLocaleDateString('bg-BG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleEventRegistration = (event: Event) => {
    navigate('/dashboard', { 
      state: { 
        eventId: event.id,
        action: 'register',
        fromEventsPage: true
      }
    });
  };

  const handleLoginRedirect = () => {
    navigate('/login', { 
      state: { 
        redirectTo: '/events',
        message: 'Моля, влезте в профила си, за да се запишете за събитие.' 
      }
    });
  };

  const handleParticipantsClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    const availableSpots = getAvailableSpots(event);
    const fillPercentage = Math.round((event.currentParticipants / event.maxParticipants) * 100);
    
    alert(`📊 Информация за участниците:\n\n🏷️ Заглавие: ${event.title}\n👥 Записани: ${event.currentParticipants}\n🎯 Максимум: ${event.maxParticipants}\n✅ Свободни: ${availableSpots}\n📈 Попълненост: ${fillPercentage}%`);
  };

  const handleViewDetails = (event: Event, index: number) => {
    const calendarDate = formatCalendarDate(event.date);
    const colorVariants = ['calendar-purple', 'calendar-purple-light', 'calendar-purple-dark', 'calendar-violet'];
    const colorClass = colorVariants[index % colorVariants.length];
    
    setSelectedEventModal({
      event,
      colorClass,
      calendarDate
    });
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMonthFilter('all');
    setOrganizerFilter('all');
  };

  const getEventStatus = (event: Event) => {
    if (event.currentParticipants >= event.maxParticipants) {
      return { text: 'Пълно', color: '#dc2626', bgColor: '#fee2e2' };
    } else if (event.currentParticipants >= event.maxParticipants * 0.8) {
      return { text: 'Почти пълно', color: '#d97706', bgColor: '#fef3c7' };
    } else if (event.currentParticipants >= event.maxParticipants * 0.5) {
      return { text: 'Средно заето', color: '#8b5cf6', bgColor: '#ede9fe' };
    } else {
      return { text: 'Свободни места', color: '#8b5cf6', bgColor: '#ede9fe' };
    }
  };

  const getColorClass = (index: number) => {
    const colorVariants = ['calendar-purple', 'calendar-purple-light', 'calendar-purple-dark', 'calendar-violet'];
    return colorVariants[index % colorVariants.length];
  };

  if (loading || authLoading) {
    return (
      <div className="events-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на събития...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="events-page">
        <div className="events-container">
          {/* Header */}
          <div className="events-header">
            <div className="events-title-section">
              <div className="title-content">
                <h1 className="handwritten-title">Предстоящи Събития</h1>
                <p className="events-subtitle">
                  Всички предстоящи събития в библиотеката - запишете се още сега за уникални изживявания!
                </p>
              </div>
            </div>

            {user && (user.role === 'admin' || user.role === 'librarian') && (
              <div className="events-actions">
                <button 
                  className="add-event-btn"
                  onClick={() => navigate('/events/add')}
                  title="Добави ново събитие"
                >
                  <Plus size={18} />
                  <span>Добави събитие</span>
                </button>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="events-stats">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-number">{events.length}</div>
                <div className="stat-label">Предстоящи събития</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-number">
                  {events.filter(e => e.currentParticipants < e.maxParticipants).length}
                </div>
                <div className="stat-label">Със свободни места</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-number">
                  {events.reduce((sum, event) => sum + event.currentParticipants, 0)}
                </div>
                <div className="stat-label">Общо записани</div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="events-filters">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Търсете събития по име, описание, място, организатор..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filters-container">
              <div className="filters-row">
                <div className="filter-group">
                  <Filter size={16} />
                  <span className="filter-label">Статус:</span>
                </div>

                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    Всички
                  </button>
                  <button 
                    className={`filter-btn ${statusFilter === 'available' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('available')}
                  >
                    Свободни места
                  </button>
                  <button 
                    className={`filter-btn ${statusFilter === 'full' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('full')}
                  >
                    Пълни
                  </button>
                </div>
              </div>

              <div className="filters-row">
                <div className="filter-select-group">
                  <label className="select-label">
                    <Calendar size={14} />
                    <span>Месец:</span>
                  </label>
                  <select 
                    className="filter-select"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                  >
                    <option value="all">Всички месеци</option>
                    {availableMonths.map(month => {
                      const [monthNum, monthName] = month.split('-');
                      return (
                        <option key={monthNum} value={monthNum}>
                          {monthName}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="filter-select-group">
                  <label className="select-label">
                    <User size={14} />
                    <span>Организатор:</span>
                  </label>
                  <select 
                    className="filter-select"
                    value={organizerFilter}
                    onChange={(e) => setOrganizerFilter(e.target.value)}
                  >
                    <option value="all">Всички организатори</option>
                    {availableOrganizers.map(organizer => (
                      <option key={organizer} value={organizer}>
                        {organizer}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(searchTerm || statusFilter !== 'all' || monthFilter !== 'all' || organizerFilter !== 'all') && (
                <div className="filters-row">
                  <button 
                    className="clear-filters-btn"
                    onClick={clearFilters}
                  >
                    Изчисти всички филтри
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button 
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <div className="grid-icon">
                <div className="grid-square"></div>
                <div className="grid-square"></div>
                <div className="grid-square"></div>
                <div className="grid-square"></div>
              </div>
              <span>Мрежа</span>
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <div className="list-icon">
                <div className="list-line"></div>
                <div className="list-line"></div>
                <div className="list-line"></div>
              </div>
              <span>Списък</span>
            </button>
          </div>

          {/* Events List */}
          <div className="events-content">
            {filteredEvents.length > 0 ? (
              <>
                <div className="events-stats-header">
                  <div className="stats-header-left">
                    <BookOpen className="stats-icon" />
                    <span className="events-count">
                      Намерени {filteredEvents.length} от {events.length} събития
                    </span>
                    {searchTerm && (
                      <span className="search-results">
                        Резултати за "{searchTerm}"
                      </span>
                    )}
                  </div>
                  {!user && (
                    <div className="login-reminder">
                      <LogIn size={16} />
                      <span>Влезте в профила си, за да се запишете за събитие</span>
                    </div>
                  )}
                </div>

                {viewMode === 'grid' ? (
                  /* Grid View */
                  <div className="events-grid">
                    {filteredEvents.map((event, index) => {
                      const calendarDate = formatCalendarDate(event.date);
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      const status = getEventStatus(event);
                      const colorClass = getColorClass(index);
                      
                      return (
                        <div 
                          key={event.id} 
                          className={`event-card ${colorClass} ${isFull ? 'event-full' : ''}`}
                        >
                          <div className="event-card-header">
                            <div className="event-date-badge">
                              <div className="event-day">{calendarDate.day}</div>
                              <div className="event-month">{calendarDate.month}</div>
                              <div className="event-year">{calendarDate.year}</div>
                            </div>
                            <div className="event-time">
                              <Clock size={14} />
                              <span>{event.time} - {event.endTime}</span>
                            </div>
                            <div 
                              className="event-status-badge"
                              style={{ 
                                color: status.color,
                                backgroundColor: status.bgColor
                              }}
                            >
                              {status.text}
                            </div>
                          </div>

                          <div className="event-card-body">
                            <h3 className="event-title" onClick={() => handleViewDetails(event, index)}>
                              {event.title}
                              <ChevronRight className="view-details-icon" />
                            </h3>
                            
                            <div className="event-description-preview">
                              {event.description ? event.description.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 'Няма описание'}
                            </div>

                            <div className="event-details-compact">
                              <div className="compact-detail">
                                <MapPin size={14} />
                                <span className="compact-text">{event.location}</span>
                              </div>
                              <div className="compact-detail">
                                <User size={14} />
                                <span className="compact-text">{event.organizer || "Учебна библиотека"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="event-card-footer">
                            <div className="event-participants">
                              <div 
                                className="participants-info"
                                onClick={(e) => handleParticipantsClick(e, event)}
                              >
                                <Users size={16} />
                                <span className="participants-count">
                                  {event.currentParticipants} / {event.maxParticipants}
                                </span>
                                <span className="participants-progress-bar">
                                  <span 
                                    className="progress-fill"
                                    style={{ 
                                      width: `${(event.currentParticipants / event.maxParticipants) * 100}%`,
                                      backgroundColor: isFull ? '#dc2626' : '#8b5cf6'
                                    }}
                                  />
                                </span>
                              </div>
                              <div className="available-spots">
                                {isFull ? (
                                  <span className="full-text">Пълно</span>
                                ) : (
                                  <span className="available-text">{availableSpots} свободни</span>
                                )}
                              </div>
                            </div>

                            <div className="event-actions-grid">
                              <button 
                                className="events-details-btn"
                                onClick={() => handleViewDetails(event, index)}
                              >
                                <Info size={16} />
                                <span>Детайли</span>
                              </button>
                              <button 
                                className={`events-register-btn ${!user || isFull ? 'events-btn-disabled' : ''}`}
                                disabled={isFull}
                                onClick={() => {
                                  if (!user) {
                                    handleLoginRedirect();
                                  } else if (!isFull) {
                                    handleEventRegistration(event);
                                  }
                                }}
                              >
                                {!user ? (
                                  <>
                                    <LogIn size={16} />
                                    <span>Вход за записване</span>
                                  </>
                                ) : isFull ? (
                                  <span>Пълно</span>
                                ) : (
                                  <>
                                    <span>Запиши се</span>
                                    <ArrowRight className="register-icon" />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View */
                  <div className="events-list">
                    {filteredEvents.map((event, index) => {
                      const fullDate = formatFullDate(event.date);
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      const status = getEventStatus(event);
                      const colorClass = getColorClass(index);
                      console.log(status);
                      return (
                        <div 
                          key={event.id} 
                          className={`event-list-item ${colorClass} ${isFull ? 'event-full' : ''}`}
                        >
                          <div className="list-item-left">
                            <div className="list-date-time">
                              <div className="list-date">
                                <Calendar size={16} />
                                <span>{fullDate}</span>
                              </div>
                              <div className="list-time">
                                <Clock size={14} />
                                <span>{event.time} - {event.endTime}</span>
                              </div>
                            </div>
                            
                            <div className="list-event-info">
                              <h3 className="event-title" onClick={() => handleViewDetails(event, index)}>
                                {event.title}
                                <ChevronRight className="view-details-icon" />
                              </h3>
                              <div className="event-description-preview-list">
                                {event.description ? event.description.replace(/<[^>]*>/g, '').substring(0, 120) + '...' : 'Няма описание'}
                              </div>
                              <div className="event-details-compact-list">
                                <div className="compact-detail">
                                  <MapPin size={14} />
                                  <span className="compact-text">{event.location}</span>
                                </div>
                                <div className="compact-detail">
                                  <User size={14} />
                                  <span className="compact-text">{event.organizer || "Учебна библиотека"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="list-item-right">
                            <div className="list-participants">
                              <div 
                                className="participants-info"
                                onClick={(e) => handleParticipantsClick(e, event)}
                              >
                                <Users size={16} />
                                <span className="participants-count">
                                  {event.currentParticipants} / {event.maxParticipants}
                                </span>
                              </div>
                              <div className="participants-progress">
                                <div 
                                  className="participants-progress-bar"
                                  style={{ 
                                    width: `${(event.currentParticipants / event.maxParticipants) * 100}%`,
                                    backgroundColor: isFull ? '#dc2626' : '#8b5cf6'
                                  }}
                                />
                              </div>
                              <div className="spots-info">
                                {isFull ? (
                                  <span className="full-text">Пълно</span>
                                ) : (
                                  <span className="available-text">{availableSpots} свободни</span>
                                )}
                              </div>
                            </div>

                            <div className="list-actions">
                              <div className="action-buttons-row">
                                <button 
                                  className="events-details-btn"
                                  onClick={() => handleViewDetails(event, index)}
                                >
                                  <Info size={16} />
                                  <span>Детайли</span>
                                </button>
                                <button 
                                  className={`events-register-btn ${!user || isFull ? 'events-btn-disabled' : ''}`}
                                  disabled={isFull}
                                  onClick={() => {
                                    if (!user) {
                                      handleLoginRedirect();
                                    } else if (!isFull) {
                                      handleEventRegistration(event);
                                    }
                                  }}
                                >
                                  {!user ? (
                                    <>
                                      <LogIn size={16} />
                                      <span>Вход</span>
                                    </>
                                  ) : isFull ? (
                                    <span>Пълно</span>
                                  ) : (
                                    <>
                                      <span>Запиши се</span>
                                      <ArrowRight className="register-icon" />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="no-events">
                <Calendar size={80} className="no-events-icon" />
                <h3 className="handwritten-title-small">
                  {searchTerm || statusFilter !== 'all' || monthFilter !== 'all' ? 
                    'Няма намерени събития' : 
                    'Няма предстоящи събития'
                  }
                </h3>
                <p>
                  {searchTerm 
                    ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                    : statusFilter !== 'all' || monthFilter !== 'all' || organizerFilter !== 'all'
                    ? 'Няма събития, отговарящи на избраните филтри.'
                    : 'В момента няма предстоящи събития. Проверете отново по-късно за нови събития в учебната библиотека.'
                  }
                </p>
                {(searchTerm || statusFilter !== 'all' || monthFilter !== 'all' || organizerFilter !== 'all') && (
                  <button 
                    className="clear-filters-btn"
                    onClick={clearFilters}
                  >
                    Изчисти филтрите
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Information */}
          <div className="events-footer">
            <div className="footer-grid">
              <div className="footer-card registration-steps">
                <div className="footer-card-header">
                  <Ticket size={24} />
                  <h4>Как да се запишете?</h4>
                </div>
                <ol className="footer-card-list">
                  <li>Влезте в профила си в системата</li>
                  <li>Изберете желаното събитие</li>
                  <li>Натиснете бутона "Запиши се"</li>
                  <li>Ще се генерира електронен билет</li>
                  <li>Пристигнете пет минути по-рано</li>
                </ol>
              </div>

              <div className="footer-card events-rules">
                <div className="footer-card-header">
                  <AlertCircle size={24} />
                  <h4>Правила за участие</h4>
                </div>
                <ul className="footer-card-list">
                  <li>Задължителна предварителна регистрация</li>
                  <li>Спазвайте точното време на събитието</li>
                  <li>Не носете храна и напитки в залата</li>
                  <li>Мобилни устройства в безшумен режим</li>
                </ul>
              </div>

              <div className="footer-card events-benefits">
                <div className="footer-card-header">
                  <Sparkles size={24} />
                  <h4>Предимства</h4>
                </div>
                <ul className="footer-card-list">
                  <li>Безплатно участие във всички събития</li>
                  <li>Сертификат за участие за избрани събития</li>
                  <li>Ексклузивни учебни материали и ресурси</li>
                  <li>Възможност за запознанства с експерти</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEventModal && (
        <EventModal
          event={selectedEventModal.event}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedEventModal(null);
          }}
          onRegister={handleEventRegistration}
          user={user}
          colorClass={selectedEventModal.colorClass}
          calendarDate={selectedEventModal.calendarDate}
        />
      )}
    </>
  );
};

export default EventsPage;