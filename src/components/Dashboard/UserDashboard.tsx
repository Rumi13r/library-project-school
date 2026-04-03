// src/components/Dashboard/UserDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, Timestamp } from "firebase/firestore";
import {
  BookOpen, Calendar, Search, Clock, CheckCircle, Ticket, History, Heart, Bookmark,
  RotateCcw, XCircle, Eye, MapPin, X, Printer, Book, Sparkles, Loader2, Home, Bell,
  ArrowRight, ChevronRight, User, Library, Star, Settings,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import EventTicketModal from "../EventTicketModal";
import EventDetailsModal from "../../pages/EventDetailsModal";
import { v4 as uuidv4 } from 'uuid';
import styles from './UserDashboard.module.css';
import PrivacySettingsTab from './PrivacySettingsTab';
import './PrivacySettingsTab.css';

import * as bookService        from "../../lib/services/bookService";
import * as reservationService  from "../../lib/services/reservationService";
import type { Reservation }     from "../../lib/services/reservationService";
import * as userService         from "../../lib/services/userService";
import * as wishlistService     from "../../lib/services/wishlistService";
import type { BookLibrary }     from "../../lib/services/bookTypes";
import { recommendationService } from "../../lib/services/recommendationService";
import type { Recommendation }   from "../../lib/services/recommendationService";

// ── FSDate helper ─────────────────────────────────────────────────────────────
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

const toDateString = (d: FSDate): string => {
  if (!d) return '';
  try {
    if (typeof d === 'string') return d.split('T')[0];
    if (d instanceof Date)    return d.toISOString().split('T')[0];
    if (typeof d === 'object') {
      if ('toDate' in d && typeof d.toDate === 'function') return d.toDate().toISOString().split('T')[0];
      if ('seconds' in d && typeof d.seconds === 'number') return new Date(d.seconds * 1000).toISOString().split('T')[0];
    }
  } catch { /* ignore */ }
  return '';
};

// ── Interfaces ────────────────────────────────────────────────────────────────
interface BorrowRecord {
  userId: string; userName?: string; userEmail?: string;
  borrowedDate: string; dueDate: string; returned: boolean;
  renewed?: boolean; renewalCount?: number;
}

interface UserBook {
  bookId: string; bookDetails: BookLibrary;
  status: 'borrowed'|'reserved'|'wishlist'|'viewed'|'available';
  borrowedDate?: string; dueDate?: string;
  reservationExpiresAt?: string; borrowedRecord?: BorrowRecord;
}

interface AppEvent {
  id: string; title: string; description: string;
  date: string; time: string; endTime: string;
  location: string; maxParticipants: number; currentParticipants: number;
  allowedRoles: string[]; organizer: string; participants: string[];
  imageUrl?: string;
  tickets?: {
    [uid: string]: {
      ticketId: string; registrationDate: FSDate;
      checkedIn: boolean; checkedInTime?: FSDate;
    };
  };
}

interface UserTicket {
  eventId: string; ticketId: string; eventTitle: string;
  eventDate: string; eventTime: string; endTime: string;
  eventLocation: string; registrationDate: string;
  checkedIn: boolean; checkedInTime?: string;
  eventImageUrl?: string; isPast?: boolean;
}

interface UserData {
  role?: 'admin'|'librarian'|'reader';
  profile?: { displayName?: string };
}

type ActiveTab =
  | 'home'|'books'|'reservations'|'wishlist'
  | 'activeEvents'|'pastEvents'|'tickets'
  | 'recommendations'|'settings';

// ═════════════════════════════════════════════════════════════════════════════
const UserDashboard: React.FC = () => {
  const [userBooks,       setUserBooks]       = useState<UserBook[]>([]);
  const [allBooks,        setAllBooks]        = useState<BookLibrary[]>([]);
  const [allEvents,       setAllEvents]       = useState<AppEvent[]>([]);
  const [userTickets,     setUserTickets]     = useState<UserTicket[]>([]);
  const [reservations,    setReservations]    = useState<Reservation[]>([]);
  const [wishlist,        setWishlist]        = useState<string[]>([]);
  const [viewedBooks,     setViewedBooks]     = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState({ borrowedBooks:0, reservedBooks:0, wishlistCount:0, activeTickets:0, pastTickets:0, totalTickets:0 });
  const [userData]             = useState<UserData|null>(null);
  const [searchTerm,            setSearchTerm]            = useState('');
  const [activeTab,             setActiveTab]             = useState<ActiveTab>('home');
  const [loading,               setLoading]               = useState(true);
  const [processingBook,        setProcessingBook]        = useState<string|null>(null);
  const [processingEvent,       setProcessingEvent]       = useState<string|null>(null);
  const [showTicket,            setShowTicket]            = useState(false);
  const [currentTicket,         setCurrentTicket]         = useState<UserTicket|null>(null);
  const [showEventModal,        setShowEventModal]        = useState(false);
  const [selectedEventId,       setSelectedEventId]       = useState<string|null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  const getUserDisplayName = useCallback((): string => {
    if (userData?.profile?.displayName) return userData.profile.displayName;
    return user?.email?.split('@')[0] || 'Потребител';
  }, [user, userData]);

  const { activeEvents, pastEvents } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      activeEvents: [...allEvents].filter(e=>e.date&&e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)),
      pastEvents:   [...allEvents].filter(e=>e.date&&e.date<today).sort((a,b)=>b.date.localeCompare(a.date)),
    };
  }, [allEvents]);

  const loadRecommendations = useCallback(async (userId: string) => {
    try { setRecommendations(await recommendationService.getPersonalizedRecommendations(userId, 6)); }
    catch (e) { console.error(e); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db,"events"));
      setAllEvents(snap.docs.map(d => {
        const x = d.data();
        return { id:d.id, title:x.title||'', description:x.description||'', date:x.date||'', time:x.time||'', endTime:x.endTime||'', location:x.location||'', maxParticipants:x.maxParticipants||0, currentParticipants:x.currentParticipants||0, allowedRoles:x.allowedRoles||[], organizer:x.organizer||'', participants:x.participants||[], imageUrl:x.imageUrl||'', tickets:x.tickets||{} };
      }));
    } catch(e) { console.error(e); }
  }, []);

  const prepareUserBooks = useCallback(async (books: BookLibrary[], resv: Reservation[], wl: string[], viewed: string[]) => {
    if (!user) return;
    const list: UserBook[] = [];
    books.forEach(book => {
      const rec = book.borrowedBy?.find((b: BorrowRecord)=>b.userId===user.uid&&!b.returned);
      if (rec) list.push({ bookId:book.id, bookDetails:book, status:'borrowed', borrowedDate:rec.borrowedDate, dueDate:rec.dueDate, borrowedRecord:rec });
    });
    resv.forEach(r => {
      if (list.some(u=>u.bookId===r.bookId&&u.status==='borrowed')) return;
      const book = books.find(b=>b.id===r.bookId);
      if (book&&r.status==='active') list.push({ bookId:book.id, bookDetails:book, status:'reserved', reservationExpiresAt:toDateString(r.expiresAt) });
    });
    wl.forEach(bookId => {
      if (list.some(u=>u.bookId===bookId&&(u.status==='borrowed'||u.status==='reserved'))) return;
      const book = books.find(b=>b.id===bookId);
      if (book&&!list.some(u=>u.bookId===bookId&&u.status==='wishlist')) list.push({ bookId:book.id, bookDetails:book, status:'wishlist' });
    });
    viewed.forEach(bookId => {
      if (list.some(u=>u.bookId===bookId)) return;
      const book = books.find(b=>b.id===bookId);
      if (book) list.push({ bookId:book.id, bookDetails:book, status:'viewed' });
    });
    setUserBooks(list);
  }, [user]);

  useEffect(() => {
    const loadAll = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const booksData = await bookService.fetchAllBooks();
        setAllBooks(booksData);
        await fetchEvents();
        const userResv = await reservationService.getUserActiveReservations(user.uid);
        setReservations(userResv);
        const userWL = await wishlistService.getUserWishlist(user.uid);
        setWishlist(userWL);
        const viewed = await userService.getUserViewedBooks(user.uid);
        setViewedBooks(viewed);
        await prepareUserBooks(booksData, userResv, userWL, viewed);
        await loadRecommendations(user.uid);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setStats({
      borrowedBooks: userBooks.filter(b=>b.status==='borrowed').length,
      reservedBooks: userBooks.filter(b=>b.status==='reserved').length,
      wishlistCount: wishlist.length,
      activeTickets: userTickets.filter(t=>!t.isPast).length,
      pastTickets:   userTickets.filter(t=>!!t.isPast).length,
      totalTickets:  userTickets.length,
    });
  }, [userBooks, wishlist, userTickets]);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const data: UserTicket[] = [];
      for (const event of allEvents) {
        const ticket = event.tickets?.[user.uid];
        if (!ticket) continue;
        const isPast = event.date < today;
        const regDate = typeof ticket.registrationDate==='object'&&ticket.registrationDate&&'toDate' in ticket.registrationDate&&typeof (ticket.registrationDate as {toDate:()=>Date}).toDate==='function'?(ticket.registrationDate as {toDate:()=>Date}).toDate().toLocaleDateString('bg-BG'):new Date().toLocaleDateString('bg-BG');
        const checkTime = typeof ticket.checkedInTime==='object'&&ticket.checkedInTime&&'toDate' in ticket.checkedInTime&&typeof (ticket.checkedInTime as {toDate:()=>Date}).toDate==='function'?(ticket.checkedInTime as {toDate:()=>Date}).toDate().toLocaleString('bg-BG'):undefined;
        data.push({ eventId:event.id, ticketId:ticket.ticketId, eventTitle:event.title, eventDate:event.date, eventTime:event.time, endTime:event.endTime, eventLocation:event.location, registrationDate:regDate, checkedIn:ticket.checkedIn||false, checkedInTime:checkTime, eventImageUrl:event.imageUrl, isPast });
      }
      data.sort((a,b)=>{if(a.isPast&&!b.isPast)return 1;if(!a.isPast&&b.isPast)return -1;return new Date(b.eventDate).getTime()-new Date(a.eventDate).getTime();});
      setUserTickets(data);
    };
    if (allEvents.length>0) fetchTickets();
  }, [allEvents, user]);

  const refreshRecs = async () => { if (user) await loadRecommendations(user.uid); };
  const formatDate  = (ds: string) => new Date(ds).toLocaleDateString('bg-BG',{day:'numeric',month:'long',year:'numeric'});
  const getStatusColor = (s: string) => ({borrowed:'#10b981',reserved:'#f59e0b',wishlist:'#ec4899',viewed:'#8b5cf6',available:'#3b82f6'}[s]||'#6b7280');
  const getStatusText  = (s: string) => ({borrowed:'Заета',reserved:'Резервирана',wishlist:'Желана',viewed:'Прегледана',available:'Налична'}[s]||'Неизвестен');
  const getAvailableSpots = (e: AppEvent) => Math.max(0,e.maxParticipants-e.currentParticipants);
  const isEventFull      = (e: AppEvent) => getAvailableSpots(e)<=0;
  const isUserRegistered = (e: AppEvent): boolean => !!(user&&e.participants?.includes(user.uid));

  // ── Book actions ────────────────────────────────────────────────────────────
  const reserveBook = async (bookId: string) => {
    if (!user?.email||!user?.displayName){alert('Моля, влезте!');return;}
    try {
      setProcessingBook(bookId);
      const book=allBooks.find(b=>b.id===bookId);
      if(!book){alert('Книгата не е намерена!');return;}
      if(book.availableCopies<=0){alert('Няма налични копия!');return;}
      if(await reservationService.checkUserReservationForBook(user.uid,bookId)){alert('Вече имате резервация!');return;}
      await reservationService.createReservation({bookId,userId:user.uid,userName:user.displayName,userEmail:user.email,borrowPeriod:book.borrowPeriod||14});
      await bookService.updateBookAvailableCopies(bookId,-1);
      const upd=await reservationService.getUserActiveReservations(user.uid);
      setReservations(upd);await prepareUserBooks(allBooks,upd,wishlist,viewedBooks);await refreshRecs();
      alert(`Резервирахте "${book.title}"!`);
    }catch(e){console.error(e);alert("Грешка при резервиране.");}
    finally{setProcessingBook(null);}
  };
  const cancelReservation = async (reservationId: string, bookId: string) => {
    if(!user)return;
    try{
      setProcessingBook(bookId);
      await reservationService.cancelReservation(reservationId);
      await bookService.updateBookAvailableCopies(bookId,1);
      const upd=await reservationService.getUserActiveReservations(user.uid);
      setReservations(upd);await prepareUserBooks(allBooks,upd,wishlist,viewedBooks);await refreshRecs();
      alert("Резервацията е отменена!");
    }catch(e){console.error(e);alert("Грешка при отмяна.");}
    finally{setProcessingBook(null);}
  };
  const toggleWishlist = async (bookId: string) => {
    if(!user){alert('Моля, влезте!');return;}
    try{
      setProcessingBook(bookId);
      const inWL=await wishlistService.isBookInWishlist(user.uid,bookId);
      if(inWL)await wishlistService.removeFromWishlist(user.uid,bookId);
      else await wishlistService.addToWishlist(user.uid,bookId);
      const upd=await wishlistService.getUserWishlist(user.uid);
      setWishlist(upd);await prepareUserBooks(allBooks,reservations,upd,viewedBooks);await refreshRecs();
    }catch(e){console.error(e);alert("Грешка.");}
    finally{setProcessingBook(null);}
  };
  const returnBook = async (bookId: string) => {
    if(!user)return;
    try{
      setProcessingBook(bookId);
      await bookService.returnBook(bookId,user.uid);
      const upd=await bookService.fetchAllBooks();setAllBooks(upd);
      await prepareUserBooks(upd,reservations,wishlist,viewedBooks);await refreshRecs();
      alert("Книгата е върната!");
    }catch(e){console.error(e);alert("Грешка при връщане.");}
    finally{setProcessingBook(null);}
  };
  const renewBook = async (bookId: string) => {
    if(!user)return;
    try{
      setProcessingBook(bookId);
      const book=allBooks.find(b=>b.id===bookId);
      if(!book){alert('Книгата не е намерена!');return;}
      const rec=book.borrowedBy?.find((b: BorrowRecord)=>b.userId===user.uid&&!b.returned);
      if(!rec){alert('Не сте взели тази книга!');return;}
      const newDue=new Date(rec.dueDate);newDue.setDate(newDue.getDate()+14);
      const updBorrowed=book.borrowedBy?.map((r: BorrowRecord)=>r.userId===user.uid&&!r.returned?{...r,dueDate:newDue.toISOString().split('T')[0]}:r);
      await updateDoc(doc(db,"books",bookId),{borrowedBy:updBorrowed,lastUpdated:Timestamp.now()});
      const upd=await bookService.fetchAllBooks();setAllBooks(upd);
      await prepareUserBooks(upd,reservations,wishlist,viewedBooks);
      alert(`Заемът е удължен до ${formatDate(newDue.toISOString().split('T')[0])}.`);
    }catch(e){console.error(e);alert("Грешка.");}
    finally{setProcessingBook(null);}
  };

  // ── Event actions ───────────────────────────────────────────────────────────
  const registerForEvent = async (eventId: string) => {
    if(!user){alert('Моля, влезте!');return;}
    try{
      setProcessingEvent(eventId);
      const ref=doc(db,"events",eventId);const snap=await getDoc(ref);
      if(!snap.exists()){alert("Събитието не е намерено!");return;}
      const ev=snap.data() as AppEvent;
      if(isUserRegistered(ev)){alert("Вече сте записани!");return;}
      if(ev.date<new Date().toISOString().split('T')[0]){alert("Събитието е изтекло!");return;}
      if(ev.currentParticipants>=ev.maxParticipants){alert("Събитието е пълно!");return;}
      const ticketId=`TICKET-${uuidv4().substring(0,8).toUpperCase()}`;
      const ticketData={ticketId,registrationDate:new Date(),checkedIn:false};
      await updateDoc(ref,{currentParticipants:ev.currentParticipants+1,participants:arrayUnion(user.uid),[`tickets.${user.uid}`]:ticketData});
      setAllEvents(prev=>prev.map(e=>e.id===eventId?{...e,currentParticipants:e.currentParticipants+1,participants:[...(e.participants||[]),user.uid],tickets:{...e.tickets,[user.uid]:ticketData}}:e));
      const nt: UserTicket={eventId,ticketId,eventTitle:ev.title,eventDate:ev.date,eventTime:ev.time,endTime:ev.endTime,eventLocation:ev.location,registrationDate:new Date().toLocaleDateString('bg-BG'),checkedIn:false,eventImageUrl:ev.imageUrl};
      setUserTickets(prev=>[...prev,nt]);setCurrentTicket(nt);setShowTicket(true);
    }catch(e){console.error(e);alert("Грешка при записване.");}
    finally{setProcessingEvent(null);}
  };
  const unregisterFromEvent = async (eventId: string) => {
    if(!user){alert('Моля, влезте!');return;}
    try{
      setProcessingEvent(eventId);
      const ref=doc(db,"events",eventId);const snap=await getDoc(ref);
      if(!snap.exists()){alert("Събитието не е намерено!");return;}
      const ev=snap.data() as AppEvent;
      if(!isUserRegistered(ev)){alert("Не сте записани!");return;}
      setUserTickets(prev=>prev.filter(t=>t.eventId!==eventId));
      const updatedTickets=ev.tickets?{...ev.tickets}:{};
      if(updatedTickets[user.uid])delete updatedTickets[user.uid];
      await updateDoc(ref,{currentParticipants:Math.max(0,ev.currentParticipants-1),participants:arrayRemove(user.uid),tickets:updatedTickets});
      setAllEvents(prev=>prev.map(e=>e.id===eventId?{...e,currentParticipants:Math.max(0,e.currentParticipants-1),participants:e.participants?.filter(u=>u!==user.uid)||[],tickets:updatedTickets}:e));
      alert(`Отписахте се от "${ev.title}"!`);
    }catch(e){console.error(e);alert("Грешка при отписване.");}
    finally{setProcessingEvent(null);}
  };

  // ── Filtered data ───────────────────────────────────────────────────────────
  const filteredUserBooks = useMemo(()=>userBooks.filter(b=>b.bookDetails.title.toLowerCase().includes(searchTerm.toLowerCase())||b.bookDetails.author.toLowerCase().includes(searchTerm.toLowerCase())||b.bookDetails.genres?.some(g=>g.toLowerCase().includes(searchTerm.toLowerCase()))||b.status.toLowerCase().includes(searchTerm.toLowerCase())),[userBooks,searchTerm]);
  const filteredReservations = useMemo(()=>reservations.filter(r=>{const b=allBooks.find(x=>x.id===r.bookId);return b&&(b.title.toLowerCase().includes(searchTerm.toLowerCase())||b.author.toLowerCase().includes(searchTerm.toLowerCase()));}),[reservations,allBooks,searchTerm]);
  const filteredWishlist = useMemo(()=>wishlist.map(id=>allBooks.find(b=>b.id===id)).filter((b): b is BookLibrary=>!!b&&(b.title.toLowerCase().includes(searchTerm.toLowerCase())||b.author.toLowerCase().includes(searchTerm.toLowerCase()))),[wishlist,allBooks,searchTerm]);
  const filteredActiveEvents = activeEvents.filter(e=>e.title.toLowerCase().includes(searchTerm.toLowerCase())||e.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredPastEvents   = pastEvents.filter(e=>e.title.toLowerCase().includes(searchTerm.toLowerCase())||e.description.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredTickets      = userTickets.filter(t=>t.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())||t.eventLocation.toLowerCase().includes(searchTerm.toLowerCase())||t.ticketId.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredRecommendations = recommendations.filter(r=>r.title.toLowerCase().includes(searchTerm.toLowerCase())||r.author.toLowerCase().includes(searchTerm.toLowerCase())||r.reason.toLowerCase().includes(searchTerm.toLowerCase()));

  const showEventTicket = (t: UserTicket) => { setCurrentTicket(t); setShowTicket(true); };
  const printTicket = () => window.print();

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className={styles.userDashboard}>
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.titleIconWrapper}><User className={styles.titleIcon} size={32}/></div>
            <div className={styles.titleContent}>
              <h1 className={styles.handwrittenTitle}>Добре дошъл, {getUserDisplayName()}!</h1>
              <p className={styles.subtitle}>Управлявайте книгите, резервациите и събитията си.</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          {[
            {icon:<BookOpen size={24}/>,label:'Заети книги',   val:stats.borrowedBooks,sub:'В момента'},
            {icon:<Bookmark size={24}/>,label:'Резервации',    val:stats.reservedBooks,sub:'Изчакващи'},
            {icon:<Heart size={24}/>,   label:'Желани книги',  val:stats.wishlistCount,sub:'В списъка'},
            {icon:<Ticket size={24}/>,  label:'Активни билети',val:stats.activeTickets,sub:'За събития'},
          ].map(s=>(
            <div key={s.label} className={styles.statItem}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statInfo}><h3>{s.label}</h3><div className={styles.statNumber}>{s.val}</div><div className={styles.statLabel}>{s.sub}</div></div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className={styles.search}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon}/>
            <input type="text" placeholder="Търсене..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={styles.searchInput}/>
            <div className={styles.searchInfo}><Clock size={14}/><span>Реално време</span></div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          {([
            ['home',           'Начало',      <Home size={18}/>],
            ['books',          'Книги',        <BookOpen size={18}/>],
            ['reservations',   'Резервации',   <Bookmark size={18}/>],
            ['wishlist',       'Желани',       <Heart size={18}/>],
            ['recommendations','Препоръки',    <Sparkles size={18}/>],
            ['activeEvents',   'Събития',      <Calendar size={18}/>],
            ['pastEvents',     'Изтекли',      <History size={18}/>],
            ['tickets',        'Билети',       <Ticket size={18}/>],
            ['settings',       'Настройки',    <Settings size={18}/>],
          ] as [string,string,React.ReactNode][]).map(([id,label,icon])=>(
            <button key={id} className={`${styles.tab} ${activeTab===id?styles.active:''}`} onClick={()=>setActiveTab(id as ActiveTab)}>
              <span className={styles.tabIcon as string}>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── HOME ──────────────────────────────────────────────────────────── */}
        {activeTab==='home'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Общ Преглед</h2>
              <p className={styles.sectionSubtitle}>Всичко на едно място</p>
            </div>
            <div className={styles.quickActions}>
              {[
                {icon:<Library size={24}/>,  title:'Разгледайте каталога', desc:'Открийте нови книги',        action:()=>navigate('/books'),             btn:'Прегледайте'},
                {icon:<Calendar size={24}/>, title:'Предстоящи събития',   desc:'Запишете се за мероприятия', action:()=>navigate('/events'),            btn:'Вижте всички'},
                {icon:<Star size={24}/>,     title:'Препоръки',             desc:'Книги, които може да харесате',action:()=>setActiveTab('recommendations'),btn:'Вижте всички'},
                {icon:<Settings size={24}/>, title:'Настройки',             desc:'Поверителност и съгласия',   action:()=>setActiveTab('settings'),       btn:'Настройки'},
              ].map(c=>(
                <div key={c.title} className={styles.quickActionCard}>
                  <div className={styles.quickActionIcon}>{c.icon}</div>
                  <div className={styles.quickActionContent}>
                    <h3>{c.title}</h3><p>{c.desc}</p>
                    <button className={styles.quickActionBtn} onClick={c.action}><span>{c.btn}</span><ArrowRight size={16}/></button>
                  </div>
                </div>
              ))}
            </div>

            {recommendations.length>0&&(
              <div className={styles.miniRecommendations}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Препоръчани за вас</h3>
                  <button className={styles.viewAllBtn} onClick={()=>setActiveTab('recommendations')}><span>Вижте всички</span><ChevronRight size={16}/></button>
                </div>
                <div className={styles.recommendationsGrid}>
                  {recommendations.slice(0,3).map(rec=>(
                    <div key={rec.bookId} className={styles.miniRecCard}>
                      {rec.coverUrl?<img src={rec.coverUrl} alt={rec.title} className={styles.miniRecCover}/>:<div className={styles.miniRecCoverPlaceholder}><Book size={20}/></div>}
                      <div className={styles.miniRecInfo}>
                        <div className={styles.miniRecTitle}>{rec.title}</div>
                        <div className={styles.miniRecAuthor}>{rec.author}</div>
                        <div className={styles.miniRecReason}>{rec.reason}</div>
                      </div>
                      <button className={styles.miniRecAction} onClick={()=>navigate(`/books/${rec.bookId}`)} title="Виж детайли"><Eye size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeEvents.length>0&&(
              <div className={styles.upcomingEvents}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>Предстоящи събития</h3>
                  <button className={styles.viewAllBtn} onClick={()=>setActiveTab('activeEvents')}><span>Вижте всички</span><ChevronRight size={16}/></button>
                </div>
                <div className={styles.eventsList}>
                  {activeEvents.slice(0,3).map(event=>{
                    const reg=isUserRegistered(event);const full=isEventFull(event);
                    return(
                      <div key={event.id} className={styles.miniEventCard}>
                        <div className={styles.miniEventInfo}>
                          <div className={styles.miniEventTitle}>{event.title}</div>
                          <div className={styles.miniEventDateTime}>
                            <div className={styles.miniEventDate}><Calendar size={14}/><span>{formatDate(event.date)}</span></div>
                            <div className={styles.eventTime}>{event.time}</div>
                          </div>
                          <div className={styles.miniEventDetails}>
                            <div className={styles.miniEventLocation}><MapPin size={14}/><span>{event.location}</span></div>
                            <div className={styles.eventSpots}><span className={`${styles.spotsCount} ${full?styles.spotsFull:''}`}>{getAvailableSpots(event)} свободни</span></div>
                          </div>
                        </div>
                        <button className={`${styles.miniEventButton} ${reg?styles.unregister:''}`} onClick={()=>reg?unregisterFromEvent(event.id):registerForEvent(event.id)} disabled={processingEvent===event.id||(!reg&&full)}>
                          {processingEvent===event.id?<><Loader2 size={16} className={styles.spinner}/><span>Зареждане...</span></>:full&&!reg?<><XCircle size={16}/><span>Пълно</span></>:reg?<><XCircle size={16}/><span>Откажи</span></>:<><CheckCircle size={16}/><span>Запиши се</span></>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.infoSection}>
              {[
                {icon:<BookOpen size={24}/>,title:'Бързи съвети',  text:'Резервирайте книги предварително. Удължавайте заемите своевременно.'},
                {icon:<Calendar size={24}/>,title:'Събития',       text:'Записвайте се предварително. Билетите се генерират автоматично.'},
                {icon:<Bell size={24}/>,    title:'Нотификации',   text:'Следете изтичащи заеми и предстоящи събития.'},
              ].map(c=>(
                <div key={c.title} className={styles.infoCard}>
                  <div className={styles.infoCardIcon}>{c.icon}</div>
                  <div className={styles.infoCardContent}><h4>{c.title}</h4><p>{c.text}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOOKS ─────────────────────────────────────────────────────────── */}
        {activeTab==='books'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Моите Книги</h2><p className={styles.sectionSubtitle}>Заети, резервирани, желани и прегледани книги</p></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredUserBooks.length>0?(
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead><tr><th>Книга</th><th>Автор</th><th>Статус</th><th>Срок</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredUserBooks.map(ub=>{
                        const book=ub.bookDetails;const isProc=processingBook===book.id;
                        const actRes=reservations.find(r=>r.bookId===book.id&&r.status==='active');
                        const isBorrowed=book.borrowedBy?.some((b: BorrowRecord)=>b.userId===user?.uid&&!b.returned);
                        const dispStatus=isBorrowed?'borrowed':ub.status;
                        return(
                          <tr key={book.id}>
                            <td><div className={styles.bookTitle}><BookOpen className={styles.bookIcon}/><div><div className={styles.eventTitleText}>{book.title}</div>{book.genres&&book.genres.length>0&&<div className={styles.bookGenres}>{book.genres.slice(0,2).map(g=><span key={g} className={styles.genreTag}>{g}</span>)}</div>}</div></div></td>
                            <td><div className={styles.bookAuthor}>{book.author}</div></td>
                            <td><span className={`${styles.badge} ${styles.activeBadge}`} style={{background:`${getStatusColor(dispStatus)}20`,color:getStatusColor(dispStatus),border:`1px solid ${getStatusColor(dispStatus)}40`}}>{isBorrowed?'Заета':getStatusText(ub.status)}</span></td>
                            <td>
                              {isBorrowed&&book.borrowedBy&&(()=>{const rec=book.borrowedBy.find((b: BorrowRecord)=>b.userId===user?.uid&&!b.returned);return rec?.dueDate?<div className={styles.dueDate}><Clock size={14}/>{formatDate(rec.dueDate)}</div>:null;})()}
                              {!isBorrowed&&actRes&&ub.reservationExpiresAt&&<div className={styles.dueDate}><Bookmark size={14}/>{formatDate(ub.reservationExpiresAt)}</div>}
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                {isBorrowed&&<><button onClick={()=>renewBook(book.id)} className={`${styles.btn} ${styles.btnPrimary}`} disabled={isProc}><RotateCcw size={16}/><span>Удължи</span></button><button onClick={()=>returnBook(book.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={isProc}><CheckCircle size={16}/><span>Върни</span></button></>}
                                {!isBorrowed&&ub.status==='reserved'&&actRes&&<button onClick={()=>cancelReservation(actRes.id,book.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={isProc}><XCircle size={16}/><span>Откажи</span></button>}
                                {!isBorrowed&&ub.status==='wishlist'&&<button onClick={()=>toggleWishlist(book.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={isProc}><Heart size={16} fill="currentColor"/><span>Премахни</span></button>}
                                {!isBorrowed&&ub.status==='viewed'&&<><button onClick={()=>toggleWishlist(book.id)} className={`${styles.btn} ${styles.btnPrimary}`} disabled={isProc}><Heart size={16}/><span>Желая</span></button><button onClick={()=>reserveBook(book.id)} className={`${styles.btn} ${styles.btnPrimary}`} disabled={isProc||book.availableCopies<=0}><Bookmark size={16}/><span>Резервирай</span></button></>}
                                <button onClick={()=>navigate(`/books/${book.id}`)} className={`${styles.btn} ${styles.btnPrimary}`}><Eye size={16}/><span>Детайли</span></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ):(
                <div className={styles.empty}><BookOpen className={styles.emptyIcon} size={48}/><p>Няма намерени книги</p><button onClick={()=>navigate('/books')} className={styles.registerBtn} style={{marginTop:16}}><Book size={16}/>Прегледайте каталога</button></div>
              )
            )}
          </div>
        )}

        {/* ── ACTIVE EVENTS ─────────────────────────────────────────────────── */}
        {activeTab==='activeEvents'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Активни Събития</h2><p className={styles.sectionSubtitle}>Предстоящи събития</p></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredActiveEvents.length>0?(
                <div className={styles.tableContainer}>
                  <table className={`${styles.table} events-table`}>
                    <thead><tr><th>Събитие</th><th>Описание</th><th>Дата и час</th><th>Място</th><th>Свободни</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredActiveEvents.map(event=>{const reg=isUserRegistered(event);const full=isEventFull(event);return(
                        <tr key={event.id}>
                          <td className="event-title-cell"><div className="event-title-content dashboard-event-title">{event.title}</div></td>
                          <td className="event-desc-cell"><div className="event-description" dangerouslySetInnerHTML={{__html:event.description}}/></td>
                          <td><div className={styles.eventDateContent}><Calendar className={styles.dateIcon}/><div><div className={styles.eventDateText}>{formatDate(event.date)}</div><div className={styles.eventTime}>{event.time} - {event.endTime}</div></div></div></td>
                          <td><div className={styles.eventLocationContent}><MapPin className={styles.locationIcon}/>{event.location}</div></td>
                          <td><span className={`${styles.spotsCount} ${full?styles.spotsFull:''}`}>{getAvailableSpots(event)}/{event.maxParticipants}</span></td>
                          <td>{reg?<span className={`${styles.badge} ${styles.activeBadge}`}>Записан</span>:full?<span className={`${styles.badge} ${styles.expiringBadge}`}>Пълно</span>:<span className={`${styles.badge} ${styles.returnedBadge}`}>Свободно</span>}</td>
                          <td><div className={styles.actionButtons}><button onClick={()=>{setSelectedEventId(event.id);setShowEventModal(true);}} className={`${styles.btn} ${styles.btnPrimary}`}><Eye size={16}/><span>Детайли</span></button>{reg?<button onClick={()=>unregisterFromEvent(event.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={processingEvent===event.id}>{processingEvent===event.id?'...':'Откажи'}</button>:<button onClick={()=>registerForEvent(event.id)} className={styles.registerBtn} disabled={processingEvent===event.id||full}>{processingEvent===event.id?'...':'Запиши се'}</button>}</div></td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><Calendar className={styles.emptyIcon} size={48}/><p>Няма активни събития</p></div>
            )}
          </div>
        )}

        {/* ── PAST EVENTS ───────────────────────────────────────────────────── */}
        {activeTab==='pastEvents'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Изтекли Събития</h2></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredPastEvents.length>0?(
                <div className={styles.tableContainer}>
                  <table className={`${styles.table} events-table`}>
                    <thead><tr><th>Събитие</th><th>Описание</th><th>Дата и час</th><th>Място</th><th>Участници</th><th>Статус</th></tr></thead>
                    <tbody>
                      {filteredPastEvents.map(event=>{const reg=isUserRegistered(event);return(
                        <tr key={event.id} className="past-event-row">
                          <td className="event-title-cell"><div className="event-title-content dashboard-event-title">{event.title}<span className="past-event-badge">Изтекло</span></div></td>
                          <td className="event-desc-cell"><div className="event-description" dangerouslySetInnerHTML={{__html:event.description}}/></td>
                          <td><div className={styles.eventDateContent}><Calendar className={styles.dateIcon}/><div><div className={styles.eventDateText}>{formatDate(event.date)}</div><div className={styles.eventTime}>{event.time} - {event.endTime}</div></div></div></td>
                          <td><div className={styles.eventLocationContent}><MapPin className={styles.locationIcon}/>{event.location}</div></td>
                          <td className="event-participants-cell"><span className={styles.participantsCount}>{event.currentParticipants}/{event.maxParticipants}</span></td>
                          <td>{reg?<span className={`${styles.badge} ${styles.pastBadge}`}>Участвахте</span>:<span className={`${styles.badge} ${styles.returnedBadge}`}>Не сте участвали</span>}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><History className={styles.emptyIcon} size={48}/><p>Няма изтекли събития</p></div>
            )}
          </div>
        )}

        {/* ── TICKETS ───────────────────────────────────────────────────────── */}
        {activeTab==='tickets'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><div><h2 className={styles.sectionTitle}>Моите Билети</h2><p className={styles.sectionSubtitle}>Всички ваши билети</p></div><div className={styles.ticketStats}><span className={styles.activeTickets}>Активни: {stats.activeTickets}</span><span className={styles.pastTickets}>Изтекли: {stats.pastTickets}</span></div></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredTickets.length>0?(
                <div className={styles.tableContainer}>
                  <table className={`${styles.table} tickets-table`}>
                    <thead><tr><th>ID</th><th>Събитие</th><th>Дата и час</th><th>Място</th><th>Регистрация</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredTickets.map(ticket=>(
                        <tr key={ticket.ticketId} className={ticket.isPast?styles.pastEventRow:''}>
                          <td className={styles.ticketIdCell}><Ticket className={styles.ticketIcon}/><span className={styles.ticketId}>{ticket.ticketId}</span>{ticket.isPast&&<span className={styles.pastIndicator}>Изтекъл</span>}</td>
                          <td className={styles.ticketEventCell}><div className="dashboard-event-title">{ticket.eventTitle}</div></td>
                          <td className={styles.ticketDateCell}><div className={styles.ticketDate}>{formatDate(ticket.eventDate)}</div><div className={styles.ticketTime}>{ticket.eventTime} - {ticket.endTime}</div></td>
                          <td className={styles.ticketLocationCell}>{ticket.eventLocation}</td>
                          <td className={styles.ticketRegistrationCell}>{ticket.registrationDate}</td>
                          <td>{ticket.isPast?<span className={`${styles.badge} ${styles.pastBadge}`}>Изтекъл</span>:ticket.checkedIn?<span className={`${styles.badge} ${styles.activeBadge}`}>Проверен</span>:<span className={`${styles.badge} ${styles.returnedBadge}`}>Очаква се</span>}</td>
                          <td><div className={styles.actionButtons}><button onClick={()=>showEventTicket(ticket)} className={`${styles.btn} ${styles.btnPrimary}`}><Ticket size={14}/><span>Виж билет</span></button>{!ticket.isPast&&<button onClick={()=>{const ev=allEvents.find(e=>e.id===ticket.eventId);if(ev)unregisterFromEvent(ev.id);}} className={`${styles.btn} ${styles.btnDanger}`}><X size={14}/><span>Откажи</span></button>}<button onClick={printTicket} className={`${styles.btn} ${styles.btnPrimary}`}><Printer size={14}/><span>Принтирай</span></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><Ticket className={styles.emptyIcon} size={48}/><p>Нямате билети</p><button onClick={()=>navigate('/events')} className={styles.registerBtn} style={{marginTop:16}}><Calendar size={16}/>Вижте събития</button></div>
            )}
          </div>
        )}

        {/* ── RESERVATIONS ──────────────────────────────────────────────────── */}
        {activeTab==='reservations'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Моите Резервации</h2></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredReservations.length>0?(
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead><tr><th>Книга</th><th>Автор</th><th>Изтича на</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredReservations.map(r=>{const book=allBooks.find(b=>b.id===r.bookId);if(!book)return null;const isProc=processingBook===book.id;const expiresStr=toDateString(r.expiresAt);return(
                        <tr key={r.id}>
                          <td><div className={styles.bookTitle}><BookOpen className={styles.bookIcon}/><div className={styles.eventTitleText}>{book.title}</div></div></td>
                          <td><div className={styles.bookAuthor}>{book.author}</div></td>
                          <td>{expiresStr?<div className={styles.dueDate}><Clock size={14}/>{formatDate(expiresStr)}</div>:<div className={styles.dueDate}>Няма срок</div>}</td>
                          <td><span className={`${styles.badge} ${styles.expiringBadge}`}>Резервирана</span></td>
                          <td><div className={styles.actionButtons}><button onClick={()=>cancelReservation(r.id,book.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={isProc}><XCircle size={16}/><span>Откажи</span></button><button onClick={()=>navigate(`/books/${book.id}`)} className={`${styles.btn} ${styles.btnPrimary}`}><Eye size={16}/><span>Детайли</span></button></div></td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><Bookmark className={styles.emptyIcon} size={48}/><p>Нямате резервации</p><button onClick={()=>navigate('/books')} className={styles.registerBtn} style={{marginTop:16}}><Book size={16}/>Каталог</button></div>
            )}
          </div>
        )}

        {/* ── WISHLIST ──────────────────────────────────────────────────────── */}
        {activeTab==='wishlist'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Желани Книги</h2></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredWishlist.length>0?(
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead><tr><th>Книга</th><th>Автор</th><th>Налични</th><th>Статус</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredWishlist.map(book=>{const isProc=processingBook===book.id;return(
                        <tr key={book.id}>
                          <td><div className={styles.bookTitle}><BookOpen className={styles.bookIcon}/><div className={styles.eventTitleText}>{book.title}</div></div></td>
                          <td><div className={styles.bookAuthor}>{book.author}</div></td>
                          <td><span className={`${styles.spotsCount} ${book.availableCopies<=0?styles.spotsFull:''}`}>{book.availableCopies} налични</span></td>
                          <td><span className={`${styles.badge} ${styles.wishlistBadge}`}>В желани</span></td>
                          <td><div className={styles.actionButtons}><button onClick={()=>toggleWishlist(book.id)} className={`${styles.btn} ${styles.btnDanger}`} disabled={isProc}><Heart size={16} fill="currentColor"/><span>Премахни</span></button>{book.availableCopies>0&&<button onClick={()=>reserveBook(book.id)} className={`${styles.btn} ${styles.btnPrimary}`} disabled={isProc}><Bookmark size={16}/><span>Резервирай</span></button>}<button onClick={()=>navigate(`/books/${book.id}`)} className={`${styles.btn} ${styles.btnPrimary}`}><Eye size={16}/><span>Детайли</span></button></div></td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><Heart className={styles.emptyIcon} size={48}/><p>Нямате желани книги</p><button onClick={()=>navigate('/books')} className={styles.registerBtn} style={{marginTop:16}}><Book size={16}/>Каталог</button></div>
            )}
          </div>
        )}

        {/* ── RECOMMENDATIONS ───────────────────────────────────────────────── */}
        {activeTab==='recommendations'&&(
          <div className={styles.section}>
            <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>Препоръчани Книги</h2><p className={styles.sectionSubtitle}>Подбрани специално за вас</p></div>
            {loading?<div className={styles.loading}><div className={styles.spinner}/><p>Зареждане...</p></div>:(
              filteredRecommendations.length>0?(
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead><tr><th>Книга</th><th>Автор</th><th>Причина</th><th>Съвпадение</th><th>Действия</th></tr></thead>
                    <tbody>
                      {filteredRecommendations.map(rec=>(
                        <tr key={rec.bookId}>
                          <td><div className={styles.bookTitle}><BookOpen className={styles.bookIcon}/><div className={styles.eventTitleText}>{rec.title}</div></div></td>
                          <td><div className={styles.bookAuthor}>{rec.author}</div></td>
                          <td><div className={styles.bookReason}>{rec.reason}</div></td>
                          <td><span className={styles.spotsCount}>{rec.score}%</span></td>
                          <td><div className={styles.actionButtons}><button onClick={()=>navigate(`/books/${rec.bookId}`)} className={`${styles.btn} ${styles.btnPrimary}`}><Eye size={16}/><span>Детайли</span></button>{rec.bookDetails?.availableCopies&&rec.bookDetails.availableCopies>0?<button onClick={()=>reserveBook(rec.bookId)} className={`${styles.btn} ${styles.btnPrimary}`}><Bookmark size={16}/><span>Резервирай</span></button>:<button onClick={()=>toggleWishlist(rec.bookId)} className={`${styles.btn} ${styles.btnPrimary}`}><Heart size={16}/><span>Желая</span></button>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<div className={styles.empty}><Sparkles className={styles.emptyIcon} size={48}/><p>Няма препоръки</p><button onClick={()=>navigate('/books')} className={styles.registerBtn} style={{marginTop:16}}><Book size={16}/>Каталог</button></div>
            )}
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
        {activeTab==='settings'&&user&&(
          <PrivacySettingsTab userId={user.uid} userEmail={user.email||''}/>
        )}

      </div>

      {/* Ticket Modal */}
      {showTicket&&currentTicket&&(
        <EventTicketModal ticketId={currentTicket.ticketId} eventTitle={currentTicket.eventTitle} eventDate={currentTicket.eventDate} eventTime={currentTicket.eventTime} endTime={currentTicket.endTime} eventLocation={currentTicket.eventLocation} userEmail={user?.email||''} eventImageUrl={currentTicket.eventImageUrl} onClose={()=>{setShowTicket(false);setCurrentTicket(null);}}/>
      )}

      {/* Event Details Modal */}
      {showEventModal&&(
        <EventDetailsModal eventId={selectedEventId} onClose={()=>{setShowEventModal(false);setSelectedEventId(null);}} onRegistrationSuccess={(td)=>{const nt: UserTicket={eventId:selectedEventId||'',ticketId:td.ticketId,eventTitle:td.eventTitle,eventDate:td.eventDate,eventTime:td.eventTime,endTime:td.endTime,eventLocation:td.eventLocation,registrationDate:new Date().toLocaleDateString('bg-BG'),checkedIn:false,eventImageUrl:td.eventImageUrl};setUserTickets(prev=>[...prev,nt]);setCurrentTicket(nt);setTimeout(()=>setShowTicket(true),500);}}/>
      )}
    </div>
  );
};

export default UserDashboard;