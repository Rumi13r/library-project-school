import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Archive, 
  Search, 
  Filter,
  History,
  Eye,
  Download,
  Trash2,
  RotateCcw,
  Calendar,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ArchivedEventsPage.css';
import { useAuth } from '../contexts/AuthContext';

interface ArchivedEvent {
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
  archivedAt?: any;
  archivedBy?: string;
  reason?: string;
  originalEventId?: string;
}

const ArchivedEventsPage: React.FC = () => {
  const [archivedEvents, setArchivedEvents] = useState<ArchivedEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<ArchivedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [organizerFilter, setOrganizerFilter] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableOrganizers, setAvailableOrganizers] = useState<string[]>([]);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchArchivedEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [archivedEvents, searchTerm, yearFilter, monthFilter, organizerFilter]);

  const fetchArchivedEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "events"));
      const allEvents: ArchivedEvent[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ArchivedEvent));

      const today = new Date();
      const archived = allEvents.filter(event => {
        const eventDate = parseEventDate(event.date, event.endTime);
        const isPastEvent = eventDate < today;
        
        const hasArchivedFlag = event.archivedAt || 
                                (event as any).status === 'archived' || 
                                (event as any).status === 'completed';
        
        return isPastEvent || hasArchivedFlag;
      });

      archived.sort((a, b) => {
        const dateA = parseEventDate(a.date, a.endTime);
        const dateB = parseEventDate(b.date, b.endTime);
        return dateB.getTime() - dateA.getTime();
      });

      setArchivedEvents(archived);
      extractFiltersData(archived);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching archived events:", error);
      const demoEvents: ArchivedEvent[] = [
        {
          id: '1',
          title: 'Лятно четене с деца',
          description: 'Събитие за летно четене с деца от 6 до 12 години',
          date: '15 юли 2023',
          time: '10:00',
          endTime: '12:00',
          location: 'Детски отдел',
          maxParticipants: 30,
          currentParticipants: 28,
          allowedRoles: ['reader', 'teacher'],
          organizer: 'Мария Иванова',
          createdAt: new Date('2023-07-01'),
          archivedAt: new Date('2023-07-16')
        },
        {
          id: '2',
          title: 'Презентация на нови книги',
          description: 'Представяне на новите поступления в библиотеката',
          date: '20 август 2023',
          time: '18:00',
          endTime: '20:00',
          location: 'Конферентна зала',
          maxParticipants: 50,
          currentParticipants: 45,
          allowedRoles: ['reader', 'teacher', 'admin'],
          organizer: 'Библиотеката',
          createdAt: new Date('2023-08-01'),
          archivedAt: new Date('2023-08-21')
        },
        {
          id: '3',
          title: 'Клуб по четене',
          description: 'Месечна среща на книжния клуб',
          date: '10 септември 2023',
          time: '17:00',
          endTime: '19:00',
          location: 'Читалня',
          maxParticipants: 25,
          currentParticipants: 25,
          allowedRoles: ['reader'],
          organizer: 'Петър Георгиев',
          createdAt: new Date('2023-09-01'),
          archivedAt: new Date('2023-09-11')
        },
        {
          id: '4',
          title: 'Образователен семинар',
          description: 'Семинар по библиотечно дело',
          date: '5 октомври 2023',
          time: '09:00',
          endTime: '16:00',
          location: 'Образователен център',
          maxParticipants: 40,
          currentParticipants: 35,
          allowedRoles: ['librarian', 'teacher', 'admin'],
          organizer: 'Учебна библиотека',
          createdAt: new Date('2023-10-01'),
          archivedAt: new Date('2023-10-06')
        }
      ];
      
      setArchivedEvents(demoEvents);
      extractFiltersData(demoEvents);
      setLoading(false);
    }
  };

  const parseEventDate = (dateString: string, timeString: string = "00:00"): Date => {
    if (dateString.includes('-')) {
      const [year, month, day] = dateString.split('-').map(Number);
      const [hours, minutes] = timeString.split(':').map(Number);
      return new Date(year, month - 1, day, hours, minutes);
    }
    
    const months: { [key: string]: number } = {
      'януари': 0, 'февруари': 1, 'март': 2, 'април': 3,
      'май': 4, 'юни': 5, 'юли': 6, 'август': 7,
      'септември': 8, 'октомври': 9, 'ноември': 10, 'декември': 11
    };
    
    const parts = dateString.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = months[parts[1].toLowerCase()];
      const year = parseInt(parts[2]);
      if (day && month !== undefined && year) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return new Date(year, month, day, hours, minutes);
      }
    }
    
    return new Date();
  };

  const extractFiltersData = (events: ArchivedEvent[]) => {
    const years = new Set<string>();
    const organizers = new Set<string>();
    
    events.forEach(event => {
      const eventDate = parseEventDate(event.date);
      const year = eventDate.getFullYear().toString();
      years.add(year);
      
      if (event.organizer) {
        organizers.add(event.organizer);
      }
    });
    
    setAvailableYears(Array.from(years).sort((a, b) => b.localeCompare(a)));
    setAvailableOrganizers(Array.from(organizers).sort());
  };

  const filterEvents = () => {
    let filtered = archivedEvents;

    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventDate = parseEventDate(event.date);
        return eventDate.getFullYear().toString() === yearFilter;
      });
    }

    if (monthFilter !== 'all') {
      const monthNumber = parseInt(monthFilter);
      filtered = filtered.filter(event => {
        const eventDate = parseEventDate(event.date);
        return eventDate.getMonth() === monthNumber;
      });
    }

    if (organizerFilter !== 'all') {
      filtered = filtered.filter(event => 
        event.organizer === organizerFilter
      );
    }

    setFilteredEvents(filtered);
  };

  const getAvailableSpots = (event: ArchivedEvent) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const isEventFull = (event: ArchivedEvent) => {
    return event.currentParticipants >= event.maxParticipants;
  };

  const getEventStatus = (event: ArchivedEvent) => {
    const eventEndDate = parseEventDate(event.date, event.endTime);
    const now = new Date();
    
    if (eventEndDate < now) {
      return 'completed';
    }
    
    if (event.archivedAt) {
      return 'archived';
    }
    
    return 'past';
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

  const getMonthName = (monthNumber: number) => {
    const months = [
      'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
      'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
    ];
    return months[monthNumber];
  };

  const handleViewDetails = (event: ArchivedEvent) => {
    navigate(`/event/${event.id}/archived`, { 
      state: { event, isArchived: true }
    });
  };

  const handleRestoreEvent = async (event: ArchivedEvent) => {
    if (!user) return;
    
    if (window.confirm(`Сигурни ли сте, че искате да възстановите събитието "${event.title}"?`)) {
      try {
        alert(`Събитието "${event.title}" беше възстановено успешно!`);
        fetchArchivedEvents();
      } catch (error) {
        console.error("Error restoring event:", error);
        alert("Грешка при възстановяване на събитието!");
      }
    }
  };

  const handleDeleteEvent = async (event: ArchivedEvent) => {
    if (!user) return;
    
    if (window.confirm(`Сигурни ли сте, че искате да изтриете събитието "${event.title}" перманентно? Това действие е необратимо!`)) {
      try {
        alert(`Събитието "${event.title}" беше изтрито успешно!`);
        fetchArchivedEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Грешка при изтриване на събитието!");
      }
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `архивирани_събития_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setYearFilter('all');
    setMonthFilter('all');
    setOrganizerFilter('all');
  };

  const toggleMobileFilters = () => {
    setShowMobileFilters(!showMobileFilters);
  };

  const applyMobileFilters = () => {
    filterEvents();
    setShowMobileFilters(false);
  };

  if (loading) {
    return (
      <div className="archived-events-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на архивирани събития...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="archived-events-page">
      <div className="archived-events-container">
        {/* Header */}
        <div className="archived-events-header">
          <div className="archived-events-title-section">
            <div className="title-icon-wrapper archived">
              <Archive className="archived-events-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Архив на Събития</h1>
              <p className="archived-events-subtitle">
                Преглед на изтекли и архивирани събития от библиотеката
              </p>
            </div>
          </div>

          <div className="archive-actions">
            {user && (user.role === 'admin' || user.role === 'librarian') && (
              <button 
                className="export-btn"
                onClick={handleExportData}
                title="Експортирай данните"
              >
                <Download size={18} />
                <span>Експортирай</span>
              </button>
            )}
            
            {isMobileView && (
              <button 
                className="mobile-filters-toggle"
                onClick={toggleMobileFilters}
              >
                <Filter size={20} />
                <span>Филтри</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="mobile-filters-modal">
            <div className="mobile-filters-header">
              <h3>Филтриране на архив</h3>
              <button 
                className="close-filters-btn"
                onClick={() => setShowMobileFilters(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mobile-filters-content">
              <div className="filter-group mobile">
                <label className="filter-label">
                  <Search size={16} />
                  Търсене
                </label>
                <input
                  type="text"
                  placeholder="Търсете в архива..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input mobile"
                />
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <Calendar size={16} />
                  Година
                </label>
                <select 
                  className="filter-select mobile"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="all">Всички години</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <Calendar size={16} />
                  Месец
                </label>
                <select 
                  className="filter-select mobile"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  <option value="all">Всички месеци</option>
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i} value={i}>{getMonthName(i)}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group mobile">
                <label className="filter-label">
                  <User size={16} />
                  Организатор
                </label>
                <select 
                  className="filter-select mobile"
                  value={organizerFilter}
                  onChange={(e) => setOrganizerFilter(e.target.value)}
                >
                  <option value="all">Всички организатори</option>
                  {availableOrganizers.map(organizer => (
                    <option key={organizer} value={organizer}>{organizer}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mobile-filters-actions">
              <button 
                className="clear-filters-btn mobile"
                onClick={() => {
                  clearFilters();
                  setShowMobileFilters(false);
                }}
              >
                Изчисти филтрите
              </button>
              <button 
                className="apply-filters-btn"
                onClick={applyMobileFilters}
              >
                Приложи филтрите
              </button>
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="archive-stats">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{archivedEvents.length}</div>
              <div className="stat-label">Общо архивирани събития</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{availableYears.length}</div>
              <div className="stat-label">Години в архива</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{availableOrganizers.length}</div>
              <div className="stat-label">Организатори</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-number">
                {archivedEvents.reduce((sum, event) => sum + event.currentParticipants, 0)}
              </div>
              <div className="stat-label">Общо участници</div>
            </div>
          </div>
        </div>

        {/* Mobile Search */}
        {isMobileView && (
          <div className="mobile-search-container">
            <div className="mobile-search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Търсене в архива..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-search-input"
              />
              <div className="mobile-search-info">
                <span>{archivedEvents.length} събития</span>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Filters */}
        {!isMobileView && (
          <div className="archived-events-filters">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Търсете в архива по име, описание, място, организатор..."
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

              <select 
                className="filter-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="all">Всички години</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select 
                className="filter-select"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="all">Всички месеци</option>
                {Array.from({length: 12}, (_, i) => (
                  <option key={i} value={i}>{getMonthName(i)}</option>
                ))}
              </select>

              <select 
                className="filter-select"
                value={organizerFilter}
                onChange={(e) => setOrganizerFilter(e.target.value)}
              >
                <option value="all">Всички организатори</option>
                {availableOrganizers.map(organizer => (
                  <option key={organizer} value={organizer}>{organizer}</option>
                ))}
              </select>

              {(searchTerm || yearFilter !== 'all' || monthFilter !== 'all' || organizerFilter !== 'all') && (
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Изчисти филтрите
                </button>
              )}
            </div>
          </div>
        )}

        {/* Archived Events List */}
        <div className="archived-events-content">
          {filteredEvents.length > 0 ? (
            <>
              <div className="archived-events-stats">
                <History className="stats-icon" />
                <span className="events-count">
                  Показани {filteredEvents.length} от {archivedEvents.length} събития
                </span>
                {searchTerm && (
                  <span className="search-results">
                    Резултати за "{searchTerm}"
                  </span>
                )}
              </div>

              {/* Mobile Vertical Layout */}
              <div className="mobile-vertical-layout">
                {filteredEvents.map((event) => {
                  const calendarDate = formatCalendarDate(event.date);
                  const availableSpots = getAvailableSpots(event);
                  const isFull = isEventFull(event);
                  const status = getEventStatus(event);
                  
                  return (
                    <div 
                      key={event.id} 
                      className="archived-event-card mobile-card"
                    >
                      {/* Date Section */}
                      <div className="event-card-section">
                        <div className="section-label">Дата и час</div>
                        <div className="event-date-mobile">
                          <div className="calendar-date-mobile">
                            <div className="calendar-day">{calendarDate.day}</div>
                            <div className="calendar-month-year">
                              <span className="calendar-month">{calendarDate.month}</span>
                              <span className="calendar-year">{calendarDate.year}</span>
                            </div>
                          </div>
                          <div className="time-info-mobile">
                            <Clock size={16} />
                            <span>{event.time} - {event.endTime}</span>
                          </div>
                          <div className={`status-badge ${status}`}>
                            {status === 'completed' && 'Завършено'}
                            {status === 'archived' && 'Архивирано'}
                            {status === 'past' && 'Изтекло'}
                          </div>
                        </div>
                      </div>

                      {/* Title Section */}
                      <div className="event-card-section">
                        <div className="section-label">Събитие</div>
                        <h3 className="event-title-mobile">{event.title}</h3>
                        <div 
                          className="event-description-mobile"
                          dangerouslySetInnerHTML={{ __html: event.description }}
                        />
                      </div>

                      {/* Details Section */}
                      <div className="event-card-section">
                        <div className="section-label">Детайли</div>
                        <div className="event-details-mobile">
                          <div className="event-detail-item">
                            <MapPin size={16} />
                            <span>{event.location}</span>
                          </div>
                          <div className="event-detail-item">
                            <User size={16} />
                            <span>{event.organizer || "Учебна библиотека"}</span>
                          </div>
                          {event.archivedAt && (
                            <div className="event-detail-item">
                              <Archive size={16} />
                              <span>
                                Архивирано: {new Date(event.archivedAt).toLocaleDateString('bg-BG')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stats Section */}
                      <div className="event-card-section">
                        <div className="section-label">Статистика</div>
                        <div className="event-stats-mobile">
                          <div className="participants-info-mobile">
                            <Users size={16} />
                            <span className="participants-count">
                              {event.currentParticipants} / {event.maxParticipants}
                            </span>
                            <span className="attendance-rate">
                              ({Math.round((event.currentParticipants / event.maxParticipants) * 100)}%)
                            </span>
                          </div>
                          <div className="participants-progress-mobile">
                            <div 
                              className="progress-bar"
                              style={{ 
                                width: `${(event.currentParticipants / event.maxParticipants) * 100}%` 
                              }}
                            />
                          </div>
                          <div className="spots-info-mobile">
                            {isFull ? (
                              <span className="full-text">Пълно</span>
                            ) : (
                              <span className="available-text">{availableSpots} незаети</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions Section */}
                      <div className="event-card-section">
                        <div className="section-label">Действия</div>
                        <div className="event-actions-mobile">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewDetails(event)}
                            title="Виж детайли"
                          >
                            <Eye size={16} />
                            <span>Детайли</span>
                          </button>
                          
                          {user && (user.role === 'admin' || user.role === 'librarian') && (
                            <>
                              <button 
                                className="action-btn restore-btn"
                                onClick={() => handleRestoreEvent(event)}
                                title="Възстанови събитието"
                              >
                                <RotateCcw size={16} />
                                <span>Възстанови</span>
                              </button>
                              
                              <button 
                                className="action-btn delete-btn"
                                onClick={() => handleDeleteEvent(event)}
                                title="Изтрий перманентно"
                              >
                                <Trash2 size={16} />
                                <span>Изтрий</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table Layout */}
              <div className="desktop-table-layout">
                <div className="archived-events-table-container">
                  <table className="archived-events-table">
                    <thead className="archived-events-table-header">
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
                        const status = getEventStatus(event);
                        
                        const colorVariants = ['event-archived-green', 'event-archived-blue', 'event-archived-gray', 'event-archived-purple'];
                        const colorClass = colorVariants[index % colorVariants.length];
                        
                        return (
                          <tr
                            key={event.id}
                            className={`archived-event-table-row ${colorClass}`}
                          >
                            {/* Date Column */}
                            <td 
                              className="archived-event-table-cell date-col" 
                              data-label="Дата и час"
                            >
                              <div className="archived-event-date">
                                <div className="calendar-date archived">
                                  <div className="calendar-day">{calendarDate.day}</div>
                                  <div className="calendar-month">{calendarDate.month}</div>
                                  <div className="calendar-year">{calendarDate.year}</div>
                                </div>
                                <div className="time-info archived">
                                  <Clock size={14} />
                                  <span>{event.time} - {event.endTime}</span>
                                </div>
                                <div className="status-badge">
                                  {status === 'completed' && 'Завършено'}
                                  {status === 'archived' && 'Архивирано'}
                                  {status === 'past' && 'Изтекло'}
                                </div>
                              </div>
                            </td>

                            {/* Title Column */}
                            <td 
                              className="archived-event-table-cell title-col"
                              data-label="Събитие"
                            >
                              <div className="archived-event-title-section">
                                <h3 className="archived-event-title">{event.title}</h3>
                                <div 
                                  className="archived-event-description"
                                  dangerouslySetInnerHTML={{ __html: event.description }}
                                />
                              </div>
                            </td>

                            {/* Details Column */}
                            <td 
                              className="archived-event-table-cell details-col"
                              data-label="Детайли"
                            >
                              <div className="archived-event-details">
                                <div className="archived-event-detail">
                                  <MapPin className="detail-icon" />
                                  <span>{event.location}</span>
                                </div>
                                <div className="archived-event-detail">
                                  <User className="detail-icon" />
                                  <span>{event.organizer || "Учебна библиотека"}</span>
                                </div>
                                {event.archivedAt && (
                                  <div className="archived-event-detail">
                                    <Archive className="detail-icon" />
                                    <span>
                                      Архивирано: {new Date(event.archivedAt).toLocaleDateString('bg-BG')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Stats Column */}
                            <td 
                              className="archived-event-table-cell stats-col"
                              data-label="Статистика"
                            >
                              <div className="archived-event-stats">
                                <div className="participants-info">
                                  <Users className="participants-icon" />
                                  <span className="participants-count">
                                    {event.currentParticipants} / {event.maxParticipants}
                                  </span>
                                  <span className="attendance-rate">
                                    ({Math.round((event.currentParticipants / event.maxParticipants) * 100)}%)
                                  </span>
                                </div>
                                <div className="participants-progress archived">
                                  <div 
                                    className="participants-progress-bar"
                                    style={{ 
                                      width: `${(event.currentParticipants / event.maxParticipants) * 100}%` 
                                    }}
                                  />
                                </div>
                                <div className="spots-info archived">
                                  {isFull ? (
                                    <span className="full-text">Пълно</span>
                                  ) : (
                                    <span className="available-text">{availableSpots} незаети</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Actions Column */}
                            <td 
                              className="archived-event-table-cell actions-col"
                              data-label="Действия"
                            >
                              <div className="archived-event-actions">
                                <button 
                                  className="view-details-btn"
                                  onClick={() => handleViewDetails(event)}
                                  title="Виж детайли"
                                >
                                  <Eye size={16} />
                                  <span>Детайли</span>
                                </button>
                                
                                {user && (user.role === 'admin' || user.role === 'librarian') && (
                                  <>
                                    <button 
                                      className="restore-btn"
                                      onClick={() => handleRestoreEvent(event)}
                                      title="Възстанови събитието"
                                    >
                                      <RotateCcw size={16} />
                                      <span>Възстанови</span>
                                    </button>
                                    
                                    <button 
                                      className="delete-btn"
                                      onClick={() => handleDeleteEvent(event)}
                                      title="Изтрий перманентно"
                                    >
                                      <Trash2 size={16} />
                                      <span>Изтрий</span>
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
                </div>
              </div>
            </>
          ) : (
            <div className="no-archived-events">
              <Archive size={80} className="no-events-icon" />
              <h3 className="handwritten-title-small">
                {searchTerm || yearFilter !== 'all' ? 'Няма намерени събития' : 'Архивът е празен'}
              </h3>
              <p>
                {searchTerm 
                  ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                  : yearFilter !== 'all'
                  ? 'Няма събития за избраната година.'
                  : 'Все още няма архивирани събития.'
                }
              </p>
              {(searchTerm || yearFilter !== 'all') && (
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
        <div className="archive-footer">
          <div className="archive-info">
            <div className="info-content">
              <h4>Информация за архива</h4>
              <p>
                Архивът съдържа всички изтекли събития от библиотеката. 
                Тук можете да преглеждате историческите данни и статистики.
                Само администраторите и библиотекарите могат да възстановяват или изтриват събития от архива.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivedEventsPage;