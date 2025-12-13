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
  Eye
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
}

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
      // Extract month
      const date = parseEventDate(event.date);
      const month = date.getMonth();
      const monthName = getMonthName(month);
      months.add(`${month}-${monthName}`);
      
      // Extract organizer
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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter === 'available') {
      filtered = filtered.filter(event => event.currentParticipants < event.maxParticipants);
    } else if (statusFilter === 'full') {
      filtered = filtered.filter(event => event.currentParticipants >= event.maxParticipants);
    }

    // Month filter
    if (monthFilter !== 'all') {
      filtered = filtered.filter(event => {
        const date = parseEventDate(event.date);
        return date.getMonth().toString() === monthFilter;
      });
    }

    // Organizer filter
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

  const handleViewDetails = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMonthFilter('all');
    setOrganizerFilter('all');
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
    <div className="events-page">
      <div className="events-container">
        {/* Header */}
        <div className="events-header">
          <div className="events-title-section">
            <div className="title-content">
              <h1 className="handwritten-title">Предстоящи Събития</h1>
              <p className="events-subtitle">
                Всички предстоящи събития в библиотеката - запишете се още сега!
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
                <span>+ Добави събитие</span>
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

          <div className="advanced-filters">
            <div className="filter-group">
              <Filter size={16} />
              <span className="filter-label">Филтри:</span>
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

            {(searchTerm || statusFilter !== 'all' || monthFilter !== 'all' || organizerFilter !== 'all') && (
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Изчисти филтрите
              </button>
            )}
          </div>
        </div>

        {/* Events List */}
        <div className="events-content">
          {filteredEvents.length > 0 ? (
            <>
              <div className="events-stats-header">
                <BookOpen className="stats-icon" />
                <span className="events-count">
                  Показани {filteredEvents.length} от {events.length} събития
                </span>
                {searchTerm && (
                  <span className="search-results">
                    Резултати за "{searchTerm}"
                  </span>
                )}
                {!user && (
                  <div className="login-reminder">
                    <LogIn size={16} />
                    <span>Влезте в профила си, за да се запишете за събитие</span>
                  </div>
                )}
              </div>

              <div className="events-table-container">
                <table className="events-table">
                  <thead className="events-table-header">
                    <tr>
                      <th className="date-col">Дата</th>
                      <th className="title-col">Събитие</th>
                      <th className="details-col">Детайли</th>
                      <th className="stats-col">Статистика</th>
                      <th className="actions-col">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((event, index) => {
                      const calendarDate = formatCalendarDate(event.date);
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      
                      // Цветови варианти за редове
                      const colorVariants = ['event-green', 'event-blue', 'event-purple', 'event-orange'];
                      const colorClass = colorVariants[index % colorVariants.length];
                      
                      return (
                        <tr
                          key={event.id}
                          className={`event-table-row ${colorClass} ${isFull ? 'event-full' : ''}`}
                        >
                          {/* Date Column */}
                          <td className="event-table-cell date-col">
                            <div className="event-date">
                              <div className="calendar-date">
                                <div className="calendar-day">{calendarDate.day}</div>
                                <div className="calendar-month">{calendarDate.month}</div>
                                <div className="calendar-year">{calendarDate.year}</div>
                              </div>
                              <div className="time-info">
                                <Clock size={14} />
                                <span>{event.time} - {event.endTime}</span>
                              </div>
                              
                            </div>
                          </td>

                          {/* Title Column */}
                          <td className="event-table-cell title-col">
                            <div className="event-title-section">
                              <h3 className="event-title">{event.title}</h3>
                              <div 
                                className="event-description"
                                dangerouslySetInnerHTML={{ __html: event.description }}
                              />
                            </div>
                          </td>

                          {/* Details Column */}
                          <td className="event-table-cell details-col">
                            <div className="event-details">
                              <div className="event-detail">
                                <MapPin className="detail-icon" />
                                <span>{event.location}</span>
                              </div>
                              <div className="event-detail">
                                <User className="detail-icon" />
                                <span>{event.organizer || "Учебна библиотека"}</span>
                              </div>
                            </div>
                          </td>

                          {/* Stats Column */}
                          <td className="event-table-cell stats-col">
                            <div className="event-stats">
                              <div 
                                className="participants-info"
                                onClick={(e) => handleParticipantsClick(e, event)}
                                style={{ cursor: 'pointer' }}
                              >
                                <Users className="participants-icon" />
                                <span className="participants-count">
                                  {event.currentParticipants} / {event.maxParticipants}
                                </span>
                                <span className="attendance-rate">
                                  ({Math.round((event.currentParticipants / event.maxParticipants) * 100)}%)
                                </span>
                              </div>
                              <div className="participants-progress">
                                <div 
                                  className="participants-progress-bar"
                                  style={{ 
                                    width: `${(event.currentParticipants / event.maxParticipants) * 100}%`,
                                    backgroundColor: isFull ? '#ef4444' : '#10b981'
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
                          </td>

                          {/* Actions Column */}
                          <td className="event-table-cell actions-col">
                            <div className="event-actions">
                              <button 
                                className="view-details-btn"
                                onClick={() => handleViewDetails(event.id)}
                                title="Виж детайли"
                              >
                                <Eye size={16} />
                                <span>Детайли</span>
                              </button>
                              
                              <button 
                                className={`event-register-btn ${!user || isFull ? 'event-btn-disabled' : ''}`}
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
          <div className="events-info">
            <div className="info-content">
              <h4>Как да се запишете за събитие?</h4>
              <p>
                1. Влезте в профила си<br />
                2. Изберете желаното събитие<br />
                3. Натиснете бутона "Запиши се"<br />
                4. Потвърдете участието си
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsPage;