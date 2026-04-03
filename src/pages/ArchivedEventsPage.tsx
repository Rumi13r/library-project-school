import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Clock, MapPin, User, Users, Archive, Search, Filter, History,
  Eye, Download, Trash2, RotateCcw, Calendar, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './ArchivedEventsPage.css';
import { useAuth } from '../contexts/AuthContext';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface ArchivedEvent {
  id:              string;
  title:           string;
  description:     string;
  date:            string;
  time:            string;
  endTime:         string;
  location:        string;
  maxParticipants: number;
  currentParticipants:number;
  allowedRoles:    string[];
  organizer:       string;
  createdAt:       FSDate;
  archivedAt?:     FSDate;
  archivedBy?:     string;
  reason?:         string;
  originalEventId?:string;
  // Firestore may store a status field — typed here to avoid unsafe casts
  status?:         'archived' | 'completed' | 'active' | 'past';
}

const DEMO_EVENTS: ArchivedEvent[] = [
  { id:'1', title:'Лятно четене с деца', description:'Събитие за летно четене', date:'15 юли 2023', time:'10:00', endTime:'12:00', location:'Детски отдел', maxParticipants:30, currentParticipants:28, allowedRoles:['reader','teacher'], organizer:'Мария Иванова', createdAt:new Date('2023-07-01'), archivedAt:new Date('2023-07-16') },
  { id:'2', title:'Презентация на нови книги', description:'Представяне на новите постъпления', date:'20 август 2023', time:'18:00', endTime:'20:00', location:'Конферентна зала', maxParticipants:50, currentParticipants:45, allowedRoles:['reader','teacher','admin'], organizer:'Библиотеката', createdAt:new Date('2023-08-01'), archivedAt:new Date('2023-08-21') },
  { id:'3', title:'Клуб по четене', description:'Месечна среща на книжния клуб', date:'10 септември 2023', time:'17:00', endTime:'19:00', location:'Читалня', maxParticipants:25, currentParticipants:25, allowedRoles:['reader'], organizer:'Петър Георгиев', createdAt:new Date('2023-09-01'), archivedAt:new Date('2023-09-11') },
  { id:'4', title:'Образователен семинар', description:'Семинар по библиотечно дело', date:'5 октомври 2023', time:'09:00', endTime:'16:00', location:'Образователен център', maxParticipants:40, currentParticipants:35, allowedRoles:['librarian','teacher','admin'], organizer:'Учебна библиотека', createdAt:new Date('2023-10-01'), archivedAt:new Date('2023-10-06') },
];

const parseEventDate = (dateString: string, timeString = '00:00'): Date => {
  if (dateString.includes('-')) {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes]   = timeString.split(':').map(Number);
    return new Date(year, month-1, day, hours, minutes);
  }
  const months: Record<string,number> = { 'януари':0,'февруари':1,'март':2,'април':3,'май':4,'юни':5,'юли':6,'август':7,'септември':8,'октомври':9,'ноември':10,'декември':11 };
  const parts = dateString.split(' ');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = months[parts[1].toLowerCase()];
    const y = parseInt(parts[2]);
    if (d && m !== undefined && y) {
      const [h, min] = timeString.split(':').map(Number);
      return new Date(y, m, d, h, min);
    }
  }
  return new Date();
};

const getMonthName = (n: number) =>
  ['Януари','Февруари','Март','Април','Май','Юни','Юли','Август','Септември','Октомври','Ноември','Декември'][n];

const ArchivedEventsPage: React.FC = () => {
  const [archivedEvents,      setArchivedEvents]      = useState<ArchivedEvent[]>([]);
  const [filteredEvents,      setFilteredEvents]      = useState<ArchivedEvent[]>([]);
  const [loading,             setLoading]             = useState(true);
  const [searchTerm,          setSearchTerm]          = useState('');
  const [yearFilter,          setYearFilter]          = useState('all');
  const [monthFilter,         setMonthFilter]         = useState('all');
  const [organizerFilter,     setOrganizerFilter]     = useState('all');
  const [availableYears,      setAvailableYears]      = useState<string[]>([]);
  const [availableOrganizers, setAvailableOrganizers] = useState<string[]>([]);
  const [isMobileView,        setIsMobileView]        = useState(window.innerWidth < 768);
  const [showMobileFilters,   setShowMobileFilters]   = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const h = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // ── extractFiltersData ─────────────────────────────────────────────────────
  const extractFiltersData = useCallback((events: ArchivedEvent[]) => {
    const years     = new Set<string>();
    const organizers= new Set<string>();
    events.forEach(e => {
      years.add(parseEventDate(e.date).getFullYear().toString());
      if (e.organizer) organizers.add(e.organizer);
    });
    setAvailableYears(Array.from(years).sort((a,b)=>b.localeCompare(a)));
    setAvailableOrganizers(Array.from(organizers).sort());
  }, []);

  // ── fetchArchivedEvents — BEFORE the useEffect that calls it ────────────────
  const fetchArchivedEvents = useCallback(async () => {
    try {
      setLoading(true);
      const snap      = await getDocs(collection(db, "events"));
      const allEvents: ArchivedEvent[] = snap.docs.map(d => ({ id:d.id, ...d.data() } as ArchivedEvent));
      const today     = new Date();
      const archived  = allEvents.filter(e => {
        const eventDate    = parseEventDate(e.date, e.endTime);
        const hasArchivedFlag = !!(e.archivedAt || e.status === 'archived' || e.status === 'completed');
        return eventDate < today || hasArchivedFlag;
      }).sort((a,b)=>parseEventDate(b.date,b.endTime).getTime()-parseEventDate(a.date,a.endTime).getTime());
      setArchivedEvents(archived);
      extractFiltersData(archived);
    } catch {
      setArchivedEvents(DEMO_EVENTS);
      extractFiltersData(DEMO_EVENTS);
    } finally {
      setLoading(false);
    }
  }, [extractFiltersData]);

  // ── filterEvents — BEFORE the useEffect that calls it ──────────────────────
  const filterEvents = useCallback(() => {
    let filtered = archivedEvents;
    if (searchTerm)
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.organizer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (yearFilter !== 'all')
      filtered = filtered.filter(e => parseEventDate(e.date).getFullYear().toString() === yearFilter);
    if (monthFilter !== 'all')
      filtered = filtered.filter(e => parseEventDate(e.date).getMonth() === parseInt(monthFilter));
    if (organizerFilter !== 'all')
      filtered = filtered.filter(e => e.organizer === organizerFilter);
    setFilteredEvents(filtered);
  }, [archivedEvents, searchTerm, yearFilter, monthFilter, organizerFilter]);

  // ── Effects AFTER function declarations ────────────────────────────────────
  useEffect(() => { fetchArchivedEvents(); }, [fetchArchivedEvents]);
  useEffect(() => { filterEvents(); }, [filterEvents]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getAvailableSpots = (e: ArchivedEvent) => e.maxParticipants - e.currentParticipants;
  const isEventFull       = (e: ArchivedEvent) => e.currentParticipants >= e.maxParticipants;

  const getEventStatus = (e: ArchivedEvent) => {
    if (parseEventDate(e.date, e.endTime) < new Date()) return 'completed';
    if (e.archivedAt) return 'archived';
    return 'past';
  };

  const formatCalendarDate = (dateString: string) => {
    const d = parseEventDate(dateString);
    return { day:d.getDate(), month:d.toLocaleDateString('bg-BG',{month:'short'}), weekday:d.toLocaleDateString('bg-BG',{weekday:'short'}), year:d.getFullYear() };
  };

  const formatFSDate = (d: FSDate): string => {
    if (!d) return '';
    try {
      if (typeof d === 'string') return new Date(d).toLocaleDateString('bg-BG');
      if (d instanceof Date) return d.toLocaleDateString('bg-BG');
      if (typeof d === 'object') {
        if ('toDate' in d && typeof d.toDate === 'function') return d.toDate().toLocaleDateString('bg-BG');
        if ('seconds' in d && typeof d.seconds === 'number') return new Date(d.seconds*1000).toLocaleDateString('bg-BG');
      }
    } catch { /* ignore */ }
    return '';
  };

  const handleViewDetails  = (e: ArchivedEvent) => navigate(`/event/${e.id}/archived`,{state:{event:e,isArchived:true}});
  const handleRestoreEvent = async (e: ArchivedEvent) => {
    if (!user) return;
    if (window.confirm(`Възстанови "${e.title}"?`)) {
      try { alert(`"${e.title}" беше възстановено!`); fetchArchivedEvents(); }
      catch { alert('Грешка при възстановяване!'); }
    }
  };
  const handleDeleteEvent  = async (e: ArchivedEvent) => {
    if (!user) return;
    if (window.confirm(`Изтрий перманентно "${e.title}"?`)) {
      try { alert(`"${e.title}" беше изтрито!`); fetchArchivedEvents(); }
      catch { alert('Грешка при изтриване!'); }
    }
  };
  const handleExportData   = () => {
    const uri  = 'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(filteredEvents,null,2));
    const link = document.createElement('a');
    link.setAttribute('href',uri);
    link.setAttribute('download',`архивирани_събития_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };
  const clearFilters         = () => { setSearchTerm(''); setYearFilter('all'); setMonthFilter('all'); setOrganizerFilter('all'); };
  const toggleMobileFilters  = () => setShowMobileFilters(v=>!v);
  const applyMobileFilters   = () => { filterEvents(); setShowMobileFilters(false); };

  if (loading) return (
    <div className="archived-events-page">
      <div className="loading-spinner"><div className="spinner"/><span>Зареждане на архивирани събития...</span></div>
    </div>
  );

  return (
    <div className="archived-events-page">
      <div className="archived-events-container">
        {/* Header */}
        <div className="archived-events-header">
          <div className="archived-events-title-section">
            <div className="title-icon-wrapper archived"><Archive className="archived-events-title-icon"/></div>
            <div className="title-content">
              <h1 className="handwritten-title">Архив на Събития</h1>
              <p className="archived-events-subtitle">Преглед на изтекли и архивирани събития от библиотеката</p>
            </div>
          </div>
          <div className="archive-actions">
            {user&&(user.role==='admin'||user.role==='librarian')&&(
              <button className="export-btn" onClick={handleExportData}><Download size={18}/><span>Експортирай</span></button>
            )}
            {isMobileView&&(
              <button className="mobile-filters-toggle" onClick={toggleMobileFilters}><Filter size={20}/><span>Филтри</span></button>
            )}
          </div>
        </div>

        {/* Mobile Filters */}
        {showMobileFilters && (
          <div className="mobile-filters-modal">
            <div className="mobile-filters-header">
              <h3>Филтриране на архив</h3>
              <button className="close-filters-btn" onClick={()=>setShowMobileFilters(false)}><X size={24}/></button>
            </div>
            <div className="mobile-filters-content">
              <div className="filter-group mobile"><label className="filter-label"><Search size={16}/>Търсене</label><input type="text" placeholder="Търсете в архива..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="filter-input mobile"/></div>
              <div className="filter-group mobile"><label className="filter-label"><Calendar size={16}/>Година</label><select className="filter-select mobile" value={yearFilter} onChange={e=>setYearFilter(e.target.value)}><option value="all">Всички години</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
              <div className="filter-group mobile"><label className="filter-label"><Calendar size={16}/>Месец</label><select className="filter-select mobile" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}><option value="all">Всички месеци</option>{Array.from({length:12},(_,i)=><option key={i} value={i}>{getMonthName(i)}</option>)}</select></div>
              <div className="filter-group mobile"><label className="filter-label"><User size={16}/>Организатор</label><select className="filter-select mobile" value={organizerFilter} onChange={e=>setOrganizerFilter(e.target.value)}><option value="all">Всички организатори</option>{availableOrganizers.map(o=><option key={o} value={o}>{o}</option>)}</select></div>
            </div>
            <div className="mobile-filters-actions">
              <button className="clear-filters-btn mobile" onClick={()=>{clearFilters();setShowMobileFilters(false);}}>Изчисти</button>
              <button className="apply-filters-btn" onClick={applyMobileFilters}>Приложи</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="archive-stats">
          {[
            {n:archivedEvents.length,l:'Общо архивирани'},
            {n:availableYears.length,l:'Години в архива'},
            {n:availableOrganizers.length,l:'Организатори'},
            {n:archivedEvents.reduce((s,e)=>s+e.currentParticipants,0),l:'Общо участници'},
          ].map(s=>(
            <div key={s.l} className="stat-card"><div className="stat-content"><div className="stat-number">{s.n}</div><div className="stat-label">{s.l}</div></div></div>
          ))}
        </div>

        {/* Mobile Search */}
        {isMobileView&&(
          <div className="mobile-search-container">
            <div className="mobile-search-box">
              <Search className="search-icon"/>
              <input type="text" placeholder="Търсене в архива..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="mobile-search-input"/>
              <div className="mobile-search-info"><span>{archivedEvents.length} събития</span></div>
            </div>
          </div>
        )}

        {/* Desktop Filters */}
        {!isMobileView&&(
          <div className="archived-events-filters">
            <div className="search-box"><Search className="search-icon"/><input type="text" placeholder="Търсете в архива..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="search-input"/></div>
            <div className="advanced-filters">
              <div className="filter-group"><Filter size={16}/><span className="filter-label">Филтри:</span></div>
              <select className="filter-select" value={yearFilter} onChange={e=>setYearFilter(e.target.value)}><option value="all">Всички години</option>{availableYears.map(y=><option key={y} value={y}>{y}</option>)}</select>
              <select className="filter-select" value={monthFilter} onChange={e=>setMonthFilter(e.target.value)}><option value="all">Всички месеци</option>{Array.from({length:12},(_,i)=><option key={i} value={i}>{getMonthName(i)}</option>)}</select>
              <select className="filter-select" value={organizerFilter} onChange={e=>setOrganizerFilter(e.target.value)}><option value="all">Всички организатори</option>{availableOrganizers.map(o=><option key={o} value={o}>{o}</option>)}</select>
              {(searchTerm||yearFilter!=='all'||monthFilter!=='all'||organizerFilter!=='all')&&<button className="clear-filters-btn" onClick={clearFilters}>Изчисти</button>}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="archived-events-content">
          {filteredEvents.length > 0 ? (
            <>
              <div className="archived-events-stats">
                <History className="stats-icon"/>
                <span className="events-count">Показани {filteredEvents.length} от {archivedEvents.length}</span>
                {searchTerm&&<span className="search-results">Резултати за "{searchTerm}"</span>}
              </div>

              {/* Desktop Table */}
              <div className="desktop-table-layout">
                <div className="archived-events-table-container">
                  <table className="archived-events-table">
                    <thead className="archived-events-table-header">
                      <tr><th className="date-col">Дата</th><th className="title-col">Събитие</th><th className="details-col">Детайли</th><th className="stats-col">Статистика</th><th className="actions-col">Действия</th></tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event, index) => {
                        const cal      = formatCalendarDate(event.date);
                        const spots    = getAvailableSpots(event);
                        const full     = isEventFull(event);
                        const status   = getEventStatus(event);
                        const colors   = ['event-archived-green','event-archived-blue','event-archived-gray','event-archived-purple'];
                        return (
                          <tr key={event.id} className={`archived-event-table-row ${colors[index%colors.length]}`}>
                            <td className="archived-event-table-cell date-col">
                              <div className="archived-event-date">
                                <div className="calendar-date archived"><div className="calendar-day">{cal.day}</div><div className="calendar-month">{cal.month}</div><div className="calendar-year">{cal.year}</div></div>
                                <div className="time-info archived"><Clock size={14}/><span>{event.time} - {event.endTime}</span></div>
                                <div className="status-badge">{status==='completed'?'Завършено':status==='archived'?'Архивирано':'Изтекло'}</div>
                              </div>
                            </td>
                            <td className="archived-event-table-cell title-col">
                              <div className="archived-event-title-section">
                                <h3 className="archived-event-title">{event.title}</h3>
                                <div className="archived-event-description" dangerouslySetInnerHTML={{__html:event.description}}/>
                              </div>
                            </td>
                            <td className="archived-event-table-cell details-col">
                              <div className="archived-event-details">
                                <div className="archived-event-detail"><MapPin className="detail-icon"/><span>{event.location}</span></div>
                                <div className="archived-event-detail"><User className="detail-icon"/><span>{event.organizer||'Учебна библиотека'}</span></div>
                                {event.archivedAt&&<div className="archived-event-detail"><Archive className="detail-icon"/><span>Архивирано: {formatFSDate(event.archivedAt)}</span></div>}
                              </div>
                            </td>
                            <td className="archived-event-table-cell stats-col">
                              <div className="archived-event-stats">
                                <div className="participants-info"><Users className="participants-icon"/><span className="participants-count">{event.currentParticipants}/{event.maxParticipants}</span><span className="attendance-rate">({Math.round((event.currentParticipants/event.maxParticipants)*100)}%)</span></div>
                                <div className="participants-progress archived"><div className="participants-progress-bar" style={{width:`${(event.currentParticipants/event.maxParticipants)*100}%`}}/></div>
                                <div className="spots-info archived">{full?<span className="full-text">Пълно</span>:<span className="available-text">{spots} незаети</span>}</div>
                              </div>
                            </td>
                            <td className="archived-event-table-cell actions-col">
                              <div className="archived-event-actions">
                                <button className="view-details-btn" onClick={()=>handleViewDetails(event)}><Eye size={16}/><span>Детайли</span></button>
                                {user&&(user.role==='admin'||user.role==='librarian')&&(
                                  <>
                                    <button className="restore-btn" onClick={()=>handleRestoreEvent(event)}><RotateCcw size={16}/><span>Възстанови</span></button>
                                    <button className="delete-btn" onClick={()=>handleDeleteEvent(event)}><Trash2 size={16}/><span>Изтрий</span></button>
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
              <Archive size={80} className="no-events-icon"/>
              <h3 className="handwritten-title-small">{searchTerm||yearFilter!=='all'?'Няма намерени':'Архивът е празен'}</h3>
              {(searchTerm||yearFilter!=='all')&&<button className="clear-filters-btn" onClick={clearFilters}>Изчисти</button>}
            </div>
          )}
        </div>

        <div className="archive-footer">
          <div className="archive-info">
            <div className="info-content">
              <h4>Информация за архива</h4>
              <p>Архивът съдържа всички изтекли събития от библиотеката.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArchivedEventsPage;