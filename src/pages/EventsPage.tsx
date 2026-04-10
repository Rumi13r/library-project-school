import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Calendar, Clock, MapPin, User, Users, Search, Filter, BookOpen,
  LogIn, ArrowRight, Phone, Mail, AlertCircle, ChevronRight,
  X, Info, Plus, Sparkles, Ticket,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EventsPage.css';
import { useAuth } from '../contexts/AuthContext';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface AppUser {
  uid:      string;
  email?:   string | null;
  role?:    string;
  displayName?: string | null;
}

interface Event {
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
  createdAt:           FSDate;    // was any
  contactEmail?:       string;
  contactPhone?:       string;
  requirements?:       string;
  category?:           string;
}

interface CalendarDate {
  day:     number;
  month:   string;
  weekday: string;
  year:    number;
}

interface EventModalData {
  event:        Event;
  colorClass:   string;
  calendarDate: CalendarDate;
}

interface EventModalProps {
  event:        Event;
  isOpen:       boolean;
  onClose:      () => void;
  onRegister:   (event: Event) => void;
  user:         AppUser | null;   // was any
  colorClass:   string;
  calendarDate: CalendarDate;
}

// ── EventModal subcomponent ────────────────────────────────────────────────────
const EventModal: React.FC<EventModalProps> = ({
  event, isOpen, onClose, onRegister, user, colorClass, calendarDate,
}) => {
  if (!isOpen) return null;

  const parseDate = (ds: string): Date => {
    if (ds.includes('-')) {
      const [y,m,d] = ds.split('-').map(Number);
      return new Date(y, m-1, d);
    }
    const months: Record<string,number> = { 'януари':0,'февруари':1,'март':2,'април':3,'май':4,'юни':5,'юли':6,'август':7,'септември':8,'октомври':9,'ноември':10,'декември':11 };
    const parts = ds.split(' ');
    if (parts.length === 2) {
      const d = parseInt(parts[0]);
      const m = months[parts[1].toLowerCase()];
      if (d && m !== undefined) return new Date(new Date().getFullYear(), m, d);
    }
    return new Date();
  };

  const formatFullDate = (ds: string) =>
    parseDate(ds).toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const available  = event.maxParticipants - event.currentParticipants;
  const isFull     = event.currentParticipants >= event.maxParticipants;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={e=>e.stopPropagation()}>
        <div className="event-modal-header">
          <div className="event-modal-title">
            <div className={`event-modal-date-badge ${colorClass}`}>
              <div className="event-modal-date-day">{calendarDate.day}</div>
              <div className="event-modal-date-month">{calendarDate.month}</div>
              <div className="event-modal-date-weekday">{calendarDate.weekday}</div>
            </div>
            <div className="event-modal-title-text">
              <h3>{event.title}</h3>
              <div className="event-modal-time"><Clock size={16}/><span>{event.time} - {event.endTime}</span></div>
            </div>
          </div>
          <button className="event-modal-close" onClick={onClose}><X size={24}/></button>
        </div>

        <div className="event-modal-content">
          <div className="event-modal-details-grid">
            <div className="event-modal-detail"><MapPin className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Място</div><div className="event-modal-detail-value">{event.location}</div></div></div>
            <div className="event-modal-detail"><User className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Организатор</div><div className="event-modal-detail-value">{event.organizer||'Учебна библиотека'}</div></div></div>
            <div className="event-modal-detail"><Users className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Участници</div><div className="event-modal-detail-value">{event.currentParticipants}/{event.maxParticipants} записани{available>0&&<span className="event-modal-available-spots">({available} свободни)</span>}</div></div></div>
            <div className="event-modal-detail"><Calendar className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Дата</div><div className="event-modal-detail-value">{formatFullDate(event.date)}</div></div></div>
            {event.contactEmail&&<div className="event-modal-detail"><Mail className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Имейл</div><div className="event-modal-detail-value">{event.contactEmail}</div></div></div>}
            {event.contactPhone&&<div className="event-modal-detail"><Phone className="event-modal-detail-icon"/><div className="event-modal-detail-content"><div className="event-modal-detail-label">Телефон</div><div className="event-modal-detail-value">{event.contactPhone}</div></div></div>}
          </div>
          <div className="event-modal-description">
            <h4 className="event-modal-description-title">Описание</h4>
            <div className="event-modal-description-content" dangerouslySetInnerHTML={{__html:event.description||'<p>Няма описание</p>'}}/>
          </div>
          {event.requirements&&<div className="event-modal-requirements"><h4 className="event-modal-requirements-title"><Info size={20}/><span>Изисквания</span></h4><div className="event-modal-requirements-content">{event.requirements}</div></div>}
          <div className="event-modal-footer">
            <button className="event-modal-close-btn" onClick={onClose}>Затвори</button>
            <button className={`event-modal-register-btn ${colorClass} ${!user||isFull?'disabled':''}`} disabled={!user||isFull} onClick={()=>user&&!isFull&&onRegister(event)}>
              {!user?'Влезте, за да се запишете':isFull?'Събитието е пълно':'Запиши се'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const EventsPage: React.FC = () => {
  const [events,              setEvents]              = useState<Event[]>([]);
  const [filteredEvents,      setFilteredEvents]      = useState<Event[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [searchTerm,          setSearchTerm]          = useState('');
  const [statusFilter,        setStatusFilter]        = useState<'all'|'available'|'full'>('all');
  const [monthFilter,         setMonthFilter]         = useState('all');
  const [organizerFilter,     setOrganizerFilter]     = useState('all');
  const [availableMonths,     setAvailableMonths]     = useState<string[]>([]);
  const [availableOrganizers, setAvailableOrganizers] = useState<string[]>([]);
  const [viewMode,            setViewMode]            = useState<'grid'|'list'>('grid');
  const [selectedEventModal,  setSelectedEventModal]  = useState<EventModalData|null>(null);
  const [isModalOpen,         setIsModalOpen]         = useState(false);

  const navigate = useNavigate();
  const { user, loading:authLoading } = useAuth();

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const parseEventDate = useCallback((ds: string): Date => {
    if (ds.includes('-')) {
      const [y,m,d] = ds.split('-').map(Number);
      return new Date(y,m-1,d);
    }
    const months: Record<string,number> = { 'януари':0,'февруари':1,'март':2,'април':3,'май':4,'юни':5,'юли':6,'август':7,'септември':8,'октомври':9,'ноември':10,'декември':11 };
    const parts = ds.split(' ');
    if (parts.length === 2) {
      const d = parseInt(parts[0]);
      const m = months[parts[1].toLowerCase()];
      if (d && m !== undefined) return new Date(new Date().getFullYear(),m,d);
    }
    return new Date();
  }, []);

  const getMonthName = (n: number) =>
    ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'][n];

  const extractFiltersData = useCallback((evs: Event[]) => {
    const months     = new Set<string>();
    const organizers = new Set<string>();
    evs.forEach(e => {
      const d = parseEventDate(e.date);
      months.add(`${d.getMonth()}-${getMonthName(d.getMonth())}`);
      if (e.organizer) organizers.add(e.organizer);
    });
    setAvailableMonths(Array.from(months).sort((a,b)=>parseInt(a)-parseInt(b)));
    setAvailableOrganizers(Array.from(organizers).sort());
  }, [parseEventDate]);

  // ── fetchEvents — declared BEFORE the useEffect ───────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const snap    = await getDocs(collection(db,"events"));
      const all: Event[] = snap.docs.map(d=>({id:d.id,...d.data()} as Event));
      const today   = new Date().toISOString().split('T')[0];
      const future  = all.filter(e=>e.date&&e.date>=today)
        .sort((a,b)=>a.date!==b.date?a.date.localeCompare(b.date):a.time.localeCompare(b.time));
      setEvents(future);
      extractFiltersData(future);
    } catch (e) {
      console.error("Error fetching events:", e);
      setEvents([]);
    } finally { setLoading(false); }
  }, [extractFiltersData]);

  // ── filterEvents — declared BEFORE the useEffect ─────────────────────────
  const filterEvents = useCallback(() => {
    let filtered = events;
    if (searchTerm) filtered = filtered.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())||e.description.toLowerCase().includes(searchTerm.toLowerCase())||e.location.toLowerCase().includes(searchTerm.toLowerCase())||e.organizer.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter==='available') filtered = filtered.filter(e=>e.currentParticipants<e.maxParticipants);
    else if (statusFilter==='full') filtered = filtered.filter(e=>e.currentParticipants>=e.maxParticipants);
    if (monthFilter!=='all') filtered = filtered.filter(e=>parseEventDate(e.date).getMonth().toString()===monthFilter);
    if (organizerFilter!=='all') filtered = filtered.filter(e=>e.organizer===organizerFilter);
    setFilteredEvents(filtered);
  }, [events, searchTerm, statusFilter, monthFilter, organizerFilter, parseEventDate]);

  // ── Effects AFTER function declarations ───────────────────────────────────
  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { filterEvents(); }, [filterEvents]);

  // ── More helpers ───────────────────────────────────────────────────────────
  const getAvailableSpots  = (e: Event) => e.maxParticipants - e.currentParticipants;
  const isEventFull        = (e: Event) => e.currentParticipants >= e.maxParticipants;

  const formatCalendarDate = (ds: string): CalendarDate => {
    const d = parseEventDate(ds);
    return { day:d.getDate(), month:d.toLocaleDateString('bg-BG',{month:'short'}), weekday:d.toLocaleDateString('bg-BG',{weekday:'short'}), year:d.getFullYear() };
  };

  const formatFullDate = (ds: string) =>
    parseEventDate(ds).toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const handleEventRegistration = (event: Event) =>
    navigate('/dashboard',{state:{eventId:event.id,action:'register',fromEventsPage:true}});

  const handleLoginRedirect = () =>
    navigate('/login',{state:{redirectTo:'/events',message:'Моля, влезте.'}});

  const handleParticipantsClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    const pct = Math.round((event.currentParticipants/event.maxParticipants)*100);
    alert(`📊 ${event.title}\n👥 Записани: ${event.currentParticipants}\n🎯 Макс: ${event.maxParticipants}\n✅ Свободни: ${getAvailableSpots(event)}\n📈 ${pct}%`);
  };

  const handleViewDetails = (event: Event, index: number) => {
    const colors = ['calendar-purple','calendar-purple-light','calendar-purple-dark','calendar-violet'];
    setSelectedEventModal({ event, colorClass:colors[index%colors.length], calendarDate:formatCalendarDate(event.date) });
    setIsModalOpen(true);
  };

  const clearFilters = () => { setSearchTerm(''); setStatusFilter('all'); setMonthFilter('all'); setOrganizerFilter('all'); };

  const getEventStatus = (e: Event) => {
    const pct = e.currentParticipants/e.maxParticipants;
    if (pct >= 1)   return { text:'Пълно',          color:'#dc2626', bgColor:'#fee2e2' };
    if (pct >= 0.8) return { text:'Почти пълно',    color:'#d97706', bgColor:'#fef3c7' };
    if (pct >= 0.5) return { text:'Средно заето',   color:'#8b5cf6', bgColor:'#ede9fe' };
    return              { text:'Свободни места',    color:'#8b5cf6', bgColor:'#ede9fe' };
  };

  const getColorClass = (i: number) =>
    ['calendar-purple','calendar-purple-light','calendar-purple-dark','calendar-violet'][i%4];

  if (loading||authLoading) return (
    <div className="events-page"><div className="loading-spinner"><div className="spinner"/><span>Зареждане...</span></div></div>
  );

  return (
    <>
      <div className="events-page">
        <div className="events-container">
          {/* Header */}
          <div className="events-header">
            <div className="events-title-section">
              <div className="title-content">
                <h1 className="handwritten-title">Предстоящи Събития</h1>
                <p className="events-subtitle">Всички предстоящи събития в библиотеката</p>
              </div>
            </div>
            {user&&(user.role==='librarian')&&(
              <div className="events-actions">
                <button className="add-event-btn" onClick={()=>navigate('/events/add')}><Plus size={18}/><span>Добави събитие</span></button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="events-stats">
            <div className="stat-card"><div className="stat-content"><div className="stat-number">{events.length}</div><div className="stat-label">Предстоящи</div></div></div>
            <div className="stat-card"><div className="stat-content"><div className="stat-number">{events.filter(e=>e.currentParticipants<e.maxParticipants).length}</div><div className="stat-label">Свободни места</div></div></div>
            <div className="stat-card"><div className="stat-content"><div className="stat-number">{events.reduce((s,e)=>s+e.currentParticipants,0)}</div><div className="stat-label">Общо записани</div></div></div>
          </div>

          {/* Filters */}
          <div className="events-filters">
            <div className="search-box"><Search className="search-icon"/><input type="text" placeholder="Търсете..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="search-input"/></div>
            <div className="filters-container">
              <div className="filters-row">
                <div className="filter-group"><Filter size={16}/><span className="filter-label">Статус:</span></div>
                <div className="filter-buttons">
                  {(['all','available','full'] as const).map(f=>(
                    <button key={f} className={`filter-btn ${statusFilter===f?'active':''}`} onClick={()=>setStatusFilter(f)}>
                      {f==='all'?'Всички':f==='available'?'Свободни':'Пълни'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="filters-row">
                <div className="filter-select-group">
                  <label className="select-label"><Calendar size={14}/><span>Месец:</span></label>
                  <select className="filter-select" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}>
                    <option value="all">Всички</option>
                    {availableMonths.map(m=>{const[n,name]=m.split('-');return <option key={n} value={n}>{name}</option>;})}
                  </select>
                </div>
                <div className="filter-select-group">
                  <label className="select-label"><User size={14}/><span>Организатор:</span></label>
                  <select className="filter-select" value={organizerFilter} onChange={e=>setOrganizerFilter(e.target.value)}>
                    <option value="all">Всички</option>
                    {availableOrganizers.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              {(searchTerm||statusFilter!=='all'||monthFilter!=='all'||organizerFilter!=='all')&&(
                <div className="filters-row"><button className="clear-filters-btn" onClick={clearFilters}>Изчисти</button></div>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div className="view-mode-toggle">
            <button className={`view-mode-btn ${viewMode==='grid'?'active':''}`} onClick={()=>setViewMode('grid')}>
              <div className="grid-icon">{[0,1,2,3].map(i=><div key={i} className="grid-square"/>)}</div><span>Мрежа</span>
            </button>
            <button className={`view-mode-btn ${viewMode==='list'?'active':''}`} onClick={()=>setViewMode('list')}>
              <div className="list-icon">{[0,1,2].map(i=><div key={i} className="list-line"/>)}</div><span>Списък</span>
            </button>
          </div>

          {/* Events Content */}
          <div className="events-content">
            {filteredEvents.length > 0 ? (
              <>
                <div className="events-stats-header">
                  <div className="stats-header-left">
                    <BookOpen className="stats-icon"/>
                    <span className="events-count">Намерени {filteredEvents.length} от {events.length}</span>
                    {searchTerm&&<span className="search-results">Резултати за "{searchTerm}"</span>}
                  </div>
                  {!user&&<div className="login-reminder"><LogIn size={16}/><span>Влезте, за да се запишете</span></div>}
                </div>

                {viewMode==='grid' ? (
                  <div className="events-grid">
                    {filteredEvents.map((event,i)=>{
                      const cal       = formatCalendarDate(event.date);
                      const spots     = getAvailableSpots(event);
                      const full      = isEventFull(event);
                      const status    = getEventStatus(event);
                      const color     = getColorClass(i);
                      return (
                        <div key={event.id} className={`event-card ${color} ${full?'event-full':''}`}>
                          <div className="event-card-header">
                            <div className="event-date-badge"><div className="event-day">{cal.day}</div><div className="event-month">{cal.month}</div><div className="event-year">{cal.year}</div></div>
                            <div className="event-time"><Clock size={14}/><span>{event.time} - {event.endTime}</span></div>
                            <div className="event-status-badge" style={{color:status.color,backgroundColor:status.bgColor}}>{status.text}</div>
                          </div>
                          <div className="event-card-body">
                            <h3 className="event-title" onClick={()=>handleViewDetails(event,i)}>{event.title}<ChevronRight className="view-details-icon"/></h3>
                            <div className="event-description-preview">{event.description?event.description.replace(/<[^>]*>/g,'').substring(0,150)+'...':'Няма описание'}</div>
                            <div className="event-details-compact">
                              <div className="compact-detail"><MapPin size={14}/><span className="compact-text">{event.location}</span></div>
                              <div className="compact-detail"><User size={14}/><span className="compact-text">{event.organizer||'Учебна библиотека'}</span></div>
                            </div>
                          </div>
                          <div className="event-card-footer">
                            <div className="event-participants">
                              <div className="participants-info" onClick={e=>handleParticipantsClick(e,event)}>
                                <Users size={16}/><span className="participants-count">{event.currentParticipants}/{event.maxParticipants}</span>
                                <span className="participants-progress-bar"><span className="progress-fill" style={{width:`${(event.currentParticipants/event.maxParticipants)*100}%`,backgroundColor:full?'#dc2626':'#8b5cf6'}}/></span>
                              </div>
                              <div className="available-spots">{full?<span className="full-text">Пълно</span>:<span className="available-text">{spots} свободни</span>}</div>
                            </div>
                            <div className="event-actions-grid">
                              <button className="events-details-btn" onClick={()=>handleViewDetails(event,i)}><Info size={16}/><span>Детайли</span></button>
                              <button className={`events-register-btn ${!user||full?'events-btn-disabled':''}`} disabled={full} onClick={()=>!user?handleLoginRedirect():!full&&handleEventRegistration(event)}>
                                {!user?<><LogIn size={16}/><span>Вход за записване</span></>:full?<span>Пълно</span>:<><span>Запиши се</span><ArrowRight className="register-icon"/></>}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="events-list">
                    {filteredEvents.map((event,i)=>{
                      const full  = isEventFull(event);
                      const spots = getAvailableSpots(event);
                      const color = getColorClass(i);
                      return (
                        <div key={event.id} className={`event-list-item ${color} ${full?'event-full':''}`}>
                          <div className="list-item-left">
                            <div className="list-date-time">
                              <div className="list-date"><Calendar size={16}/><span>{formatFullDate(event.date)}</span></div>
                              <div className="list-time"><Clock size={14}/><span>{event.time} - {event.endTime}</span></div>
                            </div>
                            <div className="list-event-info">
                              <h3 className="event-title" onClick={()=>handleViewDetails(event,i)}>{event.title}<ChevronRight className="view-details-icon"/></h3>
                              <div className="event-description-preview-list">{event.description?event.description.replace(/<[^>]*>/g,'').substring(0,120)+'...':'Няма описание'}</div>
                              <div className="event-details-compact-list">
                                <div className="compact-detail"><MapPin size={14}/><span className="compact-text">{event.location}</span></div>
                                <div className="compact-detail"><User size={14}/><span className="compact-text">{event.organizer||'Учебна библиотека'}</span></div>
                              </div>
                            </div>
                          </div>
                          <div className="list-item-right">
                            <div className="list-participants">
                              <div className="participants-info" onClick={e=>handleParticipantsClick(e,event)}><Users size={16}/><span className="participants-count">{event.currentParticipants}/{event.maxParticipants}</span></div>
                              <div className="participants-progress"><div className="participants-progress-bar" style={{width:`${(event.currentParticipants/event.maxParticipants)*100}%`,backgroundColor:full?'#dc2626':'#8b5cf6'}}/></div>
                              <div className="spots-info">{full?<span className="full-text">Пълно</span>:<span className="available-text">{spots} свободни</span>}</div>
                            </div>
                            <div className="list-actions">
                              <div className="action-buttons-row">
                                <button className="events-details-btn" onClick={()=>handleViewDetails(event,i)}><Info size={16}/><span>Детайли</span></button>
                                <button className={`events-register-btn ${!user||full?'events-btn-disabled':''}`} disabled={full} onClick={()=>!user?handleLoginRedirect():!full&&handleEventRegistration(event)}>
                                  {!user?<><LogIn size={16}/><span>Вход</span></>:full?<span>Пълно</span>:<><span>Запиши се</span><ArrowRight className="register-icon"/></>}
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
                <Calendar size={80} className="no-events-icon"/>
                <h3 className="handwritten-title-small">{searchTerm||statusFilter!=='all'||monthFilter!=='all'?'Няма намерени':'Няма предстоящи'}</h3>
                {(searchTerm||statusFilter!=='all'||monthFilter!=='all'||organizerFilter!=='all')&&<button className="clear-filters-btn" onClick={clearFilters}>Изчисти</button>}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="events-footer">
            <div className="footer-grid">
              <div className="footer-card"><div className="footer-card-header"><Ticket size={24}/><h4>Как да се запишете?</h4></div><ol className="footer-card-list"><li>Влезте в профила си</li><li>Изберете събитие</li><li>Натиснете "Запиши се"</li><li>Ще се генерира билет</li><li>Пристигнете навреме</li></ol></div>
              <div className="footer-card"><div className="footer-card-header"><AlertCircle size={24}/><h4>Правила</h4></div><ul className="footer-card-list"><li>Задължителна регистрация</li><li>Спазвайте точния час</li><li>Мобилни в безшумен режим</li></ul></div>
              <div className="footer-card"><div className="footer-card-header"><Sparkles size={24}/><h4>Предимства</h4></div><ul className="footer-card-list"><li>Безплатно участие</li><li>Сертификат за избрани</li><li>Ексклузивни материали</li></ul></div>
            </div>
          </div>
        </div>
      </div>

      {selectedEventModal && (
        <EventModal
          event={selectedEventModal.event}
          isOpen={isModalOpen}
          onClose={()=>{setIsModalOpen(false);setSelectedEventModal(null);}}
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