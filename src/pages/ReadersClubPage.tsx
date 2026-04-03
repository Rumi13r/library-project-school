import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Users, BookOpen, MessageSquare, Calendar, Clock, MapPin, User,
  Star, Heart, Share2, Bookmark, Search, Filter, Award, Book,
  ExternalLink, Plus, ArrowRight, ChevronDown, ChevronUp, X,
  MessageCircle, ThumbsUp, BookmarkCheck, Tag, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ReadersClubPage.css';

interface ClubMeeting {
  id: string; title: string; description: string;
  bookTitle: string; bookAuthor: string;
  date: string; time: string; endTime: string; location: string;
  maxParticipants: number; currentParticipants: number; organizer: string;
  discussionPoints: string[]; readingProgress: string; featured: boolean;
  createdAt: string | Date | { toDate?: () => Date; seconds?: number } | null;
  status: 'upcoming' | 'ongoing' | 'completed';
  materials?: { type: 'pdf'|'link'|'video'; title: string; url: string; }[];
}
interface ClubMember {
  id: string; name: string; role: 'organizer'|'member'|'moderator';
  booksRead: number; joinedAt: string; avatar?: string;
  favoriteGenres: string[]; currentlyReading?: string; bio?: string;
}
interface ClubDiscussion {
  id: string; bookId: string; title: string; content: string;
  author: string; likes: number; comments: number;
  createdAt: string | Date | { toDate?: () => Date; seconds?: number } | null;
  tags: string[];
}
interface BookOfMonth {
  id: string; title: string; author: string; description: string;
  coverImage: string; genre: string; rating: number; pages: number;
  readingSchedule: { startDate: string; endDate: string; weeklyPages: number; };
  discussionQuestions: string[];
}

const ReadersClubPage: React.FC = () => {
  const [meetings, setMeetings] = useState<ClubMeeting[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [discussions, setDiscussions] = useState<ClubDiscussion[]>([]);
  const [bookOfMonth, setBookOfMonth] = useState<BookOfMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'meetings'|'discussions'|'members'>('meetings');
  const [selectedMeeting, setSelectedMeeting] = useState<ClubMeeting | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [userReview, setUserReview] = useState('');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchClubData = useCallback(async () => {
    try {
      setLoading(true);
      const [mSnap, mbSnap, dSnap] = await Promise.all([
        getDocs(query(collection(db,"readers_club_meetings"),orderBy("date","asc"))),
        getDocs(query(collection(db,"readers_club_members"),orderBy("joinedAt","desc"))),
        getDocs(query(collection(db,"readers_club_discussions"),orderBy("createdAt","desc"))),
      ]);
      setMeetings(mSnap.docs.map(d=>({id:d.id,...d.data()} as ClubMeeting)));
      setMembers(mbSnap.docs.map(d=>({id:d.id,...d.data()} as ClubMember)));
      setDiscussions(dSnap.docs.map(d=>({id:d.id,...d.data()} as ClubDiscussion)));
      const cm = new Date().getMonth();
      const bSnap = await getDocs(query(collection(db,"books_of_month"),where("readingSchedule.startDate",">=",new Date(new Date().getFullYear(),cm,1))));
      if (!bSnap.empty) { const ds=bSnap.docs[0]; setBookOfMonth({id:ds.id,...ds.data()} as BookOfMonth); }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // FIX: void prevents "setState synchronously within effect" lint warning
  useEffect(()=>{ void fetchClubData(); },[fetchClubData]);

  const handleJoinMeeting = async (meeting: ClubMeeting) => {
    if (!user) { navigate('/login',{state:{redirectTo:'/readers-club'}}); return; }
    if (meeting.currentParticipants>=meeting.maxParticipants) { alert('Срещата е пълна!'); return; }
    setShowJoinForm(true);
  };
  const handleSubmitJoin = async () => {
    if (!selectedMeeting) return;
    alert(`Успешно се присъединихте към „${selectedMeeting.title}"!`);
    setShowJoinForm(false);
    setMeetings(p=>p.map(m=>m.id===selectedMeeting.id?{...m,currentParticipants:m.currentParticipants+1}:m));
  };
  const handleStartDiscussion = () => { if(!user){navigate('/login',{state:{redirectTo:'/readers-club'}});return;} navigate('/readers-club/discussions/new'); };
  const handleLike = (id: string) => { if(!user){navigate('/login');return;} setDiscussions(p=>p.map(d=>d.id===id?{...d,likes:d.likes+1}:d)); };
  const handleSave = (id: string) => { if(!user){navigate('/login');return;} console.log('save',id); alert('Запазено!'); };
  const handleShare = (d: ClubDiscussion) => { if(navigator.share){navigator.share({title:d.title,url:window.location.href}).catch(()=>{});}else{navigator.clipboard.writeText(window.location.href).then(()=>alert('Копирано!')).catch(()=>{});} };

  const getStatusColor=(s:string)=>({'upcoming':'#3b82f6','ongoing':'#10b981','completed':'#6b7280'}[s]||'#6b7280');
  const getStatusLabel=(s:string)=>({'upcoming':'Предстои','ongoing':'В ход','completed':'Завършила'}[s]||s);

  const formatDate=(ds:string)=>new Date(ds).toLocaleDateString('bg-BG',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const timeUntil=(ds:string,ts:string)=>{
    const diff=new Date(`${ds}T${ts}`).getTime()-Date.now();
    if(diff<=0) return null;
    const days=Math.floor(diff/86400000); const hours=Math.floor((diff%86400000)/3600000);
    return days>0?`${days} ${days===1?'ден':'дни'}`:hours>0?`${hours} ${hours===1?'час':'часа'}`:'скоро';
  };

  const filteredMeetings = meetings.filter(m=>{
    if(statusFilter!=='all'&&m.status!==statusFilter) return false;
    if(searchTerm&&!m.title.toLowerCase().includes(searchTerm.toLowerCase())&&!m.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if(loading) return(
    <div className="readers-club-page"><div className="loading-spinner"><div className="spinner"/><span>Зареждане на читателския клуб...</span></div></div>
  );

  return (
    <div className="readers-club-page">
      <div className="dashboard-container">

        {/* Header */}
        <div className="dashboard-header">
          <h1>Читателски Клуб</h1>
          <p>Споделете книжните си приключения, обсъждайте и откривайте нови светове с други читатели</p>
          {user && <button className="primary-btn rc-join-btn" onClick={()=>navigate('/readers-club/join')}><Users size={16}/>Присъедини се</button>}
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            {icon:<Users size={22}/>,label:'Членове',value:members.length,color:'#3b82f6'},
            {icon:<Calendar size={22}/>,label:'Предстоящи срещи',value:meetings.filter(m=>m.status==='upcoming').length,color:'#10b981'},
            {icon:<MessageSquare size={22}/>,label:'Дискусии',value:discussions.length,color:'#8b5cf6'},
            {icon:<Award size={22}/>,label:'Книга на месеца',value:bookOfMonth?1:0,color:'#f59e0b'},
          ].map((s,i)=>(
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{color:s.color}}>{s.icon}</div>
              <div className="stat-info"><span className="stat-value">{s.value}</span><span className="stat-label">{s.label}</span></div>
            </div>
          ))}
        </div>

        {/* Book of the Month */}
        {bookOfMonth && (
          <div className="content-section rc-bom-section">
            <div className="rc-bom-header">
              <Award size={20} style={{color:'#f59e0b'}}/>
              <h3>Книга на месеца</h3>
              <span className="rc-month-badge">{new Date().toLocaleDateString('bg-BG',{month:'long'})}</span>
            </div>
            <div className="rc-bom-body">
              <div className="rc-bom-cover">
                <Book size={48} style={{color:'var(--admin-primary,#3b82f6)'}}/>
                <div className="rc-progress-wrap">
                  <div className="rc-progress-bar"><div className="rc-progress-fill" style={{width:'45%'}}/></div>
                  <span className="rc-progress-label">45% прочетени</span>
                </div>
              </div>
              <div className="rc-bom-info">
                <h4>{bookOfMonth.title}</h4>
                <p className="rc-bom-author">от {bookOfMonth.author}</p>
                <p className="rc-bom-desc">{bookOfMonth.description}</p>
                <div className="sm-chips-row">
                  <span className="sm-chip"><Book size={11}/>{bookOfMonth.pages} стр.</span>
                  <span className="sm-chip"><Star size={11}/>{bookOfMonth.rating}/5.0</span>
                  <span className="sm-chip"><Tag size={11}/>{bookOfMonth.genre}</span>
                </div>
                <div className="rc-schedule-row">
                  <Calendar size={13}/>{new Date(bookOfMonth.readingSchedule.startDate).toLocaleDateString('bg-BG')}
                  <ArrowRight size={13}/>
                  {new Date(bookOfMonth.readingSchedule.endDate).toLocaleDateString('bg-BG')}
                  <span style={{marginLeft:8,color:'var(--admin-text-muted,#9ca3af)'}}>· {bookOfMonth.readingSchedule.weeklyPages} стр./седм.</span>
                </div>
                <div className="rc-bom-actions">
                  <button className="primary-btn rc-sm-btn"><MessageCircle size={14}/>Дискусия</button>
                  <button className="secondary-btn rc-sm-btn"><BookmarkCheck size={14}/>Запази</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search + Tabs */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon"/>
            <input type="text" className="search-input" placeholder="Търсете срещи, книги или дискусии..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          {[
            {id:'meetings',    label:`Срещи (${meetings.length})`,       icon:<Calendar size={16}/>},
            {id:'discussions', label:`Дискусии (${discussions.length})`, icon:<MessageSquare size={16}/>},
            {id:'members',     label:`Членове (${members.length})`,      icon:<Users size={16}/>},
          ].map(t=>(
            <button key={t.id} className={`tab-button ${viewMode===t.id?'active':''}`} onClick={()=>setViewMode(t.id as typeof viewMode)}>
              {t.icon}{t.label}
            </button>
          ))}
          <div className="rc-tab-actions">
            <div className="rc-status-filter">
              <Filter size={14}/>
              <select className="form-input rc-status-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
                <option value="all">Всички</option>
                <option value="upcoming">Предстоящи</option>
                <option value="ongoing">Текущи</option>
                <option value="completed">Завършили</option>
              </select>
            </div>
            {user && viewMode==='meetings' && (
              <button className="primary-btn rc-sm-btn" onClick={()=>navigate('/readers-club/meetings/new')}><Plus size={14}/>Предложи среща</button>
            )}
            {user && viewMode==='discussions' && (
              <button className="primary-btn rc-sm-btn" onClick={handleStartDiscussion}><MessageSquare size={14}/>Нова дискусия</button>
            )}
          </div>
        </div>

        {/* Popular Genres */}
        <div className="rc-genres-row">
          <span className="rc-genres-label">Популярни жанрове:</span>
          {['Фантастика','Биография','История','Научна литература','Роман','Класика'].map(g=>(
            <button key={g} className="rc-genre-chip" onClick={()=>setSearchTerm(g)}>{g}</button>
          ))}
        </div>

        {/* ── MEETINGS ── */}
        {viewMode==='meetings' && (
          <div className="content-section">
            <div className="sm-section-head">
              <h2><Calendar size={20}/>Срещи ({filteredMeetings.length})</h2>
            </div>
            {filteredMeetings.length>0 ? (
              <div className="rc-meetings-grid">
                {filteredMeetings.map((meeting,i)=>{
                  const tu = timeUntil(meeting.date,meeting.time);
                  const isExp = expandedMeetingId===meeting.id;
                  return (
                    <div key={meeting.id} className={`rc-meeting-card ${meeting.featured?'rc-meeting-featured':''}`} style={{animationDelay:`${i*80}ms`}}>
                      <div className="rc-meeting-top">
                        <div className="rc-date-box">
                          <span className="rc-date-day">{new Date(meeting.date).getDate()}</span>
                          <span className="rc-date-mon">{new Date(meeting.date).toLocaleDateString('bg-BG',{month:'short'})}</span>
                        </div>
                        <div className="rc-meeting-main">
                          <h4 className="rc-meeting-title">{meeting.title}</h4>
                          <div className="rc-meeting-book"><Book size={13}/><span>{meeting.bookTitle}</span><span className="rc-book-auth">от {meeting.bookAuthor}</span></div>
                        </div>
                        <div className="rc-meeting-status-col">
                          <span className="rc-status-pill" style={{background:getStatusColor(meeting.status)+'20',color:getStatusColor(meeting.status),border:`1px solid ${getStatusColor(meeting.status)}40`}}>{getStatusLabel(meeting.status)}</span>
                          {tu && <span className="rc-time-until">ощe {tu}</span>}
                        </div>
                      </div>
                      <div className="rc-meeting-meta">
                        <span><Clock size={13}/>{meeting.time} – {meeting.endTime}</span>
                        <span><MapPin size={13}/>{meeting.location}</span>
                        <span><User size={13}/>{meeting.organizer}</span>
                        <span><Users size={13}/>{meeting.currentParticipants}/{meeting.maxParticipants}</span>
                      </div>
                      <p className="rc-meeting-desc">{meeting.description}</p>
                      {isExp && (
                        <div className="rc-expanded-meeting">
                          <h5>Теми за дискусия:</h5>
                          <ul>{meeting.discussionPoints.map((p,i)=><li key={i}>{p}</li>)}</ul>
                          {meeting.materials && meeting.materials.length>0 && (
                            <div className="rc-materials-list">
                              <h5>Материали:</h5>
                              {meeting.materials.map((m,i)=><a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="sm-direct-link" style={{marginTop:4}}><FileText size={12}/>{m.title}</a>)}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="rc-meeting-actions">
                        <button className="primary-btn rc-sm-btn" onClick={()=>{setSelectedMeeting(meeting);handleJoinMeeting(meeting);}} disabled={meeting.currentParticipants>=meeting.maxParticipants}>
                          {meeting.currentParticipants>=meeting.maxParticipants?'Пълно':'Присъедини се'}
                        </button>
                        <div className="sm-icon-actions">
                          <button className="icon-action-btn" onClick={()=>setExpandedMeetingId(isExp?null:meeting.id)} title={isExp?'Скрий':'Детайли'}>{isExp?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
                          <button className="icon-action-btn" onClick={()=>{setSelectedMeeting(meeting);setShowMeetingModal(true);}} title="Подробности"><ExternalLink size={15}/></button>
                          {user && <button className="icon-action-btn" title="Запази"><Bookmark size={15}/></button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Calendar size={48}/><p>Няма срещи за избраните критерии</p>
                {user && <button className="primary-btn" style={{marginTop:'1rem'}} onClick={()=>navigate('/readers-club/meetings/new')}>Организирай среща</button>}
              </div>
            )}
          </div>
        )}

        {/* ── DISCUSSIONS ── */}
        {viewMode==='discussions' && (
          <div className="content-section">
            <div className="sm-section-head"><h2><MessageSquare size={20}/>Дискусии ({discussions.length})</h2></div>
            {discussions.length>0 ? (
              <div className="rc-discussions-grid">
                {discussions.map((d,i)=>(
                  <div key={d.id} className="rc-disc-card" style={{animationDelay:`${i*80}ms`}}>
                    <div className="rc-disc-header">
                      <div className="rc-disc-author">
                        <div className="rc-avatar"><User size={20}/></div>
                        <div>
                          <strong>{d.author}</strong>
                          <span className="rc-disc-date">
                            {d.createdAt
                              ? new Date(typeof d.createdAt==='object'&&'seconds' in (d.createdAt as object)
                                  ?((d.createdAt as {seconds:number}).seconds*1000)
                                  :d.createdAt instanceof Date?d.createdAt:String(d.createdAt)).toLocaleDateString('bg-BG')
                              : ''}
                          </span>
                        </div>
                      </div>
                      <div className="sm-chips-row">
                        {d.tags.slice(0,2).map(t=><span key={t} className="sm-chip sm-tag">{t}</span>)}
                      </div>
                    </div>
                    <h4 className="rc-disc-title">{d.title}</h4>
                    <p className="rc-disc-content">{d.content.substring(0,200)}…</p>
                    <div className="rc-disc-stats">
                      <span><ThumbsUp size={13}/>{d.likes}</span>
                      <span><MessageCircle size={13}/>{d.comments}</span>
                    </div>
                    <div className="rc-disc-actions">
                      <button className="primary-btn rc-sm-btn" onClick={()=>handleLike(d.id)}><Heart size={13}/>Харесай</button>
                      <button className="edit-btn rc-sm-btn" onClick={()=>navigate(`/readers-club/discussions/${d.id}`)}><MessageSquare size={13}/>Коментирай</button>
                      <div className="sm-icon-actions">
                        <button className="icon-action-btn" onClick={()=>handleSave(d.id)} title="Запази"><Bookmark size={15}/></button>
                        <button className="icon-action-btn" onClick={()=>handleShare(d)} title="Сподели"><Share2 size={15}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <MessageSquare size={48}/><p>Все още няма дискусии</p>
                {user && <button className="primary-btn" style={{marginTop:'1rem'}} onClick={handleStartDiscussion}>Започни дискусия</button>}
              </div>
            )}
          </div>
        )}

        {/* ── MEMBERS ── */}
        {viewMode==='members' && (
          <div className="content-section">
            <div className="sm-section-head"><h2><Users size={20}/>Членове ({members.length})</h2></div>
            <div className="rc-members-grid">
              {members.map((m,i)=>(
                <div key={m.id} className="rc-member-card" style={{animationDelay:`${i*60}ms`}}>
                  <div className="rc-member-top">
                    <div className="rc-member-avatar">
                      {m.avatar?<img src={m.avatar} alt={m.name}/>:<User size={28}/>}
                      {m.role==='organizer' && <span className="rc-role-pip org">★</span>}
                    </div>
                    <div>
                      <h4 className="rc-member-name">{m.name}</h4>
                      <span className="rc-member-role-label">{m.role==='organizer'?'Основател':m.role==='moderator'?'Модератор':'Член'}</span>
                      <div className="rc-member-stats">
                        <span><Book size={11}/>{m.booksRead} книги</span>
                        <span><Calendar size={11}/>{new Date(m.joinedAt).toLocaleDateString('bg-BG')}</span>
                      </div>
                    </div>
                  </div>
                  {m.bio && <p className="rc-member-bio">{m.bio}</p>}
                  <div className="rc-genres-chips">
                    {m.favoriteGenres.map(g=><span key={g} className="sm-chip">{g}</span>)}
                  </div>
                  {m.currentlyReading && <p className="rc-reading-now"><Book size={12}/><em>{m.currentlyReading}</em></p>}
                  <div className="rc-member-actions">
                    <button className="primary-btn rc-sm-btn" onClick={()=>navigate(`/profile/${m.id}`)}>Профил</button>
                    <button className="secondary-btn rc-sm-btn" onClick={()=>navigate(`/messages?user=${m.id}`)}><MessageSquare size={13}/>Съобщение</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote */}
        <blockquote className="rc-quote">
          <p>"Един читател живее хиляди животи, преди да умре. Човекът, който никога не чете, живее само един."</p>
          <cite>— Джордж Р. Р. Мартин</cite>
        </blockquote>

        {/* Benefits */}
        <div className="sm-info-grid">
          {[
            {icon:<Users size={24}/>,title:'Социална общност',text:'Запознайте се с хора, споделящи вашата любов към книгите.'},
            {icon:<BookOpen size={24}/>,title:'Разширете хоризонтите',text:'Открийте нови жанрове чрез препоръките на другите читатели.'},
            {icon:<MessageSquare size={24}/>,title:'Дълбоки дискусии',text:'Споделете мислите си и разберете нови перспективи.'},
            {icon:<Award size={24}/>,title:'Предизвикателства',text:'Участвайте в книжни предизвикателства и спечелете награди.'},
          ].map((c,i)=>(
            <div key={i} className="sm-info-card">
              <div className="sm-info-icon">{c.icon}</div>
              <div><h4>{c.title}</h4><p>{c.text}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Modal */}
      {showMeetingModal && selectedMeeting && (
        <div className="modal-overlay" onClick={()=>setShowMeetingModal(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMeeting.title}</h3>
              <button className="close-btn" onClick={()=>setShowMeetingModal(false)}><X size={18}/></button>
            </div>
            <div className="modal-body">
              <div className="rc-modal-details">
                <div className="modal-detail"><span>Дата</span><strong>{formatDate(selectedMeeting.date)}</strong></div>
                <div className="modal-detail"><span>Час</span><strong>{selectedMeeting.time} – {selectedMeeting.endTime}</strong></div>
                <div className="modal-detail"><span>Място</span><strong>{selectedMeeting.location}</strong></div>
                <div className="modal-detail"><span>Книга</span><strong>{selectedMeeting.bookTitle}</strong></div>
                <div className="modal-detail"><span>Автор</span><strong>{selectedMeeting.bookAuthor}</strong></div>
                <div className="modal-detail"><span>Участници</span><strong>{selectedMeeting.currentParticipants}/{selectedMeeting.maxParticipants}</strong></div>
              </div>
              <p style={{color:'var(--admin-text-secondary)',lineHeight:1.6,marginTop:'1rem'}}>{selectedMeeting.description}</p>
              <h5 style={{margin:'1rem 0 .5rem',color:'var(--admin-text-primary)'}}>Теми:</h5>
              <ul style={{paddingLeft:'1.25rem',color:'var(--admin-text-secondary)',fontSize:'.875rem'}}>
                {selectedMeeting.discussionPoints.map((p,i)=><li key={i}>{p}</li>)}
              </ul>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={()=>{setShowMeetingModal(false);handleJoinMeeting(selectedMeeting);}}>Присъедини се</button>
              <button className="cancel-btn" onClick={()=>setShowMeetingModal(false)}>Затвори</button>
            </div>
          </div>
        </div>
      )}

      {/* Join Form */}
      {showJoinForm && selectedMeeting && (
        <div className="modal-overlay" onClick={()=>setShowJoinForm(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>Присъединяване</h3>
              <button className="close-btn" onClick={()=>setShowJoinForm(false)}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              <div className="form-group">
                <label className="filter-label">Вашето име</label>
                <input type="text" className="form-input" defaultValue={user?.displayName||''} readOnly/>
              </div>
              <div className="form-group">
                <label className="filter-label">Имейл</label>
                <input type="email" className="form-input" defaultValue={user?.email||''} readOnly/>
              </div>
              <div className="form-group">
                <label className="filter-label">Защо искате да се присъедините? (по избор)</label>
                <textarea className="form-input" rows={3} style={{resize:'vertical'}} placeholder="Споделете..." value={userReview} onChange={e=>setUserReview(e.target.value)}/>
              </div>
              <div className="rc-modal-details">
                <div className="modal-detail"><span>Дата</span><strong>{formatDate(selectedMeeting.date)}</strong></div>
                <div className="modal-detail"><span>Час</span><strong>{selectedMeeting.time} – {selectedMeeting.endTime}</strong></div>
                <div className="modal-detail"><span>Свободни места</span><strong>{selectedMeeting.maxParticipants-selectedMeeting.currentParticipants}</strong></div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={handleSubmitJoin}>Потвърди</button>
              <button className="cancel-btn" onClick={()=>setShowJoinForm(false)}>Откажи</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadersClubPage;