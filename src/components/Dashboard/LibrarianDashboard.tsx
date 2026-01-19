// src/components/Dashboard/LibrarianDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp, query, orderBy } from "firebase/firestore";
import * as bookService from "../../lib/services/bookService";
import type { BookLibrary } from "../../lib/services/bookTypes";
import { 
  Calendar, Trash2, Plus, Search, Clock, 
  MapPin, User, Edit, X, Save, Book, UserCheck, 
  Bookmark, Tag, Copy, Home, AlertTriangle, CheckCircle,
  Bell, TrendingUp, Users, Package, Eye, Star,
  BarChart, Activity, BookOpen, Loader2, Archive,
  ChevronRight, Award, Hash,
  CheckSquare, ShoppingCart, Truck, Clipboard,
  DollarSign, BarChart3, Target,
  Mail, Phone, Globe, FileText, Download,
  Printer, Wrench
} from "lucide-react";
import styles from './LibrarianDashboard.module.css';

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
  imageUrl?: string;
  participants: string[];
}

interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userEmail: string;
  reservedAt: any;
  status: 'active' | 'completed' | 'cancelled';
  pickupDate?: string;
  returnDate?: string;
  expiresAt?: any;
}

interface LibrarianTask {
  id: string;
  title: string;
  description: string;
  type: 'reservation' | 'return' | 'inventory' | 'event' | 'maintenance' | 'ordering' | 'cataloging';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string;
  dueDate: string;
  createdAt: any;
  bookId?: string;
  eventId?: string;
  reservationId?: string;
  orderId?: string;
}

interface BookOrder {
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  year: number;
  category: string;
  copies: number;
  supplier: string;
  supplierContact: string;
  price: number;
  currency: string;
  orderDate: string;
  expectedDelivery: string;
  status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  orderNumber: string;
  notes: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  rating: number;
  deliveryTime: string;
  paymentTerms: string;
  notes: string;
}

interface InventoryAudit {
  id: string;
  date: string;
  auditor: string;
  section: string;
  totalBooks: number;
  countedBooks: number;
  discrepancies: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string;
  createdAt: any;
}

const LibrarianDashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [books, setBooks] = useState<BookLibrary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<LibrarianTask[]>([]);
  const [bookOrders, setBookOrders] = useState<BookOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>([]);
  
  const [activeTab, setActiveTab] = useState<"home" | "books" | "events" | "reservations" | "popular" | "ordering" | "inventory" | "suppliers" | "reports">("home");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [showArchivedEvents, setShowArchivedEvents] = useState<boolean>(false);
  const [popularFilter, setPopularFilter] = useState<"mostLiked" | "mostWaited" | "mostViewed">("mostLiked");
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'ordered' | 'shipped' | 'delivered'>('all');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed'>('all');

  // Модални прозорци
  const [showBookModal, setShowBookModal] = useState<boolean>(false);
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [_showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [showInventoryModal, setShowInventoryModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Данни за модален прозорец на книга - СЪЩАТА ФОРМА КАТО В AdminDashboard
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
  
  // Данни за модален прозорец на събитие
  const [modalEventData, setModalEventData] = useState<Partial<Event>>({
    title: "",
    description: "",
    date: "",
    time: "",
    endTime: "",
    location: "",
    maxParticipants: 20,
    allowedRoles: ["reader", "librarian"],
    organizer: "",
    imageUrl: "",
    currentParticipants: 0,
    participants: []
  });

  // Данни за модален прозорец на задача
  const [modalTaskData, setModalTaskData] = useState<Partial<LibrarianTask>>({
    title: "",
    description: "",
    type: "inventory",
    priority: "medium",
    status: "pending",
    assignedTo: "",
    dueDate: "",
  });

  // Данни за модален прозорец на поръчка
  const [modalOrderData, setModalOrderData] = useState<Partial<BookOrder>>({
    title: "",
    author: "",
    isbn: "",
    publisher: "",
    year: new Date().getFullYear(),
    category: "",
    copies: 1,
    supplier: "",
    supplierContact: "",
    price: 0,
    currency: "BGN",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDelivery: "",
    status: "pending",
    orderNumber: `ORD-${Date.now()}`,
    notes: "",
    createdBy: "Библиотекар"
  });

  // Данни за модален прозорец на доставчик
  const [modalSupplierData, setModalSupplierData] = useState<Partial<Supplier>>({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    rating: 5,
    deliveryTime: "7-14 дни",
    paymentTerms: "30 дни",
    notes: ""
  });

  // Данни за модален прозорец на инвентаризация
  const [modalInventoryData, setModalInventoryData] = useState<Partial<InventoryAudit>>({
    date: new Date().toISOString().split('T')[0],
    auditor: "",
    section: "",
    totalBooks: 0,
    countedBooks: 0,
    discrepancies: 0,
    status: "planned",
    notes: ""
  });

  const locationOptions = [
    "1303", "3310", "3301-EOП", "3305-АНП", "библиотека", "Зала Европа", "Комп.каб.-ТЧ", 
    "Физкултура3", "1201", "1202", "1203", "1206", "1408-КК", "1308-КК", 
    "1101", "1102", "1103", "1104", "1105", "1106", "1204", "1205", "1207", 
    "1209", "1301", "1302", "1304", "1305", "1307", "1309", "1401", "1402", 
    "1403", "1404", "1405", "1406", "1407", "1409", "1306"
  ];

  const bookSections = [
    "Българска литература",
    "Световна литература", 
    "Научна литература",
    "Детска литература",
    "Справочници",
    "Учебници",
    "Периодични издания",
    "Аудио-визуални материали",
    "Специални колекции"
  ];

  const suppliersList = [
    "Книжен пазар ЕООД",
    "Просвета АД",
    "Хермес ООД",
    "Абагар Холдинг",
    "Силвестър & С-ие",
    "Фют ЕООД",
    "Булвест 2000",
    "Книгата БГ",
    "Читанка",
    "Други"
  ];

  const currencies = ["BGN", "EUR", "USD"];

  const taskTypes = [
    { value: 'reservation', label: 'Обработка на резервация', icon: <Bookmark size={16} /> },
    { value: 'return', label: 'Връщане на книга', icon: <BookOpen size={16} /> },
    { value: 'inventory', label: 'Инвентаризация', icon: <Package size={16} /> },
    { value: 'event', label: 'Организация на събитие', icon: <Calendar size={16} /> },
    { value: 'maintenance', label: 'Поддръжка', icon: <Wrench size={16} /> },
    { value: 'ordering', label: 'Поръчка на книги', icon: <ShoppingCart size={16} /> },
    { value: 'cataloging', label: 'Каталогизиране', icon: <FileText size={16} /> }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Ниска', color: '#10b981' },
    { value: 'medium', label: 'Средна', color: '#f59e0b' },
    { value: 'high', label: 'Висока', color: '#ef4444' },
    { value: 'urgent', label: 'Спешна', color: '#dc2626' }
  ];

  const orderStatuses = [
    { value: 'pending', label: 'Чакаща', color: '#f59e0b' },
    { value: 'ordered', label: 'Поръчана', color: '#3b82f6' },
    { value: 'shipped', label: 'Изпратена', color: '#8b5cf6' },
    { value: 'delivered', label: 'Доставена', color: '#10b981' },
    { value: 'cancelled', label: 'Отменена', color: '#ef4444' }
  ];

  const inventoryStatuses = [
    { value: 'planned', label: 'Планирана', color: '#3b82f6' },
    { value: 'in_progress', label: 'В ход', color: '#f59e0b' },
    { value: 'completed', label: 'Завършена', color: '#10b981' },
    { value: 'cancelled', label: 'Отменена', color: '#ef4444' }
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

  // Изчисляване на активни и архивирани събития
  const { activeEvents, archivedEvents } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    const active = events
      .filter(event => event.date && event.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));

    const archived = events
      .filter(event => event.date && event.date < today)
      .sort((a, b) => b.date.localeCompare(a.date));

    return { activeEvents: active, archivedEvents: archived };
  }, [events]);

  // Функции за популярни книги
  const getMostLikedBooks = () => {
    return books
      .filter(book => (book.rating ?? 0) >= 4)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  };
console.log(getMostLikedBooks());
  const getBooksWithLongestWaitingList = () => {
    return books
      .filter(book => (book.reservationQueue || 0) > 0)
      .sort((a, b) => (b.reservationQueue || 0) - (a.reservationQueue || 0))
      .slice(0, 10);
  };

  const getMostViewedBooks = () => {
    return books
      .filter(book => (book.views || 0) > 0)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
  };

  const getTopRatedBooks = () => {
    return books
      .sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.ratingsCount || 0) - (a.ratingsCount || 0);
      })
      .slice(0, 10);
  };

  const getMostInDemandBooks = () => {
    return books
      .sort((a, b) => {
        const waitingDiff = (b.reservationQueue || 0) - (a.reservationQueue || 0);
        if (waitingDiff !== 0) return waitingDiff;
        return (b.views || 0) - (a.views || 0);
      })
      .slice(0, 10);
  };
console.log(getMostInDemandBooks());
  // Изчисляване на обобщени статистики за популярни книги
  const calculatePopularStats = () => {
    const topBooks = getTopRatedBooks();
    const waitingBooks = getBooksWithLongestWaitingList();
    const viewedBooks = getMostViewedBooks();
    
    const totalWaitingPeople = books.reduce((sum, book) => sum + (book.reservationQueue || 0), 0);
    const averageRating = books.reduce((sum, book) => sum + (book.rating || 0), 0) / books.length;
    const totalViews = books.reduce((sum, book) => sum + (book.views || 0), 0);
    const highlyRatedCount = books.filter(book => (book.rating || 0) >= 4).length;
    const booksWithWaitingList = books.filter(book => (book.reservationQueue || 0) > 0).length;
    
    return {
      totalWaitingPeople,
      averageRating: averageRating.toFixed(1),
      totalViews,
      highlyRatedCount,
      booksWithWaitingList,
      topRatedBook: topBooks[0] || null,
      mostWaitedBook: waitingBooks[0] || null,
      mostViewedBook: viewedBooks[0] || null
    };
  };

  // Функции за статистики за поръчки
  const calculateOrderStats = () => {
    const totalOrders = bookOrders.length;
    const pendingOrders = bookOrders.filter(o => o.status === 'pending').length;
    const deliveredOrders = bookOrders.filter(o => o.status === 'delivered').length;
    const totalValue = bookOrders.reduce((sum, order) => sum + (order.price * order.copies), 0);
    const avgDeliveryTime = bookOrders
      .filter(o => o.expectedDelivery && o.orderDate)
      .reduce((sum, o) => {
        const orderDate = new Date(o.orderDate);
        const expectedDate = new Date(o.expectedDelivery);
        const diffTime = Math.abs(expectedDate.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return sum + diffDays;
      }, 0) / (deliveredOrders || 1);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalValue: totalValue.toFixed(2),
      avgDeliveryTime: avgDeliveryTime.toFixed(1)
    };
  };

  // Функции за статистики за инвентаризация
  const calculateInventoryStats = () => {
    const totalAudits = inventoryAudits.length;
    const completedAudits = inventoryAudits.filter(a => a.status === 'completed').length;
    const inProgressAudits = inventoryAudits.filter(a => a.status === 'in_progress').length;
    const totalDiscrepancies = inventoryAudits.reduce((sum, audit) => sum + (audit.discrepancies || 0), 0);
    const totalBooksCounted = inventoryAudits.reduce((sum, audit) => sum + (audit.countedBooks || 0), 0);
    const accuracyRate = totalBooksCounted > 0 
      ? ((totalBooksCounted - totalDiscrepancies) / totalBooksCounted * 100).toFixed(1)
      : "100";

    return {
      totalAudits,
      completedAudits,
      inProgressAudits,
      totalDiscrepancies,
      totalBooksCounted,
      accuracyRate
    };
  };

  const popularStats = calculatePopularStats();
  const orderStats = calculateOrderStats();
  const inventoryStats = calculateInventoryStats();

  // Зареждане на всички данни
  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEvents(),
        fetchBooks(),
        fetchReservations(),
        fetchTasks(),
        fetchBookOrders(),
        fetchSuppliers(),
        fetchInventoryAudits()
      ]);
    } catch (error) {
      console.error("Грешка при зареждане на данни:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    const snapshot = await getDocs(collection(db, "events"));
    const eventsData: Event[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Event));
    setEvents(eventsData);
  };

  const fetchBooks = async () => {
    try {
      const booksData = await bookService.fetchAllBooks();
      setBooks(booksData);
    } catch (error) {
      console.error("Error fetching books:", error);
    }
  };

  const fetchReservations = async () => {
    const snapshot = await getDocs(collection(db, "reservations"));
    const reservationsData: Reservation[] = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Reservation));
    setReservations(reservationsData);
  };

  const fetchTasks = async () => {
    try {
      const q = query(collection(db, "librarian_tasks"), orderBy("dueDate", "asc"));
      const snapshot = await getDocs(q);
      const tasksData: LibrarianTask[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as LibrarianTask));
      setTasks(tasksData);
    } catch (error) {
      console.error("Грешка при зареждане на задачи:", error);
      setTasks([]);
    }
  };

  const fetchBookOrders = async () => {
    try {
      const q = query(collection(db, "book_orders"), orderBy("orderDate", "desc"));
      const snapshot = await getDocs(q);
      const ordersData: BookOrder[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as BookOrder));
      setBookOrders(ordersData);
    } catch (error) {
      console.error("Грешка при зареждане на поръчки:", error);
      setBookOrders([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "suppliers"));
      const suppliersData: Supplier[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Supplier));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Грешка при зареждане на доставчици:", error);
      setSuppliers([]);
    }
  };

  const fetchInventoryAudits = async () => {
    try {
      const q = query(collection(db, "inventory_audits"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const auditsData: InventoryAudit[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as InventoryAudit));
      setInventoryAudits(auditsData);
    } catch (error) {
      console.error("Грешка при зареждане на инвентаризации:", error);
      setInventoryAudits([]);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Изчисляване на статистики за начална страница
  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
    const overdueTasks = tasks.filter(t => t.dueDate < today && t.status !== 'completed').length;
    
    const activeReservations = reservations.filter(r => r.status === 'active').length;
    const pendingPickups = activeReservations;
    
    const lowStockBooks = books.filter(b => b.availableCopies <= 2 && b.copies > 0).length;
    const totalBooks = books.length;
    
    const todayEvents = events.filter(e => e.date === today).length;
    const upcomingEvents = activeEvents.length;
    
    const pendingOrders = bookOrders.filter(o => o.status === 'pending').length;
    const recentAudits = inventoryAudits.filter(a => a.date === today).length;
    
    return {
      pendingTasks,
      highPriorityTasks,
      overdueTasks,
      activeReservations,
      pendingPickups,
      lowStockBooks,
      totalBooks,
      todayEvents,
      upcomingEvents,
      pendingOrders,
      recentAudits
    };
  };

  const stats = calculateStats();

  // Филтриране на предстоящи задачи
  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    return tasks
      .filter(task => task.dueDate >= today && task.dueDate <= tomorrowStr && task.status !== 'completed')
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.dueDate.localeCompare(b.dueDate);
      });
  };

  // Филтриране на скорошни резервации
  const getRecentReservations = () => {
    return reservations
      .filter(r => r.status === 'active')
      .sort((a, b) => {
        const dateA = a.reservedAt?.toDate?.() || new Date(0);
        const dateB = b.reservedAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  };

  // Филтриране на книги с малко налични копия
  const getLowStockBooks = () => {
    return books
      .filter(b => b.availableCopies <= 2 && b.copies > 0)
      .sort((a, b) => a.availableCopies - b.availableCopies)
      .slice(0, 5);
  };

  // Филтриране на предстоящи събития
  const getUpcomingEvents = () => {
    return activeEvents.slice(0, 5);
  };

  // Филтриране на скорошни поръчки
  const getRecentOrders = () => {
    return bookOrders
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  };

  // Филтриране на скорошни инвентаризации
  const getRecentAudits = () => {
    return inventoryAudits
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  // Филтриране на поръчки според статус
  const getFilteredOrders = () => {
    if (orderFilter === 'all') return bookOrders;
    return bookOrders.filter(order => order.status === orderFilter);
  };

  // Филтриране на инвентаризации според статус
  const getFilteredAudits = () => {
    if (inventoryFilter === 'all') return inventoryAudits;
    return inventoryAudits.filter(audit => audit.status === inventoryFilter);
  };

  // Филтриране на популярни книги според избрания филтър
  const getFilteredPopularBooks = () => {
    switch (popularFilter) {
      case "mostLiked":
        return getTopRatedBooks();
      case "mostWaited":
        return getBooksWithLongestWaitingList();
      case "mostViewed":
        return getMostViewedBooks();
      default:
        return getTopRatedBooks();
    }
  };

  // Модални функции за книги - СЪЩАТА ФОРМА КАТО В AdminDashboard
  const openCreateBookModal = () => {
    setModalMode('create');
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
    setModalMode('edit');
    setModalBookData({
      // Основни полета
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      copies: book.copies || 1,
      availableCopies: book.availableCopies !== undefined ? book.availableCopies : (book.copies || 1),
      publisher: book.publisher || "",
      year: book.year || new Date().getFullYear(),
      description: book.description || "",
      location: book.location || "Библиотека",
      coverUrl: book.coverUrl || "",
      
      // Допълнителни полета
      shelfNumber: book.shelfNumber || "",
      callNumber: book.callNumber || "",
      genres: book.genres || [],
      tags: book.tags || [],
      pages: book.pages || 0,
      language: book.language || "Български",
      edition: book.edition || "Първо издание",
      coverType: book.coverType || "soft",
      condition: book.condition || "good",
      ageRecommendation: book.ageRecommendation || "",
      featured: book.featured || false,
      status: book.status || "available",
      rating: book.rating || 0,
      ratingsCount: book.ratingsCount || 0,
      views: book.views || 0,
      borrowPeriod: book.borrowPeriod || 14,
      maxRenewals: book.maxRenewals || 2,
      reservationQueue: book.reservationQueue || 0,
      waitingList: book.waitingList || [],
      summary: book.summary || "",
      tableOfContents: book.tableOfContents || [],
      relatedBooks: book.relatedBooks || [],
      awards: book.awards || [],
      digitalVersion: book.digitalVersion || {
        available: false,
        format: "",
        url: ""
      },
      isActive: book.isActive !== false,
      underMaintenance: book.underMaintenance || false
    });
    setShowBookModal(true);
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setModalBookData({});
  };

  // функция за създаване на книга 
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

  // В AdminDashboard.tsx (админския панел)
const approveReservationAndBorrowBook = async (reservationId: string, bookId: string, userId: string) => {
  try {
    const book = books.find(b => b.id === bookId);
    const reservation = reservations.find(r => r.id === reservationId);
    
    if (!book || !reservation) {
      alert('Книгата или резервацията не са намерени!');
      return;
    }

    // 1. Маркирай резервацията като "fulfilled"
    await updateDoc(doc(db, "reservations", reservationId), {
      status: 'fulfilled',
      lastUpdated: Timestamp.now()
    });

    // 2. Добави запис в borrowedBy на книгата
    const borrowedRecord = {
      userId: userId,
      userName: reservation.userName, // ВЗЕМЕТЕ ИМЕТО ОТ РЕЗЕРВАЦИЯТА
      userEmail: reservation.userEmail, // ВЗЕМЕТЕ ИМЕЙЛА ОТ РЕЗЕРВАЦИЯТА
      borrowedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + (book.borrowPeriod || 14) * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      returned: false,
      renewed: false,
      renewalCount: 0
    };

    const updatedBorrowedBy = [...(book.borrowedBy || []), borrowedRecord];
    
    await updateDoc(doc(db, "books", bookId), {
      borrowedBy: updatedBorrowedBy,
      availableCopies: Math.max(0, book.availableCopies - 1),
      lastUpdated: Timestamp.now()
    });

    alert(`Книгата "${book.title}" е одобрена за ${reservation.userName}!`);
    
    // Обнови данните
    fetchReservations();
    fetchBooks();
    
  } catch (error) {
    console.error('Грешка при одобряване на резервация:', error);
    alert('Грешка при одобряване на резервация!');
  }
};

  // Модални функции за събития
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
      allowedRoles: ["reader", "librarian"],
      organizer: "",
      imageUrl: "",
      currentParticipants: 0,
      participants: []
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
      allowedRoles: event.allowedRoles,
      organizer: event.organizer,
      imageUrl: event.imageUrl || "",
      currentParticipants: event.currentParticipants,
      participants: event.participants || []
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setModalEventData({});
  };

  const handleCreateEvent = async () => {
    if (!modalEventData.title?.trim() || !modalEventData.date || 
        !modalEventData.time || !modalEventData.endTime || !modalEventData.location) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }
    
    try {
      const eventData = {
        ...modalEventData,
        currentParticipants: 0,
        participants: [],
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "events"), eventData);
      
      closeEventModal();
      await fetchAllData();
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

    try {
      await updateDoc(doc(db, "events", modalEventData.id), {
        ...modalEventData,
        updatedAt: Timestamp.now()
      });
      
      closeEventModal();
      await fetchAllData();
      alert("Събитието е обновено успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на събитие:", error);
      alert("Грешка при обновяване на събитие!");
    }
  };

  // Функции за задачи
  const openCreateTaskModal = () => {
    setModalMode('create');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setModalTaskData({
      title: "",
      description: "",
      type: "inventory",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      dueDate: tomorrow.toISOString().split('T')[0],
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: LibrarianTask) => {
    setModalMode('edit');
    setModalTaskData({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      priority: task.priority,
      status: task.status,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      bookId: task.bookId,
      eventId: task.eventId,
      reservationId: task.reservationId,
      orderId: task.orderId
    });
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setModalTaskData({});
  };

  const handleCreateTask = async () => {
    if (!modalTaskData.title?.trim() || !modalTaskData.dueDate) {
      alert("Моля, попълнете заглавие и крайна дата!");
      return;
    }

    try {
      const taskData = {
        ...modalTaskData,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "librarian_tasks"), taskData);
      
      closeTaskModal();
      await fetchAllData();
      alert("Задачата е добавена успешно!");
      
    } catch (error) {
      console.error("Грешка при добавяне на задача:", error);
      alert("Грешка при добавяне на задача!");
    }
  };
console.log(handleCreateTask);
  const handleUpdateTask = async () => {
    if (!modalTaskData.id) return;
    
    if (!modalTaskData.title?.trim() || !modalTaskData.dueDate) {
      alert("Моля, попълнете заглавие и крайна дата!");
      return;
    }

    try {
      await updateDoc(doc(db, "librarian_tasks", modalTaskData.id), {
        ...modalTaskData,
        updatedAt: Timestamp.now()
      });
      
      closeTaskModal();
      await fetchAllData();
      alert("Задачата е обновена успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на задача:", error);
      alert("Грешка при обновяване на задача!");
    }
  };
console.log(handleUpdateTask);
  const updateTaskStatus = async (taskId: string, status: LibrarianTask['status']) => {
    try {
      await updateDoc(doc(db, "librarian_tasks", taskId), {
        status,
        updatedAt: Timestamp.now()
      });
      
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при обновяване на статуса на задача:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете задачата?")) return;
    try {
      await deleteDoc(doc(db, "librarian_tasks", taskId));
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при изтриване на задача:", error);
    }
  };

  // Функции за поръчки на книги
  const openCreateOrderModal = () => {
    setModalMode('create');
    const today = new Date();
    const expected = new Date(today);
    expected.setDate(expected.getDate() + 14);
    
    setModalOrderData({
      title: "",
      author: "",
      isbn: "",
      publisher: "",
      year: new Date().getFullYear(),
      category: "",
      copies: 1,
      supplier: "",
      supplierContact: "",
      price: 0,
      currency: "BGN",
      orderDate: today.toISOString().split('T')[0],
      expectedDelivery: expected.toISOString().split('T')[0],
      status: "pending",
      orderNumber: `ORD-${Date.now()}`,
      notes: "",
      createdBy: "Библиотекар"
    });
    setShowOrderModal(true);
  };

  const openEditOrderModal = (order: BookOrder) => {
    setModalMode('edit');
    setModalOrderData({
      id: order.id,
      title: order.title,
      author: order.author,
      isbn: order.isbn,
      publisher: order.publisher,
      year: order.year,
      category: order.category,
      copies: order.copies,
      supplier: order.supplier,
      supplierContact: order.supplierContact,
      price: order.price,
      currency: order.currency,
      orderDate: order.orderDate,
      expectedDelivery: order.expectedDelivery,
      status: order.status,
      orderNumber: order.orderNumber,
      notes: order.notes,
      createdBy: order.createdBy
    });
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setModalOrderData({});
  };

  const handleCreateOrder = async () => {
    if (!modalOrderData.title?.trim() || !modalOrderData.author?.trim() || 
        !modalOrderData.isbn?.trim() || !modalOrderData.supplier?.trim()) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }

    try {
      const orderData = {
        ...modalOrderData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, "book_orders"), orderData);
      
      closeOrderModal();
      await fetchAllData();
      alert("Поръчката е създадена успешно!");
      
    } catch (error) {
      console.error("Грешка при създаване на поръчка:", error);
      alert("Грешка при създаване на поръчка!");
    }
  };

  const handleUpdateOrder = async () => {
    if (!modalOrderData.id) return;
    
    if (!modalOrderData.title?.trim() || !modalOrderData.author?.trim() || 
        !modalOrderData.isbn?.trim() || !modalOrderData.supplier?.trim()) {
      alert("Моля, попълнете всички задължителни полета!");
      return;
    }

    try {
      await updateDoc(doc(db, "book_orders", modalOrderData.id), {
        ...modalOrderData,
        updatedAt: Timestamp.now()
      });
      
      closeOrderModal();
      await fetchAllData();
      alert("Поръчката е обновена успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на поръчка:", error);
      alert("Грешка при обновяване на поръчка!");
    }
  };

  const updateOrderStatus = async (orderId: string, status: BookOrder['status']) => {
    try {
      await updateDoc(doc(db, "book_orders", orderId), {
        status,
        updatedAt: Timestamp.now()
      });
      
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при обновяване на статуса на поръчка:", error);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете поръчката?")) return;
    try {
      await deleteDoc(doc(db, "book_orders", orderId));
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при изтриване на поръчка:", error);
    }
  };

  // Функции за доставчици
  const openCreateSupplierModal = () => {
    setModalMode('create');
    setModalSupplierData({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      rating: 5,
      deliveryTime: "7-14 дни",
      paymentTerms: "30 дни",
      notes: ""
    });
    setShowSupplierModal(true);
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setModalMode('edit');
    setModalSupplierData({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      address: supplier.address,
      rating: supplier.rating,
      deliveryTime: supplier.deliveryTime,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes
    });
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
    setModalSupplierData({});
  };

  const handleCreateSupplier = async () => {
    if (!modalSupplierData.name?.trim() || !modalSupplierData.contactPerson?.trim()) {
      alert("Моля, попълнете име на доставчика и лице за контакт!");
      return;
    }

    try {
      const supplierData = {
        ...modalSupplierData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, "suppliers"), supplierData);
      
      closeSupplierModal();
      await fetchAllData();
      alert("Доставчикът е добавен успешно!");
      
    } catch (error) {
      console.error("Грешка при добавяне на доставчик:", error);
      alert("Грешка при добавяне на доставчик!");
    }
  };

  const handleUpdateSupplier = async () => {
    if (!modalSupplierData.id) return;
    
    if (!modalSupplierData.name?.trim() || !modalSupplierData.contactPerson?.trim()) {
      alert("Моля, попълнете име на доставчика и лице за контакт!");
      return;
    }

    try {
      await updateDoc(doc(db, "suppliers", modalSupplierData.id), {
        ...modalSupplierData,
        updatedAt: Timestamp.now()
      });
      
      closeSupplierModal();
      await fetchAllData();
      alert("Доставчикът е обновен успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на доставчик:", error);
      alert("Грешка при обновяване на доставчик!");
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете доставчика?")) return;
    try {
      await deleteDoc(doc(db, "suppliers", supplierId));
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при изтриване на доставчик:", error);
    }
  };

  // Функции за инвентаризация
  const openCreateInventoryModal = () => {
    setModalMode('create');
    setModalInventoryData({
      date: new Date().toISOString().split('T')[0],
      auditor: "",
      section: "",
      totalBooks: 0,
      countedBooks: 0,
      discrepancies: 0,
      status: "planned",
      notes: ""
    });
    setShowInventoryModal(true);
  };

  const openEditInventoryModal = (audit: InventoryAudit) => {
    setModalMode('edit');
    setModalInventoryData({
      id: audit.id,
      date: audit.date,
      auditor: audit.auditor,
      section: audit.section,
      totalBooks: audit.totalBooks,
      countedBooks: audit.countedBooks,
      discrepancies: audit.discrepancies,
      status: audit.status,
      notes: audit.notes
    });
    setShowInventoryModal(true);
  };

  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setModalInventoryData({});
  };

  const handleCreateInventory = async () => {
    if (!modalInventoryData.section?.trim() || !modalInventoryData.auditor?.trim()) {
      alert("Моля, попълнете секция и извършител на инвентаризацията!");
      return;
    }

    try {
      const inventoryData = {
        ...modalInventoryData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(collection(db, "inventory_audits"), inventoryData);
      
      closeInventoryModal();
      await fetchAllData();
      alert("Инвентаризацията е планирана успешно!");
      
    } catch (error) {
      console.error("Грешка при планиране на инвентаризация:", error);
      alert("Грешка при планиране на инвентаризация!");
    }
  };

  const handleUpdateInventory = async () => {
    if (!modalInventoryData.id) return;
    
    if (!modalInventoryData.section?.trim() || !modalInventoryData.auditor?.trim()) {
      alert("Моля, попълнете секция и извършител на инвентаризацията!");
      return;
    }

    try {
      await updateDoc(doc(db, "inventory_audits", modalInventoryData.id), {
        ...modalInventoryData,
        updatedAt: Timestamp.now()
      });
      
      closeInventoryModal();
      await fetchAllData();
      alert("Инвентаризацията е обновена успешно!");
      
    } catch (error) {
      console.error("Грешка при обновяване на инвентаризация:", error);
      alert("Грешка при обновяване на инвентаризация!");
    }
  };

  const updateInventoryStatus = async (auditId: string, status: InventoryAudit['status']) => {
    try {
      await updateDoc(doc(db, "inventory_audits", auditId), {
        status,
        updatedAt: Timestamp.now()
      });
      
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при обновяване на статуса на инвентаризация:", error);
    }
  };

  const deleteInventory = async (auditId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете инвентаризацията?")) return;
    try {
      await deleteDoc(doc(db, "inventory_audits", auditId));
      await fetchAllData();
    } catch (error) {
      console.error("Грешка при изтриване на инвентаризация:", error);
    }
  };

  // Други функции
  const deleteBook = async (bookId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете книгата?")) return;
    try {
      await bookService.deleteBook(bookId);
      await fetchAllData();
      alert("Книгата е изтрита успешно!");
    } catch (error) {
      console.error("Error deleting book:", error);
      alert("Грешка при изтриване на книга!");
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете събитието?")) return;
    await deleteDoc(doc(db, "events", eventId));
    await fetchAllData();
  };

  const updateReservationStatus = async (reservationId: string, status: Reservation['status']) => {
    await updateDoc(doc(db, "reservations", reservationId), {
      status,
      updatedAt: Timestamp.now()
    });
    await fetchAllData();
  };

  // Филтрирани данни
  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      (book.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (book.author?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (book.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (book.genres && book.genres.some(genre => 
        genre.toLowerCase().includes(searchTerm.toLowerCase())
      )) ||
      (book.tags && book.tags.some(tag => 
        tag.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    return matchesSearch;
  });

  const filteredEvents = events.filter(event =>
    (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredReservations = reservations.filter(reservation =>
    (reservation.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (reservation.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredActiveEvents = activeEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchivedEvents = archivedEvents.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
console.log(filteredEvents);
  // Helper functions
  const getAvailableSpots = (event: Event) => {
    return event.maxParticipants - event.currentParticipants;
  };

  // Добави след helper функциите в кода
const formatFirestoreDate = (dateValue: any): string => {
  if (!dateValue) return "Няма дата";
  
  try {
    if (typeof dateValue === 'string') {
      return new Date(dateValue).toLocaleDateString('bg-BG');
    } else if (dateValue instanceof Date) {
      return dateValue.toLocaleDateString('bg-BG');
    } else if (dateValue.toDate) {
      return dateValue.toDate().toLocaleDateString('bg-BG');
    } else if (dateValue.seconds) {
      // Firestore Timestamp
      return new Date(dateValue.seconds * 1000).toLocaleDateString('bg-BG');
    }
    return "Няма дата";
  } catch (error) {
    console.error("Грешка при форматиране на дата:", error);
    return "Няма дата";
  }
};

  const isEventFull = (event: Event) => {
    return event.currentParticipants >= event.maxParticipants;
  };

  const getBookReservations = (bookId: string) => {
    return reservations.filter(r => r.bookId === bookId && r.status === 'active');
  };
console.log(getBookReservations);
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'overdue': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'ordered': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getInventoryStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'short'
    })} ${timeString}`;
  };
console.log(formatDateTime);
  const formatCurrency = (amount: number, currency: string = 'BGN') => {
    return new Intl.NumberFormat('bg-BG', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const renderStarRating = (rating: number) => {
    return (
      <div className={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={`${styles.starIcon} ${star <= Math.round(rating) ? styles.starFilled : ''}`}
            fill={star <= Math.round(rating) ? "currentColor" : "none"}
          />
        ))}
        <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Зареждане на библиотекарския панел...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.dashboardContainer}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <div className={styles.titleIconWrapper}>
              <Book className={styles.titleIcon} size={32} />
            </div>
            <div className={styles.titleContent}>
              <h1 className={styles.handwrittenTitle}>Библиотекарски Панел</h1>
              <p className={styles.subtitle}>
                Управление на книги, събития, резервации и задачи
              </p>
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.suggestBtn}>
              <Star size={18} />
              <span>Бърз достъп</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Търсене по заглавие, автор, име..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsSection}>
          <button 
            className={`${styles.tabButton} ${activeTab === "home" ? styles.active : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <Home size={18} />
            Начало
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "books" ? styles.active : ""}`}
            onClick={() => setActiveTab("books")}
          >
            <Book size={18} />
            Книги ({books.length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "events" ? styles.active : ""}`}
            onClick={() => setActiveTab("events")}
          >
            <Calendar size={18} />
            Събития ({events.length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "reservations" ? styles.active : ""}`}
            onClick={() => setActiveTab("reservations")}
          >
            <Bookmark size={18} />
            Резервации ({reservations.filter(r => r.status === 'active').length})
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === "popular" ? styles.active : ""}`}
            onClick={() => setActiveTab("popular")}
          >
            <TrendingUp size={18} />
            Популярни
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "ordering" ? styles.active : ""}`}
            onClick={() => setActiveTab("ordering")}
          >
            <ShoppingCart size={18} />
            Поръчки ({bookOrders.length})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "inventory" ? styles.active : ""}`}
            onClick={() => setActiveTab("inventory")}
          >
            <Clipboard size={18} />
            Инвентаризация ({inventoryAudits.length})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "suppliers" ? styles.active : ""}`}
            onClick={() => setActiveTab("suppliers")}
          >
            <Truck size={18} />
            Доставчици ({suppliers.length})
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === "reports" ? styles.active : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3 size={18} />
            Справки
          </button>
        </div>

        {/* Home Tab */}
        {activeTab === "home" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Общ Преглед</h2>
              <div className={styles.headerActions}>
                <button 
                  onClick={openCreateTaskModal}
                  className={styles.primaryBtn}
                >
                  <Plus size={16} />
                  Нова Задача
                </button>
              </div>
            </div>

            {/* Статистики */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statTasks}`}>
                  <AlertTriangle size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{stats.pendingTasks}</div>
                  <div className={styles.statLabel}>Чакащи задачи</div>
                  <div className={styles.statSubtext}>
                    {stats.highPriorityTasks} висок приоритет
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statReservations}`}>
                  <Bookmark size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{stats.activeReservations}</div>
                  <div className={styles.statLabel}>Активни резервации</div>
                  <div className={styles.statSubtext}>
                    {stats.pendingPickups} за взимане
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statBooks}`}>
                  <BookOpen size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{stats.totalBooks}</div>
                  <div className={styles.statLabel}>Общо книги</div>
                  <div className={styles.statSubtext}>
                    {stats.lowStockBooks} с нисък запас
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statOrders}`}>
                  <ShoppingCart size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{stats.pendingOrders}</div>
                  <div className={styles.statLabel}>Чакащи поръчки</div>
                  <div className={styles.statSubtext}>
                    за одобрение
                  </div>
                </div>
              </div>
            </div>

            {/* Предстоящи задачи */}
            <div className={`${styles.sectionCard} ${styles.darkCard}`}>
              <div className={styles.sectionHeader}>
                <h3>
                  <Bell size={20} />
                  Предстоящи задачи (днес и утре)
                </h3>
              </div>
              
              <div className={styles.tasksList}>
                {getUpcomingTasks().length > 0 ? (
                  getUpcomingTasks().map(task => {
                    const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
                    
                    return (
                      <div key={task.id} className={styles.taskItem}>
                        <div className={styles.taskInfo}>
                          <div className={styles.taskHeader}>
                            <div className={styles.taskType}>
                              {taskTypes.find(t => t.value === task.type)?.icon}
                              <span>{taskTypes.find(t => t.value === task.type)?.label}</span>
                            </div>
                            <div 
                              className={styles.taskPriority}
                              style={{ 
                                backgroundColor: `${getPriorityColor(task.priority)}20`,
                                color: getPriorityColor(task.priority),
                                border: `1px solid ${getPriorityColor(task.priority)}40`
                              }}
                            >
                              {priorityOptions.find(p => p.value === task.priority)?.label}
                            </div>
                          </div>
                          
                          <div className={styles.taskTitle}>
                            <h4>{task.title}</h4>
                            {isOverdue && (
                              <span className={styles.overdueBadge}>Изтекла</span>
                            )}
                          </div>
                          
                          {task.description && (
                            <p className={styles.taskDescription}>{task.description}</p>
                          )}
                          
                          <div className={styles.taskFooter}>
                            <div className={styles.taskDueDate}>
                              <Clock size={14} />
                              <span>Краен срок: {formatDate(task.dueDate)}</span>
                            </div>
                            <div 
                              className={styles.taskStatus}
                              style={{ 
                                backgroundColor: `${getStatusColor(task.status)}20`,
                                color: getStatusColor(task.status),
                                border: `1px solid ${getStatusColor(task.status)}40`
                              }}
                            >
                              {task.status === 'in_progress' ? 'В прогрес' : 
                               task.status === 'completed' ? 'Завършена' : 
                               task.status === 'overdue' ? 'Изтекла' : 'Чакаща'}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.taskActions}>
                          <button
                            onClick={() => openEditTaskModal(task)}
                            className={styles.editTaskBtn}
                            title="Редактирай"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className={styles.completeTaskBtn}
                            title="Маркирай като завършена"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className={styles.deleteTaskBtn}
                            title="Изтрий"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyState}>
                    <CheckCircle size={32} />
                    <p>Няма предстоящи задачи за днес и утре</p>
                    <button 
                      onClick={openCreateTaskModal}
                      className={styles.primaryBtn}
                    >
                      <Plus size={16} />
                      Създай първата задача
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Бърз преглед на други раздели */}
            <div className={styles.quickOverviewGrid}>
              {/* Скорошни резервации */}
              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <Bookmark size={18} />
                    Скорошни резервации
                  </h4>
                  <span className={styles.badge}>{getRecentReservations().length}</span>
                </div>
                
                <div className={styles.overviewList}>
                  {getRecentReservations().length > 0 ? (
                    getRecentReservations().map(reservation => {
                      const book = books.find(b => b.id === reservation.bookId);
                      return (
                        <div key={reservation.id} className={styles.overviewItem}>
                          <div className={styles.overviewItemMain}>
                            <div className={styles.overviewItemTitle}>
                              {book?.title || "Неизвестна книга"}
                            </div>
                            <div className={styles.overviewItemSubtext}>
                              от {reservation.userName}
                            </div>
                          </div>
                          <div className={styles.overviewItemMeta}>
                            <div className={styles.overviewItemDate}>
                              {reservation.reservedAt?.toDate 
                                ? new Date(reservation.reservedAt.toDate()).toLocaleDateString('bg-BG')
                                : "Няма дата"
                              }
                            </div>
                            <button
                              onClick={() => updateReservationStatus(reservation.id, 'completed')}
                              className={styles.smallActionBtn}
                              title="Маркирай като завършена"
                            >
                              <CheckCircle size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.overviewEmpty}>
                      <p>Няма скорошни резервации</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setActiveTab("reservations")}
                  className={styles.viewAllBtn}
                >
                  Виж всички резервации
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Книги с нисък запас */}
              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <AlertTriangle size={18} />
                    Книги с нисък запас
                  </h4>
                  <span className={styles.badge}>{getLowStockBooks().length}</span>
                </div>
                
                <div className={styles.overviewList}>
                  {getLowStockBooks().length > 0 ? (
                    getLowStockBooks().map(book => (
                      <div key={book.id} className={styles.overviewItem}>
                        <div className={styles.overviewItemMain}>
                          <div className={styles.overviewItemTitle}>
                            {book.title}
                          </div>
                          <div className={styles.overviewItemSubtext}>
                            {book.author}
                          </div>
                        </div>
                        <div className={styles.overviewItemMeta}>
                          <div className={`${styles.stockLevel} ${book.availableCopies === 0 ? styles.outOfStock : styles.lowStock}`}>
                            {book.availableCopies === 0 ? 'Изчерпана' : `${book.availableCopies} копия`}
                          </div>
                          <button
                            onClick={() => openEditBookModal(book)}
                            className={styles.smallActionBtn}
                            title="Редактирай"
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.overviewEmpty}>
                      <p>Всички книги са с добър запас</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setActiveTab("books")}
                  className={styles.viewAllBtn}
                >
                  Виж всички книги
                  <ChevronRight size={16} />
                </button>
              </div>
// В края на Home Tab (след quickOverviewGrid) добавете:
<div className={styles.recentOverview}>
  <div className={`${styles.overviewCard} ${styles.darkCard}`}>
    <div className={styles.overviewHeader}>
      <h4>
        <ShoppingCart size={18} />
        Скорошни поръчки
      </h4>
      <span className={styles.badge}>{getRecentOrders().length}</span>
    </div>
    <div className={styles.overviewList}>
      {getRecentOrders().slice(0, 5).map(order => (
        <div key={order.id} className={styles.overviewItem}>
          <div className={styles.overviewItemMain}>
            <div className={styles.overviewItemTitle}>{order.title}</div>
            <div className={styles.overviewItemSubtext}>
              {order.supplier} • {formatDate(order.orderDate)}
            </div>
          </div>
          <div className={styles.overviewItemMeta}>
            <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
              {order.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>

  <div className={`${styles.overviewCard} ${styles.darkCard}`}>
    <div className={styles.overviewHeader}>
      <h4>
        <Clipboard size={18} />
        Скорошни инвентаризации
      </h4>
      <span className={styles.badge}>{getRecentAudits().length}</span>
    </div>
    <div className={styles.overviewList}>
      {getRecentAudits().slice(0, 5).map(audit => (
        <div key={audit.id} className={styles.overviewItem}>
          <div className={styles.overviewItemMain}>
            <div className={styles.overviewItemTitle}>{audit.section}</div>
            <div className={styles.overviewItemSubtext}>
              {audit.auditor} • {formatDate(audit.date)}
            </div>
          </div>
          <div className={styles.overviewItemMeta}>
            <span className={`${styles.statusBadge} ${styles[`status${audit.status}`]}`}>
              {audit.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
              {/* Предстоящи събития */}
              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <Calendar size={18} />
                    Предстоящи събития
                  </h4>
                  <span className={styles.badge}>{getUpcomingEvents().length}</span>
                </div>
                
                <div className={styles.overviewList}>
                  {getUpcomingEvents().length > 0 ? (
                    getUpcomingEvents().map(event => {
                      const availableSpots = getAvailableSpots(event);
                      const isFull = isEventFull(event);
                      
                      return (
                        <div key={event.id} className={styles.overviewItem}>
                          <div className={styles.overviewItemMain}>
                            <div className={styles.overviewItemTitle}>
                              {event.title}
                            </div>
                            <div className={styles.overviewItemSubtext}>
                              {event.location} • {event.time}
                            </div>
                          </div>
                          <div className={styles.overviewItemMeta}>
                            <div className={`${styles.eventSpots} ${isFull ? styles.full : ''}`}>
                              {availableSpots} места
                            </div>
                            <button
                              onClick={() => openEditEventModal(event)}
                              className={styles.smallActionBtn}
                              title="Редактирай"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.overviewEmpty}>
                      <p>Няма предстоящи събития</p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setActiveTab("events")}
                  className={styles.viewAllBtn}
                >
                  Виж всички събития
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Books Tab */}
        {activeTab === "books" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Управление на Книги</h2>
              <div className={styles.headerActions}>
                <button 
                  onClick={openCreateBookModal}
                  className={styles.primaryBtn}
                >
                  <Plus size={16} />
                  Добави Нова Книга
                </button>
                <button 
                  onClick={openCreateOrderModal}
                  className={styles.secondaryBtn}
                >
                  <ShoppingCart size={16} />
                  Поръчай Книги
                </button>
              </div>
            </div>

            {/* Books Grid */}
            <div className={styles.booksGridAdmin}>
              {filteredBooks.map((book) => (
                <div key={book.id} className={`${styles.bookCardAdmin} ${styles.darkCard}`}>
                  {/* Book Header */}
                  <div className={styles.bookHeaderAdmin}>
                    <div className={styles.bookThumbnailAdmin}>
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className={styles.bookCoverAdmin} />
                      ) : (
                        <div className={styles.bookImageFallbackAdmin}>
                          <Book className={styles.fallbackIconAdmin} />
                        </div>
                      )}
                    </div>

                    <div className={styles.bookMainInfoAdmin}>
                      <div className={styles.bookTitleSectionAdmin}>
                        <h3 className={styles.bookTitleAdmin}>
                          {book.title}
                        </h3>
                        <p className={styles.bookAuthorAdmin}>{book.author}</p>
                      </div>

                      <div className={styles.bookMetaAdmin}>
                        <div className={styles.bookCategoryAdmin}>
                          <Tag size={14} />
                          <span>{book.category}</span>
                        </div>
                        
                        <div className={styles.bookAvailabilityAdmin}>
                          <Copy size={14} />
                          <span>{book.availableCopies}/{book.copies} копия</span>
                        </div>

                        <div className={styles.bookLocationAdmin}>
                          <MapPin size={14} />
                          <span>{book.location}</span>
                        </div>

                        <div className={styles.bookIsbnAdmin}>
                          <span>ISBN: {book.isbn}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Book Description */}
                  {book.description && (
                    <div className={styles.bookDescriptionAdmin}>
                      <p>{book.description.substring(0, 150)}...</p>
                    </div>
                  )}

                  {/* Book Details */}
                  <div className={styles.bookDetailsAdmin}>
                    <div className={styles.detailsGridAdmin}>
                      <div className={styles.bookDetailAdmin}>
                        <span className={styles.detailLabelAdmin}>Издател:</span>
                        <span className={styles.detailValueAdmin}>{book.publisher || "Няма информация"}</span>
                      </div>
                      <div className={styles.bookDetailAdmin}>
                        <span className={styles.detailLabelAdmin}>Година:</span>
                        <span className={styles.detailValueAdmin}>{book.year}</span>
                      </div>
                      {book.pages && (
                        <div className={styles.bookDetailAdmin}>
                          <span className={styles.detailLabelAdmin}>Страници:</span>
                          <span className={styles.detailValueAdmin}>{book.pages}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Book Stats */}
                  <div className={styles.bookStatsAdmin}>
                    <div className={styles.statGroupAdmin}>
                      <Star size={14} />
                      <span>Рейтинг: {book.rating?.toFixed(1) || 0}/5</span>
                    </div>
                    <div className={styles.statGroupAdmin}>
                      <Eye size={14} />
                      <span>Прегледи: {book.views || 0}</span>
                    </div>
                    <div className={styles.statGroupAdmin}>
                      <Users size={14} />
                      <span>Чакащи: {book.reservationQueue || 0}</span>
                    </div>
                  </div>

                  {/* Book Actions */}
                  <div className={styles.bookActionsAdmin}>
                    <div className={styles.adminActionButtons}>
                      <button
                        onClick={() => openEditBookModal(book)}
                        className={styles.editBookBtn}
                        title="Редактирай книга"
                      >
                        <Edit size={16} />
                        <span>Редактирай</span>
                      </button>
                      
                      <button
                        onClick={() => deleteBook(book.id)}
                        className={styles.deleteBookBtn}
                        title="Изтрий книга"
                      >
                        <Trash2 size={16} />
                        <span>Изтрий</span>
                      </button>
                    </div>
                    <div className={styles.bookStatsAdmin}>
                      <div className={styles.statGroupAdmin}>
                        <Book size={14} />
                        <span>ID: {book.id.substring(0, 8)}...</span>
                      </div>
                      <div className={styles.statGroupAdmin}>
                        <Calendar size={14} />
                        <span>Добавена: {formatFirestoreDate(book.createdAt)}
                            : "Няма дата"
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredBooks.length === 0 && (
                <div className={styles.emptyState}>
                  <Book size={48} />
                  <p>Няма намерени книги</p>
                  <button 
                    onClick={openCreateBookModal}
                    className={styles.primaryBtn}
                  >
                    <Plus size={16} />
                    Добави първата книга
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <div className={styles.eventsHeader}>
                <h2>Управление на Събития</h2>
                <div className={styles.eventFilters}>
                  <button
                    className={`${styles.filterBtn} ${!showArchivedEvents ? styles.active : ''}`}
                    onClick={() => setShowArchivedEvents(false)}
                  >
                    <Calendar size={16} />
                    Активни ({activeEvents.length})
                  </button>
                  <button
                    className={`${styles.filterBtn} ${showArchivedEvents ? styles.active : ''}`}
                    onClick={() => setShowArchivedEvents(true)}
                  >
                    <Archive size={16} />
                    Архив ({archivedEvents.length})
                  </button>
                </div>
              </div>
              <button 
                onClick={openCreateEventModal}
                className={styles.primaryBtn}
              >
                <Plus size={16} />
                Създай Ново Събитие
              </button>
            </div>

            {/* Active Events */}
            {!showArchivedEvents && (
              <>
                <div className={styles.tableContainer}>
                  <table className={`${styles.dataTable} ${styles.darkTable}`}>
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
                      {filteredActiveEvents.map(event => (
                        <tr key={event.id} className={isEventFull(event) ? styles.eventFull : ''}>
                          <td className={styles.eventInfoCell}>
                            <div className={styles.eventTitleSection}>
                              <div className={styles.eventTitle}>
                                {event.title || "Без заглавие"}
                              </div>
                              <div className={styles.eventDesc}>{event.description || "Без описание"}</div>
                            </div>
                          </td>
                          <td className={styles.eventTimeCell}>
                            <div className={styles.eventTimeDisplay}>
                              <div className={styles.eventDate}>
                                <Calendar size={14} />
                                {event.date ? new Date(event.date).toLocaleDateString('bg-BG') : "Без дата"}
                              </div>
                              <div className={styles.eventTimeRange}>
                                <Clock size={14} />
                                {event.time || "Без час"} - {event.endTime || "Без край"}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.eventLocation}>
                              <MapPin size={14} />
                              {event.location || "Без място"}
                            </div>
                          </td>
                          <td>
                            <div className={styles.participantsInfo}>
                              <div className={styles.participantsCount}>
                                <User size={14} />
                                {event.currentParticipants} / {event.maxParticipants}
                              </div>
                              <div className={styles.availableSpots}>
                                Свободни: {getAvailableSpots(event)}
                              </div>
                              {isEventFull(event) && (
                                <div className={styles.fullBadge}>Пълно</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.actionButtons}>
                              <button
                                onClick={() => openEditEventModal(event)}
                                className={styles.editBtn}
                                title="Редактирай"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteEvent(event.id)}
                                className={styles.deleteBtn}
                                title="Изтрий"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredActiveEvents.length === 0 && (
                    <div className={styles.emptyState}>
                      <Calendar size={32} />
                      <p>Няма активни събития</p>
                      <button 
                        onClick={openCreateEventModal}
                        className={styles.primaryBtn}
                      >
                        <Plus size={16} />
                        Създай първото събитие
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Archived Events */}
            {showArchivedEvents && (
              <>
                <div className={styles.tableContainer}>
                  <table className={`${styles.dataTable} ${styles.darkTable} ${styles.archivedTable}`}>
                    <thead>
                      <tr>
                        <th>Заглавие</th>
                        <th>Дата и час</th>
                        <th>Място</th>
                        <th>Участници</th>
                        <th>Статус</th>
                        <th>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchivedEvents.map(event => {
                        const isPast = new Date(event.date) < new Date();
                        
                        return (
                          <tr key={event.id} className={styles.archivedRow}>
                            <td className={styles.eventInfoCell}>
                              <div className={styles.eventTitleSection}>
                                <div className={styles.eventTitle}>
                                  {event.title || "Без заглавие"}
                                  <span className={styles.archivedBadge}>Архивирано</span>
                                </div>
                                <div className={styles.eventDesc}>{event.description || "Без описание"}</div>
                              </div>
                            </td>
                            <td className={styles.eventTimeCell}>
                              <div className={styles.eventTimeDisplay}>
                                <div className={styles.eventDate}>
                                  <Calendar size={14} />
                                  {event.date ? new Date(event.date).toLocaleDateString('bg-BG') : "Без дата"}
                                </div>
                                <div className={styles.eventTimeRange}>
                                  <Clock size={14} />
                                  {event.time || "Без час"} - {event.endTime || "Без край"}
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className={styles.eventLocation}>
                                <MapPin size={14} />
                                {event.location || "Без място"}
                              </div>
                            </td>
                            <td>
                              <div className={styles.participantsInfo}>
                                <div className={styles.participantsCount}>
                                  <User size={14} />
                                  {event.currentParticipants} / {event.maxParticipants}
                                </div>
                                <div className={styles.archivedParticipants}>
                                  Участвали: {event.currentParticipants}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={styles.archivedStatus}>
                                {isPast ? 'Изтекло' : 'Завършено'}
                              </span>
                            </td>
                            <td>
                              <div className={styles.actionButtons}>
                                <button
                                  onClick={() => openEditEventModal(event)}
                                  className={styles.editBtn}
                                  title="Редактирай"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => deleteEvent(event.id)}
                                  className={styles.deleteBtn}
                                  title="Изтрий"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredArchivedEvents.length === 0 && (
                    <div className={styles.emptyState}>
                      <Archive size={32} />
                      <p>Няма архивирани събития</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Reservations Tab */}
        {activeTab === "reservations" && (
          <div className={styles.contentSection}>
            <h2>Управление на Резервации</h2>
            
            <div className={styles.statsGrid}>
              <div className={`${styles.statCard} ${styles.darkCard}`}>
                <div className={`${styles.statIcon} ${styles.activeReservations}`}>
                  <Bookmark size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>
                    {reservations.filter(r => r.status === 'active').length}
                  </div>
                  <div className={styles.statLabel}>Активни резервации</div>
                </div>
              </div>
              <div className={`${styles.statCard} ${styles.darkCard}`}>
                <div className={`${styles.statIcon} ${styles.completedReservations}`}>
                  <UserCheck size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>
                    {reservations.filter(r => r.status === 'completed').length}
                  </div>
                  <div className={styles.statLabel}>Завършени</div>
                </div>
              </div>
              <div className={`${styles.statCard} ${styles.darkCard}`}>
                <div className={`${styles.statIcon} ${styles.totalReservations}`}>
                  <Book size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{reservations.length}</div>
                  <div className={styles.statLabel}>Общо резервации</div>
                </div>
              </div>
            </div>

            <div className={styles.tableContainer}>
              <table className={`${styles.dataTable} ${styles.darkTable}`}>
                <thead>
                  <tr>
                    <th>Книга</th>
                    <th>Потребител</th>
                    <th>Дата на резервация</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map(reservation => {
                    const book = books.find(b => b.id === reservation.bookId);
                    return (
                      <tr key={reservation.id}>
                        <td>
                          <div className={styles.bookInfo}>
                            <div className={styles.bookTitle}>{book?.title || "Неизвестна книга"}</div>
                            <div className={styles.bookAuthor}>{book?.author || "Неизвестен автор"}</div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.userInfo}>
                            <div className={styles.userName}>{reservation.userName || "Без име"}</div>
                            <div className={styles.userEmail}>{reservation.userEmail || "Без имейл"}</div>
                          </div>
                        </td>
                        <td>
                          {reservation.reservedAt?.toDate 
                            ? new Date(reservation.reservedAt.toDate()).toLocaleDateString('bg-BG')
                            : "Няма дата"
                          }
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}`]}`}>
                            {reservation.status === 'active' ? 'Активна' : 
                             reservation.status === 'completed' ? 'Завършена' : 'Отменена'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
    {reservation.status === 'active' && (
      <>
        <button
          onClick={() => approveReservationAndBorrowBook(reservation.id, reservation.bookId, reservation.userId)}
          className={styles.completeBtn}
          title="Одобри и маркирай като взета"
        >
          <BookOpen size={16} />
          <span>Взета</span>
        </button>
        <button
          onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
          className={styles.cancelBtn}
          title="Откажи резервация"
        >
          <X size={16} />
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
              {filteredReservations.length === 0 && (
                <div className={styles.emptyState}>
                  <Bookmark size={32} />
                  <p>Няма намерени резервации</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Popular Tab */}
        {activeTab === "popular" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Популярни книги и чакащи хора</h2>
              <div className={styles.headerActions}>
                <button 
                  onClick={() => setPopularFilter("mostLiked")}
                  className={`${styles.smallBtn} ${popularFilter === "mostLiked" ? styles.active : ""}`}
                >
                  <Star size={14} />
                  Най-харесани
                </button>
                <button 
                  onClick={() => setPopularFilter("mostWaited")}
                  className={`${styles.smallBtn} ${popularFilter === "mostWaited" ? styles.active : ""}`}
                >
                  <Users size={14} />
                  Най-чакани
                </button>
                <button 
                  onClick={() => setPopularFilter("mostViewed")}
                  className={`${styles.smallBtn} ${popularFilter === "mostViewed" ? styles.active : ""}`}
                >
                  <Eye size={14} />
                  Най-гледани
                </button>
              </div>
            </div>

            {/* Обобщени статистики за популярни книги */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statPopular}`}>
                  <Star size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{popularStats.highlyRatedCount}</div>
                  <div className={styles.statLabel}>Високо оценени книги</div>
                  <div className={styles.statSubtext}>
                    рейтинг ≥ 4.0
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statWaiting}`}>
                  <Users size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{popularStats.totalWaitingPeople}</div>
                  <div className={styles.statLabel}>Общо чакащи хора</div>
                  <div className={styles.statSubtext}>
                    във всички опашки
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statViews}`}>
                  <Eye size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{popularStats.totalViews}</div>
                  <div className={styles.statLabel}>Общо прегледи</div>
                  <div className={styles.statSubtext}>
                    на всички книги
                  </div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statQueue}`}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{popularStats.booksWithWaitingList}</div>
                  <div className={styles.statLabel}>Книги с опашка</div>
                  <div className={styles.statSubtext}>
                    имат списък на чакащите
                  </div>
                </div>
              </div>
            </div>

            {/* Най-добри перформанси */}
            <div className={`${styles.sectionCard} ${styles.darkCard}`}>
              <div className={styles.sectionHeader}>
                <h3>
                  <Award size={20} />
                  Най-добри перформанси
                </h3>
              </div>
              
              <div className={styles.topPerformers}>
                <div className={styles.performerCard}>
                  <div className={styles.performerIcon}>
                    <Star size={24} />
                  </div>
                  <div className={styles.performerInfo}>
                    <h4>Най-високо оценена книга</h4>
                    {popularStats.topRatedBook ? (
                      <>
                        <div className={styles.performerTitle}>{popularStats.topRatedBook.title}</div>
                        <div className={styles.performerSubtitle}>от {popularStats.topRatedBook.author}</div>
                        <div className={styles.performerStats}>
                          <span className={styles.performerRating}>
                            <Star size={12} />
                            {popularStats.topRatedBook.rating?.toFixed(1) || 0}/5
                          </span>
                          <span className={styles.performerCount}>
                            ({popularStats.topRatedBook.ratingsCount || 0} оценки)
                          </span>
                        </div>
                      </>
                    ) : (
                      <p>Няма данни</p>
                    )}
                  </div>
                </div>
                
                <div className={styles.performerCard}>
                  <div className={styles.performerIcon}>
                    <Users size={24} />
                  </div>
                  <div className={styles.performerInfo}>
                    <h4>Най-търсена книга</h4>
                    {popularStats.mostWaitedBook ? (
                      <>
                        <div className={styles.performerTitle}>{popularStats.mostWaitedBook.title}</div>
                        <div className={styles.performerSubtitle}>от {popularStats.mostWaitedBook.author}</div>
                        <div className={styles.performerStats}>
                          <span className={styles.performerWaiting}>
                            <Users size={12} />
                            {popularStats.mostWaitedBook.reservationQueue || 0} чакащи
                          </span>
                          <span className={styles.performerAvailable}>
                            {popularStats.mostWaitedBook.availableCopies || 0} налични
                          </span>
                        </div>
                      </>
                    ) : (
                      <p>Няма данни</p>
                    )}
                  </div>
                </div>
                
                <div className={styles.performerCard}>
                  <div className={styles.performerIcon}>
                    <Eye size={24} />
                  </div>
                  <div className={styles.performerInfo}>
                    <h4>Най-преглеждана книга</h4>
                    {popularStats.mostViewedBook ? (
                      <>
                        <div className={styles.performerTitle}>{popularStats.mostViewedBook.title}</div>
                        <div className={styles.performerSubtitle}>от {popularStats.mostViewedBook.author}</div>
                        <div className={styles.performerStats}>
                          <span className={styles.performerViews}>
                            <Eye size={12} />
                            {popularStats.mostViewedBook.views || 0} прегледа
                          </span>
                        </div>
                      </>
                    ) : (
                      <p>Няма данни</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Списък с книги според избрания филтър */}
            <div className={`${styles.sectionCard} ${styles.darkCard}`}>
              <div className={styles.sectionHeader}>
                <h3>
                  {popularFilter === "mostLiked" && <Star size={20} />}
                  {popularFilter === "mostWaited" && <Users size={20} />}
                  {popularFilter === "mostViewed" && <Eye size={20} />}
                  {popularFilter === "mostLiked" && "Най-харесани книги"}
                  {popularFilter === "mostWaited" && "Книги с най-дълги опашки"}
                  {popularFilter === "mostViewed" && "Най-преглеждани книги"}
                </h3>
                <span className={styles.badge}>{getFilteredPopularBooks().length}</span>
              </div>
              
              <div className={styles.tableContainer}>
                <table className={`${styles.dataTable} ${styles.darkTable}`}>
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Книга</th>
                      <th>Автор</th>
                      <th>Категория</th>
                      <th>Рейтинг</th>
                      <th>Прегледи</th>
                      <th>Чакащи</th>
                      <th>Наличност</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredPopularBooks().map((book, index) => (
                      <tr key={book.id}>
                        <td className={styles.rankCell}>
                          <div className={`${styles.rankBadge} ${index < 3 ? styles.topRank : ''}`}>
                            {index + 1}
                          </div>
                        </td>
                        <td>
                          <div className={styles.bookInfo}>
                            <div className={styles.bookTitle}>{book.title}</div>
                            <div className={styles.bookAuthor}>{book.author}</div>
                          </div>
                        </td>
                        <td>{book.author}</td>
                        <td>{book.category}</td>
                        <td>
                          <div className={styles.ratingCell}>
                            {renderStarRating(book.rating || 0)}
                            <span className={styles.ratingCount}>({book.ratingsCount || 0})</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.viewsCell}>
                            <Eye size={12} />
                            <span>{book.views || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.waitingCell} ${(book.reservationQueue || 0) > 0 ? styles.hasWaiting : ''}`}>
                            <Users size={12} />
                            <span>{book.reservationQueue || 0}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.availabilityCell} ${book.availableCopies === 0 ? styles.outOfStock : book.availableCopies <= 2 ? styles.lowStock : ''}`}>
                            {book.availableCopies}/{book.copies}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => openEditBookModal(book)}
                              className={styles.editBtn}
                              title="Редактирай"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => window.open(`/library?book=${book.id}`, '_blank')}
                              className={styles.completeBtn}
                              title="Виж в библиотеката"
                            >
                              <BookOpen size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredPopularBooks().length === 0 && (
                  <div className={styles.emptyState}>
                    <Star size={32} />
                    <p>Няма данни за популярни книги</p>
                    <button 
                      onClick={() => setActiveTab("books")}
                      className={styles.primaryBtn}
                    >
                      <Plus size={16} />
                      Добави книги
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Диаграма на топ 10 книги */}
            <div className={styles.quickOverviewGrid}>
              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <TrendingUp size={18} />
                    Топ 10 книги по рейтинг
                  </h4>
                </div>
                
                <div className={styles.overviewList}>
                  {getTopRatedBooks().slice(0, 10).map((book, index) => (
                    <div key={book.id} className={styles.overviewItem}>
                      <div className={styles.overviewItemMain}>
                        <div className={styles.overviewItemTitle}>
                          <span className={styles.rankNumber}>{index + 1}.</span> 
                          {book.title}
                        </div>
                        <div className={styles.overviewItemSubtext}>
                          {book.author}
                        </div>
                      </div>
                      <div className={styles.overviewItemMeta}>
                        <div className={styles.bookRating}>
                          <Star size={12} />
                          <span>{book.rating?.toFixed(1) || 0}</span>
                        </div>
                        <button
                          onClick={() => openEditBookModal(book)}
                          className={styles.smallActionBtn}
                          title="Редактирай"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setActiveTab("books")}
                  className={styles.viewAllBtn}
                >
                  Виж всички книги
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <Users size={18} />
                    Топ 10 книги по чакащи
                  </h4>
                </div>
                
                <div className={styles.overviewList}>
                  {getBooksWithLongestWaitingList().slice(0, 10).map((book, index) => (
                    <div key={book.id} className={styles.overviewItem}>
                      <div className={styles.overviewItemMain}>
                        <div className={styles.overviewItemTitle}>
                          <span className={styles.rankNumber}>{index + 1}.</span> 
                          {book.title}
                        </div>
                        <div className={styles.overviewItemSubtext}>
                          {book.author}
                        </div>
                      </div>
                      <div className={styles.overviewItemMeta}>
                        <div className={styles.waitingQueue}>
                          <Users size={12} />
                          <span>{book.reservationQueue || 0}</span>
                        </div>
                        <button
                          onClick={() => openEditBookModal(book)}
                          className={styles.smallActionBtn}
                          title="Редактирай"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setActiveTab("books")}
                  className={styles.viewAllBtn}
                >
                  Виж всички книги
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className={`${styles.overviewCard} ${styles.darkCard}`}>
                <div className={styles.overviewHeader}>
                  <h4>
                    <Eye size={18} />
                    Топ 10 книги по прегледи
                  </h4>
                </div>
                
                <div className={styles.overviewList}>
                  {getMostViewedBooks().slice(0, 10).map((book, index) => (
                    <div key={book.id} className={styles.overviewItem}>
                      <div className={styles.overviewItemMain}>
                        <div className={styles.overviewItemTitle}>
                          <span className={styles.rankNumber}>{index + 1}.</span> 
                          {book.title}
                        </div>
                        <div className={styles.overviewItemSubtext}>
                          {book.author}
                        </div>
                      </div>
                      <div className={styles.overviewItemMeta}>
                        <div className={styles.bookViews}>
                          <Eye size={12} />
                          <span>{book.views || 0}</span>
                        </div>
                        <button
                          onClick={() => openEditBookModal(book)}
                          className={styles.smallActionBtn}
                          title="Редактирай"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={() => setActiveTab("books")}
                  className={styles.viewAllBtn}
                >
                  Виж всички книги
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ordering Tab */}
        {activeTab === "ordering" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Поръчка на книги</h2>
              <div className={styles.headerActions}>
                <button 
                  onClick={openCreateOrderModal}
                  className={styles.primaryBtn}
                >
                  <Plus size={16} />
                  Нова Поръчка
                </button>
                <button 
                  onClick={openCreateSupplierModal}
                  className={styles.secondaryBtn}
                >
                  <Truck size={16} />
                  Добави Доставчик
                </button>
              </div>
            </div>

            {/* Order Statistics */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statTotalOrders}`}>
                  <ShoppingCart size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{orderStats.totalOrders}</div>
                  <div className={styles.statLabel}>Общо поръчки</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statPendingOrders}`}>
                  <Clock size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{orderStats.pendingOrders}</div>
                  <div className={styles.statLabel}>Чакащи</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statDeliveredOrders}`}>
                  <CheckCircle size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{orderStats.deliveredOrders}</div>
                  <div className={styles.statLabel}>Доставени</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statValueOrders}`}>
                  <DollarSign size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{orderStats.totalValue}</div>
                  <div className={styles.statLabel}>Обща стойност</div>
                </div>
              </div>
            </div>

            {/* Order Filters */}
            <div className={styles.filtersSection}>
              <div className={styles.filterButtons}>
                <button
                  className={`${styles.filterBtn} ${orderFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setOrderFilter('all')}
                >
                  Всички
                </button>
                <button
                  className={`${styles.filterBtn} ${orderFilter === 'pending' ? styles.active : ''}`}
                  onClick={() => setOrderFilter('pending')}
                >
                  Чакащи
                </button>
                <button
                  className={`${styles.filterBtn} ${orderFilter === 'ordered' ? styles.active : ''}`}
                  onClick={() => setOrderFilter('ordered')}
                >
                  Поръчани
                </button>
                <button
                  className={`${styles.filterBtn} ${orderFilter === 'shipped' ? styles.active : ''}`}
                  onClick={() => setOrderFilter('shipped')}
                >
                  Изпратени
                </button>
                <button
                  className={`${styles.filterBtn} ${orderFilter === 'delivered' ? styles.active : ''}`}
                  onClick={() => setOrderFilter('delivered')}
                >
                  Доставени
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className={styles.tableContainer}>
              <table className={`${styles.dataTable} ${styles.darkTable}`}>
                <thead>
                  <tr>
                    <th>Номер</th>
                    <th>Книга</th>
                    <th>Доставчик</th>
                    <th>Дата на поръчка</th>
                    <th>Очаквана доставка</th>
                    <th>Количество</th>
                    <th>Стойност</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOrders().map(order => (
                    <tr key={order.id}>
                      <td>
                        <div className={styles.orderNumber}>
                          <Hash size={12} />
                          {order.orderNumber}
                        </div>
                      </td>
                      <td>
                        <div className={styles.bookInfo}>
                          <div className={styles.bookTitle}>{order.title}</div>
                          <div className={styles.bookAuthor}>{order.author}</div>
                          <div className={styles.bookIsbn}>ISBN: {order.isbn}</div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.supplierInfo}>
                          <div className={styles.supplierName}>{order.supplier}</div>
                          <div className={styles.supplierContact}>{order.supplierContact}</div>
                        </div>
                      </td>
                      <td>{formatDate(order.orderDate)}</td>
                      <td>{formatDate(order.expectedDelivery)}</td>
                      <td>
                        <div className={styles.quantityBadge}>
                          {order.copies} бр.
                        </div>
                      </td>
                      <td>
                        <div className={styles.priceValue}>
                          {formatCurrency(order.price * order.copies, order.currency)}
                        </div>
                      </td>
                      <td>
                        <span 
                          className={styles.statusBadge}
                          style={{ 
                            backgroundColor: `${getOrderStatusColor(order.status)}20`,
                            color: getOrderStatusColor(order.status),
                            border: `1px solid ${getOrderStatusColor(order.status)}40`
                          }}
                        >
                          {orderStatuses.find(s => s.value === order.status)?.label}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button
                            onClick={() => openEditOrderModal(order)}
                            className={styles.editBtn}
                            title="Редактирай"
                          >
                            <Edit size={16} />
                          </button>
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                const nextStatus = 
                                  order.status === 'pending' ? 'ordered' :
                                  order.status === 'ordered' ? 'shipped' :
                                  order.status === 'shipped' ? 'delivered' : order.status;
                                updateOrderStatus(order.id, nextStatus);
                              }}
                              className={styles.completeBtn}
                              title="Следващ статус"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteOrder(order.id)}
                            className={styles.deleteBtn}
                            title="Изтрий"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getFilteredOrders().length === 0 && (
                <div className={styles.emptyState}>
                  <ShoppingCart size={48} />
                  <p>Няма намерени поръчки</p>
                  <button 
                    onClick={openCreateOrderModal}
                    className={styles.primaryBtn}
                  >
                    <Plus size={16} />
                    Създай първата поръчка
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Инвентаризация</h2>
              <div className={styles.headerActions}>
                <button 
                  onClick={openCreateInventoryModal}
                  className={styles.primaryBtn}
                >
                  <Plus size={16} />
                  Нова Инвентаризация
                </button>
                <button 
                  onClick={openCreateTaskModal}
                  className={styles.secondaryBtn}
                >
                  <CheckSquare size={16} />
                  Добави Задача
                </button>
              </div>
            </div>

            {/* Inventory Statistics */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statTotalAudits}`}>
                  <Clipboard size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{inventoryStats.totalAudits}</div>
                  <div className={styles.statLabel}>Общо инвентаризации</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statInProgress}`}>
                  <Activity size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{inventoryStats.inProgressAudits}</div>
                  <div className={styles.statLabel}>В ход</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statCompleted}`}>
                  <CheckCircle size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{inventoryStats.completedAudits}</div>
                  <div className={styles.statLabel}>Завършени</div>
                </div>
              </div>
              
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.statAccuracy}`}>
                  <Target size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statNumber}>{inventoryStats.accuracyRate}%</div>
                  <div className={styles.statLabel}>Точност</div>
                </div>
              </div>
            </div>

            {/* Inventory Filters */}
            <div className={styles.filtersSection}>
              <div className={styles.filterButtons}>
                <button
                  className={`${styles.filterBtn} ${inventoryFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setInventoryFilter('all')}
                >
                  Всички
                </button>
                <button
                  className={`${styles.filterBtn} ${inventoryFilter === 'planned' ? styles.active : ''}`}
                  onClick={() => setInventoryFilter('planned')}
                >
                  Планирани
                </button>
                <button
                  className={`${styles.filterBtn} ${inventoryFilter === 'in_progress' ? styles.active : ''}`}
                  onClick={() => setInventoryFilter('in_progress')}
                >
                  В ход
                </button>
                <button
                  className={`${styles.filterBtn} ${inventoryFilter === 'completed' ? styles.active : ''}`}
                  onClick={() => setInventoryFilter('completed')}
                >
                  Завършени
                </button>
              </div>
            </div>

            {/* Inventory Table */}
            <div className={styles.tableContainer}>
              <table className={`${styles.dataTable} ${styles.darkTable}`}>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Секция</th>
                    <th>Извършител</th>
                    <th>Книги (общо/преброени)</th>
                    <th>Разминавания</th>
                    <th>Точност</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAudits().map(audit => {
                    const accuracy = audit.totalBooks > 0 
                      ? ((audit.countedBooks - audit.discrepancies) / audit.totalBooks * 100).toFixed(1)
                      : "100";
                    
                    return (
                      <tr key={audit.id}>
                        <td>{formatDate(audit.date)}</td>
                        <td>
                          <div className={styles.sectionInfo}>
                            <div className={styles.sectionName}>{audit.section}</div>
                          </div>
                        </td>
                        <td>{audit.auditor}</td>
                        <td>
                          <div className={styles.booksCount}>
                            <span className={styles.totalCount}>{audit.totalBooks}</span>
                            <span className={styles.separator}>/</span>
                            <span className={styles.countedCount}>{audit.countedBooks}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.discrepancyBadge} ${audit.discrepancies > 0 ? styles.hasDiscrepancy : ''}`}>
                            {audit.discrepancies}
                          </div>
                        </td>
                        <td>
                          <div className={`${styles.accuracyBadge} ${parseFloat(accuracy) >= 95 ? styles.highAccuracy : parseFloat(accuracy) >= 90 ? styles.mediumAccuracy : styles.lowAccuracy}`}>
                            {accuracy}%
                          </div>
                        </td>
                        <td>
                          <span 
                            className={styles.statusBadge}
                            style={{ 
                              backgroundColor: `${getInventoryStatusColor(audit.status)}20`,
                              color: getInventoryStatusColor(audit.status),
                              border: `1px solid ${getInventoryStatusColor(audit.status)}40`
                            }}
                          >
                            {inventoryStatuses.find(s => s.value === audit.status)?.label}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              onClick={() => openEditInventoryModal(audit)}
                              className={styles.editBtn}
                              title="Редактирай"
                            >
                              <Edit size={16} />
                            </button>
                            {audit.status !== 'completed' && audit.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  const nextStatus = 
                                    audit.status === 'planned' ? 'in_progress' :
                                    audit.status === 'in_progress' ? 'completed' : audit.status;
                                  updateInventoryStatus(audit.id, nextStatus);
                                }}
                                className={styles.completeBtn}
                                title="Следващ статус"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteInventory(audit.id)}
                              className={styles.deleteBtn}
                              title="Изтрий"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {getFilteredAudits().length === 0 && (
                <div className={styles.emptyState}>
                  <Clipboard size={48} />
                  <p>Няма намерени инвентаризации</p>
                  <button 
                    onClick={openCreateInventoryModal}
                    className={styles.primaryBtn}
                  >
                    <Plus size={16} />
                    Планирай първа инвентаризация
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === "suppliers" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Доставчици</h2>
              <button 
                onClick={openCreateSupplierModal}
                className={styles.primaryBtn}
              >
                <Plus size={16} />
                Добави Доставчик
              </button>
            </div>

            {/* Suppliers Grid */}
            <div className={styles.suppliersGrid}>
              {suppliers.map(supplier => (
                <div key={supplier.id} className={`${styles.supplierCard} ${styles.darkCard}`}>
                  <div className={styles.supplierHeader}>
                    <div className={styles.supplierIcon}>
                      <Truck size={24} />
                    </div>
                    <div className={styles.supplierMainInfo}>
                      <h3 className={styles.supplierName}>{supplier.name}</h3>
                      <div className={styles.supplierContactPerson}>
                        <User size={14} />
                        <span>{supplier.contactPerson}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.supplierDetails}>
                    <div className={styles.supplierDetail}>
                      <Mail size={14} />
                      <span>{supplier.email}</span>
                    </div>
                    <div className={styles.supplierDetail}>
                      <Phone size={14} />
                      <span>{supplier.phone}</span>
                    </div>
                    {supplier.website && (
                      <div className={styles.supplierDetail}>
                        <Globe size={14} />
                        <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                          {supplier.website}
                        </a>
                      </div>
                    )}
                    <div className={styles.supplierDetail}>
                      <MapPin size={14} />
                      <span>{supplier.address}</span>
                    </div>
                  </div>

                  <div className={styles.supplierStats}>
                    <div className={styles.supplierStat}>
                      <div className={styles.statLabel}>Рейтинг:</div>
                      <div className={styles.supplierRating}>
                        {renderStarRating(supplier.rating)}
                      </div>
                    </div>
                    <div className={styles.supplierStat}>
                      <div className={styles.statLabel}>Срок на доставка:</div>
                      <div className={styles.statValue}>{supplier.deliveryTime}</div>
                    </div>
                    <div className={styles.supplierStat}>
                      <div className={styles.statLabel}>Условия за плащане:</div>
                      <div className={styles.statValue}>{supplier.paymentTerms}</div>
                    </div>
                  </div>

                  {supplier.notes && (
                    <div className={styles.supplierNotes}>
                      <FileText size={14} />
                      <span>{supplier.notes}</span>
                    </div>
                  )}

                  <div className={styles.supplierActions}>
                    <button
                      onClick={() => openEditSupplierModal(supplier)}
                      className={styles.editBtn}
                      title="Редактирай"
                    >
                      <Edit size={16} />
                      <span>Редактирай</span>
                    </button>
                    <button
                      onClick={() => deleteSupplier(supplier.id)}
                      className={styles.deleteBtn}
                      title="Изтрий"
                    >
                      <Trash2 size={16} />
                      <span>Изтрий</span>
                    </button>
                  </div>
                </div>
              ))}
              
              {suppliers.length === 0 && (
                <div className={styles.emptyState}>
                  <Truck size={48} />
                  <p>Няма намерени доставчици</p>
                  <button 
                    onClick={openCreateSupplierModal}
                    className={styles.primaryBtn}
                  >
                    <Plus size={16} />
                    Добави първи доставчик
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className={styles.contentSection}>
            <div className={styles.roomsHeader}>
              <h2>Справки и отчети</h2>
            </div>

            <div className={styles.reportsGrid}>
              {/* Статистики за книги */}
              <div className={`${styles.reportCard} ${styles.darkCard}`}>
                <div className={styles.reportHeader}>
                  <Book size={24} />
                  <h3>Статистики за книги</h3>
                </div>
                <div className={styles.reportStats}>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Общ брой книги:</div>
                    <div className={styles.statValue}>{books.length}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Среден рейтинг:</div>
                    <div className={styles.statValue}>{popularStats.averageRating}/5</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Общо прегледи:</div>
                    <div className={styles.statValue}>{popularStats.totalViews}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Книги с опашка:</div>
                    <div className={styles.statValue}>{popularStats.booksWithWaitingList}</div>
                  </div>
                </div>
                <button className={styles.reportBtn}>
                  <Download size={16} />
                  Изтекти отчет
                </button>
              </div>

              {/* Статистики за поръчки */}
              <div className={`${styles.reportCard} ${styles.darkCard}`}>
                <div className={styles.reportHeader}>
                  <ShoppingCart size={24} />
                  <h3>Статистики за поръчки</h3>
                </div>
                <div className={styles.reportStats}>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Общо поръчки:</div>
                    <div className={styles.statValue}>{orderStats.totalOrders}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Чакащи поръчки:</div>
                    <div className={styles.statValue}>{orderStats.pendingOrders}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Обща стойност:</div>
                    <div className={styles.statValue}>{formatCurrency(parseFloat(orderStats.totalValue))}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Средно време за доставка:</div>
                    <div className={styles.statValue}>{orderStats.avgDeliveryTime} дни</div>
                  </div>
                </div>
                <button className={styles.reportBtn}>
                  <Printer size={16} />
                  Принтирай отчет
                </button>
              </div>

              {/* Статистики за инвентаризация */}
              <div className={`${styles.reportCard} ${styles.darkCard}`}>
                <div className={styles.reportHeader}>
                  <Clipboard size={24} />
                  <h3>Статистики за инвентаризация</h3>
                </div>
                <div className={styles.reportStats}>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Общо инвентаризации:</div>
                    <div className={styles.statValue}>{inventoryStats.totalAudits}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Завършени:</div>
                    <div className={styles.statValue}>{inventoryStats.completedAudits}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Точност:</div>
                    <div className={styles.statValue}>{inventoryStats.accuracyRate}%</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Разминавания:</div>
                    <div className={styles.statValue}>{inventoryStats.totalDiscrepancies}</div>
                  </div>
                </div>
                <button className={styles.reportBtn}>
                  <BarChart size={16} />
                  Генерирай отчет
                </button>
              </div>

              {/* Статистики за резервации */}
              <div className={`${styles.reportCard} ${styles.darkCard}`}>
                <div className={styles.reportHeader}>
                  <Bookmark size={24} />
                  <h3>Статистики за резервации</h3>
                </div>
                <div className={styles.reportStats}>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Активни резервации:</div>
                    <div className={styles.statValue}>{reservations.filter(r => r.status === 'active').length}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Завършени:</div>
                    <div className={styles.statValue}>{reservations.filter(r => r.status === 'completed').length}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Отменени:</div>
                    <div className={styles.statValue}>{reservations.filter(r => r.status === 'cancelled').length}</div>
                  </div>
                  <div className={styles.reportStat}>
                    <div className={styles.statLabel}>Общо:</div>
                    <div className={styles.statValue}>{reservations.length}</div>
                  </div>
                </div>
                <button className={styles.reportBtn}>
                  <FileText size={16} />
                  Създай отчет
                </button>
              </div>
            </div>

            {/* Бързи отчети */}
            <div className={styles.quickReports}>
              <h3>Бързи отчети</h3>
              <div className={styles.quickReportButtons}>
                <button className={styles.quickReportBtn}>
                  <Calendar size={16} />
                  Дневен отчет
                </button>
                <button className={styles.quickReportBtn}>
                  <TrendingUp size={16} />
                  Седмичен отчет
                </button>
                <button className={styles.quickReportBtn}>
                  <BarChart3 size={16} />
                  Месечен отчет
                </button>
                <button className={styles.quickReportBtn}>
                  <Star size={16} />
                  Най-популярни книги
                </button>
                <button className={styles.quickReportBtn}>
                  <AlertTriangle size={16} />
                  Книги с нисък запас
                </button>
                <button className={styles.quickReportBtn}>
                  <DollarSign size={16} />
                  Финансов отчет
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Модални прозорци */}
        {/* Book Modal */}
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
            <label className="required">Заглавие</label>
            <input
              type="text"
              placeholder="Заглавие на книгата"
              value={modalBookData.title || ""}
              onChange={(e) => setModalBookData({...modalBookData, title: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Автор</label>
            <input
              type="text"
              placeholder="Автор на книгата"
              value={modalBookData.author || ""}
              onChange={(e) => setModalBookData({...modalBookData, author: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">ISBN</label>
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
            <label className="required">Жанрове</label>
            <select
              value={modalBookData.genres?.[0] || ""}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setModalBookData({
                    ...modalBookData,
                    genres: [value] 
                  });
                }
              }}
              className="modal-form-input"
            >
              <option value="">Изберете жанр</option>
              {bookService.BOOK_GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
            <small className="help-text">
              Изберете основен жанр за книгата
            </small>
            {modalBookData.genres && modalBookData.genres.length > 0 && (
              <div className="selected-genres">
                Избран жанр: {modalBookData.genres[0]}
              </div>
            )}
          </div>
          
          <div className="modal-form-group">
            <label className="required">Брой копия</label>
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
            <label>Налични копия</label>
            <input
              type="number"
              min="0"
              max={modalBookData.copies || 1}
              value={modalBookData.availableCopies || (modalBookData.copies || 1)}
              onChange={(e) => setModalBookData({...modalBookData, availableCopies: parseInt(e.target.value) || 0})}
              className="modal-form-input"
            />
          </div>

          {/* Библиотекарски полета (задължителни) */}
          <div className="modal-form-group">
            <label className="required">Рафт</label>
            <input
              type="text"
              placeholder="Напр. БГ ЛИТ A3"
              value={modalBookData.shelfNumber || ""}
              onChange={(e) => setModalBookData({...modalBookData, shelfNumber: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Сигнатура</label>
            <input
              type="text"
              placeholder="Напр. 891.811 V39"
              value={modalBookData.callNumber || ""}
              onChange={(e) => setModalBookData({...modalBookData, callNumber: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          <div className="modal-form-group">
            <label className="required">Местоположение</label>
            <input
              type="text"
              placeholder="Напр. Основен отдел"
              value={modalBookData.location || "Библиотека"}
              onChange={(e) => setModalBookData({...modalBookData, location: e.target.value})}
              className="modal-form-input"
            />
          </div>
          
          {/* Параметри за заемане */}
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
              value={modalBookData.pages || 0}
              onChange={(e) => setModalBookData({...modalBookData, pages: parseInt(e.target.value) || 0})}
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
              })()}
            </div>
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
          
          {/* Флагчета в отделен ред (едно под друго) */}
          <div className="modal-form-group full-width">
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={modalBookData.featured || false}
                  onChange={(e) => setModalBookData({...modalBookData, featured: e.target.checked})}
                  className="checkbox-input"
                />
                <span>⭐ Препоръчана книга</span>
              </label>
              <small className="checkbox-help">
                (показва се най-отгоре в списъците)
              </small>
            </div>
            
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={modalBookData.isActive !== false}
                  onChange={(e) => setModalBookData({...modalBookData, isActive: e.target.checked})}
                  className="checkbox-input"
                />
                <span>Активна книга</span>
              </label>
              <small className="checkbox-help">
                (показва се в системата)
              </small>
            </div>
            
            <div className="checkbox-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={modalBookData.underMaintenance || false}
                  onChange={(e) => setModalBookData({...modalBookData, underMaintenance: e.target.checked})}
                  className="checkbox-input"
                />
                <span>🔧 В ремонт/обслужване</span>
              </label>
              <small className="checkbox-help">
                (не може да се заема)
              </small>
            </div>
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
                     !modalBookData.isbn?.trim() || !modalBookData.category?.trim() ||
                     !modalBookData.shelfNumber?.trim() || !modalBookData.callNumber?.trim()}
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

        {/* Event Modal */}
        {showEventModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.largeModal} ${styles.darkModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Създаване на ново събитие' : 'Редактиране на събитие'}
                </h3>
                <button onClick={closeEventModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  {/* Основни полета за събитие */}
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label className={styles.required}>Заглавие на събитието *</label>
                    <input
                      type="text"
                      value={modalEventData.title || ""}
                      onChange={(e) => setModalEventData({...modalEventData, title: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Въведете заглавие"
                    />
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Описание</label>
                    <textarea
                      value={modalEventData.description || ""}
                      onChange={(e) => setModalEventData({...modalEventData, description: e.target.value})}
                      className={styles.modalFormInput}
                      rows={3}
                      placeholder="Опишете събитието"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Дата *</label>
                    <input
                      type="date"
                      value={modalEventData.date || ""}
                      onChange={(e) => setModalEventData({...modalEventData, date: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Начален час *</label>
                    <select
                      value={modalEventData.time || ""}
                      onChange={(e) => setModalEventData({...modalEventData, time: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете час</option>
                      {timeOptionsWithMinutes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Краен час *</label>
                    <select
                      value={modalEventData.endTime || ""}
                      onChange={(e) => setModalEventData({...modalEventData, endTime: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете час</option>
                      {timeOptionsWithMinutes.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Местоположение *</label>
                    <select
                      value={modalEventData.location || ""}
                      onChange={(e) => setModalEventData({...modalEventData, location: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете местоположение</option>
                      {locationOptions.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Максимален брой участници</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={modalEventData.maxParticipants || 20}
                      onChange={(e) => setModalEventData({...modalEventData, maxParticipants: parseInt(e.target.value) || 20})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Организатор</label>
                    <input
                      type="text"
                      value={modalEventData.organizer || ""}
                      onChange={(e) => setModalEventData({...modalEventData, organizer: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Име на организатора"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>URL на снимка</label>
                    <input
                      type="text"
                      value={modalEventData.imageUrl || ""}
                      onChange={(e) => setModalEventData({...modalEventData, imageUrl: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateEvent : handleUpdateEvent}
                    disabled={
                      !modalEventData.title?.trim() || 
                      !modalEventData.date || 
                      !modalEventData.time || 
                      !modalEventData.endTime || 
                      !modalEventData.location
                    }
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Създай Събитие' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeEventModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Modal */}
        {showOrderModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.largeModal} ${styles.darkModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Създаване на нова поръчка' : 'Редактиране на поръчка'}
                </h3>
                <button onClick={closeOrderModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  {/* Информация за книгата */}
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      type="text"
                      value={modalOrderData.title || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, title: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Заглавие на книгата"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Автор *</label>
                    <input
                      type="text"
                      value={modalOrderData.author || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, author: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Автор"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>ISBN *</label>
                    <input
                      type="text"
                      value={modalOrderData.isbn || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, isbn: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="ISBN номер"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Категория</label>
                    <select
                      value={modalOrderData.category || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, category: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете категория</option>
                      {bookService.BOOK_CATEGORIES.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Информация за поръчката */}
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Доставчик *</label>
                    <select
                      value={modalOrderData.supplier || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, supplier: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете доставчик</option>
                      {suppliersList.map(supplier => (
                        <option key={supplier} value={supplier}>{supplier}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Контакт с доставчика</label>
                    <input
                      type="text"
                      value={modalOrderData.supplierContact || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, supplierContact: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Имейл или телефон"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Брой копия *</label>
                    <input
                      type="number"
                      min="1"
                      value={modalOrderData.copies || 1}
                      onChange={(e) => setModalOrderData({...modalOrderData, copies: parseInt(e.target.value) || 1})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Цена за брой</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={modalOrderData.price || 0}
                      onChange={(e) => setModalOrderData({...modalOrderData, price: parseFloat(e.target.value) || 0})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Валута</label>
                    <select
                      value={modalOrderData.currency || "BGN"}
                      onChange={(e) => setModalOrderData({...modalOrderData, currency: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      {currencies.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Дата на поръчка *</label>
                    <input
                      type="date"
                      value={modalOrderData.orderDate || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, orderDate: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Очаквана доставка</label>
                    <input
                      type="date"
                      value={modalOrderData.expectedDelivery || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, expectedDelivery: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Статус</label>
                    <select
                      value={modalOrderData.status || "pending"}
                      onChange={(e) => setModalOrderData({...modalOrderData, status: e.target.value as any})}
                      className={styles.modalFormInput}
                    >
                      {orderStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Бележки</label>
                    <textarea
                      value={modalOrderData.notes || ""}
                      onChange={(e) => setModalOrderData({...modalOrderData, notes: e.target.value})}
                      className={styles.modalFormInput}
                      rows={3}
                      placeholder="Допълнителни бележки към поръчката"
                    />
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateOrder : handleUpdateOrder}
                    disabled={
                      !modalOrderData.title?.trim() || 
                      !modalOrderData.author?.trim() || 
                      !modalOrderData.isbn?.trim() || 
                      !modalOrderData.supplier?.trim()
                    }
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Създай Поръчка' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeOrderModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Modal */}
        {showSupplierModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.mediumModal} ${styles.darkModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Добавяне на нов доставчик' : 'Редактиране на доставчик'}
                </h3>
                <button onClick={closeSupplierModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Име на доставчика *</label>
                    <input
                      type="text"
                      value={modalSupplierData.name || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, name: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Име на фирмата"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Лице за контакт *</label>
                    <input
                      type="text"
                      value={modalSupplierData.contactPerson || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, contactPerson: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Име на контакта"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Имейл</label>
                    <input
                      type="email"
                      value={modalSupplierData.email || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, email: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="имейл@пример.com"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Телефон</label>
                    <input
                      type="tel"
                      value={modalSupplierData.phone || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, phone: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="+359 888 123 456"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Уебсайт</label>
                    <input
                      type="url"
                      value={modalSupplierData.website || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, website: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="https://example.com"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Адрес</label>
                    <input
                      type="text"
                      value={modalSupplierData.address || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, address: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Пълен адрес"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Рейтинг (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={modalSupplierData.rating || 5}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, rating: parseFloat(e.target.value) || 5})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Срок на доставка</label>
                    <input
                      type="text"
                      value={modalSupplierData.deliveryTime || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, deliveryTime: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Напр. 7-14 дни"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Условия за плащане</label>
                    <input
                      type="text"
                      value={modalSupplierData.paymentTerms || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, paymentTerms: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Напр. 30 дни"
                    />
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Бележки</label>
                    <textarea
                      value={modalSupplierData.notes || ""}
                      onChange={(e) => setModalSupplierData({...modalSupplierData, notes: e.target.value})}
                      className={styles.modalFormInput}
                      rows={3}
                      placeholder="Допълнителни бележки за доставчика"
                    />
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateSupplier : handleUpdateSupplier}
                    disabled={!modalSupplierData.name?.trim() || !modalSupplierData.contactPerson?.trim()}
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Добави Доставчик' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeSupplierModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Modal */}
        {showInventoryModal && (
          <div className={styles.modalOverlay}>
            <div className={`${styles.modalContent} ${styles.mediumModal} ${styles.darkModal}`}>
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === 'create' ? 'Планиране на инвентаризация' : 'Редактиране на инвентаризация'}
                </h3>
                <button onClick={closeInventoryModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Дата *</label>
                    <input
                      type="date"
                      value={modalInventoryData.date || ""}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, date: e.target.value})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Извършител *</label>
                    <input
                      type="text"
                      value={modalInventoryData.auditor || ""}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, auditor: e.target.value})}
                      className={styles.modalFormInput}
                      placeholder="Име на извършителя"
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Секция *</label>
                    <select
                      value={modalInventoryData.section || ""}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, section: e.target.value})}
                      className={styles.modalFormInput}
                    >
                      <option value="">Изберете секция</option>
                      {bookSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Общо книги</label>
                    <input
                      type="number"
                      min="0"
                      value={modalInventoryData.totalBooks || 0}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, totalBooks: parseInt(e.target.value) || 0})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Преброени книги</label>
                    <input
                      type="number"
                      min="0"
                      value={modalInventoryData.countedBooks || 0}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, countedBooks: parseInt(e.target.value) || 0})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Разминавания</label>
                    <input
                      type="number"
                      min="0"
                      value={modalInventoryData.discrepancies || 0}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, discrepancies: parseInt(e.target.value) || 0})}
                      className={styles.modalFormInput}
                    />
                  </div>
                  
                  <div className={styles.modalFormGroup}>
                    <label>Статус</label>
                    <select
                      value={modalInventoryData.status || "planned"}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, status: e.target.value as any})}
                      className={styles.modalFormInput}
                    >
                      {inventoryStatuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className={`${styles.modalFormGroup} ${styles.fullWidth}`}>
                    <label>Бележки</label>
                    <textarea
                      value={modalInventoryData.notes || ""}
                      onChange={(e) => setModalInventoryData({...modalInventoryData, notes: e.target.value})}
                      className={styles.modalFormInput}
                      rows={3}
                      placeholder="Допълнителни бележки за инвентаризацията"
                    />
                  </div>
                </div>
                
                <div className={styles.modalActions}>
                  <button 
                    onClick={modalMode === 'create' ? handleCreateInventory : handleUpdateInventory}
                    disabled={!modalInventoryData.section?.trim() || !modalInventoryData.auditor?.trim()}
                    className={`${styles.primaryBtn} ${styles.modalSaveBtn}`}
                  >
                    <Save size={16} />
                    {modalMode === 'create' ? 'Планирай Инвентаризация' : 'Запази Промените'}
                  </button>
                  <button 
                    onClick={closeInventoryModal}
                    className={styles.secondaryBtn}
                  >
                    Отказ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrarianDashboard;