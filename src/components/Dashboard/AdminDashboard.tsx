import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, getDoc, Timestamp} from "firebase/firestore";
import type { BookLibrary } from "../../lib/services/bookTypes";
import * as bookService from "../../lib/services/bookService";
import { 
  Users, Calendar, Trash2, Plus, Search, Clock, MapPin, User, Edit, X, Save, Building, Upload, Type, QrCode, Check, XCircle, CameraOff, BarChart3, Image as ImageIcon,
  Shield, BookOpen, List, Grid,
  Tag,
  Copy,
  Bookmark,
  Newspaper,
  Eye,
  Heart
} from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import './AdminDashboard.css';
import '../../pages/EventsPage.css';

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
  type: 'event';
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
  type: 'schedule';
}

type BookingInfo = RoomBooking | ScheduleBooking;

interface UserEvent {
  eventId: string;
  registrationDate: any;
  status?: string;
}

interface Ticket {
  ticketId: string;
  registrationDate: any;
  checkedIn: boolean;
  checkedInTime?: any;
}

interface User {
  uid: string;
  id: string;
  email: string;
  role: string;
  events?: UserEvent[];
  books?: any[];
  createdAt?: any;
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
  participants: string[];     
  allowedRoles: string[];
  createdAt: any;
  organizer: string;
  imageUrl?: string;
  tickets?: {
    [userId: string]: Ticket;
  };
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
  status: 'checked' | 'pending';
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
  date: any; 
  views: number;
  likes: number;
  tags: string[];
  featured: boolean;
  createdAt: any;
  updatedAt: any;
}

const EditorToolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Въведете URL на картинката:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="editor-toolbar">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
        title="Удебелен текст"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
        title="Курсив"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
        title="Списък"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
        title="Номериран списък"
      >
        <Grid size={16} />
      </button>
      <div className="toolbar-divider"></div>
      <button
        type="button"
        onClick={addImage}
        className="toolbar-btn"
        title="Добави картинка"
      >
        <ImageIcon size={16} />
      </button>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [books, setBooks] = useState<BookLibrary[]>([]);
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [scheduleBookings, setScheduleBookings] = useState<ScheduleBooking[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"users" | "events" | "rooms" | "tickets" | "books" | "reservations" | "news">("users");
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingCell, setEditingCell] = useState<{room: string, timeSlot: string, booking: BookingInfo | null} | null>(null);
  const [addingEventFromCell, setAddingEventFromCell] = useState<{room: string, timeSlot: string} | null>(null);
  
  const [isImportingSchedule, setIsImportingSchedule] = useState(false);
  const [importData, setImportData] = useState("");
  const [selectedRoomForImport, setSelectedRoomForImport] = useState("1303");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [semester, setSemester] = useState<"winter" | "summer">("winter");
  const [cellEventImageUrl, setCellEventImageUrl] = useState<string>("");

  const [cellEventTitle, setCellEventTitle] = useState<string>("");
  const [cellEventDesc, setCellEventDesc] = useState<string>("");
  const [cellEventStartTime, setCellEventStartTime] = useState<string>("");
  const [cellEventEndTime, setCellEventEndTime] = useState<string>("");
  const [cellEventMaxParticipants, setCellEventMaxParticipants] = useState<number>(20);
  const [cellEventOrganizer, setCellEventOrganizer] = useState<string>("");

  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');

  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalEventData, setModalEventData] = useState<Partial<Event>>({
    title: "",
    description: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    maxParticipants: 20,
    organizer: "",
    allowedRoles: ["reader", "librarian"],
    imageUrl: "" 
  });

  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [modalBookData, setModalBookData] = useState<Partial<BookLibrary>>({
  // Основни полета
  title: "",
  author: "",
  isbn: "",
  publisher: "",
  year: new Date().getFullYear(),
  category: "",
  description: "",
  copies: 1,
  availableCopies: 1,
  location: "Библиотека",
  coverUrl: "",
  shelfNumber: "",
  callNumber: "",
  genres: [],
  tags: [],
  pages: 0,
  language: "Български",
  edition: "Първо издание",
  coverType: "soft",
  condition: "good",
  ageRecommendation: "",
  featured: false,
  status: "available",
  rating: 0,
  ratingsCount: 0,
  views: 0,
  borrowPeriod: 14,
  maxRenewals: 2,
  reservationQueue: 0,
  waitingList: [],
  summary: "",
  tableOfContents: [],
  relatedBooks: [],
  awards: [],
  digitalVersion: {
    available: false,
    format: "",
    url: ""
  },
  isActive: true,
  underMaintenance: false
});

  const [showCheckTicketModal, setShowCheckTicketModal] = useState<boolean>(false);
  const [ticketSearchTerm, setTicketSearchTerm] = useState<string>("");
  const [checkTicketModalData, setCheckTicketModalData] = useState<CheckTicketModalData | null>(null);
  const [isCheckingTicket, setIsCheckingTicket] = useState<boolean>(false);
  const [ticketStatusMessage, setTicketStatusMessage] = useState<string>("");
  const [ticketStatusType, setTicketStatusType] = useState<"success" | "error" | "info" | "warning">("info");

  const [showTodayStats, setShowTodayStats] = useState<boolean>(false);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalTickets: 0,
    checkedInTickets: 0,
    pendingTickets: 0,
    todayScannedTickets: []
  });

  const [news, setNews] = useState<NewsArticle[]>([]);
const [showNewsModal, setShowNewsModal] = useState<boolean>(false);
const [modalNewsData, setModalNewsData] = useState<Partial<NewsArticle>>({
  title: "",
  excerpt: "",
  content: "",
  category: "Общи",
  image: "",
  author: "Администратор",
  tags: [],
  featured: false
});

  const editor = useEditor({
    extensions: [StarterKit],
    content: modalEventData.description || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setModalEventData(prev => ({
        ...prev,
        description: html
      }));
    },
  });
  const fetchNews = async () => {
  const snapshot = await getDocs(collection(db, "news"));
  const newsData: NewsArticle[] = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as NewsArticle));
  setNews(newsData);
};

  useEffect(() => {
    if (editor && modalEventData.description !== editor.getHTML()) {
      editor.commands.setContent(modalEventData.description || "");
    }
  }, [modalEventData.description, editor]);

  useEffect(() => {
    if (showTodayStats) {
      loadTodayStats();
    }
  }, [showTodayStats, events]);

  const loadTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const scannedTickets: TicketDetail[] = [];
    
    let total = 0;
    let checkedIn = 0;
    let pending = 0;
    
    events.forEach(event => {
      if (event.tickets) {
        Object.entries(event.tickets).forEach(([userId, ticket]) => {
          total++;
          
          if (ticket.checkedIn) {
            checkedIn++;
            
            const checkedInDate = ticket.checkedInTime?.toDate?.();
            const ticketDate = checkedInDate ? checkedInDate.toISOString().split('T')[0] : '';
            
            if (ticketDate === today) {
              const user = users.find(u => u.id === userId);
              scannedTickets.push({
                ticketId: ticket.ticketId,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                userName: user?.displayName || user?.firstName || "Неизвестен потребител",
                userEmail: user?.email || "Няма имейл",
                scanTime: checkedInDate ? checkedInDate.toLocaleString('bg-BG') : "Днес",
                status: 'checked'
              });
            }
          } else {
            pending++;
            
            const eventDate = event.date;
            const todayDate = new Date();
            const eventDateTime = new Date(eventDate + 'T' + event.time);
            
            if (eventDateTime >= todayDate) {
              const user = users.find(u => u.id === userId);
              scannedTickets.push({
                ticketId: ticket.ticketId,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                userName: user?.displayName || user?.firstName || "Неизвестен потребител",
                userEmail: user?.email || "Няма имейл",
                scanTime: "Очаква сканиране",
                status: 'pending'
              });
            }
          }
        });
      }
    });
    
    scannedTickets.sort((a, b) => {
      const dateA = new Date(a.eventDate + 'T' + a.eventTime);
      const dateB = new Date(b.eventDate + 'T' + b.eventTime);
      
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      
      return dateA.getTime() - dateB.getTime();
    });
    
    setTodayStats({
      totalTickets: total,
      checkedInTickets: checkedIn,
      pendingTickets: pending,
      todayScannedTickets: scannedTickets
    });
  };

  const locationOptions = [
    "1303", "3310", "3301-EOП", "3305-АНП", "библиотека", "Зала Европа", "Комп.каб.-ТЧ", 
    "Физкултура3", "1201", "1202", "1203", "1206", "1408-КК", "1308-КК", 
    "1101", "1102", "1103", "1104", "1105", "1106", "1204", "1205", "1207", 
    "1209", "1301", "1302", "1304", "1305", "1307", "1309", "1401", "1402", 
    "1403", "1404", "1405", "1406", "1407", "1409", "1306"
  ];

  const timeSlots = [
    "07:00-08:00", "08:00-09:00", "09:00-10:00", "10:00-11:00", "11:00-12:00", 
    "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", 
    "17:00-18:00", "18:00-19:00", "19:00-20:00"
  ];

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour <= 19; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptionsWithMinutes = generateTimeOptions();

  // ----------- handle QR scan -----------
  const handleQrScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (!detectedCodes?.length) return;

    const raw = detectedCodes[0].rawValue;
    if (!raw) return;

    console.log("Raw QR value:", raw);

    let ticketId = '';

    try {
      const parsed = JSON.parse(raw);
      if (parsed.TICKETID) {
        ticketId = parsed.TICKETID;
      } else {
        ticketId = raw;
      }
    } catch {
      ticketId = raw;
    }

    const match = ticketId.match(/TICKET-([A-Z0-9]+)/i);
    const finalTicketId = match ? `TICKET-${match[1].toUpperCase()}` : ticketId;

    setTicketSearchTerm(finalTicketId);
    console.log("Сканиран ticketId:", finalTicketId);

    await searchTicket(finalTicketId);
  };

  // ----------- handle QR error -----------
  const handleQrError = (error: any) => {
    console.error("QR Scanner error:", error);
    setCameraError(
      "Неуспешно зареждане на камерата. Моля, проверете разрешенията."
    );
  };

  // ----------- QR scanner модал функции -----------
  const openQrScanner = () => {
    setShowQrScanner(true);
    setShowCheckTicketModal(false);
    setShowTodayStats(false);
    setCameraError("");
    setTicketStatusMessage("");
    setCheckTicketModalData(null);
  };

  const closeQrScanner = () => {
    setShowQrScanner(false);
    setCameraError("");
    if (!showCheckTicketModal) setShowCheckTicketModal(true);
  };

  const openCheckTicketModal = () => {
    setShowCheckTicketModal(true);
    setShowQrScanner(false);
    setShowTodayStats(false);
    setTicketSearchTerm("");
    setCheckTicketModalData(null);
    setTicketStatusMessage("");
  };

  // ----------- searchTicket -----------
  const searchTicket = async (ticketIdParam?: string): Promise<boolean> => {
    const ticketToSearch = ticketIdParam || ticketSearchTerm;

    if (!ticketToSearch.trim()) {
      setTicketStatusMessage("Моля, въведете номер на билет!");
      setTicketStatusType("error");
      return false;
    }

    try {
      setIsCheckingTicket(true);
      setTicketStatusMessage("Търсене на билет...");
      setTicketStatusType("info");

      let ticketId = ticketToSearch.trim().toUpperCase();
      
      const match = ticketId.match(/TICKET-[A-Z0-9]+/);
      if (match) {
        ticketId = match[0];
      } else {
        ticketId = `TICKET-${ticketId}`;
      }
      
      console.log("Търсим билет с ID:", ticketId);

      let foundEvent: Event | null = null;
      let foundUserId: string | null = null;
      let foundTicketData: Ticket | null = null;

      for (const event of events) {
        if (event.tickets) {
          for (const [userId, ticket] of Object.entries(event.tickets)) {
            const currentTicket = ticket as Ticket;
            const normalizedTicketId = currentTicket.ticketId.toUpperCase();
            const normalizedSearchId = ticketId.toUpperCase();
            
            if (normalizedTicketId === normalizedSearchId) {
              foundEvent = event;
              foundUserId = userId;
              foundTicketData = currentTicket;
              break;
            }
          }
          if (foundEvent) break;
        }
      }

      if (!foundEvent || !foundUserId || !foundTicketData) {
        setTicketStatusMessage("❌ Билетът не е намерен!");
        setTicketStatusType("error");
        return false;
      }

      const user = users.find(u => u.id === foundUserId);

      setCheckTicketModalData({
        eventId: foundEvent.id,
        eventTitle: foundEvent.title,
        eventDate: foundEvent.date,
        eventTime: foundEvent.time,
        ticketId: foundTicketData.ticketId,
        userName: user?.displayName || user?.firstName || "Неизвестен потребител",
        userEmail: user?.email || "Няма имейл",
        registrationDate:
          foundTicketData.registrationDate?.toDate?.().toLocaleString("bg-BG") ||
          "Неизвестна дата",
        checkedIn: foundTicketData.checkedIn || false,
        checkedInTime: foundTicketData.checkedInTime?.toDate?.().toLocaleString("bg-BG"),
      });

      setShowCheckTicketModal(true);
      setTicketStatusMessage("✅ Билетът е намерен!");
      setTicketStatusType("success");
      return true;
    } catch (error) {
      console.error("Грешка при търсене на билет:", error);
      setTicketStatusMessage("Възникна грешка при търсенето!");
      setTicketStatusType("error");
      return false;
    } finally {
      setIsCheckingTicket(false);
    }
  };

  // ----------- checkInTicket -----------
  const checkInTicket = async (): Promise<boolean> => {
    if (!checkTicketModalData) return false;

    try {
      setIsCheckingTicket(true);
      setTicketStatusMessage("Регистриране...");

      const eventRef = doc(db, "events", checkTicketModalData.eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) throw new Error("Събитието не е намерено");

      const eventData = eventDoc.data();
      const tickets = eventData?.tickets || {};

      const userIdToUpdate = Object.entries(tickets).find(
        ([_, ticket]) => (ticket as Ticket).ticketId === checkTicketModalData.ticketId
      )?.[0];

      if (!userIdToUpdate) throw new Error("Билетът не е намерен в базата данни");

      const now = Timestamp.fromDate(new Date());
      await updateDoc(eventRef, {
        [`tickets.${userIdToUpdate}.checkedIn`]: true,
        [`tickets.${userIdToUpdate}.checkedInTime`]: now,
      });

      await fetchEvents();
      setCheckTicketModalData(prev =>
        prev
          ? { ...prev, checkedIn: true, checkedInTime: now.toDate().toLocaleString("bg-BG") }
          : null
      );

      return true;
    } catch (error) {
      console.error("❌ Грешка при check-in:", error);
      const errorMessage = error instanceof Error ? error.message : "Неизвестна грешка";
      setTicketStatusMessage(`❌ ${errorMessage}`);
      setTicketStatusType("error");
      return false;
    } finally {
      setIsCheckingTicket(false);
    }
  };

  const uncheckTicket = async () => {
    if (!checkTicketModalData) return;

    try {
      setIsCheckingTicket(true);
      setTicketStatusMessage("Отмяна на регистрация...");

      const eventRef = doc(db, "events", checkTicketModalData.eventId);
      
      const event = events.find(e => e.id === checkTicketModalData.eventId);
      let userIdToUpdate = "";
      
      if (event && event.tickets) {
        for (const [userId, ticket] of Object.entries(event.tickets)) {
          if (ticket.ticketId === checkTicketModalData.ticketId) {
            userIdToUpdate = userId;
            break;
          }
        }
      }
      
      if (!userIdToUpdate) {
        throw new Error("Не може да се намери потребител за билета");
      }

      await updateDoc(eventRef, {
        [`tickets.${userIdToUpdate}.checkedIn`]: false,
        [`tickets.${userIdToUpdate}.checkedInTime`]: null
      });

      setEvents(prevEvents => 
        prevEvents.map(event => {
          if (event.id === checkTicketModalData.eventId && event.tickets) {
            const updatedTickets = { ...event.tickets };
            if (updatedTickets[userIdToUpdate]) {
              const ticket = updatedTickets[userIdToUpdate] as Ticket;
              updatedTickets[userIdToUpdate] = { 
                ...ticket, 
                checkedIn: false,
                checkedInTime: null 
              };
            }
            return { ...event, tickets: updatedTickets };
          }
          return event;
        })
      );

      setCheckTicketModalData(prev => prev ? { 
        ...prev, 
        checkedIn: false,
        checkedInTime: undefined 
      } : null);
      
      setTicketStatusMessage("Регистрацията е отменена!");
      setTicketStatusType("success");
      
      loadTodayStats();
      
      setTimeout(() => {
        setTicketStatusMessage("");
      }, 3000);

    } catch (error) {
      console.error("Грешка при отмяна на регистрация:", error);
      setTicketStatusMessage("Възникна грешка при отмяната!");
      setTicketStatusType("error");
    } finally {
      setIsCheckingTicket(false);
    }
  };

  const openTodayStats = () => {
    setShowTodayStats(true);
    setShowCheckTicketModal(false);
    loadTodayStats();
  };

  const validateTime = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  };

  const validateTimeRange = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return true;
    return endTime > startTime;
  };

  const convertToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };

  const hasTimeOverlap = (
    slotStart: string, 
    slotEnd: string, 
    eventStart: string, 
    eventEnd: string
  ): boolean => {
    const slotStartMin = convertToMinutes(slotStart);
    const slotEndMin = convertToMinutes(slotEnd);
    const eventStartMin = convertToMinutes(eventStart);
    const eventEndMin = convertToMinutes(eventEnd);
    
    return eventStartMin < slotEndMin && eventEndMin > slotStartMin;
  };

  //-----------Book-----------------

  
  const hasBookingConflict = (
    room: string, 
    date: string, 
    startTime: string, 
    endTime: string, 
    excludeEventId?: string
  ): boolean => {
    const eventConflict = roomBookings.some(booking => {
      if (excludeEventId && booking.id === excludeEventId) return false;
      
      if (booking.room !== room || booking.date !== date) return false;
      
      const newStart = startTime;
      const newEnd = endTime;
      const existingStart = booking.time;
      const existingEnd = booking.endTime;
      
      return (
        (newStart >= existingStart && newStart < existingEnd) ||
        (newEnd > existingStart && newEnd <= existingEnd) ||
        (newStart <= existingStart && newEnd >= existingEnd)
      );
    });
    
    if (eventConflict) return true;
    
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const scheduleConflicts = scheduleBookings.filter(
        schedule => schedule.room === room && schedule.dayOfWeek === dayOfWeek
      );
      
      const hasScheduleConflict = scheduleConflicts.some(schedule => {
        const eventStart = startTime;
        const eventEnd = endTime;
        const scheduleStart = schedule.startTime;
        const scheduleEnd = schedule.endTime;
        
        return (
          (eventStart >= scheduleStart && eventStart < scheduleEnd) ||
          (eventEnd > scheduleStart && eventEnd <= scheduleEnd) ||
          (eventStart <= scheduleStart && eventEnd >= scheduleEnd)
        );
      });
      
      return hasScheduleConflict;
    }
    
    return false;
  };

  const parseScheduleText = (text: string): { dayOfWeek: number, period: number, startTime: string, endTime: string, classSchedules: ClassSchedule[] }[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
    const dayMap: { [key: string]: number } = {
      'Понеделник': 1,
      'Вторник': 2,
      'Сряда': 3,
      'Четвъртък': 4,
      'Петък': 5
    };
    
    const scheduleSlots: { dayOfWeek: number, period: number, startTime: string, endTime: string, classSchedules: ClassSchedule[] }[] = [];
    
    let currentDay: number = 0;
    let periodCounter: number = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (dayMap[line] !== undefined) {
        currentDay = dayMap[line];
        periodCounter = 1;
        continue;
      }
      
      if (currentDay > 0 && line.includes('–')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          const timeRange = parts[0];
          const [startTime, endTime] = timeRange.split('–').map(t => t.trim() + ':00');
          
          const scheduleText = parts.slice(1).join(' ');
          let classSchedules: ClassSchedule[] = [];
          
          if (scheduleText !== '—' && scheduleText.trim() !== '') {
            const classParts = scheduleText.split(',').map(part => part.trim()).filter(part => part !== '');
            
            classSchedules = classParts.map(part => {
              const classMatch = part.match(/(\d+[а-яд\.]+)$/);
              let className = '';
              let subjectTeacher = part;
              
              if (classMatch) {
                className = classMatch[1];
                subjectTeacher = part.substring(0, part.length - className.length).trim();
              }
              
              let subject = subjectTeacher;
              let teacher = '';
              
              const teacherMatch = subjectTeacher.match(/\((.+?)\)/);
              if (teacherMatch) {
                teacher = teacherMatch[1];
                subject = subjectTeacher.replace(`(${teacher})`, '').trim();
              } else {
                const nameParts = subjectTeacher.split(' ');
                if (nameParts.length > 1) {
                  const lastWord = nameParts[nameParts.length - 1];
                  if (lastWord.match(/^[А-Я][а-я]+$/)) {
                    teacher = lastWord;
                    subject = nameParts.slice(0, -1).join(' ');
                  }
                }
              }
              
              return {
                subject: subject || 'Неизвестен предмет',
                teacher,
                className: className || 'Неизвестен клас'
              };
            });
          }
          
          if (classSchedules.length > 0) {
            scheduleSlots.push({
              dayOfWeek: currentDay,
              period: periodCounter,
              startTime,
              endTime,
              classSchedules
            });
          }
          
          periodCounter++;
        }
      }
    }
    
    return scheduleSlots;
  };

  const importScheduleToFirebase = async () => {
    if (!importData.trim() || !selectedRoomForImport) {
      alert("Моля, въведете данни за графика и изберете стая!");
      return;
    }
    
    try {
      const scheduleSlots = parseScheduleText(importData);
      
      if (scheduleSlots.length === 0) {
        alert("Не можахме да разчетем графика. Проверете формата на данните!");
        return;
      }
      
      const existingSchedules = await getDocs(collection(db, "scheduleBookings"));
      const deletePromises: Promise<void>[] = [];
      
      existingSchedules.docs.forEach(doc => {
        if (doc.data().room === selectedRoomForImport) {
          deletePromises.push(deleteDoc(doc.ref));
        }
      });
      
      await Promise.all(deletePromises);
      
      const addPromises: Promise<any>[] = [];
      
      scheduleSlots.forEach(slot => {
        const scheduleBooking: Omit<ScheduleBooking, 'id'> = {
          room: selectedRoomForImport,
          dayOfWeek: slot.dayOfWeek,
          period: slot.period,
          startTime: slot.startTime,
          endTime: slot.endTime,
          classSchedules: slot.classSchedules,
          semester,
          academicYear,
          type: 'schedule'
        };
        
        addPromises.push(addDoc(collection(db, "scheduleBookings"), scheduleBooking));
      });
      
      await Promise.all(addPromises);
      alert(`Графикът за стая ${selectedRoomForImport} е импортиран успешно! Добавени са ${scheduleSlots.length} часа.`);
      setIsImportingSchedule(false);
      setImportData("");
      fetchScheduleBookings();
      
    } catch (error) {
      console.error("Грешка при импортиране:", error);
      alert("Грешка при импортиране на графика!");
    }
  };

  const isRoomBookedByEvent = (room: string, date: string, timeSlotHour: string): boolean => {
    const slotStart = timeSlotHour + ':00';
    const slotEnd = (parseInt(timeSlotHour) + 1) + ':00';
    
    return roomBookings.some(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      
      return hasTimeOverlap(slotStart, slotEnd, booking.time, booking.endTime);
    });
  };

  const getEventInfo = (room: string, date: string, timeSlotHour: string): RoomBooking | null => {
    const slotStart = timeSlotHour + ':00';
    const slotEnd = (parseInt(timeSlotHour) + 1) + ':00';
    
    const booking = roomBookings.find(booking => {
      if (booking.room !== room || booking.date !== date) return false;
      
      return hasTimeOverlap(slotStart, slotEnd, booking.time, booking.endTime);
    });
    
    return booking || null;
  };

  const isRoomBookedInSchedule = (room: string, date: string, timeSlotHour: string): boolean => {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek < 1 || dayOfWeek > 5) return false;
    
    const slotStart = timeSlotHour + ':00';
    const slotEnd = (parseInt(timeSlotHour) + 1) + ':00';
    
    return scheduleBookings.some(
      schedule => 
        schedule.room === room && 
        schedule.dayOfWeek === dayOfWeek &&
        hasTimeOverlap(slotStart, slotEnd, schedule.startTime, schedule.endTime)
    );
  };

  const getScheduleInfo = (room: string, date: string, timeSlotHour: string): ScheduleBooking | null => {
    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek < 1 || dayOfWeek > 5) return null;
    
    const slotStart = timeSlotHour + ':00';
    const slotEnd = (parseInt(timeSlotHour) + 1) + ':00';
    
    const schedule = scheduleBookings.find(
      schedule => 
        schedule.room === room && 
        schedule.dayOfWeek === dayOfWeek &&
        hasTimeOverlap(slotStart, slotEnd, schedule.startTime, schedule.endTime)
    );
    
    return schedule || null;
  };

  const getBookingInfo = (room: string, date: string, timeSlotHour: string): BookingInfo | null => {
    const eventInfo = getEventInfo(room, date, timeSlotHour);
    if (eventInfo) {
      return eventInfo;
    }
    
    const scheduleInfo = getScheduleInfo(room, date, timeSlotHour);
    if (scheduleInfo) {
      return scheduleInfo;
    }
    
    return null;
  };

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const usersData: User[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: doc.id,
        email: data.email || '',
        role: data.role || 'reader',
        events: data.events || [],
        books: data.books || [],
        createdAt: data.createdAt || null,
        displayName: data.displayName || '',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        profile: data.profile || {}
      } as User;
    });
    setUsers(usersData);
  };

  const fetchEvents = async () => {
    const snapshot = await getDocs(collection(db, "events"));
    const eventsData: Event[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Event));
    setEvents(eventsData);
    updateRoomBookings(eventsData);
  };

  const fetchBooks = async () => {
  try {
    const booksData = await bookService.fetchAllBooks();
    
    // ДЕБЪГ: Провери какво се връща
    console.log("📚 Заредени книги:", booksData.length);
    
    if (booksData.length > 0) {
      // Провери първите 3 книги
      booksData.slice(0, 3).forEach((book, index) => {
        console.log(`📖 Книга ${index + 1}:`, {
          title: book.title,
          shelfNumber: book.shelfNumber,
          callNumber: book.callNumber,
          location: book.location,
          hasShelfNumber: !!book.shelfNumber,
          hasCallNumber: !!book.callNumber
        });
      });
      
      // Провери всички рафтове
      const allShelves = booksData
        .map(b => b.shelfNumber)
        .filter(s => s && s.trim() !== '');
      console.log("🏷️ Всички рафтове:", allShelves);
      console.log("🏷️ Уникални рафтове:", [...new Set(allShelves)]);
    } else {
      console.log("⚠️ Няма заредени книги!");
    }
    
    setBooks(booksData);
  } catch (error) {
    console.error("❌ Error fetching books:", error);
  }
};

  const fetchScheduleBookings = async () => {
    const snapshot = await getDocs(collection(db, "scheduleBookings"));
    const schedulesData: ScheduleBooking[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as ScheduleBooking));
    setScheduleBookings(schedulesData);
  };

  const updateRoomBookings = (eventsData: Event[]) => {
    const bookings: RoomBooking[] = [];
    eventsData.forEach(event => {
      if (event.date && event.time && event.endTime && event.location) {
        bookings.push({
          id: event.id,
          room: event.location,
          date: event.date,
          time: event.time,
          endTime: event.endTime,
          eventId: event.id,
          eventTitle: event.title,
          type: 'event'
        });
      }
    });
    setRoomBookings(bookings);
  };

  useEffect(() => {
    fetchUsers();
    fetchEvents();
    fetchBooks();
    fetchScheduleBookings();
    fetchNews();
  }, []);

  const changeUserRole = async (userId: string, newRole: string) => {
    await updateDoc(doc(db, "users", userId), { 
      role: newRole,
      updatedAt: new Date()
    });
    fetchUsers();
  };

  const openCreateNewsModal = () => {
  setModalNewsData({
    title: "",
    excerpt: "",
    content: "",
    category: "Общи",
    image: "",
    author: "Администратор",
    tags: [],
    featured: false
  });
  setShowNewsModal(true);
};

const openEditNewsModal = (newsItem: NewsArticle) => {
  setModalNewsData({
    id: newsItem.id,
    title: newsItem.title,
    excerpt: newsItem.excerpt,
    content: newsItem.content,
    category: newsItem.category,
    image: newsItem.image,
    author: newsItem.author,
    tags: newsItem.tags || [],
    featured: newsItem.featured || false
  });
  setShowNewsModal(true);
};

const closeNewsModal = () => {
  setShowNewsModal(false);
  setModalNewsData({});
};


const handleCreateNews = async () => {
  if (!modalNewsData.title?.trim() || !modalNewsData.excerpt?.trim() || 
      !modalNewsData.content?.trim() || !modalNewsData.category?.trim() || 
      !modalNewsData.image?.trim()) {
    alert("Моля, попълнете всички задължителни полета (включително основната снимка)!");
    return;
  }
  
  try {
    // Комбинираме основната снимка с допълнителните
    const allImages = [
      modalNewsData.image, // Основната снимка винаги е първа
      ...(modalNewsData.images || []).filter(img => img.trim() !== "")
    ].filter((value, index, self) => self.indexOf(value) === index); // Премахваме дубликати

    const newsData = {
      title: modalNewsData.title,
      excerpt: modalNewsData.excerpt,
      content: modalNewsData.content,
      category: modalNewsData.category,
      image: modalNewsData.image, // Основна снимка (задължителна)
      images: allImages.length > 1 ? allImages : [], // Ако има повече от 1 снимка
      author: modalNewsData.author || "Администратор",
      date: Timestamp.now(),
      views: 0,
      likes: 0,
      tags: modalNewsData.tags || [],
      featured: modalNewsData.featured || false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await addDoc(collection(db, "news"), newsData);
    
    closeNewsModal();
    await fetchNews();
    alert("Новината е създадена успешно!");
    
  } catch (error) {
    console.error("Грешка при създаване на новина:", error);
    alert("Грешка при създаване на новина!");
  }
};

const handleUpdateNews = async () => {
  if (!modalNewsData.id) return;
  
  if (!modalNewsData.title?.trim() || !modalNewsData.excerpt?.trim() || 
      !modalNewsData.content?.trim() || !modalNewsData.category?.trim() || 
      !modalNewsData.image?.trim()) {
    alert("Моля, попълнете всички задължителни полета!");
    return;
  }

  try {
    // Комбинираме снимките
    const allImages = [
      modalNewsData.image,
      ...(modalNewsData.images || []).filter(img => img.trim() !== "")
    ].filter((value, index, self) => self.indexOf(value) === index);

    await updateDoc(doc(db, "news", modalNewsData.id), {
      title: modalNewsData.title,
      excerpt: modalNewsData.excerpt,
      content: modalNewsData.content,
      category: modalNewsData.category,
      image: modalNewsData.image,
      images: allImages.length > 1 ? allImages : [],
      author: modalNewsData.author || "Администратор",
      tags: modalNewsData.tags || [],
      featured: modalNewsData.featured || false,
      updatedAt: Timestamp.now()
    });
    
    closeNewsModal();
    await fetchNews();
    alert("Новината е обновена успешно!");
    
  } catch (error) {
    console.error("Грешка при обновяване на новина:", error);
    alert("Грешка при обновяване на новина!");
  }
};
console.log(handleCreateNews,handleUpdateNews);

const deleteNews = async (newsId: string) => {
  if (!window.confirm("Сигурни ли сте, че искате да изтриете новината?")) return;
  
  try {
    await deleteDoc(doc(db, "news", newsId));
    await fetchNews();
    alert("Новината е изтрита успешно!");
  } catch (error) {
    console.error("Error deleting news:", error);
    alert("Грешка при изтриване на новина!");
  }
};

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете потребителя?")) return;
    await deleteDoc(doc(db, "users", userId));
    fetchUsers();
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете събитието?")) return;
    await deleteDoc(doc(db, "events", eventId));
    fetchEvents();
  };

  const deleteBook = async (bookId: string) => {
  if (!window.confirm("Сигурни ли сте, че искате да изтриете книгата?")) return;
  
  try {
    await bookService.deleteBook(bookId);
    await fetchBooks(); // Презареди книгите след изтриване
    alert("Книгата е изтрита успешно!");
  } catch (error) {
    console.error("Error deleting book:", error);
    alert("Грешка при изтриване на книга!");
  }
};

  const startAddingEventFromCell = (room: string, timeSlot: string) => {
    const [slotStart] = timeSlot.split('-');
    const startHour = parseInt(slotStart);
    
    setCellEventStartTime(`${slotStart}:00`);
    setCellEventEndTime(`${(startHour + 1).toString().padStart(2, '0')}:00`);
    
    setAddingEventFromCell({
      room,
      timeSlot
    });
  };

  const createEventFromCell = async () => {
    if (!addingEventFromCell || !cellEventTitle.trim() || !selectedDate || !cellEventStartTime || !cellEventEndTime) return;
    
    if (!validateTime(cellEventStartTime) || !validateTime(cellEventEndTime)) {
      alert("Моля, въведете валиден час във формат HH:MM (например 14:30)");
      return;
    }

    if (!validateTimeRange(cellEventStartTime, cellEventEndTime)) {
      alert("Крайният час трябва да е след началния час!");
      return;
    }
    
    if (hasBookingConflict(addingEventFromCell.room, selectedDate, cellEventStartTime, cellEventEndTime)) {
      alert("Стаята е вече резервирана за избрания времеви интервал! Моля, изберете друго време или място.");
      return;
    }
    
    const eventData = {
      title: cellEventTitle,
      description: cellEventDesc,
      date: selectedDate,
      time: cellEventStartTime,
      endTime: cellEventEndTime,
      location: addingEventFromCell.room,
      maxParticipants: cellEventMaxParticipants,
      currentParticipants: 0,
      allowedRoles: ["reader", "librarian"],
      organizer: cellEventOrganizer,
      imageUrl: cellEventImageUrl, 
      createdAt: new Date(),
      registrations: []
    };

    await addDoc(collection(db, "events"), eventData);
    
    setCellEventTitle("");
    setCellEventDesc("");
    setCellEventStartTime("");
    setCellEventEndTime("");
    setCellEventMaxParticipants(20);
    setCellEventOrganizer("");
    setCellEventImageUrl(""); 
    setAddingEventFromCell(null);
    
    fetchEvents();
  };

  const deleteBookingFromCell = async (booking: BookingInfo) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете тази резервация?")) return;
    
    try {
      if (booking.type === 'event') {
        await deleteDoc(doc(db, "events", booking.eventId));
        fetchEvents();
      } else if (booking.type === 'schedule') {
        await deleteDoc(doc(db, "scheduleBookings", booking.id));
        fetchScheduleBookings();
      }
      
      setEditingCell(null);
      alert("Резервацията е изтрита успешно!");
    } catch (error) {
      console.error("Грешка при изтриване:", error);
      alert("Грешка при изтриване на резервацията!");
    }
  };

  const startEditingCell = (room: string, timeSlot: string) => {
    const [slotStart] = timeSlot.split('-');
    const bookingInfo = getBookingInfo(room, selectedDate, slotStart);
    
    if (bookingInfo) {
      setEditingCell({
        room,
        timeSlot,
        booking: bookingInfo
      });
    } else {
      startAddingEventFromCell(room, timeSlot);
    }
  };

  const openCreateEventModal = () => {
    setModalMode('create');
    setModalEventData({
      title: "",
      description: "",
      date: "",
      time: "",
      endTime: "",
      location: "",
      maxParticipants: 20,
      organizer: "",
      allowedRoles: ["reader", "librarian"],
      imageUrl: ""
    });
    setShowEventModal(true);
  };

  const openEditEventModal = (event: Event) => {
    setModalMode('edit');
    setModalEventData({
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      endTime: event.endTime,
      location: event.location,
      maxParticipants: event.maxParticipants,
      organizer: event.organizer,
      allowedRoles: event.allowedRoles,
      currentParticipants: event.currentParticipants,
      imageUrl: event.imageUrl || ""
    });
    setShowEventModal(true);
  };

  const openCreateBookModal = () => {
  setModalBookData({
    // Основни полета
    title: "",
    author: "",
    isbn: "",
    publisher: "",
    year: new Date().getFullYear(),
    category: "",
    genres: [], // ЗАМЕНЯ subcategory
    tags: [],
    description: "",
    copies: 1,
    location: "Библиотека",
    coverUrl: "",
    
    // Допълнителни полета
    language: "Български",
    edition: "Първо издание",
    coverType: "soft",
    shelfNumber: "",
    callNumber: "",
    condition: "good",
    ageRecommendation: "",
    featured: false,
    pages: 0,
    availableCopies: 1,
    status: "available", 
    rating: 0,
    ratingsCount: 0,
    views: 0,
    borrowPeriod: 14,
    maxRenewals: 2,
    reservationQueue: 0,
    waitingList: [],
    summary: "",
    tableOfContents: [],
    relatedBooks: [],
    awards: [],
    digitalVersion: {
      available: false,
      format: "",
      url: ""
    },
    isActive: true,
    underMaintenance: false
  });
  setShowBookModal(true);
};

  const openEditBookModal = (book: BookLibrary) => {
  setModalBookData({
    // Основни полета
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    publisher: book.publisher || "",
    year: book.year || new Date().getFullYear(),
    category: book.category,
    genres: book.genres || [], // ЗАМЕНЯ subcategory
    tags: book.tags || [],
    description: book.description || "",
    copies: book.copies || 1,
    availableCopies: book.availableCopies !== undefined ? book.availableCopies : (book.copies || 1),
    location: book.location || "Библиотека",
    coverUrl: book.coverUrl || "",
    
    // Допълнителни полета
    language: book.language || 'Български',
    edition: book.edition || 'Първо издание',
    coverType: book.coverType || 'soft',
    shelfNumber: book.shelfNumber || '',
    callNumber: book.callNumber || '',
    condition: book.condition || 'good',
    ageRecommendation: book.ageRecommendation || '',
    featured: book.featured || false,
    pages: book.pages || 0,
    
    // Заемане
    borrowPeriod: book.borrowPeriod || 14,
    maxRenewals: book.maxRenewals || 2,
    
    // Статус и системни полета
    status: book.status || 'available',
    rating: book.rating || 0,
    ratingsCount: book.ratingsCount || 0,
    views: book.views || 0,
    isActive: book.isActive !== false,
    underMaintenance: book.underMaintenance || false
  });
  setShowBookModal(true);
};
  const closeEventModal = () => {
    setShowEventModal(false);
    setModalEventData({});
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setModalBookData({});
  };

  const handleModalInputChange = (field: keyof Event, value: any) => {
    setModalEventData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateEvent = async () => {
    if (!modalEventData.title?.trim() || !modalEventData.date || 
        !modalEventData.time || !modalEventData.endTime || !modalEventData.location) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }
    
    if (!validateTime(modalEventData.time) || !validateTime(modalEventData.endTime)) {
      alert("Моля, въведете валиден час във формат HH:MM (например 14:30)");
      return;
    }

    if (!validateTimeRange(modalEventData.time, modalEventData.endTime)) {
      alert("Крайният час трябва да е след началния час!");
      return;
    }
    
    if (hasBookingConflict(
      modalEventData.location, 
      modalEventData.date, 
      modalEventData.time, 
      modalEventData.endTime
    )) {
      alert("Стаята е вече резервирана за избрания времеви интервал! Моля, изберете друго време или място.");
      return;
    }
    
    try {
      const eventData = {
        title: modalEventData.title,
        description: modalEventData.description || "",
        date: modalEventData.date,
        time: modalEventData.time,
        endTime: modalEventData.endTime,
        location: modalEventData.location,
        maxParticipants: modalEventData.maxParticipants || 20,
        currentParticipants: 0,
        allowedRoles: modalEventData.allowedRoles || ["reader", "librarian"],
        organizer: modalEventData.organizer || "",
        imageUrl: modalEventData.imageUrl || "",
        createdAt: new Date(),
        registrations: []
      };

      await addDoc(collection(db, "events"), eventData);
      
      closeEventModal();
      fetchEvents();
      alert("Събитието е създадено успешно!");
      
    } catch (error) {
      console.error("Грешка при създаване на събитие:", error);
      alert("Грешка при създаване на събитие!");
    }
  };

  const handleUpdateEvent = async () => {
    if (!modalEventData.id) return;
    
    if (!modalEventData.title?.trim() || !modalEventData.date || 
        !modalEventData.time || !modalEventData.endTime || !modalEventData.location) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }
    
    if (!validateTime(modalEventData.time) || !validateTime(modalEventData.endTime)) {
      alert("Моля, въведете валиден час във формат HH:MM (например 14:30)");
      return;
    }

    if (!validateTimeRange(modalEventData.time, modalEventData.endTime)) {
      alert("Крайният час трябва да е след началния час!");
      return;
    }

    if (modalEventData.maxParticipants && modalEventData.currentParticipants && 
        modalEventData.maxParticipants < modalEventData.currentParticipants) {
      alert("Не можете да зададете по-малко места от текущо записаните участници!");
      return;
    }

    if (hasBookingConflict(
      modalEventData.location, 
      modalEventData.date, 
      modalEventData.time, 
      modalEventData.endTime, 
      modalEventData.id
    )) {
      alert("Стаята е вече резервирана за избрания времеви интервал! Моля, изберете друго време или място.");
      return;
    }

    try {
      await updateDoc(doc(db, "events", modalEventData.id), {
        title: modalEventData.title,
        description: modalEventData.description || "",
        date: modalEventData.date,
        time: modalEventData.time,
        endTime: modalEventData.endTime,
        location: modalEventData.location,
        maxParticipants: modalEventData.maxParticipants || 20,
        organizer: modalEventData.organizer || "",
        allowedRoles: modalEventData.allowedRoles || ["reader", "librarian"],
        imageUrl: modalEventData.imageUrl || "",
        updatedAt: new Date()
      });
      
      closeEventModal();
      fetchEvents();
      alert("Събитието е обновено успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на събитие:", error);
      alert("Грешка при обновяване на събитие!");
    }
  };

  const handleCreateBook = async () => {
  if (!modalBookData.title?.trim() || !modalBookData.author?.trim() || 
      !modalBookData.isbn?.trim() || !modalBookData.category?.trim()) {
    alert("Моля, попълнете всички задължителни полета!");
    return;
  }
  
  try {
    const bookInput = {
      title: modalBookData.title || "",
      author: modalBookData.author || "",
      isbn: modalBookData.isbn || "",
      category: modalBookData.category || "",
      copies: modalBookData.copies || 1,
      availableCopies: modalBookData.availableCopies || modalBookData.copies || 1,
      publisher: modalBookData.publisher || "",
      year: modalBookData.year || new Date().getFullYear(),
      description: modalBookData.description || "",
      location: modalBookData.location || "Библиотека",
      coverUrl: modalBookData.coverUrl || "",
      
      // ДОБАВИ ТЕЗИ ПОЛЕТА:
      shelfNumber: modalBookData.shelfNumber || "",
      callNumber: modalBookData.callNumber || "",
      genres: modalBookData.genres || [],
      tags: modalBookData.tags || [],
      pages: modalBookData.pages || 0,
      language: modalBookData.language || "Български",
      edition: modalBookData.edition || "Първо издание",
      coverType: modalBookData.coverType || "soft",
      condition: modalBookData.condition || "good",
      ageRecommendation: modalBookData.ageRecommendation || "",
      featured: modalBookData.featured || false,
      isActive: modalBookData.isActive !== false,
      underMaintenance: modalBookData.underMaintenance || false,
      borrowPeriod: modalBookData.borrowPeriod || 14,
      maxRenewals: modalBookData.maxRenewals || 2,
      summary: modalBookData.summary || "",
      tableOfContents: modalBookData.tableOfContents || [],
      relatedBooks: modalBookData.relatedBooks || [],
      awards: modalBookData.awards || [],
      digitalVersion: modalBookData.digitalVersion || {
        available: false,
        format: "",
        url: ""
      }
    };

    await bookService.createBook(bookInput);
    
    closeBookModal();
    await fetchBooks();
    alert("Книгата е добавена успешно!");
    
  } catch (error) {
    console.error("Грешка при добавяне на книга:", error);
    alert("Грешка при добавяне на книга!");
  }
};
  const handleUpdateBook = async () => {
  if (!modalBookData.id) return;
  
  if (!modalBookData.title?.trim() || !modalBookData.author?.trim() || 
      !modalBookData.isbn?.trim() || !modalBookData.category?.trim()) {
    alert("Моля, попълнете всички задължителни полета!");
    return;
  }

  try {
    // Подготовка на данните за обновяване
    const bookUpdateInput = {
      title: modalBookData.title,
      author: modalBookData.author,
      isbn: modalBookData.isbn,
      category: modalBookData.category,
      copies: modalBookData.copies,
      publisher: modalBookData.publisher,
      year: modalBookData.year,
      description: modalBookData.description,
      location: modalBookData.location,
      coverUrl: modalBookData.coverUrl,
      genres: modalBookData.genres,
      tags: modalBookData.tags,
      pages: modalBookData.pages,
      language: modalBookData.language,
      edition: modalBookData.edition,
      coverType: modalBookData.coverType,
      condition: modalBookData.condition,
      ageRecommendation: modalBookData.ageRecommendation,
      featured: modalBookData.featured,
      isActive: modalBookData.isActive,
      underMaintenance: modalBookData.underMaintenance,
      borrowPeriod: modalBookData.borrowPeriod,
      maxRenewals: modalBookData.maxRenewals,
      summary: modalBookData.summary,
      tableOfContents: modalBookData.tableOfContents,
      relatedBooks: modalBookData.relatedBooks,
      awards: modalBookData.awards,
      digitalVersion: modalBookData.digitalVersion
    };

    await bookService.updateBook(modalBookData.id, bookUpdateInput);
    
    closeBookModal();
    await fetchBooks(); // Презареди книгите след обновяване
    alert("Книгата е обновена успешно!");
    
  } catch (error) {
    console.error("Грешка при обновяване на книга:", error);
    alert("Грешка при обновяване на книга!");
  }
};

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName && user.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.lastName && user.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBooks = books.filter(book =>
  book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
  book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
  book.isbn.toLowerCase().includes(searchTerm.toLowerCase()) ||
  book.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (book.genres && book.genres.some(genre => 
    genre.toLowerCase().includes(searchTerm.toLowerCase())
  )) ||
  (book.tags && book.tags.some(tag => 
    tag.toLowerCase().includes(searchTerm.toLowerCase())
  ))
);

  const getAvailableSpots = (event: Event) => {
    return event.maxParticipants - event.currentParticipants;
  };

  const isEventFull = (event: Event) => {
    return event.currentParticipants >= event.maxParticipants;
  };

  const getUserDisplayName = (user: User) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.email.split('@')[0];
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="events-header"> 
          <div className="events-title-section">
            <div className="title-icon-wrapper">
              <Shield className="events-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Административен Панел</h1> 
              <p className="events-subtitle">
                Управление на потребители, събития, книги и проверка на билети
              </p>
            </div>
          </div>
        </div>

        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсене по имейл, роля, заглавие, автор..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="tabs-section">
  <button
    className={`tab-button ${activeTab === "users" ? "active" : ""}`}
    onClick={() => setActiveTab("users")}
  >
    <Users size={18} />
    Потребители ({users.length})
  </button>

  <button
    className={`tab-button ${activeTab === "events" ? "active" : ""}`}
    onClick={() => setActiveTab("events")}
  >
    <Calendar size={18} />
    Събития ({events.length})
  </button>

  <button
    className={`tab-button ${activeTab === "books" ? "active" : ""}`}
    onClick={() => setActiveTab("books")}
  >
    <BookOpen size={18} />
    Книги ({books.length})
  </button>

  <button
    className={`tab-button ${activeTab === "reservations" ? "active" : ""}`}
    onClick={() => setActiveTab("reservations")}
  >
    <Bookmark size={18} />
    Резервирани книги ({})
  </button>

  <button
  className={`tab-button ${activeTab === "news" ? "active" : ""}`}
  onClick={() => setActiveTab("news")}
>
  <Newspaper size={18} />
  Новини ({news.length})
</button>
  <button
    className={`tab-button ${activeTab === "rooms" ? "active" : ""}`}
    onClick={() => setActiveTab("rooms")}
  >
    <Building size={18} />
    Стаи ({locationOptions.length})
  </button>
          <button 
            className={`tab-button ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("tickets");
              setShowQrScanner(false);
              setShowCheckTicketModal(false);
              setShowTodayStats(false);
            }}
          >
            <QrCode size={18} />
            Проверка на билети
          </button>
        </div>

        {showQrScanner && (
          <div className="modal-overlay">
            <div className="modal-content qr-scanner-modal">
              <div className="modal-header">
                <h3>Сканирайте QR кода на билета</h3>
                <button 
                  onClick={closeQrScanner}
                  className="close-btn"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body">
                {cameraError ? (
                  <div className="camera-error">
                    <CameraOff size={48} />
                    <p>{cameraError}</p>
                    <p className="camera-help">
                      Моля, разрешете достъп до камерата в настройките на браузъра
                    </p>
                    <button 
                      onClick={openQrScanner}
                      className="secondary-btn retry-btn"
                    >
                      Опитай отново
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="qr-scanner-container">
                      <Scanner
                        onScan={handleQrScan}
                        onError={handleQrError}
                        scanDelay={300}
                        constraints={{ facingMode: "environment" }}
                        styles={{ container: { width: '100%' } }}
                      />
                      <div className="qr-overlay">
                        <div className="qr-frame"></div>
                        <div className="qr-instructions">
                          Насочете камерата към QR кода на билета
                        </div>
                      </div>
                    </div>
                    
                    <div className="qr-scanner-info">
                      <div className="info-tip">
                        <strong>Съвети:</strong>
                        <ul>
                          <li>Уверете се, че QR кода е добре осветен</li>
                          <li>Дръжте телефона неподвижно</li>
                          <li>Билетът ще се сканира автоматично</li>
                        </ul>
                      </div>
                      
                      <div className="manual-entry-option">
                        <p>Или въведете номера ръчно:</p>
                        <div className="manual-input-group">
                          <input
                            type="text"
                            value={ticketSearchTerm}
                            onChange={(e) => setTicketSearchTerm(e.target.value.toUpperCase())}
                            placeholder="TICKET-XXXX"
                            className="search-input small-input"
                          />
                          <button
                            onClick={async () => {
                              const found = await searchTicket();
                              if (found) {
                                setShowQrScanner(false);
                                setTimeout(() => setTicketStatusMessage(""), 3000);
                              }
                            }}
                            disabled={!ticketSearchTerm.trim()}
                            className="primary-btn small-btn"
                          >
                            Търси
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

       {showNewsModal && (
  <div className="modal-overlay">
    <div className="modal-content large-modal">
      <div className="modal-header">
        <h3>
          {modalNewsData.id ? 'Редактиране на новина' : 'Създаване на статия'}
        </h3>
        <button onClick={closeNewsModal} className="close-btn">
          <X size={20} />
        </button>
      </div>
      
      <div className="modal-body event-modal-body">
        <div className="event-modal-grid">
          {/* ЗАГЛАВИЕ (задължително) */}
          <div className="modal-form-group full-width">
            <label className="required">Заглавие *</label>
            <input
              type="text"
              placeholder="Заглавие на новината"
              value={modalNewsData.title || ""}
              onChange={(e) => setModalNewsData({...modalNewsData, title: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          {/* КРАТКА ИЗВАДКА (задължителна) */}
          <div className="modal-form-group full-width">
            <label className="required">Кратко описание *</label>
            <textarea
              placeholder="Кратко описание/извадка, която ще се показва в списъка с новини"
              value={modalNewsData.excerpt || ""}
              onChange={(e) => setModalNewsData({...modalNewsData, excerpt: e.target.value})}
              className="modal-form-input"
              rows={3}
            />
            <small className="help-text">
              Кратък текст, който се показва в списъка с новини (макс. 200 символа)
            </small>
          </div>
          
          {/* ПЪЛНО СЪДЪРЖАНИЕ (задължително) */}
          <div className="modal-form-group full-width">
            <label className="required">Съдържание *</label>
            <textarea
              placeholder="Пълното съдържание на новината..."
              value={modalNewsData.content || ""}
              onChange={(e) => setModalNewsData({...modalNewsData, content: e.target.value})}
              className="modal-form-input"
              rows={8}
            />
            <small className="help-text">
              Поддържа HTML форматиране. Можете да добавяте <strong>&lt;strong&gt;</strong>, <em>&lt;em&gt;</em>, <br/>&lt;br/&gt; и др.
            </small>
          </div>
          
          {/* КАТЕГОРИЯ (задължителна) */}
          <div className="modal-form-group">
            <label className="required">Категория *</label>
            <select
              value={modalNewsData.category || "Общи"}
              onChange={(e) => setModalNewsData({...modalNewsData, category: e.target.value})}
              className="modal-form-input"
            >
              <option value="Общи">Общи</option>
              <option value="Събития">Събития</option>
              <option value="Актуално">Актуално</option>
              <option value="Образование">Образование</option>
              <option value="Библиотека">Библиотека</option>
              <option value="Други">Други</option>
            </select>
          </div>
          
          {/* ТАГОВЕ */}
          <div className="modal-form-group">
            <label>Тагове (разделени със запетая)</label>
            <input
              type="text"
              placeholder="новина, събитие, библиотека, актуално"
              value={modalNewsData.tags ? modalNewsData.tags.join(', ') : ""}
              onChange={(e) => {
                const tagsArray = e.target.value
                  .split(',')
                  .map(tag => tag.trim())
                  .filter(tag => tag.length > 0);
                setModalNewsData({
                  ...modalNewsData, 
                  tags: tagsArray
                });
              }}
              className="modal-form-input"
            />
            <small className="help-text">
              Таговете помагат за по-доброто търсене и категоризиране
            </small>
          </div>
          
          {/* АВТОР */}
          <div className="modal-form-group">
            <label>Автор</label>
            <input
              type="text"
              placeholder="Име на автора"
              value={modalNewsData.author || "Администратор"}
              onChange={(e) => setModalNewsData({...modalNewsData, author: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          {/* ФИЧЪРД/ПРЕПОРЪЧАНО - ПОПРАВЕНО */}
          <div className="modal-form-group">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="featured"
                checked={modalNewsData.featured || false}
                onChange={(e) => setModalNewsData({...modalNewsData, featured: e.target.checked})}
                className="checkbox-input"
              />
              <label htmlFor="featured" className="checkbox-label">
                Препоръчана новина
              </label>
            </div>
            <small className="help-text">
              Препоръчаните новини се показват най-отгоре в списъка
            </small>
          </div>
          
          {/* ОСНОВНА СНИМКА (задължителна) */}
          <div className="modal-form-group full-width">
            <label className="required">Основна снимка (за списъка) *</label>
            <input
              type="url"
              placeholder="https://example.com/main-image.jpg"
              value={modalNewsData.image || ""}
              onChange={(e) => setModalNewsData({...modalNewsData, image: e.target.value})}
              className="modal-form-input"
            />
            <small className="help-text">
              Тази снимка ще се показва в списъка с новини и в началото на новината
            </small>
            {modalNewsData.image && (
              <div className="image-preview">
                <p>Преглед на основната снимка:</p>
                <img 
                  src={modalNewsData.image} 
                  alt="Основна снимка" 
                  className="preview-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const errorMsg = document.createElement('p');
                      errorMsg.className = 'image-error';
                      errorMsg.textContent = 'Невалиден линк или картинката не може да се зареди';
                      parent.appendChild(errorMsg);
                    }
                  }}
                />
              </div>
            )}
          </div>
          
          {/* ДОПЪЛНИТЕЛНИ СНИМКИ (по избор) - ПОПРАВЕНО */}
          <div className="modal-form-group full-width">
            <label>Допълнителни снимки за галерия</label>
            <div className="images-container">
              {(modalNewsData.images && modalNewsData.images.length > 0 ? modalNewsData.images : []).map((imageUrl, index) => (
                <div key={index} className="image-input-row">
                  <input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl || ""}
                    onChange={(e) => {
                      const newImages = [...(modalNewsData.images || [])];
                      newImages[index] = e.target.value;
                      setModalNewsData({...modalNewsData, images: newImages});
                    }}
                    className="modal-form-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = [...(modalNewsData.images || [])];
                      newImages.splice(index, 1);
                      setModalNewsData({...modalNewsData, images: newImages});
                    }}
                    className="remove-image-btn"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setModalNewsData({
                    ...modalNewsData,
                    images: [...(modalNewsData.images || []), ""]
                  });
                }}
                className="add-image-btn"
              >
                <Plus size={16} />
                <span>Добави още снимка</span>
              </button>
            </div>
            <small className="help-text">
              Можете да добавите допълнителни снимки, които ще се показват в галерията на новината.
              Основната снимка автоматично се добавя и в галерията.
            </small>
          </div>
        </div>
        
        {/* БУТОНИ ЗА ДЕЙСТВИЕ */}
        <div className="modal-actions">
          <button 
            onClick={modalNewsData.id ? handleUpdateNews : handleCreateNews}
            disabled={!modalNewsData.title?.trim() || !modalNewsData.excerpt?.trim() || 
                     !modalNewsData.content?.trim() || !modalNewsData.category?.trim() || 
                     !modalNewsData.image?.trim()}
            className="primary-btn modal-save-btn"
          >
            <Save size={16} />
            {modalNewsData.id ? 'Запази Промените' : 'Създай Новина'}
          </button>
          
          <button 
            onClick={closeNewsModal}
            className="secondary-btn"
          >
            Отказ
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {showCheckTicketModal && !showQrScanner && !showTodayStats && (
          <div className="modal-overlay">
            <div className="modal-content ticket-check-modal">
              <div className="modal-header">
                <h3>Проверка на билети</h3>
                <div className="modal-header-actions">
                  <button
                    onClick={openTodayStats}
                    className="stats-btn primary-btn"
                  >
                    <BarChart3 size={18} />
                    Статистика за днес
                  </button>
                  <button 
                    onClick={() => setShowCheckTicketModal(false)}
                    className="close-btn"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="modal-body">
                <div className="ticket-search-section">
                  <div className="search-box">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Въведете номер на билет (TICKET-XXXX) или сканирайте QR код..."
                      value={ticketSearchTerm}
                      onChange={(e) => setTicketSearchTerm(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && searchTicket()}
                      className="search-input"
                      disabled={isCheckingTicket}
                    />
                  </div>
                  
                  <div className="ticket-search-buttons">
                    <button
                      onClick={() => searchTicket()}
                      disabled={isCheckingTicket || !ticketSearchTerm.trim()}
                      className="primary-btn search-ticket-btn"
                    >
                      {isCheckingTicket ? 'Търсене...' : 'Търси билет'}
                    </button>
                    
                    <button
                      onClick={openQrScanner}
                      className="primary-btn qr-scanner-btn"
                      title="Сканирай QR код"
                    >
                      <QrCode size={18} />
                      Сканирай QR
                    </button>
                  </div>
                </div>

                {ticketStatusMessage && (
                  <div className={`ticket-status-message ${ticketStatusType}`}>
                    {ticketStatusType === 'success' && <Check size={16} />}
                    {ticketStatusType === 'error' && <XCircle size={16} />}
                    {ticketStatusMessage}
                  </div>
                )}

                {checkTicketModalData && (
                  <div className="ticket-details">
                    <div className="ticket-details-header">
                      <h4>Детайли за билета</h4>
                      <div className={`ticket-status-badge ${checkTicketModalData.checkedIn ? 'checked' : 'pending'}`}>
                        {checkTicketModalData.checkedIn ? 'Регистриран' : 'Чака регистрация'}
                      </div>
                    </div>
                    
                    <div className="ticket-info-grid">
                      <div className="ticket-info-item">
                        <strong>Номер на билет:</strong>
                        <span className="ticket-id">{checkTicketModalData.ticketId}</span>
                      </div>
                      
                      <div className="ticket-info-item">
                        <strong>Събитие:</strong>
                        <span>{checkTicketModalData.eventTitle}</span>
                      </div>
                      
                      <div className="ticket-info-item">
                        <strong>Дата и час:</strong>
                        <span>{checkTicketModalData.eventDate} | {checkTicketModalData.eventTime}</span>
                      </div>
                      
                      <div className="ticket-info-item">
                        <strong>Потребител:</strong>
                        <span>{checkTicketModalData.userName}</span>
                      </div>
                      
                      <div className="ticket-info-item">
                        <strong>Имейл:</strong>
                        <span>{checkTicketModalData.userEmail}</span>
                      </div>
                      
                      <div className="ticket-info-item">
                        <strong>Дата на регистрация:</strong>
                        <span>{checkTicketModalData.registrationDate}</span>
                      </div>
                      
                      {checkTicketModalData.checkedInTime && (
                        <div className="ticket-info-item">
                          <strong>Регистриран на:</strong>
                          <span>{checkTicketModalData.checkedInTime}</span>
                        </div>
                      )}
                      
                      <div className="ticket-info-item">
                        <strong>Статус:</strong>
                        <span className={`status-text ${checkTicketModalData.checkedIn ? 'checked' : 'pending'}`}>
                          {checkTicketModalData.checkedIn ? '✅ Вече регистриран' : '⏳ Чака регистрация'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ticket-actions">
                      {!checkTicketModalData.checkedIn ? (
                        <button
                          onClick={checkInTicket}
                          disabled={isCheckingTicket}
                          className="primary-btn check-in-btn"
                        >
                          <Check size={16} />
                          Регистрирай посетител
                        </button>
                      ) : (
                        <button
                          onClick={uncheckTicket}
                          disabled={isCheckingTicket}
                          className="secondary-btn uncheck-btn"
                        >
                          <XCircle size={16} />
                          Отмени регистрация
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="ticket-help-section">
                  <div className="help-item">
                    <strong>Инструкции:</strong>
                    <ul>
                      <li>Въведете номера на билета в полето по-горе (напр. TICKET-123ABC)</li>
                      <li>Или сканирайте QR кода от билета на посетителя</li>
                      <li>След като намерите билета, може да го регистрирате като натиснете бутона "Регистрирай посетител"</li>
                      <li>При необходимост можете да отмените регистрацията</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTodayStats && !showQrScanner && (
          <div className="modal-overlay">
            <div className="modal-content ticket-check-modal">
              <div className="modal-header">
                <h3>Статистика за днес ({new Date().toLocaleDateString('bg-BG')})</h3>
                <div className="modal-header-actions">
                  <button 
                    onClick={() => {
                      setShowTodayStats(false);
                      setShowCheckTicketModal(true);
                    }}
                    className="primary-btn option-btn"
                  >
                    Назад към проверка
                  </button>
                  <button 
                    onClick={() => setShowTodayStats(false)}
                    className="close-btn"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="modal-body">
                <div className="today-stats-overview">
                  <h4>Преглед на билетите</h4>
                  <div className="stats-cards">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <BarChart3 size={24} />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{todayStats.totalTickets}</div>
                        <div className="stat-label">Общо билети</div>
                      </div>
                    </div>
                    <div className="stat-card success">
                      <div className="stat-icon">
                        <Check size={24} />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{todayStats.checkedInTickets}</div>
                        <div className="stat-label">Регистрирани</div>
                      </div>
                    </div>
                    <div className="stat-card warning">
                      <div className="stat-icon">
                        <Clock size={24} />
                      </div>
                      <div className="stat-info">
                        <div className="stat-value">{todayStats.pendingTickets}</div>
                        <div className="stat-label">Чакащи</div>
                      </div>
                    </div>
                  </div>
                </div>

                {todayStats.todayScannedTickets.length > 0 ? (
                  <div className="scanned-tickets-section">
                    <h4>Всички билети ({todayStats.todayScannedTickets.length})</h4>
                    <div className="scanned-tickets-list">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Билет №</th>
                            <th>Събитие</th>
                            <th>Потребител</th>
                            <th>Имейл</th>
                            <th>Статус</th>
                            <th>Информация</th>
                          </tr>
                        </thead>
                        <tbody>
                          {todayStats.todayScannedTickets.map((ticket, index) => (
                            <tr key={index}>
                              <td className="ticket-id-cell">
                                <span className="ticket-id-small">{ticket.ticketId}</span>
                              </td>
                              <td>
                                <div className="event-info">
                                  <div className="event-title">{ticket.eventTitle}</div>
                                  <div className="event-time">{ticket.eventDate} {ticket.eventTime}</div>
                                </div>
                              </td>
                              <td>{ticket.userName}</td>
                              <td>{ticket.userEmail}</td>
                              <td>
                                <span className={`status-badge ${ticket.status}`}>
                                  {ticket.status === 'checked' ? 'Регистриран' : 'Очаква сканиране'}
                                </span>
                              </td>
                              <td>
                                {ticket.scanTime}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="no-scanned-tickets">
                    <div className="empty-state">
                      <QrCode size={48} />
                      <p>Няма налични билети</p>
                      <p className="help-text">Все още няма билети за сканиране</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showEventModal && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h3>
                  {modalMode === 'create' ? 'Създаване на ново събитие' : 'Редактиране на събитие'}
                </h3>
                <button 
                  onClick={closeEventModal}
                  className="close-btn"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="modal-body event-modal-body">
                <div className="event-modal-grid">
                  <div className="modal-form-group">
                    <label className="required">Заглавие на събитието</label>
                    <input
                      type="text"
                      placeholder="Напр. Среща с писател"
                      value={modalEventData.title || ""}
                      onChange={(e) => handleModalInputChange('title', e.target.value)}
                      className="modal-form-input"
                    />
                  </div>
                  
                  <div className="modal-form-group">
                    <label>Описание (поддържа форматиране)</label>
                    <div className="editor-container">
                      <EditorToolbar editor={editor} />
                      <div className="editor-content">
                        <EditorContent editor={editor} />
                      </div>
                      <div className="formatting-tips">
                        <Type size={14} />
                        <span>Можете да форматирате текста: <strong>удебеляване</strong>, <em>курсив</em>, заглавия и списъци.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="modal-form-group">
                    <label className="required">Дата</label>
                    <input
                      type="date"
                      value={modalEventData.date || ""}
                      onChange={(e) => handleModalInputChange('date', e.target.value)}
                      className="modal-form-input"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="time-range-group">
                    <div className="modal-form-group">
                      <label className="required">Начален час</label>
                      <select
                        value={modalEventData.time || ""}
                        onChange={(e) => handleModalInputChange('time', e.target.value)}
                        className="modal-form-input"
                      >
                        <option value="">Изберете начален час</option>
                        {timeOptionsWithMinutes.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="modal-form-group">
                      <label className="required">Краен час</label>
                      <select
                        value={modalEventData.endTime || ""}
                        onChange={(e) => handleModalInputChange('endTime', e.target.value)}
                        className="modal-form-input"
                      >
                        <option value="">Изберете краен час</option>
                        {timeOptionsWithMinutes.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {modalEventData.time && modalEventData.endTime && 
                   !validateTimeRange(modalEventData.time, modalEventData.endTime) && (
                    <div className="validation-error">
                      Крайният час трябва да е след началния час!
                    </div>
                  )}
                  
                  <div className="modal-form-group">
                    <label className="required">Място</label>
                    <select
                      value={modalEventData.location || ""}
                      onChange={(e) => handleModalInputChange('location', e.target.value)}
                      className={`modal-form-input ${
                        modalEventData.location && modalEventData.date && 
                        modalEventData.time && modalEventData.endTime && 
                        hasBookingConflict(
                          modalEventData.location, 
                          modalEventData.date, 
                          modalEventData.time, 
                          modalEventData.endTime,
                          modalEventData.id
                        ) 
                          ? 'booking-conflict' 
                          : ''
                      }`}
                    >
                      <option value="">Изберете място</option>
                      {locationOptions.map(location => {
                        const hasConflict = modalEventData.date && modalEventData.time && modalEventData.endTime && 
                          hasBookingConflict(
                            location, 
                            modalEventData.date, 
                            modalEventData.time, 
                            modalEventData.endTime,
                            modalEventData.id
                          );
                        
                        return (
                          <option 
                            key={location} 
                            value={location}
                            disabled={hasConflict || false}
                            className={hasConflict ? 'conflict-option' : ''}
                          >
                            {location} {hasConflict ? '(Заето)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    
                    {modalEventData.location && modalEventData.date && 
                     modalEventData.time && modalEventData.endTime && 
                     hasBookingConflict(
                       modalEventData.location, 
                       modalEventData.date, 
                       modalEventData.time, 
                       modalEventData.endTime,
                       modalEventData.id
                     ) && (
                      <div className="validation-error">
                        Стаята е вече резервирана за избрания интервал!
                      </div>
                    )}
                  </div>
                  
                  <div className="modal-form-group">
                    <label>Брой места</label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={modalEventData.maxParticipants || 20}
                      onChange={(e) => handleModalInputChange('maxParticipants', parseInt(e.target.value) || 20)}
                      className="modal-form-input"
                    />
                    {modalMode === 'edit' && modalEventData.currentParticipants && (
                      <small className="help-text">
                        Текущо записани: {modalEventData.currentParticipants} участника
                      </small>
                    )}
                  </div>
                  
                  <div className="modal-form-group">
                    <label>Организатор</label>
                    <input
                      type="text"
                      placeholder="Име на организатора"
                      value={modalEventData.organizer || ""}
                      onChange={(e) => handleModalInputChange('organizer', e.target.value)}
                      className="modal-form-input"
                    />
                  </div>
                  
                  <div className="modal-form-group">
                    <label>Линк към картинка</label>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={modalEventData.imageUrl || ""}
                      onChange={(e) => handleModalInputChange('imageUrl', e.target.value)}
                      className="modal-form-input"
                    />
                    <small className="help-text">
                      Картинката ще се показва на генерираните билети за събитието
                    </small>
                    {modalEventData.imageUrl && (
                      <div className="image-preview">
                        <p>Преглед на картинката:</p>
                        <img 
                          src={modalEventData.imageUrl} 
                          alt="Preview" 
                          className="preview-image"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const errorMsg = document.createElement('p');
                              errorMsg.className = 'image-error';
                              errorMsg.textContent = 'Невалиден линк или картинката не може да се зареди';
                              parent.appendChild(errorMsg);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={modalMode === 'create' ? handleCreateEvent : handleUpdateEvent}
                    disabled={
                      !modalEventData.title?.trim() || 
                      !modalEventData.date || 
                      !modalEventData.time || 
                      !modalEventData.endTime || 
                      !modalEventData.location || 
                      !validateTimeRange(modalEventData.time, modalEventData.endTime) ||
                      hasBookingConflict(
                        modalEventData.location, 
                        modalEventData.date, 
                        modalEventData.time, 
                        modalEventData.endTime,
                        modalEventData.id
                      )
                    }
                    className="primary-btn modal-save-btn"
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Създай Събитие' : 'Запази Промените'}
                  </button>
                  
                  <button 
                    onClick={closeEventModal}
                    className="secondary-btn"
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showBookModal && (
  <div className="modal-overlay">
    <div className="modal-content large-modal">
      <div className="modal-header">
        <h3>
          {modalBookData.id ? 'Редактиране на книга' : 'Добавяне на нова книга'}
        </h3>
        <button onClick={closeBookModal} className="close-btn">
          <X size={20} />
        </button>
      </div>
      
      <div className="modal-body event-modal-body">
        <div className="event-modal-grid">
          {/* Основни полета (задължителни) */}
          <div className="modal-form-group">
            <label className="required">Заглавие *</label>
            <input
              type="text"
              placeholder="Заглавие на книгата"
              value={modalBookData.title || ""}
              onChange={(e) => setModalBookData({...modalBookData, title: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Автор *</label>
            <input
              type="text"
              placeholder="Автор на книгата"
              value={modalBookData.author || ""}
              onChange={(e) => setModalBookData({...modalBookData, author: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">ISBN *</label>
            <input
              type="text"
              placeholder="ISBN номер"
              value={modalBookData.isbn || ""}
              onChange={(e) => setModalBookData({...modalBookData, isbn: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Категория *</label>
            <select
  value={modalBookData.category || ""}
  onChange={(e) => setModalBookData({...modalBookData, category: e.target.value})}
  className="modal-form-input"
>
  <option value="">Изберете категория</option>
  {bookService.BOOK_CATEGORIES.map(category => (
    <option key={category} value={category}>{category}</option>
  ))}
</select>
          </div>
          
          <div className="modal-form-group">
            <label className="required">Брой копия *</label>
            <input
              type="number"
              min="1"
              max="100"
              value={modalBookData.copies || 1}
              onChange={(e) => setModalBookData({...modalBookData, copies: parseInt(e.target.value) || 1})}
              className="modal-form-input"
            />
          </div>
          <div className="modal-form-group">
  <label className="required">Жанрове *</label>
  <select
    multiple
    value={modalBookData.genres || []}
    onChange={(e) => {
      const selectedGenres = Array.from(e.target.selectedOptions, option => option.value);
      setModalBookData({...modalBookData, genres: selectedGenres});
    }}
    className="modal-form-input"
    size={4}
  >
    <option value="">Изберете един или повече жанрове</option>
    {bookService.BOOK_GENRES.map(genre => (
  <option key={genre} value={genre}>{genre}</option>
))}
  </select>
  <small className="help-text">
    Задръжте Ctrl (Windows) или Command (Mac) за да изберете повече от един жанр.
    Избрани: {modalBookData.genres?.length || 0}
  </small>
  {modalBookData.genres && modalBookData.genres.length > 0 && (
    <div className="selected-genres">
      Избрани жанрове: {modalBookData.genres.join(', ')}
    </div>
  )}
</div>

          <div className="modal-form-group">
            <label>Период на заемане (дни)</label>
            <input
              type="number"
              min="1"
              max="90"
              value={modalBookData.borrowPeriod || 14}
              onChange={(e) => setModalBookData({...modalBookData, borrowPeriod: parseInt(e.target.value) || 14})}
              className="modal-form-input"
            />
          </div>

          <div className="modal-form-group">
            <label>Максимум удължавания</label>
            <input
              type="number"
              min="0"
              max="10"
              value={modalBookData.maxRenewals || 2}
              onChange={(e) => setModalBookData({...modalBookData, maxRenewals: parseInt(e.target.value) || 2})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Местоположение *</label>
            <input
              type="text"
              placeholder="Напр. Основен отдел"
              value={modalBookData.location || ""}
              onChange={(e) => setModalBookData({...modalBookData, location: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          {/* Допълнителни полета */}
          <div className="modal-form-group">
            <label>Издател</label>
            <input
              type="text"
              placeholder="Издателство"
              value={modalBookData.publisher || ""}
              onChange={(e) => setModalBookData({...modalBookData, publisher: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Година на издаване</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={modalBookData.year || new Date().getFullYear()}
              onChange={(e) => setModalBookData({...modalBookData, year: parseInt(e.target.value)})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Брой страници</label>
            <input
              type="number"
              min="1"
              placeholder="Напр. 250"
              value={modalBookData.pages || ""}
              onChange={(e) => setModalBookData({...modalBookData, pages: parseInt(e.target.value) || undefined})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Език</label>
            <input
              type="text"
              placeholder="Напр. Български"
              value={modalBookData.language || "Български"}
              onChange={(e) => setModalBookData({...modalBookData, language: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Издание</label>
            <input
              type="text"
              placeholder="Напр. Първо издание"
              value={modalBookData.edition || "Първо издание"}
              onChange={(e) => setModalBookData({...modalBookData, edition: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Тип корица</label>
            <select
              value={modalBookData.coverType || "soft"}
              onChange={(e) => setModalBookData({...modalBookData, coverType: e.target.value as 'hard' | 'soft'})}
              className="modal-form-input"
            >
              <option value="soft">Меки корици</option>
              <option value="hard">Твърди корици</option>
            </select>
          </div>
          
          <div className="modal-form-group">
            <label>Състояние</label>
            <select
              value={modalBookData.condition || "good"}
              onChange={(e) => setModalBookData({...modalBookData, condition: e.target.value as 'new' | 'good' | 'fair' | 'poor'})}
              className="modal-form-input"
            >
              <option value="new">Нова</option>
              <option value="good">Добра</option>
              <option value="fair">Задоволителна</option>
              <option value="poor">Лоша</option>
            </select>
          </div>
         <div className="modal-form-group">
  <div className="modal-form-group">
  <label>Текущ статус</label>
  <div className="status-display">
    {(() => {
      const copies = modalBookData.copies || 1;
      const available = modalBookData.availableCopies || copies;
        return (
          <div className="status-badge status-available">
            <span>✅ Налична ({available}/{copies} копия)</span>
          </div>
        );
      }
    )()}
  </div>
</div>
</div>
          <div className="modal-form-group">
            <label>Рафт</label>
            <input
              type="text"
              placeholder="Напр. БГ ЛИТ A3"
              value={modalBookData.shelfNumber || ""}
              onChange={(e) => setModalBookData({...modalBookData, shelfNumber: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Сигнатура</label>
            <input
              type="text"
              placeholder="Напр. 891.811 V39"
              value={modalBookData.callNumber || ""}
              onChange={(e) => setModalBookData({...modalBookData, callNumber: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          {/* ДОПЪЛНИТЕЛНО - по избор */}
          <div className="modal-form-group full-width">
            <label>Описание</label>
            <textarea
              placeholder="Кратко описание на книгата"
              value={modalBookData.description || ""}
              onChange={(e) => setModalBookData({...modalBookData, description: e.target.value})}
              className="modal-form-input"
              rows={3}
            />
          </div>
          
          <div className="modal-form-group">
            <label>Тагове (разделени със запетая)</label>
            <input
              type="text"
              placeholder="Напр. бредбъри, фантастика, времеви пътувания"
              value={modalBookData.tags ? modalBookData.tags.join(', ') : ""}
              onChange={(e) => setModalBookData({
                ...modalBookData, 
                tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
              })}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label>Възрастова препоръка</label>
            <input
              type="text"
              placeholder="Напр. 14+"
              value={modalBookData.ageRecommendation || ""}
              onChange={(e) => setModalBookData({...modalBookData, ageRecommendation: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group full-width">
            <label>Линк към корица</label>
            <input
              type="url"
              placeholder="https://example.com/cover.jpg"
              value={modalBookData.coverUrl || ""}
              onChange={(e) => setModalBookData({...modalBookData, coverUrl: e.target.value})}
              className="modal-form-input"
            />
            {modalBookData.coverUrl && (
              <div className="image-preview">
                <p>Преглед на корицата:</p>
                <img 
                  src={modalBookData.coverUrl} 
                  alt="Preview" 
                  className="preview-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      const errorMsg = document.createElement('p');
                      errorMsg.className = 'image-error';
                      errorMsg.textContent = 'Невалиден линк или картинката не може да се зареди';
                      parent.appendChild(errorMsg);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-actions">
          <button 
            onClick={modalBookData.id ? handleUpdateBook : handleCreateBook}
            disabled={!modalBookData.title?.trim() || !modalBookData.author?.trim() || 
                     !modalBookData.isbn?.trim() || !modalBookData.category?.trim()}
            className="primary-btn modal-save-btn"
          >
            <Save size={16} />
            {modalBookData.id ? 'Запази Промените' : 'Създай Книга'}
          </button>
          <button 
            onClick={closeBookModal}
            className="secondary-btn"
          >
            Отказ
          </button>
        </div>
      </div>
    </div>
  </div>
)}
        {activeTab === "users" && (
          <div className="content-section">
            <div className="rooms-header">
  <h2>Управление на потребители</h2>
</div>

<div className="user-stats-cards">
  <div className="stat-card total-users">
    <div className="stat-content">
      <div className="stat-label">{users.length}</div>
      <div className="stat-label">Общо потребители</div>
    </div>
  </div>
  
  <div className="stat-card readers">
    <div className="stat-content">
      <div className="stat-label">{users.filter(u => u.role === 'reader').length}</div>
      <div className="stat-label">Читатели</div>
    </div>
  </div>
  
  <div className="stat-card librarians">
    <div className="stat-content">
      <div className="stat-label">{users.filter(u => u.role === 'librarian').length}</div>
      <div className="stat-label">Библиотекари</div>
    </div>
  </div>
  
  <div className="stat-card admins">
    <div className="stat-content">
      <div className="stat-label">{users.filter(u => u.role === 'admin').length}</div>
      <div className="stat-label">Администратори</div>
    </div>
  </div>
</div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Потребител</th>
                    <th>Имейл</th>
                    <th>Роля</th>
                    <th>Събития</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="user-info-cell">
                        <div className="user-avatar-small">
                          {getUserDisplayName(user).charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <div className="user-email">{getUserDisplayName(user)}</div>
                          {user.profile?.grade && (
                            <div className="user-grade">{user.profile.grade} клас</div>
                          )}
                        </div>
                      </td>
                      <td className="user-email">{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value)}
                          className={`role-select role-${user.role}`}
                        >
                          <option value="reader">Читател</option>
                          <option value="librarian">Библиотекар</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </td>
                     <td className="user-events-cell">
  <div className="user-events-compact">
    {(() => {
      const userEvents = events.filter(e => 
        e.participants?.includes(user.id)
      );

      if (userEvents.length === 0) {
        return <span className="no-events-badge">0</span>;
      }

      return (
        <div className="events-summary">
          <div className="events-count-badge" title={`Записан за ${userEvents.length} събития`}>
            {userEvents.length}
            <div className="events-tooltip">
              <div className="tooltip-content">
                {userEvents.slice(0, 5).map((eventObj, index) => (
                  <div key={index} className="tooltip-event">
                    <div className="tooltip-event-title">{eventObj.title}</div>
                    <div className="tooltip-event-date">
                      {new Date(eventObj.date).toLocaleDateString('bg-BG')}
                    </div>
                  </div>
                ))}
                {userEvents.length > 5 && (
                  <div className="tooltip-more">+ още {userEvents.length - 5} събития</div>
                )}
              </div>
            </div>
          </div>
          <div className="upcoming-events">
            {(() => {
              const upcomingEvents = userEvents.filter(event => 
                new Date(event.date) >= new Date()
              ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
              
              if (upcomingEvents.length > 0) {
                const nextEvent = upcomingEvents[0];
                return (
                  <div className="next-event-info" title={`Следващо: ${nextEvent.title} (${new Date(nextEvent.date).toLocaleDateString('bg-BG')})`}>
                    <span className="next-event-date">
                      {new Date(nextEvent.date).toLocaleDateString('bg-BG', { 
                        day: '2-digit', 
                        month: 'short' 
                      })}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      );
    })()}
  </div>
</td>
                      <td>
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="delete-btn"
                          title="Изтрий потребител"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="empty-state">
                  <Users size={32} />
                  <p>Няма намерени потребители</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Управление на събития</h2>
              <button 
                onClick={openCreateEventModal}
                className="primary-btn"
              >
                <Plus size={16} />
                Създай Ново Събитие
              </button>
            </div>
            
            <div className="table-container">
              <table className="data-table events-table">
                <thead>
                  <tr>
                    <th>Заглавие</th>
                    <th>Дата и час</th>
                    <th>Място</th>
                    <th>Участници</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(event => (
                    <tr key={event.id} className={isEventFull(event) ? 'event-full' : ''}>
                      <td className="event-info-cell">
                        <div className="event-title-section">
                          <div className="event-title">
                            {event.title}
                            {event.imageUrl && (
                              <span className="event-has-image" title="Има прикачена картинка">
                                <ImageIcon size={14} />
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <div 
                              className="event-desc-html"
                              dangerouslySetInnerHTML={{ __html: event.description }}
                            />
                          )}
                        </div>
                      </td>
                      <td className="event-time-cell">
                        <div className="event-time-display">
                          <div className="event-date">
                            <Calendar size={14} />
                            {new Date(event.date).toLocaleDateString('bg-BG')}
                          </div>
                          <div className="event-time-range">
                            <Clock size={14} />
                            {event.time} - {event.endTime}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="event-location">
                          <MapPin size={14} />
                          {event.location}
                        </div>
                      </td>
                      <td>
                        <div className="participants-info">
                          <div className="participants-count">
                            <User size={14} />
                            {event.currentParticipants} / {event.maxParticipants}
                          </div>
                          <div className="available-spots">
                            Свободни: {getAvailableSpots(event)}
                          </div>
                          {isEventFull(event) && (
                            <div className="full-badge">Пълно</div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => openEditEventModal(event)}
                            className="edit-btn"
                            title="Редактирай събитие"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="delete-btn"
                            title="Изтрий събитие"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredEvents.length === 0 && (
                <div className="empty-state">
                  <Calendar size={32} />
                  <p>Няма намерени събития</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "books" && (
  <div className="content-section">
    <div className="rooms-header">
      <h2>Управление на библиотека</h2>
      <button 
        onClick={openCreateBookModal}
        className="primary-btn"
      >
        <Plus size={16} />
        Добави Нова Книга
      </button>
    </div>
    
    <div className="books-grid-admin">
      {filteredBooks.map((book) => (
        <div key={book.id} className="book-card-admin">
          {/* Book Header */}
          <div className="book-header-admin">
            <div className="book-thumbnail-admin">
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="book-cover-admin" />
              ) : (
                <div className="book-image-fallback-admin">
                  <BookOpen className="fallback-icon-admin" />
                </div>
              )}
            </div>

            <div className="book-main-info-admin">
              <div className="book-title-section-admin">
                <h3 className="book-title-admin">
                  {book.title}
                </h3>
                <p className="book-author-admin">{book.author}</p>
              </div>

              <div className="book-meta-admin">
                <div className="book-category-admin">
                  <Tag size={14} />
                  <span>{book.category}</span>
                </div>
                
                <div className="book-availability-admin">
                  <Copy size={14} />
                  <span>{book.availableCopies}/{book.copies} копия</span>
                </div>

                <div className="book-location-admin">
                  <MapPin size={14} />
                  <span>{book.location}</span>
                </div>

                <div className="book-isbn-admin">
                  <span>ISBN: {book.isbn}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Book Description */}
          {book.description && (
            <div className="book-description-admin">
              <p>{book.description.substring(0, 150)}...</p>
            </div>
          )}

          {/* Book Details */}
          <div className="book-details-admin">
            <div className="details-grid-admin">
              <div className="book-detail-admin">
                <span className="detail-label-admin">Издател:</span>
                <span className="detail-value-admin">{book.publisher || "Няма информация"}</span>
              </div>
              <div className="book-detail-admin">
                <span className="detail-label-admin">Година:</span>
                <span className="detail-value-admin">{book.year}</span>
              </div>
              {book.pages && (
                <div className="book-detail-admin">
                  <span className="detail-label-admin">Страници:</span>
                  <span className="detail-value-admin">{book.pages}</span>
                </div>
              )}
            </div>
          </div>

          {/* Book Actions */}
          <div className="book-actions-admin">
            <div className="admin-action-buttons">
              <button
                onClick={() => openEditBookModal(book)}
                className="edit-book-btn"
                title="Редактирай книга"
              >
                <Edit size={16} />
                <span>Редактирай</span>
              </button>
              
              <button
                onClick={() => deleteBook(book.id)}
                className="delete-book-btn"
                title="Изтрий книга"
              >
                <Trash2 size={16} />
                <span>Изтрий</span>
              </button>
            </div>
            <div className="book-stats-admin">
              <div className="stat-group-admin">
                <BookOpen size={14} />
                <span>ID: {book.id.substring(0, 8)}...</span>
              </div>
              <div className="stat-group-admin">
                <Calendar size={14} />
                <span>Добавена: {
                  book.createdAt
                    ? typeof book.createdAt === 'string'
                      ? new Date(book.createdAt).toLocaleDateString('bg-BG')
                      : (book.createdAt instanceof Date 
                          ? book.createdAt.toLocaleDateString('bg-BG')
                          : book.createdAt.toDate?.().toLocaleDateString('bg-BG') || "Няма дата")
                    : "Няма дата"
                }</span>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {filteredBooks.length === 0 && (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>Няма намерени книги</p>
          <button 
            onClick={openCreateBookModal}
            className="primary-btn"
          >
            <Plus size={16} />
            Добави първата книга
          </button>
        </div>
      )}
    </div>
  </div>
)}

        {activeTab === "rooms" && (
          <div className="content-section">
            <div className="rooms-header">
              <h2>Заетост на стаи</h2>
              <button 
                onClick={() => setIsImportingSchedule(true)}
                className="import-btn primary-btn"
              >
                <Upload size={16} />
                Импортирай седмичен график
              </button>
            </div>
            
            {isImportingSchedule && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Импортиране на седмичен график</h3>
                    <button 
                      onClick={() => setIsImportingSchedule(false)}
                      className="close-btn"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Стая</label>
                      <select
                        value={selectedRoomForImport}
                        onChange={(e) => setSelectedRoomForImport(e.target.value)}
                        className="form-input"
                      >
                        {locationOptions.map(room => (
                          <option key={room} value={room}>{room}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Учебна година</label>
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="2024-2025"
                        className="form-input"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Семестър</label>
                      <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value as "winter" | "summer")}
                        className="form-input"
                      >
                        <option value="winter">Зимен</option>
                        <option value="summer">Летен</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Данни за график (по денове)</label>
                      <textarea
                        value={importData}
                        onChange={(e) => setImportData(e.target.value)}
                        placeholder="Понеделник&#10;07:30–08:10 Пре 8д&#10;08:20–09:00 ГА 8д&#10;...&#10;Вторник&#10;07:30–08:10 Мат 8д&#10;..."
                        className="form-input textarea"
                        rows={15}
                      />
                      <small className="help-text">
                        Формат: Име на ден, след това всеки ред: времеви интервал предмет клас (може да има повече от един предмет разделени със запетая)
                      </small>
                    </div>
                    
                    <div className="modal-actions">
                      <button 
                        onClick={importScheduleToFirebase}
                        disabled={!importData.trim()}
                        className="primary-btn"
                      >
                        Импортирай
                      </button>
                      <button 
                        onClick={() => setIsImportingSchedule(false)}
                        className="secondary-btn"
                      >
                        Отказ
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {addingEventFromCell && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Добавяне на събитие</h3>
                    <button 
                      onClick={() => setAddingEventFromCell(null)}
                      className="close-btn"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="modal-body">
                    <div className="cell-info">
                      <p><strong>Стая:</strong> {addingEventFromCell.room}</p>
                      <p><strong>Дата:</strong> {new Date(selectedDate).toLocaleDateString('bg-BG')}</p>
                      <p><strong>Час:</strong> {addingEventFromCell.timeSlot}</p>
                    </div>
                    
                    <div className="event-form-grid">
                      <div className="form-group">
                        <label>Заглавие на събитието *</label>
                        <input
                          type="text"
                          placeholder="Напр. Среща с писател"
                          value={cellEventTitle}
                          onChange={(e) => setCellEventTitle(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Описание</label>
                        <textarea
                          placeholder="Кратко описание на събитието"
                          value={cellEventDesc}
                          onChange={(e) => setCellEventDesc(e.target.value)}
                          className="form-input textarea"
                          rows={5}
                        />
                      </div>
                      <div className="form-group">
                        <label>Начален час *</label>
                        <select
                          value={cellEventStartTime}
                          onChange={(e) => setCellEventStartTime(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Изберете начален час</option>
                          {timeOptionsWithMinutes.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Краен час *</label>
                        <select
                          value={cellEventEndTime}
                          onChange={(e) => setCellEventEndTime(e.target.value)}
                          className="form-input"
                        >
                          <option value="">Изберете краен час</option>
                          {timeOptionsWithMinutes.map(time => (
                            <option key={time} value={time}>{time}</option>
                          ))}
                        </select>
                        {cellEventStartTime && cellEventEndTime && !validateTimeRange(cellEventStartTime, cellEventEndTime) && (
                          <div className="validation-error">
                            Крайният час трябва да е след началния!
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Брой места</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={cellEventMaxParticipants}
                          onChange={(e) => setCellEventMaxParticipants(parseInt(e.target.value) || 1)}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Организатор</label>
                        <input
                          type="text"
                          placeholder="Име на организатора"
                          value={cellEventOrganizer}
                          onChange={(e) => setCellEventOrganizer(e.target.value)}
                          className="form-input"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Линк към картинка</label>
                        <input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={cellEventImageUrl}
                          onChange={(e) => setCellEventImageUrl(e.target.value)}
                          className="form-input"
                        />
                        <small className="help-text">
                          Картинката ще се показва на генерираните билети
                        </small>
                        {cellEventImageUrl && (
                          <div className="image-preview">
                            <p>Преглед:</p>
                            <img 
                              src={cellEventImageUrl} 
                              alt="Preview" 
                              className="preview-image"
                              style={{ maxWidth: '100%', maxHeight: '150px' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const parent = (e.target as HTMLImageElement).parentElement;
                                if (parent) {
                                  const errorMsg = document.createElement('p');
                                  errorMsg.className = 'image-error';
                                  errorMsg.textContent = 'Невалиден линк или картинката не може да се зареди';
                                  parent.appendChild(errorMsg);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="modal-actions">
                        <button 
                          onClick={createEventFromCell}
                          disabled={
                            !cellEventTitle.trim() || 
                            !cellEventStartTime || 
                            !cellEventEndTime || 
                            !validateTimeRange(cellEventStartTime, cellEventEndTime) ||
                            hasBookingConflict(addingEventFromCell.room, selectedDate, cellEventStartTime, cellEventEndTime)
                          }
                          className="primary-btn"
                        >
                          <Plus size={16} />
                          Създай Събитие
                        </button>
                        <button 
                          onClick={() => {
                            setAddingEventFromCell(null);
                            setCellEventImageUrl("");
                          }}
                          className="secondary-btn"
                        >
                          Отказ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {editingCell && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <h3>Резервация</h3>
                    <button 
                      onClick={() => setEditingCell(null)}
                      className="close-btn"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="modal-body">
                    <div className="cell-info">
                      <p><strong>Стая:</strong> {editingCell.room}</p>
                      <p><strong>Дата:</strong> {new Date(selectedDate).toLocaleDateString('bg-BG')}</p>
                      <p><strong>Час:</strong> {editingCell.timeSlot}</p>
                      
                      {editingCell.booking ? (
                        <div className="booking-details">
                          <h4>Резервация:</h4>
                          {editingCell.booking.type === 'event' ? (
                            <div className="event-booking">
                              <p><strong>Събитие:</strong> {editingCell.booking.eventTitle}</p>
                              <p><strong>Време:</strong> {editingCell.booking.time} - {editingCell.booking.endTime}</p>
                              <p><strong>Тип:</strong> Събитие</p>
                            </div>
                          ) : (
                            <div className="schedule-booking">
                              <p><strong>Учебни занятия:</strong></p>
                              {editingCell.booking.classSchedules.map((schedule, index) => (
                                <div key={index} className="class-item">
                                  <p><strong>Предмет:</strong> {schedule.subject}</p>
                                  <p><strong>Клас:</strong> {schedule.className}</p>
                                  {schedule.teacher && <p><strong>Учител:</strong> {schedule.teacher}</p>}
                                </div>
                              ))}
                              <p><strong>Тип:</strong> Учебно занятие</p>
                            </div>
                          )}
                          
                          <div className="modal-actions">
                            <button 
                              onClick={() => deleteBookingFromCell(editingCell.booking!)}
                              className="delete-btn"
                            >
                              <Trash2 size={16} />
                              Изтрий резервация
                            </button>
                            <button 
                              onClick={() => setEditingCell(null)}
                              className="secondary-btn"
                            >
                              Затвори
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="no-booking">
                          <p>Няма резервация за този час и стая.</p>
                          <div className="modal-actions">
                            <button 
                              onClick={() => startAddingEventFromCell(editingCell.room, editingCell.timeSlot)}
                              className="primary-btn"
                            >
                              <Plus size={16} />
                              Добави събитие
                            </button>
                            <button 
                              onClick={() => setEditingCell(null)}
                              className="secondary-btn"
                            >
                              Затвори
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="date-picker-section">
              <label htmlFor="room-date" className="date-picker-label">
                Изберете дата:
              </label>
              <input
                id="room-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-picker-input"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="rooms-grid-container">
              <div className="rooms-timetable">
                <div className="table-header-row">
                  <div className="corner-cell">Стая/Час</div>
                  {timeSlots.map(time => (
                    <div key={time} className="time-header-cell">
                      {time.split('-')[0]}
                    </div>
                  ))}
                </div>

                {locationOptions.map(room => (
                  <div key={room} className="table-row">
                    <div className="room-name-cell">
                      <Building size={16} />
                      <span>{room}</span>
                    </div>
                    {timeSlots.map(timeSlot => {
                      const [slotStart] = timeSlot.split('-');
                      const isEventBooked = isRoomBookedByEvent(room, selectedDate, slotStart);
                      const isScheduleBooked = isRoomBookedInSchedule(room, selectedDate, slotStart);
                      const bookingInfo = getBookingInfo(room, selectedDate, slotStart);
                      
                      return (
                        <div
                          key={`${room}-${timeSlot}`}
                          className={`time-slot-cell ${
                            isScheduleBooked ? 'scheduled' : 
                            isEventBooked ? 'booked' : 'available'
                          } ${editingCell?.room === room && editingCell?.timeSlot === timeSlot ? 'editing' : ''}`}
                          onClick={() => startEditingCell(room, timeSlot)}
                          title={
                            isScheduleBooked ? 
                            `Учебни занятия: ${bookingInfo && bookingInfo.type === 'schedule' ? 
                              bookingInfo.classSchedules.map(s => `${s.subject} (${s.className})${s.teacher ? ` - ${s.teacher}` : ''}`).join(', ') : 
                              ''}` : 
                            isEventBooked ? 
                            `Събитие: ${bookingInfo && bookingInfo.type === 'event' ? 
                              `${bookingInfo.eventTitle} (${bookingInfo.time} - ${bookingInfo.endTime})` : 
                              ''}` : 
                            `Свободно: ${timeSlot} - кликнете за добавяне на събитие`
                          }
                        >
                          {isScheduleBooked && (
                            <div className="schedule-indicator">
                              <div className="schedule-dot"></div>
                              <div className="event-tooltip">
                                {bookingInfo && bookingInfo.type === 'schedule' && (
                                  <>
                                    <strong>Учебни занятия:</strong>
                                    {bookingInfo.classSchedules.map((schedule, index) => (
                                      <div key={index}>
                                        {schedule.subject} {schedule.className}
                                        {schedule.teacher && ` (${schedule.teacher})`}
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {isEventBooked && !isScheduleBooked && (
                            <div className="booking-indicator">
                              <div className="event-dot"></div>
                              <div className="event-tooltip">
                                {bookingInfo && bookingInfo.type === 'event' && (
                                  <>
                                    <strong>{bookingInfo.eventTitle}</strong>
                                    <br />
                                    {bookingInfo.time} - {bookingInfo.endTime}
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                          {isScheduleBooked && bookingInfo && bookingInfo.type === 'schedule' && (
                            <div className="class-count">
                              {bookingInfo.classSchedules.length}
                            </div>
                          )}
                          {!isScheduleBooked && !isEventBooked && (
                            <div className="available-text">+</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="rooms-legend">
              <div className="legend-item">
                <div className="legend-color available"></div>
                <span>Свободна стая (кликнете за добавяне)</span>
              </div>
              <div className="legend-item">
                <div className="legend-color scheduled"></div>
                <span>Учебно занятие</span>
              </div>
              <div className="legend-item">
                <div className="legend-color booked"></div>
                <span>Резервация за събитие</span>
              </div>
            </div>

            <div className="bookings-list">
              <h3>Резервации за {new Date(selectedDate).toLocaleDateString('bg-BG')}</h3>
              
              {(() => {
                const dayOfWeek = new Date(selectedDate).getDay();
                const dayBookings = roomBookings.filter(booking => booking.date === selectedDate);
                const daySchedules = scheduleBookings.filter(schedule => 
                  schedule.dayOfWeek === dayOfWeek && schedule.classSchedules.length > 0
                );
                
                const totalBookings = dayBookings.length + daySchedules.length;
                
                if (totalBookings > 0) {
                  return (
                    <div className="bookings-grid">
                      {dayBookings.map(booking => (
                        <div key={booking.id} className="booking-card">
                          <div className="booking-room">
                            <Building size={16} />
                            {booking.room}
                          </div>
                          <div className="booking-time">
                            <Clock size={16} />
                            {booking.time} - {booking.endTime}
                          </div>
                          <div className="booking-event">{booking.eventTitle}</div>
                          <div className="booking-type">Събитие</div>
                        </div>
                      ))}
                      {daySchedules.map(schedule => (
                        <div key={schedule.id} className="booking-card scheduled">
                          <div className="booking-room">
                            <Building size={16} />
                            {schedule.room}
                          </div>
                          <div className="booking-time">
                            <Clock size={16} />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                          <div className="booking-classes">
                            {schedule.classSchedules.map((classSchedule, index) => (
                              <div key={index} className="class-item">
                                <div className="class-subject">{classSchedule.subject}</div>
                                <div className="class-details">
                                  {classSchedule.className}
                                  {classSchedule.teacher && ` | ${classSchedule.teacher}`}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="booking-type">Учебно занятие</div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="no-bookings">
                      <Calendar size={32} />
                      <p>Няма резервации за избраната дата</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="content-section">
            <div className="tickets-header">
              <h2>Проверка на билети</h2>
            </div>
            <div className="ticket-options-grid">
              <div className="ticket-option-card" onClick={openCheckTicketModal}>
                <div className="option-icon">
                  <Search size={32} />
                </div>
                <h3>Ръчно търсене</h3>
                <p>Въведете номер на билет или сканирайте QR код</p>
                <button className="primary-btn option-btn">
                  Проверка
                </button>
              </div>
              
              <div className="ticket-option-card" onClick={openQrScanner}>
                <div className="option-icon">
                  <QrCode size={32} />
                </div>
                <h3>Директно сканиране</h3>
                <p>Директно сканиране на QR код от билет</p>
                <button className="primary-btn option-btn">
                  Сканирай QR код
                </button>
              </div>
              
              <div className="ticket-option-card" onClick={openTodayStats}>
                <div className="option-icon">
                  <BarChart3 size={32} />
                </div>
                <h3>Статистика</h3>
                <p>Преглед на регистрираните посетители за днес</p>
                <button className="primary-btn option-btn">
                  Виж статистика
                </button>
              </div>
            </div>
            
            <div className="tickets-stats">
              <h3>Статистика</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Общо билети</div>
                  <div className="stat-value">
                    {events.reduce((total, event) => 
                      total + (event.tickets ? Object.keys(event.tickets).length : 0), 0
                    )}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Регистрирани</div>
                  <div className="stat-value">
                    {events.reduce((total, event) => {
                      if (!event.tickets) return total;
                      return total + Object.values(event.tickets).filter(ticket => 
                        ticket.checkedIn
                      ).length;
                    }, 0)}
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Очакващи</div>
                  <div className="stat-value">
                    {events.reduce((total, event) => {
                      if (!event.tickets) return total;
                      return total + Object.values(event.tickets).filter(ticket => 
                        !ticket.checkedIn
                      ).length;
                    }, 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          {activeTab === "news" && (
  <div className="content-section">
    <div className="rooms-header">
      <h2>Управление на новини</h2>
      <button 
        onClick={openCreateNewsModal}
        className="primary-btn"
      >
        <Plus size={16} />
        Добави Нова Новина
      </button>
    </div>
    
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Заглавие</th>
            <th>Категория</th>
            <th>Автор</th>
            <th>Дата</th>
            <th>Прегледи</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {news.map(newsItem => (
            <tr key={newsItem.id} className={newsItem.featured ? 'featured-news' : ''}>
              <td className="news-info-cell">
                <div className="news-title-section">
                  <div className="news-title">
                    {newsItem.title}
                    {newsItem.featured && (
                      <span className="featured-badge" title="Препоръчана новина">
                        ★
                      </span>
                    )}
                  </div>
                  <div className="news-excerpt">{newsItem.excerpt}</div>
                  {newsItem.tags && newsItem.tags.length > 0 && (
                    <div className="news-tags-preview">
                      {newsItem.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="news-tag-small">#{tag}</span>
                      ))}
                      {newsItem.tags.length > 3 && (
                        <span className="more-tags">+{newsItem.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <span className={`news-category-badge ${newsItem.category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {newsItem.category}
                </span>
              </td>
              <td>{newsItem.author}</td>
              <td>
                {newsItem.date?.toDate 
                  ? newsItem.date.toDate().toLocaleDateString('bg-BG')
                  : "Няма дата"
                }
              </td>
              <td>
                <div className="news-stats">
                  <div className="stat-item" title="Прегледи">
                    <Eye size={14} />
                    <span>{newsItem.views || 0}</span>
                  </div>
                  <div className="stat-item" title="Харесвания">
                    <Heart size={14} />
                    <span>{newsItem.likes || 0}</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="action-buttons">
                  <button
                    onClick={() => openEditNewsModal(newsItem)}
                    className="edit-btn"
                    title="Редактирай новина"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteNews(newsItem.id)}
                    className="delete-btn"
                    title="Изтрий новина"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {news.length === 0 && (
        <div className="empty-state">
          <Newspaper size={32} />
          <p>Няма намерени новини</p>
          <button 
            onClick={openCreateNewsModal}
            className="primary-btn"
          >
            <Plus size={16} />
            Добави първата новина
          </button>
        </div>
      )}
    </div>
  </div>
)}
      </div>
    </div>
  );
};

export default AdminDashboard;