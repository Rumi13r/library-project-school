import React, { useEffect, useState, useCallback } from "react";
import { db } from "../../firebase/firebase";
import {
  collection, getDocs, doc, updateDoc, deleteDoc,
  addDoc, getDoc, Timestamp,
} from "firebase/firestore";
import type { BookLibrary } from "../../lib/services/bookTypes";
import * as bookService from "../../lib/services/bookService";
import {
  Users, Calendar, Trash2, Plus, Search, Clock, MapPin, User, Edit, X, Save,
  Building, Upload, Type, QrCode, Check, XCircle, CameraOff, BarChart3,
  Image as ImageIcon, Shield, BookOpen, List, Grid, Tag, Copy, Bookmark,
  Newspaper, Eye, Heart,
} from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Scanner } from "@yudiel/react-qr-scanner";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import "./AdminDashboard.css";
import "../../pages/EventsPage.css";
import { getAllReservations } from "../../lib/services/reservationService";
import { cancelReservation as cancelReservationService } from "../../lib/services/reservationService";
import { RefreshCw } from "lucide-react";

// ── Shared Firestore timestamp type ──────────────────────────────────────────
type FSTimestamp =
  | { toDate?: () => Date; seconds?: number }
  | Date
  | string
  | null
  | undefined;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ClassSchedule {
  subject: string;
  teacher: string;
  className: string;
}

interface RoomBooking {
  id: string;
  room: string;
  date: string;
  time: string;
  endTime: string;
  eventId: string;
  eventTitle: string;
  type: "event";
}

interface ScheduleBooking {
  id: string;
  room: string;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
  classSchedules: ClassSchedule[];
  semester: string;
  academicYear: string;
  type: "schedule";
}

type BookingInfo = RoomBooking | ScheduleBooking;

interface UserEvent {
  eventId: string;
  registrationDate: FSTimestamp;
  status?: string;
}

interface Ticket {
  ticketId: string;
  registrationDate: FSTimestamp;
  checkedIn: boolean;
  checkedInTime?: FSTimestamp;
}

interface AppUser {
  uid: string;
  id: string;
  email: string;
  role: string;
  events?: UserEvent[];
  books?: BookLibrary[];
  createdAt?: FSTimestamp;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profile?: {
    displayName?: string;
    firstName?: string;
    grade?: string;
    lastName?: string;
    phone?: string;
  };
}

interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  participants: string[];
  allowedRoles: string[];
  createdAt: FSTimestamp;
  organizer: string;
  imageUrl?: string;
  tickets?: Record<string, Ticket>;
}

interface CheckTicketModalData {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  ticketId: string;
  userName: string;
  userEmail: string;
  registrationDate: string;
  checkedIn: boolean;
  checkedInTime?: string;
}

interface TodayStats {
  totalTickets: number;
  checkedInTickets: number;
  pendingTickets: number;
  todayScannedTickets: TicketDetail[];
}

interface TicketDetail {
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  userName: string;
  userEmail: string;
  scanTime: string;
  status: "checked" | "pending";
}

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  images?: string[];
  author: string;
  date: FSTimestamp;
  views: number;
  likes: number;
  tags: string[];
  featured: boolean;
  createdAt: FSTimestamp;
  updatedAt: FSTimestamp;
}

interface AdminReservation {
  id: string;
  status: "active" | "fulfilled" | "cancelled" | "expired";
  bookId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  reservedAt: FSTimestamp;
  expiresAt: FSTimestamp;
}

// ── EditorToolbar ─────────────────────────────────────────────────────────────

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt("Въведете URL на картинката:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="editor-toolbar">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`} title="Удебелен текст">
        <strong>B</strong>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`} title="Курсив">
        <em>I</em>
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`} title="Списък">
        <List size={16} />
      </button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`} title="Номериран списък">
        <Grid size={16} />
      </button>
      <div className="toolbar-divider" />
      <button type="button" onClick={addImage} className="toolbar-btn" title="Добави картинка">
        <ImageIcon size={16} />
      </button>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFSDate = (d: FSTimestamp): string => {
  if (!d) return "Няма дата";
  try {
    if (typeof d === "string") return new Date(d).toLocaleDateString("bg-BG");
    if (d instanceof Date)     return d.toLocaleDateString("bg-BG");
    if (typeof d === "object") {
      if ("toDate" in d && typeof d.toDate === "function") return d.toDate().toLocaleDateString("bg-BG");
      if ("seconds" in d && typeof d.seconds === "number") return new Date(d.seconds * 1000).toLocaleDateString("bg-BG");
    }
  } catch { /* ignore */ }
  return "Няма дата";
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const AdminDashboard: React.FC = () => {

  // ── State ──────────────────────────────────────────────────────────────────
  const [users,            setUsers]            = useState<AppUser[]>([]);
  const [events,           setEvents]           = useState<AppEvent[]>([]);
  const [books,            setBooks]            = useState<BookLibrary[]>([]);
  const [roomBookings,     setRoomBookings]     = useState<RoomBooking[]>([]);
  const [scheduleBookings, setScheduleBookings] = useState<ScheduleBooking[]>([]);
  const [reservations,     setReservations]     = useState<AdminReservation[]>([]);
  const [news,             setNews]             = useState<NewsArticle[]>([]);

  const [searchTerm,   setSearchTerm]   = useState("");
  const [activeTab,    setActiveTab]    = useState<
    "users"|"events"|"rooms"|"tickets"|"books"|"reservations"|"news"
  >("users");

  const [selectedDate,         setSelectedDate]         = useState(new Date().toISOString().split("T")[0]);
  const [editingCell,          setEditingCell]          = useState<{room:string;timeSlot:string;booking:BookingInfo|null}|null>(null);
  const [addingEventFromCell,  setAddingEventFromCell]  = useState<{room:string;timeSlot:string}|null>(null);
  const [isImportingSchedule,  setIsImportingSchedule]  = useState(false);
  const [importData,           setImportData]           = useState("");
  const [selectedRoomForImport,setSelectedRoomForImport]= useState("1303");
  const [academicYear,         setAcademicYear]         = useState("2024-2025");
  const [semester,             setSemester]             = useState<"winter"|"summer">("winter");

  const [cellEventTitle,         setCellEventTitle]          = useState("");
  const [cellEventDesc,          setCellEventDesc]           = useState("");
  const [cellEventStartTime,     setCellEventStartTime]      = useState("");
  const [cellEventEndTime,       setCellEventEndTime]        = useState("");
  const [cellEventMaxParticipants,setCellEventMaxParticipants]= useState(20);
  const [cellEventOrganizer,     setCellEventOrganizer]      = useState("");
  const [cellEventImageUrl,      setCellEventImageUrl]       = useState("");

  const [showQrScanner,       setShowQrScanner]       = useState(false);
  const [cameraError,         setCameraError]         = useState("");
  const [showEventModal,      setShowEventModal]      = useState(false);
  const [modalMode,           setModalMode]           = useState<"create"|"edit">("create");
  const [showCheckTicketModal,setShowCheckTicketModal]= useState(false);
  const [showTodayStats,      setShowTodayStats]      = useState(false);
  const [showNewsModal,       setShowNewsModal]       = useState(false);

  const [ticketSearchTerm,    setTicketSearchTerm]    = useState("");
  const [checkTicketModalData,setCheckTicketModalData]= useState<CheckTicketModalData|null>(null);
  const [isCheckingTicket,    setIsCheckingTicket]    = useState(false);
  const [ticketStatusMessage, setTicketStatusMessage] = useState("");
  const [ticketStatusType,    setTicketStatusType]    = useState<"success"|"error"|"info"|"warning">("info");

  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalTickets: 0, checkedInTickets: 0, pendingTickets: 0, todayScannedTickets: [],
  });

  const EMPTY_EVENT: Partial<AppEvent> = {
    title:"", description:"", date:"", time:"", endTime:"",
    location:"", maxParticipants:20, organizer:"",
    allowedRoles:["reader","librarian"], imageUrl:"",
  };

  const [modalEventData, setModalEventData] = useState<Partial<AppEvent>>(EMPTY_EVENT);
  const [modalNewsData,  setModalNewsData]  = useState<Partial<NewsArticle>>({
    title:"", excerpt:"", content:"", category:"Общи",
    image:"", author:"Администратор", tags:[], featured:false,
  });

  // ── TipTap editor ──────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [StarterKit],
    content: modalEventData.description || "",
    onUpdate: ({ editor: e }) => {
      setModalEventData(prev => ({ ...prev, description: e.getHTML() }));
    },
  });

  useEffect(() => {
    if (editor && modalEventData.description !== editor.getHTML()) {
      editor.commands.setContent(modalEventData.description || "");
    }
  }, [modalEventData.description, editor]);

  // ── Constants ──────────────────────────────────────────────────────────────
  const locationOptions = [
    "1303","3310","3301-EOП","3305-АНП","библиотека","Зала Европа","Комп.каб.-ТЧ",
    "Физкултура3","1201","1202","1203","1206","1408-КК","1308-КК",
    "1101","1102","1103","1104","1105","1106","1204","1205","1207",
    "1209","1301","1302","1304","1305","1307","1309","1401","1402",
    "1403","1404","1405","1406","1407","1409","1306",
  ];

  const timeSlots = [
    "07:00-08:00","08:00-09:00","09:00-10:00","10:00-11:00","11:00-12:00",
    "12:00-13:00","13:00-14:00","14:00-15:00","15:00-16:00","16:00-17:00",
    "17:00-18:00","18:00-19:00","19:00-20:00",
  ];

  const timeOptionsWithMinutes = (() => {
    const opts: string[] = [];
    for (let h = 7; h <= 19; h++)
      for (let m = 0; m < 60; m += 15)
        opts.push(`${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`);
    return opts;
  })();

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id, uid: d.id,
        email: data.email || "",
        role: data.role || "reader",
        events: data.events || [],
        books: data.books || [],
        createdAt: data.createdAt || null,
        displayName: data.displayName || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        profile: data.profile || {},
      } as AppUser;
    }));
  }, []);

  const fetchEvents = useCallback(async () => {
    const snap = await getDocs(collection(db, "events"));
    const eventsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as AppEvent));
    setEvents(eventsData);
    setRoomBookings(
      eventsData
        .filter(e => e.date && e.time && e.endTime && e.location)
        .map(e => ({
          id: e.id, room: e.location, date: e.date,
          time: e.time, endTime: e.endTime,
          eventId: e.id, eventTitle: e.title, type: "event" as const,
        }))
    );
  }, []);

  const fetchBooks = useCallback(async () => {
    try { setBooks(await bookService.fetchAllBooks()); }
    catch (e) { console.error("Error fetching books:", e); }
  }, []);

  const fetchScheduleBookings = useCallback(async () => {
    const snap = await getDocs(collection(db, "scheduleBookings"));
    setScheduleBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as ScheduleBooking)));
  }, []);

  const fetchNews = useCallback(async () => {
    const snap = await getDocs(collection(db, "news"));
    setNews(snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsArticle)));
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const data = await getAllReservations();
      setReservations(data as AdminReservation[]);
    } catch (e) { console.error("Error fetching reservations:", e); }
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchUsers();
    fetchEvents();
    fetchBooks();
    fetchScheduleBookings();
    fetchNews();
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── loadTodayStats ─────────────────────────────────────────────────────────
  const loadTodayStats = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const scanned: TicketDetail[] = [];
    let total = 0, checkedIn = 0, pending = 0;

    events.forEach(event => {
      if (!event.tickets) return;
      Object.entries(event.tickets).forEach(([userId, ticket]) => {
        total++;
        if (ticket.checkedIn) {
          checkedIn++;
          const checkedInDate =
            typeof ticket.checkedInTime === "object" &&
            ticket.checkedInTime &&
            "toDate" in ticket.checkedInTime &&
            typeof ticket.checkedInTime.toDate === "function"
              ? ticket.checkedInTime.toDate()
              : null;
          if (checkedInDate && checkedInDate.toISOString().split("T")[0] === today) {
            const user = users.find(u => u.id === userId);
            scanned.push({
              ticketId: ticket.ticketId,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              userName: user?.displayName || user?.firstName || "Неизвестен",
              userEmail: user?.email || "Няма имейл",
              scanTime: checkedInDate.toLocaleString("bg-BG"),
              status: "checked",
            });
          }
        } else {
          pending++;
          if (new Date(`${event.date}T${event.time}`) >= new Date()) {
            const user = users.find(u => u.id === userId);
            scanned.push({
              ticketId: ticket.ticketId,
              eventTitle: event.title,
              eventDate: event.date,
              eventTime: event.time,
              userName: user?.displayName || user?.firstName || "Неизвестен",
              userEmail: user?.email || "Няма имейл",
              scanTime: "Очаква сканиране",
              status: "pending",
            });
          }
        }
      });
    });

    scanned.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(`${a.eventDate}T${a.eventTime}`).getTime() -
             new Date(`${b.eventDate}T${b.eventTime}`).getTime();
    });

    setTodayStats({ totalTickets: total, checkedInTickets: checkedIn, pendingTickets: pending, todayScannedTickets: scanned });
  }, [events, users]);

  useEffect(() => {
    if (showTodayStats) loadTodayStats();
  }, [showTodayStats, loadTodayStats]);

  // ── Validation helpers ─────────────────────────────────────────────────────
  const validateTime      = (t: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t);
  const validateTimeRange = (s: string, e: string) => !s || !e || e > s;
  const convertToMinutes  = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+(m||0); };

  const hasTimeOverlap = (ss: string, se: string, es: string, ee: string) => {
    const [ssm,sem,esm,eem] = [ss,se,es,ee].map(convertToMinutes);
    return esm < sem && eem > ssm;
  };

  const hasBookingConflict = (room: string, date: string, start: string, end: string, excludeId?: string) => {
    if (roomBookings.some(b => {
      if (excludeId && b.id === excludeId) return false;
      if (b.room !== room || b.date !== date) return false;
      return hasTimeOverlap(start, end, b.time, b.endTime);
    })) return true;

    const dow = new Date(date).getDay();
    if (dow >= 1 && dow <= 5) {
      return scheduleBookings
        .filter(s => s.room === room && s.dayOfWeek === dow)
        .some(s => hasTimeOverlap(start, end, s.startTime, s.endTime));
    }
    return false;
  };

  const isRoomBookedByEvent    = (room: string, date: string, h: string) =>
    roomBookings.some(b => b.room === room && b.date === date && hasTimeOverlap(`${h}:00`, `${parseInt(h)+1}:00`, b.time, b.endTime));

  const isRoomBookedInSchedule = (room: string, date: string, h: string) => {
    const dow = new Date(date).getDay();
    if (dow < 1 || dow > 5) return false;
    return scheduleBookings.some(s => s.room === room && s.dayOfWeek === dow && hasTimeOverlap(`${h}:00`, `${parseInt(h)+1}:00`, s.startTime, s.endTime));
  };

  const getEventInfo    = (room: string, date: string, h: string): RoomBooking | null =>
    roomBookings.find(b => b.room === room && b.date === date && hasTimeOverlap(`${h}:00`, `${parseInt(h)+1}:00`, b.time, b.endTime)) ?? null;

  const getScheduleInfo = (room: string, date: string, h: string): ScheduleBooking | null => {
    const dow = new Date(date).getDay();
    if (dow < 1 || dow > 5) return null;
    return scheduleBookings.find(s => s.room === room && s.dayOfWeek === dow && hasTimeOverlap(`${h}:00`, `${parseInt(h)+1}:00`, s.startTime, s.endTime)) ?? null;
  };

  const getBookingInfo  = (room: string, date: string, h: string): BookingInfo | null =>
    getEventInfo(room, date, h) ?? getScheduleInfo(room, date, h);

  // ── QR Scanner ─────────────────────────────────────────────────────────────
  const handleQrScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (!detectedCodes?.length) return;
    const raw = detectedCodes[0].rawValue;
    if (!raw) return;
    let ticketId = raw;
    try { const p = JSON.parse(raw); if (p.TICKETID) ticketId = p.TICKETID; } catch { /* raw value */ }
    const match = ticketId.match(/TICKET-([A-Z0-9]+)/i);
    const final = match ? `TICKET-${match[1].toUpperCase()}` : ticketId;
    setTicketSearchTerm(final);
    await searchTicket(final);
  };

  const handleQrError = (error: unknown) => {
    console.error("QR Scanner error:", error);
    setCameraError("Неуспешно зареждане на камерата. Проверете разрешенията.");
  };

  const openQrScanner = () => { setShowQrScanner(true); setShowCheckTicketModal(false); setShowTodayStats(false); setCameraError(""); setTicketStatusMessage(""); setCheckTicketModalData(null); };
  const closeQrScanner = () => { setShowQrScanner(false); setCameraError(""); if (!showCheckTicketModal) setShowCheckTicketModal(true); };
  const openCheckTicketModal = () => { setShowCheckTicketModal(true); setShowQrScanner(false); setShowTodayStats(false); setTicketSearchTerm(""); setCheckTicketModalData(null); setTicketStatusMessage(""); };
  const openTodayStats = () => { setShowTodayStats(true); setShowCheckTicketModal(false); loadTodayStats(); };

  // ── searchTicket ───────────────────────────────────────────────────────────
  const searchTicket = async (ticketIdParam?: string): Promise<boolean> => {
    const raw = ticketIdParam || ticketSearchTerm;
    if (!raw.trim()) { setTicketStatusMessage("Моля, въведете номер на билет!"); setTicketStatusType("error"); return false; }

    try {
      setIsCheckingTicket(true);
      setTicketStatusMessage("Търсене..."); setTicketStatusType("info");

      let ticketId = raw.trim().toUpperCase();
      const m = ticketId.match(/TICKET-[A-Z0-9]+/);
      ticketId = m ? m[0] : `TICKET-${ticketId}`;

      let foundEvent: AppEvent | null = null;
      let foundUserId = "";
      let foundTicket: Ticket | null = null;

      for (const event of events) {
        if (!event.tickets) continue;
        for (const [userId, ticket] of Object.entries(event.tickets)) {
          if (ticket.ticketId.toUpperCase() === ticketId) {
            foundEvent = event; foundUserId = userId; foundTicket = ticket; break;
          }
        }
        if (foundEvent) break;
      }

      if (!foundEvent || !foundTicket) {
        setTicketStatusMessage("❌ Билетът не е намерен!"); setTicketStatusType("error");
        return false;
      }

      const user = users.find(u => u.id === foundUserId);
      setCheckTicketModalData({
        eventId: foundEvent.id,
        eventTitle: foundEvent.title,
        eventDate: foundEvent.date,
        eventTime: foundEvent.time,
        ticketId: foundTicket.ticketId,
        userName: user?.displayName || user?.firstName || "Неизвестен",
        userEmail: user?.email || "Няма имейл",
        registrationDate: formatFSDate(foundTicket.registrationDate),
        checkedIn: foundTicket.checkedIn || false,
        checkedInTime: formatFSDate(foundTicket.checkedInTime) || undefined,
      });
      setShowCheckTicketModal(true);
      setTicketStatusMessage("✅ Билетът е намерен!"); setTicketStatusType("success");
      return true;
    } catch (e) {
      console.error(e);
      setTicketStatusMessage("Грешка при търсене!"); setTicketStatusType("error");
      return false;
    } finally { setIsCheckingTicket(false); }
  };

  const checkInTicket = async (): Promise<boolean> => {
    if (!checkTicketModalData) return false;
    try {
      setIsCheckingTicket(true);
      setTicketStatusMessage("Регистриране...");
      const eventRef = doc(db, "events", checkTicketModalData.eventId);
      const eventDoc = await getDoc(eventRef);
      if (!eventDoc.exists()) throw new Error("Събитието не е намерено");
      const tickets = (eventDoc.data()?.tickets || {}) as Record<string, Ticket>;
      const userIdToUpdate = Object.entries(tickets).find(
        ([, ticket]) => ticket.ticketId === checkTicketModalData.ticketId
      )?.[0];
      if (!userIdToUpdate) throw new Error("Билетът не е намерен");
      const now = Timestamp.fromDate(new Date());
      await updateDoc(eventRef, {
        [`tickets.${userIdToUpdate}.checkedIn`]: true,
        [`tickets.${userIdToUpdate}.checkedInTime`]: now,
      });
      await fetchEvents();
      setCheckTicketModalData(prev => prev ? { ...prev, checkedIn: true, checkedInTime: now.toDate().toLocaleString("bg-BG") } : null);
      return true;
    } catch (e) {
      console.error(e);
      setTicketStatusMessage(`❌ ${e instanceof Error ? e.message : "Грешка"}`);
      setTicketStatusType("error");
      return false;
    } finally { setIsCheckingTicket(false); }
  };

  const uncheckTicket = async () => {
    if (!checkTicketModalData) return;
    try {
      setIsCheckingTicket(true);
      const eventRef = doc(db, "events", checkTicketModalData.eventId);
      const event = events.find(e => e.id === checkTicketModalData.eventId);
      let userIdToUpdate = "";
      if (event?.tickets) {
        for (const [uid, ticket] of Object.entries(event.tickets)) {
          if (ticket.ticketId === checkTicketModalData.ticketId) { userIdToUpdate = uid; break; }
        }
      }
      if (!userIdToUpdate) throw new Error("Не е намерен потребител");
      await updateDoc(eventRef, {
        [`tickets.${userIdToUpdate}.checkedIn`]: false,
        [`tickets.${userIdToUpdate}.checkedInTime`]: null,
      });
      setEvents(prev => prev.map(e => {
        if (e.id !== checkTicketModalData.eventId || !e.tickets) return e;
        const t = { ...e.tickets };
        if (t[userIdToUpdate]) t[userIdToUpdate] = { ...t[userIdToUpdate], checkedIn: false, checkedInTime: undefined };
        return { ...e, tickets: t };
      }));
      setCheckTicketModalData(prev => prev ? { ...prev, checkedIn: false, checkedInTime: undefined } : null);
      setTicketStatusMessage("Регистрацията е отменена!"); setTicketStatusType("success");
      loadTodayStats();
      setTimeout(() => setTicketStatusMessage(""), 3000);
    } catch (e) {
      console.error(e);
      setTicketStatusMessage("Грешка при отмяна!"); setTicketStatusType("error");
    } finally { setIsCheckingTicket(false); }
  };

  // ── Reservation actions ────────────────────────────────────────────────────
  const markReservationFulfilled = async (id: string) => {
    try {
      await updateDoc(doc(db, "reservations", id), { status: "fulfilled", lastUpdated: Timestamp.now() });
      fetchReservations();
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  const cancelReservation = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await cancelReservationService(id);
      const res = reservations.find(r => r.id === id);
      if (res?.bookId) {
        const book = books.find(b => b.id === res.bookId);
        if (book) await bookService.updateBook(book.id, { availableCopies: book.availableCopies + 1 });
      }
      fetchReservations(); fetchBooks();
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  // ── User / Event / Book actions ────────────────────────────────────────────
  const changeUserRole = async (uid: string, role: string) => {
    await updateDoc(doc(db, "users", uid), { role, updatedAt: new Date() });
    fetchUsers();
  };
  const deleteUser  = async (uid: string) => { if (!window.confirm("Изтрий?")) return; await deleteDoc(doc(db, "users", uid)); fetchUsers(); };
  const deleteEvent = async (id:  string) => { if (!window.confirm("Изтрий?")) return; await deleteDoc(doc(db, "events", id)); fetchEvents(); };
  const deleteBook  = async (id:  string) => {
    if (!window.confirm("Изтрий?")) return;
    try { await bookService.deleteBook(id); await fetchBooks(); }
    catch (e) { console.error(e); alert("Грешка!"); }
  };
  const deleteNews  = async (id:  string) => {
    if (!window.confirm("Изтрий?")) return;
    try { await deleteDoc(doc(db, "news", id)); await fetchNews(); }
    catch (e) { console.error(e); alert("Грешка!"); }
  };

  // ── Event modal helpers ────────────────────────────────────────────────────
  const handleModalInputChange = (field: keyof AppEvent, value: string | number | string[] | boolean) => {
    setModalEventData(prev => ({ ...prev, [field]: value }));
  };

  const openCreateEventModal = () => { setModalMode("create"); setModalEventData(EMPTY_EVENT); setShowEventModal(true); };
  const openEditEventModal   = (e: AppEvent) => { setModalMode("edit"); setModalEventData({ id:e.id, title:e.title, description:e.description, date:e.date, time:e.time, endTime:e.endTime, location:e.location, maxParticipants:e.maxParticipants, organizer:e.organizer, allowedRoles:e.allowedRoles, currentParticipants:e.currentParticipants, imageUrl:e.imageUrl||"" }); setShowEventModal(true); };
  const closeEventModal      = () => { setShowEventModal(false); setModalEventData({}); };

  const handleCreateEvent = async () => {
    if (!modalEventData.title?.trim()||!modalEventData.date||!modalEventData.time||!modalEventData.endTime||!modalEventData.location) { alert("Попълнете задължителните полета!"); return; }
    if (!validateTime(modalEventData.time)||!validateTime(modalEventData.endTime)) { alert("Невалиден час!"); return; }
    if (!validateTimeRange(modalEventData.time,modalEventData.endTime)) { alert("Крайният час трябва да е след началния!"); return; }
    if (hasBookingConflict(modalEventData.location,modalEventData.date,modalEventData.time,modalEventData.endTime)) { alert("Стаята е заета!"); return; }
    try {
      await addDoc(collection(db,"events"), { title:modalEventData.title, description:modalEventData.description||"", date:modalEventData.date, time:modalEventData.time, endTime:modalEventData.endTime, location:modalEventData.location, maxParticipants:modalEventData.maxParticipants||20, currentParticipants:0, allowedRoles:modalEventData.allowedRoles||["reader","librarian"], organizer:modalEventData.organizer||"", imageUrl:modalEventData.imageUrl||"", createdAt:new Date(), registrations:[] });
      closeEventModal(); fetchEvents(); alert("Събитието е създадено!");
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  const handleUpdateEvent = async () => {
    if (!modalEventData.id) return;
    if (!modalEventData.title?.trim()||!modalEventData.date||!modalEventData.time||!modalEventData.endTime||!modalEventData.location) { alert("Попълнете задължителните полета!"); return; }
    if (!validateTime(modalEventData.time)||!validateTime(modalEventData.endTime)) { alert("Невалиден час!"); return; }
    if (!validateTimeRange(modalEventData.time,modalEventData.endTime)) { alert("Крайният час трябва да е след началния!"); return; }
    if (hasBookingConflict(modalEventData.location,modalEventData.date,modalEventData.time,modalEventData.endTime,modalEventData.id)) { alert("Стаята е заета!"); return; }
    try {
      await updateDoc(doc(db,"events",modalEventData.id), { title:modalEventData.title, description:modalEventData.description||"", date:modalEventData.date, time:modalEventData.time, endTime:modalEventData.endTime, location:modalEventData.location, maxParticipants:modalEventData.maxParticipants||20, organizer:modalEventData.organizer||"", allowedRoles:modalEventData.allowedRoles||["reader","librarian"], imageUrl:modalEventData.imageUrl||"", updatedAt:new Date() });
      closeEventModal(); fetchEvents(); alert("Обновено!");
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  // ── News modal helpers ─────────────────────────────────────────────────────
  const openCreateNewsModal = () => { setModalNewsData({ title:"", excerpt:"", content:"", category:"Общи", image:"", author:"Администратор", tags:[], featured:false }); setShowNewsModal(true); };
  const openEditNewsModal   = (item: NewsArticle) => { setModalNewsData({ id:item.id, title:item.title, excerpt:item.excerpt, content:item.content, category:item.category, image:item.image, author:item.author, tags:item.tags||[], featured:item.featured||false }); setShowNewsModal(true); };
  const closeNewsModal      = () => { setShowNewsModal(false); setModalNewsData({}); };

  const handleCreateNews = async () => {
    if (!modalNewsData.title?.trim()||!modalNewsData.excerpt?.trim()||!modalNewsData.content?.trim()||!modalNewsData.category?.trim()||!modalNewsData.image?.trim()) { alert("Попълнете задължителните полета!"); return; }
    try {
      const allImages = [modalNewsData.image, ...(modalNewsData.images||[]).filter(i=>i.trim())].filter((v,i,a)=>a.indexOf(v)===i);
      await addDoc(collection(db,"news"), { title:modalNewsData.title, excerpt:modalNewsData.excerpt, content:modalNewsData.content, category:modalNewsData.category, image:modalNewsData.image, images:allImages.length>1?allImages:[], author:modalNewsData.author||"Администратор", date:Timestamp.now(), views:0, likes:0, tags:modalNewsData.tags||[], featured:modalNewsData.featured||false, createdAt:Timestamp.now(), updatedAt:Timestamp.now() });
      closeNewsModal(); await fetchNews(); alert("Новината е създадена!");
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  const handleUpdateNews = async () => {
    if (!modalNewsData.id) return;
    if (!modalNewsData.title?.trim()||!modalNewsData.excerpt?.trim()||!modalNewsData.content?.trim()||!modalNewsData.category?.trim()||!modalNewsData.image?.trim()) { alert("Попълнете задължителните полета!"); return; }
    try {
      const allImages = [modalNewsData.image, ...(modalNewsData.images||[]).filter(i=>i.trim())].filter((v,i,a)=>a.indexOf(v)===i);
      await updateDoc(doc(db,"news",modalNewsData.id), { title:modalNewsData.title, excerpt:modalNewsData.excerpt, content:modalNewsData.content, category:modalNewsData.category, image:modalNewsData.image, images:allImages.length>1?allImages:[], author:modalNewsData.author||"Администратор", tags:modalNewsData.tags||[], featured:modalNewsData.featured||false, updatedAt:Timestamp.now() });
      closeNewsModal(); await fetchNews(); alert("Обновено!");
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  // ── Schedule import ────────────────────────────────────────────────────────
  const parseScheduleText = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const dayMap: Record<string,number> = { Понеделник:1, Вторник:2, Сряда:3, Четвъртък:4, Петък:5 };
    const slots: { dayOfWeek:number; period:number; startTime:string; endTime:string; classSchedules:ClassSchedule[] }[] = [];
    let currentDay = 0, period = 1;

    for (const line of lines) {
      if (dayMap[line] !== undefined) { currentDay = dayMap[line]; period = 1; continue; }
      if (currentDay > 0 && line.includes("–")) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const [st, et] = parts[0].split("–").map(t => `${t.trim()}:00`);
          const schedText = parts.slice(1).join(" ");
          const classSchedules: ClassSchedule[] = [];
          if (schedText !== "—" && schedText.trim()) {
            schedText.split(",").map(p => p.trim()).filter(Boolean).forEach(part => {
              // Fixed: removed unnecessary escape of dot inside character class
              const cm = part.match(/(\d+[а-яд.]+)$/);
              let cn = "", st2 = part;
              if (cm) { cn = cm[1]; st2 = part.slice(0, -cn.length).trim(); }
              let subject = st2, teacher = "";
              const tm = st2.match(/\((.+?)\)/);
              if (tm) { teacher = tm[1]; subject = st2.replace(`(${teacher})`,"").trim(); }
              else {
                const np = st2.split(" ");
                const lw = np[np.length-1];
                if (lw?.match(/^[А-Я][а-я]+$/)) { teacher = lw; subject = np.slice(0,-1).join(" "); }
              }
              classSchedules.push({ subject: subject||"Неизвестен предмет", teacher, className: cn||"Неизвестен клас" });
            });
          }
          if (classSchedules.length > 0) slots.push({ dayOfWeek:currentDay, period, startTime:st, endTime:et, classSchedules });
          period++;
        }
      }
    }
    return slots;
  };

  const importScheduleToFirebase = async () => {
    if (!importData.trim()||!selectedRoomForImport) { alert("Попълнете данните!"); return; }
    try {
      const slots = parseScheduleText(importData);
      if (!slots.length) { alert("Не можахме да разчетем графика!"); return; }
      const existing = await getDocs(collection(db,"scheduleBookings"));
      await Promise.all(existing.docs.filter(d=>d.data().room===selectedRoomForImport).map(d=>deleteDoc(d.ref)));
      await Promise.all(slots.map(s => addDoc(collection(db,"scheduleBookings"), { room:selectedRoomForImport, ...s, semester, academicYear, type:"schedule" })));
      alert(`Импортиран график за ${selectedRoomForImport} — ${slots.length} часа.`);
      setIsImportingSchedule(false); setImportData(""); fetchScheduleBookings();
    } catch (e) { console.error(e); alert("Грешка при импортиране!"); }
  };

  // ── Cell events ────────────────────────────────────────────────────────────
  const startAddingEventFromCell = (room: string, timeSlot: string) => {
    const [h] = timeSlot.split("-");
    setCellEventStartTime(`${h}:00`);
    setCellEventEndTime(`${(parseInt(h)+1).toString().padStart(2,"0")}:00`);
    setAddingEventFromCell({ room, timeSlot });
  };

  const createEventFromCell = async () => {
    if (!addingEventFromCell||!cellEventTitle.trim()||!selectedDate||!cellEventStartTime||!cellEventEndTime) return;
    if (!validateTime(cellEventStartTime)||!validateTime(cellEventEndTime)) { alert("Невалиден час!"); return; }
    if (!validateTimeRange(cellEventStartTime,cellEventEndTime)) { alert("Крайният час трябва да е след началния!"); return; }
    if (hasBookingConflict(addingEventFromCell.room,selectedDate,cellEventStartTime,cellEventEndTime)) { alert("Стаята е заета!"); return; }
    await addDoc(collection(db,"events"), { title:cellEventTitle, description:cellEventDesc, date:selectedDate, time:cellEventStartTime, endTime:cellEventEndTime, location:addingEventFromCell.room, maxParticipants:cellEventMaxParticipants, currentParticipants:0, allowedRoles:["reader","librarian"], organizer:cellEventOrganizer, imageUrl:cellEventImageUrl, createdAt:new Date(), registrations:[] });
    setCellEventTitle(""); setCellEventDesc(""); setCellEventStartTime(""); setCellEventEndTime(""); setCellEventMaxParticipants(20); setCellEventOrganizer(""); setCellEventImageUrl(""); setAddingEventFromCell(null);
    fetchEvents();
  };

  const deleteBookingFromCell = async (booking: BookingInfo) => {
    if (!window.confirm("Изтрий резервацията?")) return;
    try {
      if (booking.type==="event") { await deleteDoc(doc(db,"events",booking.eventId)); fetchEvents(); }
      else { await deleteDoc(doc(db,"scheduleBookings",booking.id)); fetchScheduleBookings(); }
      setEditingCell(null);
    } catch (e) { console.error(e); alert("Грешка!"); }
  };

  const startEditingCell = (room: string, timeSlot: string) => {
    const [h] = timeSlot.split("-");
    const info = getBookingInfo(room, selectedDate, h);
    if (info) setEditingCell({ room, timeSlot, booking: info });
    else startAddingEventFromCell(room, timeSlot);
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const getUserDisplayName = (u: AppUser) =>
    u.displayName || (u.firstName&&u.lastName ? `${u.firstName} ${u.lastName}` : u.email.split("@")[0]);

  const filteredUsers  = users.filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase())||u.role.includes(searchTerm)||(u.firstName?.toLowerCase()||"").includes(searchTerm.toLowerCase())||(u.lastName?.toLowerCase()||"").includes(searchTerm.toLowerCase()));
  const filteredEvents = events.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase())||e.description.toLowerCase().includes(searchTerm.toLowerCase())||e.location.toLowerCase().includes(searchTerm.toLowerCase())||e.organizer.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBooks  = books.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase())||b.author.toLowerCase().includes(searchTerm.toLowerCase())||b.isbn.toLowerCase().includes(searchTerm.toLowerCase())||b.category.toLowerCase().includes(searchTerm.toLowerCase())||(b.genres?.some(g=>g.toLowerCase().includes(searchTerm.toLowerCase())))||( b.tags?.some(t=>t.toLowerCase().includes(searchTerm.toLowerCase()))));

  const isEventFull      = (e: AppEvent) => e.currentParticipants >= e.maxParticipants;

  // ── Image preview helper ───────────────────────────────────────────────────
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img.style.display = "none";
    const p = img.parentElement;
    if (p) {
      const err = document.createElement("p");
      err.className = "image-error";
      err.textContent = "Невалиден линк";
      p.appendChild(err);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">

        {/* Header */}
        <div className="events-header">
          <div className="events-title-section">
            <div className="title-icon-wrapper"><Shield className="events-title-icon" /></div>
            <div className="title-content">
              <h1 className="handwritten-title">Административен Панел</h1>
              <p className="events-subtitle">Управление на потребители, събития, книги и проверка на билети</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input type="text" placeholder="Търсене..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className="search-input" />
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          {([
            { id:"users",        label:`Потребители (${users.length})`,          icon:<Users size={18}/> },
            { id:"events",       label:`Събития (${events.length})`,             icon:<Calendar size={18}/> },
            { id:"books",        label:`Книги (${books.length})`,                icon:<BookOpen size={18}/> },
            { id:"reservations", label:`Резервирани книги (${reservations.length})`, icon:<Bookmark size={18}/> },
            { id:"news",         label:`Новини (${news.length})`,                icon:<Newspaper size={18}/> },
            { id:"rooms",        label:`Стаи (${locationOptions.length})`,       icon:<Building size={18}/> },
            { id:"tickets",      label:"Проверка на билети",                     icon:<QrCode size={18}/> },
          ] as const).map(t => (
            <button key={t.id}
              className={`tab-button ${activeTab===t.id?"active":""}`}
              onClick={() => {
                setActiveTab(t.id);
                if (t.id==="tickets") { setShowQrScanner(false); setShowCheckTicketModal(false); setShowTodayStats(false); }
              }}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── QR Scanner Modal ─────────────────────────────────────────────── */}
        {showQrScanner && (
          <div className="modal-overlay">
            <div className="modal-content qr-scanner-modal">
              <div className="modal-header">
                <h3>Сканирайте QR кода на билета</h3>
                <button onClick={closeQrScanner} className="close-btn"><X size={20}/></button>
              </div>
              <div className="modal-body">
                {cameraError ? (
                  <div className="camera-error">
                    <CameraOff size={48}/><p>{cameraError}</p>
                    <button onClick={openQrScanner} className="secondary-btn retry-btn">Опитай отново</button>
                  </div>
                ) : (
                  <>
                    <div className="qr-scanner-container">
                      <Scanner onScan={handleQrScan} onError={handleQrError} scanDelay={300}
                        constraints={{ facingMode:"environment" }} styles={{ container:{ width:"100%" } }} />
                      <div className="qr-overlay">
                        <div className="qr-frame"></div>
                        <div className="qr-instructions">Насочете камерата към QR кода</div>
                      </div>
                    </div>
                    <div className="manual-entry-option">
                      <div className="manual-input-group">
                        <input type="text" value={ticketSearchTerm}
                          onChange={e=>setTicketSearchTerm(e.target.value.toUpperCase())}
                          placeholder="TICKET-XXXX" className="search-input small-input" />
                        <button onClick={async()=>{ const ok=await searchTicket(); if(ok){setShowQrScanner(false);} }}
                          disabled={!ticketSearchTerm.trim()} className="primary-btn small-btn">Търси</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── News Modal ───────────────────────────────────────────────────── */}
        {showNewsModal && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h3>{modalNewsData.id ? "Редактиране на новина" : "Създаване на статия"}</h3>
                <button onClick={closeNewsModal} className="close-btn"><X size={20}/></button>
              </div>
              <div className="modal-body event-modal-body">
                <div className="event-modal-grid">
                  <div className="modal-form-group full-width">
                    <label className="required">Заглавие *</label>
                    <input type="text" value={modalNewsData.title||""} onChange={e=>setModalNewsData({...modalNewsData,title:e.target.value})} className="modal-form-input" placeholder="Заглавие на новината" />
                  </div>
                  <div className="modal-form-group full-width">
                    <label className="required">Кратко описание *</label>
                    <textarea value={modalNewsData.excerpt||""} onChange={e=>setModalNewsData({...modalNewsData,excerpt:e.target.value})} className="modal-form-input" rows={3} />
                  </div>
                  <div className="modal-form-group full-width">
                    <label className="required">Съдържание *</label>
                    <textarea value={modalNewsData.content||""} onChange={e=>setModalNewsData({...modalNewsData,content:e.target.value})} className="modal-form-input" rows={8} />
                  </div>
                  <div className="modal-form-group">
                    <label className="required">Категория *</label>
                    <select value={modalNewsData.category||"Общи"} onChange={e=>setModalNewsData({...modalNewsData,category:e.target.value})} className="modal-form-input">
                      {["Общи","Събития","Актуално","Образование","Библиотека","Други"].map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Тагове (запетая)</label>
                    <input type="text" value={modalNewsData.tags?.join(", ")||""} onChange={e=>setModalNewsData({...modalNewsData,tags:e.target.value.split(",").map(t=>t.trim()).filter(Boolean)})} className="modal-form-input" />
                  </div>
                  <div className="modal-form-group">
                    <label>Автор</label>
                    <input type="text" value={modalNewsData.author||"Администратор"} onChange={e=>setModalNewsData({...modalNewsData,author:e.target.value})} className="modal-form-input" />
                  </div>
                  <div className="modal-form-group">
                    <div className="checkbox-group">
                      <input type="checkbox" id="featured" checked={modalNewsData.featured||false} onChange={e=>setModalNewsData({...modalNewsData,featured:e.target.checked})} className="checkbox-input" />
                      <label htmlFor="featured" className="checkbox-label">Препоръчана новина</label>
                    </div>
                  </div>
                  <div className="modal-form-group full-width">
                    <label className="required">Основна снимка *</label>
                    <input type="url" value={modalNewsData.image||""} onChange={e=>setModalNewsData({...modalNewsData,image:e.target.value})} className="modal-form-input" />
                    {modalNewsData.image && <div className="image-preview"><img src={modalNewsData.image} alt="Preview" className="preview-image" onError={handleImgError} /></div>}
                  </div>
                </div>
                <div className="modal-actions">
                  <button onClick={modalNewsData.id?handleUpdateNews:handleCreateNews}
                    disabled={!modalNewsData.title?.trim()||!modalNewsData.excerpt?.trim()||!modalNewsData.content?.trim()||!modalNewsData.category?.trim()||!modalNewsData.image?.trim()}
                    className="primary-btn modal-save-btn">
                    <Save size={16}/>{modalNewsData.id?"Запази":"Създай"}
                  </button>
                  <button onClick={closeNewsModal} className="secondary-btn">Отказ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Check Ticket Modal ───────────────────────────────────────────── */}
        {showCheckTicketModal && !showQrScanner && !showTodayStats && (
          <div className="modal-overlay">
            <div className="modal-content ticket-check-modal">
              <div className="modal-header">
                <h3>Проверка на билети</h3>
                <div className="modal-header-actions">
                  <button onClick={openTodayStats} className="stats-btn primary-btn"><BarChart3 size={18}/>Статистика</button>
                  <button onClick={()=>setShowCheckTicketModal(false)} className="close-btn"><X size={20}/></button>
                </div>
              </div>
              <div className="modal-body">
                <div className="ticket-search-section">
                  <div className="search-box">
                    <Search className="search-icon"/>
                    <input type="text" placeholder="TICKET-XXXX..." value={ticketSearchTerm}
                      onChange={e=>setTicketSearchTerm(e.target.value.toUpperCase())}
                      onKeyPress={e=>e.key==="Enter"&&searchTicket()} className="search-input" disabled={isCheckingTicket} />
                  </div>
                  <div className="ticket-search-buttons">
                    <button onClick={()=>searchTicket()} disabled={isCheckingTicket||!ticketSearchTerm.trim()} className="primary-btn">{isCheckingTicket?"Търсене...":"Търси билет"}</button>
                    <button onClick={openQrScanner} className="primary-btn qr-scanner-btn"><QrCode size={18}/>Сканирай QR</button>
                  </div>
                </div>
                {ticketStatusMessage && (
                  <div className={`ticket-status-message ${ticketStatusType}`}>
                    {ticketStatusType==="success"&&<Check size={16}/>}
                    {ticketStatusType==="error"&&<XCircle size={16}/>}
                    {ticketStatusMessage}
                  </div>
                )}
                {checkTicketModalData && (
                  <div className="ticket-details">
                    <div className="ticket-details-header">
                      <h4>Детайли за билета</h4>
                      <div className={`ticket-status-badge ${checkTicketModalData.checkedIn?"checked":"pending"}`}>
                        {checkTicketModalData.checkedIn?"Регистриран":"Чака регистрация"}
                      </div>
                    </div>
                    <div className="ticket-info-grid">
                      <div className="ticket-info-item"><strong>Номер:</strong><span className="ticket-id">{checkTicketModalData.ticketId}</span></div>
                      <div className="ticket-info-item"><strong>Събитие:</strong><span>{checkTicketModalData.eventTitle}</span></div>
                      <div className="ticket-info-item"><strong>Дата:</strong><span>{checkTicketModalData.eventDate} | {checkTicketModalData.eventTime}</span></div>
                      <div className="ticket-info-item"><strong>Потребител:</strong><span>{checkTicketModalData.userName}</span></div>
                      <div className="ticket-info-item"><strong>Имейл:</strong><span>{checkTicketModalData.userEmail}</span></div>
                      {checkTicketModalData.checkedInTime && <div className="ticket-info-item"><strong>Регистриран на:</strong><span>{checkTicketModalData.checkedInTime}</span></div>}
                    </div>
                    <div className="ticket-actions">
                      {!checkTicketModalData.checkedIn
                        ? <button onClick={checkInTicket} disabled={isCheckingTicket} className="primary-btn check-in-btn"><Check size={16}/>Регистрирай</button>
                        : <button onClick={uncheckTicket} disabled={isCheckingTicket} className="secondary-btn uncheck-btn"><XCircle size={16}/>Отмени регистрация</button>
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Today Stats Modal ────────────────────────────────────────────── */}
        {showTodayStats && !showQrScanner && (
          <div className="modal-overlay">
            <div className="modal-content ticket-check-modal">
              <div className="modal-header">
                <h3>Статистика за днес ({new Date().toLocaleDateString("bg-BG")})</h3>
              </div>
              <div className="modal-body">
                <div className="stats-cards">
                  <div className="stat-card"><div className="stat-icon"><BarChart3 size={24}/></div><div className="stat-info"><div className="stat-value">{todayStats.totalTickets}</div><div className="stat-label">Общо</div></div></div>
                  <div className="stat-card success"><div className="stat-icon"><Check size={24}/></div><div className="stat-info"><div className="stat-value">{todayStats.checkedInTickets}</div><div className="stat-label">Регистрирани</div></div></div>
                  <div className="stat-card warning"><div className="stat-icon"><Clock size={24}/></div><div className="stat-info"><div className="stat-value">{todayStats.pendingTickets}</div><div className="stat-label">Чакащи</div></div></div>
                </div>
                {todayStats.todayScannedTickets.length > 0 ? (
                  <div className="table-container" style={{marginTop:20}}>
                    <table className="data-table">
                      <thead><tr><th>Билет №</th><th>Събитие</th><th>Потребител</th><th>Статус</th><th>Час</th></tr></thead>
                      <tbody>
                        {todayStats.todayScannedTickets.map((t,i)=>(
                          <tr key={i}>
                            <td><span className="ticket-id-small">{t.ticketId}</span></td>
                            <td><div className="event-title">{t.eventTitle}</div><div className="event-time">{t.eventDate}</div></td>
                            <td>{t.userName}</td>
                            <td><span className={`status-badge ${t.status}`}>{t.status==="checked"?"Регистриран":"Очаква"}</span></td>
                            <td>{t.scanTime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state"><QrCode size={48}/><p>Няма билети</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Event Modal ──────────────────────────────────────────────────── */}
        {showEventModal && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h3>{modalMode==="create"?"Ново събитие":"Редактирай събитие"}</h3>
                <button onClick={closeEventModal} className="close-btn"><X size={20}/></button>
              </div>
              <div className="modal-body event-modal-body">
                <div className="event-modal-grid">
                  <div className="modal-form-group">
                    <label className="required">Заглавие</label>
                    <input type="text" value={modalEventData.title||""} onChange={e=>handleModalInputChange("title",e.target.value)} className="modal-form-input" />
                  </div>
                  <div className="modal-form-group">
                    <label>Описание</label>
                    <div className="editor-container">
                      <EditorToolbar editor={editor} />
                      <div className="editor-content"><EditorContent editor={editor}/></div>
                      <div className="formatting-tips"><Type size={14}/><span>Форматиране: <strong>удебеляване</strong>, <em>курсив</em></span></div>
                    </div>
                  </div>
                  <div className="modal-form-group">
                    <label className="required">Дата</label>
                    <input type="date" value={modalEventData.date||""} onChange={e=>handleModalInputChange("date",e.target.value)} className="modal-form-input" min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="time-range-group">
                    <div className="modal-form-group">
                      <label className="required">Начален час</label>
                      <select value={modalEventData.time||""} onChange={e=>handleModalInputChange("time",e.target.value)} className="modal-form-input">
                        <option value="">Изберете</option>
                        {timeOptionsWithMinutes.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="modal-form-group">
                      <label className="required">Краен час</label>
                      <select value={modalEventData.endTime||""} onChange={e=>handleModalInputChange("endTime",e.target.value)} className="modal-form-input">
                        <option value="">Изберете</option>
                        {timeOptionsWithMinutes.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="modal-form-group">
                    <label className="required">Място</label>
                    <select value={modalEventData.location||""} onChange={e=>handleModalInputChange("location",e.target.value)} className="modal-form-input">
                      <option value="">Изберете</option>
                      {locationOptions.map(l=>{
                        const conflict=!!(modalEventData.date&&modalEventData.time&&modalEventData.endTime&&hasBookingConflict(l,modalEventData.date,modalEventData.time,modalEventData.endTime,modalEventData.id));
                        return <option key={l} value={l} disabled={conflict}>{l}{conflict?" (Заето)":""}</option>;
                      })}
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Брой места</label>
                    <input type="number" min="1" max="1000" value={modalEventData.maxParticipants||20} onChange={e=>handleModalInputChange("maxParticipants",parseInt(e.target.value)||20)} className="modal-form-input" />
                  </div>
                  <div className="modal-form-group">
                    <label>Организатор</label>
                    <input type="text" value={modalEventData.organizer||""} onChange={e=>handleModalInputChange("organizer",e.target.value)} className="modal-form-input" />
                  </div>
                  <div className="modal-form-group">
                    <label>Линк към картинка</label>
                    <input type="url" value={modalEventData.imageUrl||""} onChange={e=>handleModalInputChange("imageUrl",e.target.value)} className="modal-form-input" />
                    {modalEventData.imageUrl && <div className="image-preview"><img src={modalEventData.imageUrl} alt="Preview" className="preview-image" onError={handleImgError}/></div>}
                  </div>
                </div>
                <div className="modal-actions">
                  <button onClick={modalMode==="create"?handleCreateEvent:handleUpdateEvent}
                    disabled={!modalEventData.title?.trim()||!modalEventData.date||!modalEventData.time||!modalEventData.endTime||!modalEventData.location||!validateTimeRange(modalEventData.time,modalEventData.endTime)||hasBookingConflict(modalEventData.location||"",modalEventData.date||"",modalEventData.time||"",modalEventData.endTime||"",modalEventData.id)}
                    className="primary-btn modal-save-btn">
                    <Save size={16}/>{modalMode==="create"?"Създай":"Запази"}
                  </button>
                  <button onClick={closeEventModal} className="secondary-btn">Отказ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Room Import / Cell modals (unchanged logic) ──────────────────── */}
        {isImportingSchedule && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header"><h3>Импортиране на седмичен график</h3><button onClick={()=>setIsImportingSchedule(false)} className="close-btn"><X size={20}/></button></div>
              <div className="modal-body">
                <div className="form-group"><label>Стая</label><select value={selectedRoomForImport} onChange={e=>setSelectedRoomForImport(e.target.value)} className="form-input">{locationOptions.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                <div className="form-group"><label>Учебна година</label><input type="text" value={academicYear} onChange={e=>setAcademicYear(e.target.value)} placeholder="2024-2025" className="form-input"/></div>
                <div className="form-group"><label>Семестър</label><select value={semester} onChange={e=>setSemester(e.target.value as "winter"|"summer")} className="form-input"><option value="winter">Зимен</option><option value="summer">Летен</option></select></div>
                <div className="form-group"><label>Данни за график</label><textarea value={importData} onChange={e=>setImportData(e.target.value)} className="form-input textarea" rows={15} placeholder="Понеделник&#10;07:30–08:10 Предмет 8а&#10;..."/></div>
                <div className="modal-actions">
                  <button onClick={importScheduleToFirebase} disabled={!importData.trim()} className="primary-btn">Импортирай</button>
                  <button onClick={()=>setIsImportingSchedule(false)} className="secondary-btn">Отказ</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {addingEventFromCell && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header"><h3>Добавяне на събитие</h3><button onClick={()=>setAddingEventFromCell(null)} className="close-btn"><X size={20}/></button></div>
              <div className="modal-body">
                <p><strong>Стая:</strong> {addingEventFromCell.room} | <strong>Дата:</strong> {new Date(selectedDate).toLocaleDateString("bg-BG")}</p>
                <div className="event-form-grid">
                  <div className="form-group"><label>Заглавие *</label><input type="text" value={cellEventTitle} onChange={e=>setCellEventTitle(e.target.value)} className="form-input"/></div>
                  <div className="form-group"><label>Описание</label><textarea value={cellEventDesc} onChange={e=>setCellEventDesc(e.target.value)} className="form-input textarea" rows={3}/></div>
                  <div className="form-group"><label>Начален час *</label><select value={cellEventStartTime} onChange={e=>setCellEventStartTime(e.target.value)} className="form-input"><option value="">Изберете</option>{timeOptionsWithMinutes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label>Краен час *</label><select value={cellEventEndTime} onChange={e=>setCellEventEndTime(e.target.value)} className="form-input"><option value="">Изберете</option>{timeOptionsWithMinutes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label>Брой места</label><input type="number" min="1" max="1000" value={cellEventMaxParticipants} onChange={e=>setCellEventMaxParticipants(parseInt(e.target.value)||1)} className="form-input"/></div>
                  <div className="form-group"><label>Организатор</label><input type="text" value={cellEventOrganizer} onChange={e=>setCellEventOrganizer(e.target.value)} className="form-input"/></div>
                  <div className="form-group"><label>Линк към картинка</label><input type="url" value={cellEventImageUrl} onChange={e=>setCellEventImageUrl(e.target.value)} className="form-input"/></div>
                  <div className="modal-actions">
                    <button onClick={createEventFromCell} disabled={!cellEventTitle.trim()||!cellEventStartTime||!cellEventEndTime||!validateTimeRange(cellEventStartTime,cellEventEndTime)||hasBookingConflict(addingEventFromCell.room,selectedDate,cellEventStartTime,cellEventEndTime)} className="primary-btn"><Plus size={16}/>Създай</button>
                    <button onClick={()=>{setAddingEventFromCell(null);setCellEventImageUrl("");}} className="secondary-btn">Отказ</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editingCell && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header"><h3>Резервация</h3><button onClick={()=>setEditingCell(null)} className="close-btn"><X size={20}/></button></div>
              <div className="modal-body">
                <p><strong>Стая:</strong> {editingCell.room} | <strong>Час:</strong> {editingCell.timeSlot}</p>
                {editingCell.booking ? (
                  <div className="booking-details">
                    {editingCell.booking.type==="event"
                      ? <p><strong>Събитие:</strong> {editingCell.booking.eventTitle} | {editingCell.booking.time}–{editingCell.booking.endTime}</p>
                      : editingCell.booking.classSchedules.map((s,i)=><div key={i}><p><strong>{s.subject}</strong> — {s.className}{s.teacher&&` (${s.teacher})`}</p></div>)
                    }
                    <div className="modal-actions">
                      <button onClick={()=>deleteBookingFromCell(editingCell.booking!)} className="delete-btn"><Trash2 size={16}/>Изтрий</button>
                      <button onClick={()=>setEditingCell(null)} className="secondary-btn">Затвори</button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-actions">
                    <button onClick={()=>startAddingEventFromCell(editingCell.room,editingCell.timeSlot)} className="primary-btn"><Plus size={16}/>Добави събитие</button>
                    <button onClick={()=>setEditingCell(null)} className="secondary-btn">Затвори</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB CONTENT */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* USERS TAB */}
        {activeTab==="users" && (
          <div className="content-section">
            <div className="rooms-header"><h2>Управление на потребители</h2></div>
            <div className="user-stats-cards">
              {[
                { count:users.length,                              label:"Общо потребители",  cls:"total-users"  },
                { count:users.filter(u=>u.role==="reader").length, label:"Читатели",          cls:"readers"      },
                { count:users.filter(u=>u.role==="librarian").length,label:"Библиотекари",    cls:"librarians"   },
                { count:users.filter(u=>u.role==="admin").length,  label:"Администратори",    cls:"admins"       },
              ].map(s=>(
                <div key={s.cls} className={`stat-card ${s.cls}`}>
                  <div className="stat-content"><div className="stat-label">{s.count}</div><div className="stat-label">{s.label}</div></div>
                </div>
              ))}
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Потребител</th><th>Имейл</th><th>Роля</th><th>Събития</th><th>Действия</th></tr></thead>
                <tbody>
                  {filteredUsers.map(u=>(
                    <tr key={u.id}>
                      <td className="user-info-cell">
                        <div className="user-avatar-small">{getUserDisplayName(u).charAt(0).toUpperCase()}</div>
                        <div className="user-details">
                          <div className="user-email">{getUserDisplayName(u)}</div>
                          {u.profile?.grade && <div className="user-grade">{u.profile.grade} клас</div>}
                        </div>
                      </td>
                      <td className="user-email">{u.email}</td>
                      <td>
                        <select value={u.role} onChange={e=>changeUserRole(u.id,e.target.value)} className={`role-select role-${u.role}`}>
                          <option value="reader">Читател</option>
                          <option value="librarian">Библиотекар</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </td>
                      <td>
                        <span className="events-count-badge">
                          {events.filter(e=>e.participants?.includes(u.id)).length}
                        </span>
                      </td>
                      <td>
                        <button onClick={()=>deleteUser(u.id)} className="delete-btn"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length===0 && <div className="empty-state"><Users size={32}/><p>Няма потребители</p></div>}
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab==="events" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Управление на събития</h2>
              <button onClick={openCreateEventModal} className="primary-btn"><Plus size={16}/>Ново събитие</button>
            </div>
            <div className="table-container">
              <table className="data-table events-table">
                <thead><tr><th>Заглавие</th><th>Дата и час</th><th>Място</th><th>Участници</th><th>Действия</th></tr></thead>
                <tbody>
                  {filteredEvents.map(e=>(
                    <tr key={e.id} className={isEventFull(e)?"event-full":""}>
                      <td className="event-info-cell">
                        <div className="event-title">{e.title}{e.imageUrl&&<span title="Има картинка"><ImageIcon size={14}/></span>}</div>
                        {e.description&&<div className="event-desc-html" dangerouslySetInnerHTML={{__html:e.description}}/>}
                      </td>
                      <td><div className="event-date"><Calendar size={14}/>{new Date(e.date).toLocaleDateString("bg-BG")}</div><div className="event-time-range"><Clock size={14}/>{e.time} - {e.endTime}</div></td>
                      <td><div className="event-location"><MapPin size={14}/>{e.location}</div></td>
                      <td><div className="participants-count"><User size={14}/>{e.currentParticipants}/{e.maxParticipants}</div>{isEventFull(e)&&<div className="full-badge">Пълно</div>}</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={()=>openEditEventModal(e)} className="edit-btn"><Edit size={16}/></button>
                          <button onClick={()=>deleteEvent(e.id)} className="delete-btn"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length===0&&<div className="empty-state"><Calendar size={32}/><p>Няма събития</p></div>}
            </div>
          </div>
        )}

        {/* BOOKS TAB */}
        {activeTab==="books" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Управление на библиотека</h2>
            </div>
            <div className="books-grid-admin">
              {filteredBooks.map(book=>(
                <div key={book.id} className="book-card-admin">
                  <div className="book-header-admin">
                    <div className="book-thumbnail-admin">
                      {book.coverUrl ? <img src={book.coverUrl} alt={book.title} className="book-cover-admin"/> : <div className="book-image-fallback-admin"><BookOpen className="fallback-icon-admin"/></div>}
                    </div>
                    <div className="book-main-info-admin">
                      <h3 className="book-title-admin">{book.title}</h3>
                      <p className="book-author-admin">{book.author}</p>
                      <div className="book-meta-admin">
                        <div className="book-category-admin"><Tag size={14}/><span>{book.category}</span></div>
                        <div className="book-availability-admin"><Copy size={14}/><span>{book.availableCopies}/{book.copies} копия</span></div>
                        <div className="book-location-admin"><MapPin size={14}/><span>{book.location}</span></div>
                        <div className="book-isbn-admin">ISBN: {book.isbn}</div>
                      </div>
                    </div>
                  </div>
                  {book.description && <div className="book-description-admin"><p>{book.description.substring(0,150)}...</p></div>}
                  <div className="book-actions-admin">
                    <div className="admin-action-buttons">
                      <button onClick={()=>deleteBook(book.id)} className="delete-book-btn"><Trash2 size={16}/><span>Изтрий</span></button>
                    </div>
                    <div className="book-stats-admin">
                      <div className="stat-group-admin"><Calendar size={14}/><span>Добавена: {formatFSDate(book.createdAt)}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RESERVATIONS TAB */}
        {activeTab==="reservations" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Управление на Резервации</h2>
              <button onClick={fetchReservations} className="secondary-btn"><RefreshCw size={16}/>Обнови</button>
            </div>
            <div className="stats-grid">
              {[
                { status:"active",    label:"Активни",   count:reservations.filter(r=>r.status==="active").length },
                { status:"fulfilled", label:"Изпълнени", count:reservations.filter(r=>r.status==="fulfilled").length },
                { status:"cancelled", label:"Отменени",  count:reservations.filter(r=>r.status==="cancelled").length },
                { status:"total",     label:"Общо",       count:reservations.length },
              ].map(s=>(
                <div key={s.status} className="stat-card">
                  <div className="stat-icon"><Bookmark size={24}/></div>
                  <div className="stat-info"><div className="stat-number">{s.count}</div><div className="stat-label">{s.label}</div></div>
                </div>
              ))}
            </div>
            {reservations.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Книга</th><th>Потребител</th><th>Дата</th><th>Краен срок</th><th>Статус</th><th>Действия</th></tr></thead>
                  <tbody>
                    {reservations.map(r=>{
                      const book = books.find(b=>b.id===r.bookId);
                      const user = users.find(u=>u.id===r.userId);
                      return (
                        <tr key={r.id}>
                          <td><div className="book-info-cell"><strong>{book?.title||"Неизвестна книга"}</strong><small>{book?.author}</small></div></td>
                          <td><div className="user-info-cell"><span>{user?.displayName||r.userName||"Неизвестен"}</span><small>{r.userEmail}</small></div></td>
                          <td>{formatFSDate(r.reservedAt)}</td>
                          <td>{formatFSDate(r.expiresAt)}</td>
                          <td>
                            <span className={`status-badge ${r.status||"active"}`}>
                              {r.status==="active"?"Активна":r.status==="fulfilled"?"Изпълнена":r.status==="cancelled"?"Отменена":"Изтекла"}
                            </span>
                          </td>
                          <td>
                            {r.status==="active" && (
                              <div className="action-buttons">
                                <button onClick={()=>cancelReservation(r.id)} className="secondary-btn small-btn">Отмени</button>
                                <button onClick={()=>markReservationFulfilled(r.id)} className="primary-btn small-btn">Изпълнена</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><Bookmark size={48}/><p>Няма резервации</p></div>
            )}
          </div>
        )}

        {/* NEWS TAB */}
        {activeTab==="news" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Управление на новини</h2>
              <button onClick={openCreateNewsModal} className="primary-btn"><Plus size={16}/>Добави новина</button>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Заглавие</th><th>Категория</th><th>Автор</th><th>Дата</th><th>Статистика</th><th>Действия</th></tr></thead>
                <tbody>
                  {news.map(item=>(
                    <tr key={item.id} className={item.featured?"featured-news":""}>
                      <td className="news-info-cell">
                        <div className="news-title">{item.title}{item.featured&&<span className="featured-badge">★</span>}</div>
                        <div className="news-excerpt">{item.excerpt}</div>
                        {item.tags?.length>0 && <div className="news-tags-preview">{item.tags.slice(0,3).map((t,i)=><span key={i} className="news-tag-small">#{t}</span>)}</div>}
                      </td>
                      <td><span className={`news-category-badge ${item.category.toLowerCase().replace(/\s+/g,"-")}`}>{item.category}</span></td>
                      <td>{item.author}</td>
                      <td>{formatFSDate(item.date)}</td>
                      <td>
                        <div className="news-stats">
                          <div className="stat-item"><Eye size={14}/><span>{item.views||0}</span></div>
                          <div className="stat-item"><Heart size={14}/><span>{item.likes||0}</span></div>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={()=>openEditNewsModal(item)} className="edit-btn"><Edit size={16}/></button>
                          <button onClick={()=>deleteNews(item.id)} className="delete-btn"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {news.length===0&&<div className="empty-state"><Newspaper size={32}/><p>Няма новини</p></div>}
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {activeTab==="rooms" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Заетост на стаи</h2>
              <button onClick={()=>setIsImportingSchedule(true)} className="primary-btn"><Upload size={16}/>Импортирай график</button>
            </div>
            <div className="date-picker-section">
              <label htmlFor="room-date" className="date-picker-label">Изберете дата:</label>
              <input id="room-date" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="date-picker-input" min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="rooms-grid-container">
              <div className="rooms-timetable">
                <div className="table-header-row">
                  <div className="corner-cell">Стая/Час</div>
                  {timeSlots.map(t=><div key={t} className="time-header-cell">{t.split("-")[0]}</div>)}
                </div>
                {locationOptions.map(room=>(
                  <div key={room} className="table-row">
                    <div className="room-name-cell"><Building size={16}/><span>{room}</span></div>
                    {timeSlots.map(slot=>{
                      const [h] = slot.split("-");
                      const isEvent    = isRoomBookedByEvent(room,selectedDate,h);
                      const isSched    = isRoomBookedInSchedule(room,selectedDate,h);
                      const info       = getBookingInfo(room,selectedDate,h);
                      return (
                        <div key={`${room}-${slot}`}
                          className={`time-slot-cell ${isSched?"scheduled":isEvent?"booked":"available"} ${editingCell?.room===room&&editingCell?.timeSlot===slot?"editing":""}`}
                          onClick={()=>startEditingCell(room,slot)}>
                          {isSched&&<div className="schedule-indicator"><div className="schedule-dot"/>{info?.type==="schedule"&&<div className="event-tooltip">{info.classSchedules.map((s,i)=><div key={i}>{s.subject} {s.className}</div>)}</div>}</div>}
                          {isEvent&&!isSched&&<div className="booking-indicator"><div className="event-dot"/>{info?.type==="event"&&<div className="event-tooltip"><strong>{info.eventTitle}</strong><br/>{info.time}-{info.endTime}</div>}</div>}
                          {!isEvent&&!isSched&&<div className="available-text">+</div>}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="rooms-legend">
              <div className="legend-item"><div className="legend-color available"></div><span>Свободна</span></div>
              <div className="legend-item"><div className="legend-color scheduled"></div><span>Учебно занятие</span></div>
              <div className="legend-item"><div className="legend-color booked"></div><span>Събитие</span></div>
            </div>
          </div>
        )}

        {/* TICKETS TAB */}
        {activeTab==="tickets" && (
          <div className="content-section">
            <div className="tickets-header"><h2>Проверка на билети</h2></div>
            <div className="ticket-options-grid">
              <div className="ticket-option-card" onClick={openCheckTicketModal}>
                <div className="option-icon"><Search size={32}/></div>
                <h3>Ръчно търсене</h3>
                <p>Въведете номер или сканирайте QR</p>
                <button className="primary-btn option-btn">Проверка</button>
              </div>
              <div className="ticket-option-card" onClick={openQrScanner}>
                <div className="option-icon"><QrCode size={32}/></div>
                <h3>Директно сканиране</h3>
                <p>Сканиране на QR код от билет</p>
                <button className="primary-btn option-btn">Сканирай QR</button>
              </div>
              <div className="ticket-option-card" onClick={openTodayStats}>
                <div className="option-icon"><BarChart3 size={32}/></div>
                <h3>Статистика</h3>
                <p>Преглед на регистрираните за днес</p>
                <button className="primary-btn option-btn">Виж статистика</button>
              </div>
            </div>
            <div className="tickets-stats">
              <h3>Обща статистика</h3>
              <div className="stats-grid">
                {[
                  { label:"Общо билети", value:events.reduce((t,e)=>t+(e.tickets?Object.keys(e.tickets).length:0),0) },
                  { label:"Регистрирани", value:events.reduce((t,e)=>e.tickets?t+Object.values(e.tickets).filter(tk=>tk.checkedIn).length:t,0) },
                  { label:"Очакващи",    value:events.reduce((t,e)=>e.tickets?t+Object.values(e.tickets).filter(tk=>!tk.checkedIn).length:t,0) },
                ].map(s=>(
                  <div key={s.label} className="stat-card">
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;