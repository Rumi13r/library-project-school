// src/components/Dashboard/LibrarianDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { db } from "../../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import * as bookService from "../../lib/services/bookService";
import type { BookLibrary } from "../../lib/services/bookTypes";
import {
  Calendar,
  Trash2,
  Plus,
  Search,
  Clock,
  Edit,
  X,
  Save,
  Book,
  UserCheck,
  Bookmark,
  Home,
  AlertTriangle,
  CheckCircle,
  Bell,
  TrendingUp,
  Users,
  Package,
  Eye,
  Star,
  BarChart,
  BookOpen,
  Loader2,
  ChevronRight,
  Award,
  CheckSquare,
  ShoppingCart,
  Truck,
  Clipboard,
  DollarSign,
  BarChart3,
  FileText,
  Download,
  Printer,
  Wrench,
  Zap,
  Brain,
} from "lucide-react";
import styles from "./LibrarianDashboard.module.css";
import { groqService } from "../../services/groqService";
import type { GroqRecommendation } from "../../services/groqService";

import BooksTab from "./BooksTab";
import EventsTab from "./EventsTab";
import OrdersTab from "./OrdersTab";
import InventoryTab from "./InventoryTab";
import SuppliersTab from "./SuppliersTab";
import AIAnalysisTab from "./AIAnalysisTab";
import TasksTab from "./TasksTab";
import BookFormModal from "./BookFormModal";
import OnlineBooksTab from "./OnlineBooksTab";
import AIResourcesTab from "./AIResourcesTab";
import StudyMaterialsTab from "./StudyMaterialsTab";

import type {
  LibraryEvent,
  Reservation,
  LibrarianTask,
  BookOrder,
  Supplier,
  InventoryAudit,
} from "../../lib/services/types";

type FSTimestamp = { toDate: () => Date; seconds?: number };
type FSSeconds = { seconds: number; toDate?: never };
type FSDate = FSTimestamp | FSSeconds | Date | string | null | undefined;

// ─────────────────────────────────────────────────────────────────────────────
const LibrarianDashboard: React.FC = () => {
  // ── Data state ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<LibraryEvent[]>([]);
  const [books, setBooks] = useState<BookLibrary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<LibrarianTask[]>([]);
  const [bookOrders, setBookOrders] = useState<BookOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryAudits, setInventoryAudits] = useState<InventoryAudit[]>([]);

  // ── Groq state ──────────────────────────────────────────────────────────────
  const [groqAnalysis, setGroqAnalysis] = useState<string>("");
  const [groqBookAnalysis, setGroqBookAnalysis] = useState<string>("");
  const [groqEventAnalysis, setGroqEventAnalysis] = useState<string>("");
  const [groqRecommendations, setGroqRecommendations] = useState<
    GroqRecommendation[]
  >([]);
  const [groqLoading, setGroqLoading] = useState<boolean>(false);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [isDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "books"
    | "events"
    | "reservations"
    | "tasks"
    | "popular"
    | "ordering"
    | "inventory"
    | "suppliers"
    | "reports"
    | "ai"
    | "onlineBooks"
    | "aiResources"
    | "studyMaterials"
  >("home");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [popularFilter, setPopularFilter] = useState<
    "mostLiked" | "mostWaited" | "mostViewed"
  >("mostLiked");
  const [orderFilter, setOrderFilter] = useState<
    "all" | "pending" | "ordered" | "shipped" | "delivered"
  >("all");
  const [inventoryFilter, setInventoryFilter] = useState<
    "all" | "planned" | "in_progress" | "completed"
  >("all");

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [showBookModal, setShowBookModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // ── Modal data ───────────────────────────────────────────────────────────────
  const [modalBookData, setModalBookData] = useState<Partial<BookLibrary>>({
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
    digitalVersion: { available: false, format: "", url: "" },
    isActive: true,
    underMaintenance: false,
  });

  const [modalEventData, setModalEventData] = useState<Partial<LibraryEvent>>({
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
    participants: [],
  });

  const [modalTaskData, setModalTaskData] = useState<Partial<LibrarianTask>>({
    title: "",
    description: "",
    type: "inventory",
    priority: "medium",
    status: "pending",
    assignedTo: "",
    dueDate: "",
  });

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
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    status: "pending",
    orderNumber: `ORD-${Date.now()}`,
    notes: "",
    createdBy: "Библиотекар",
  });

  const [modalSupplierData, setModalSupplierData] = useState<Partial<Supplier>>(
    {
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      rating: 5,
      deliveryTime: "7-14 дни",
      paymentTerms: "30 дни",
      notes: "",
    },
  );

  const [modalInventoryData, setModalInventoryData] = useState<
    Partial<InventoryAudit>
  >({
    date: new Date().toISOString().split("T")[0],
    auditor: "",
    section: "",
    totalBooks: 0,
    countedBooks: 0,
    discrepancies: 0,
    status: "planned",
    notes: "",
  });

  // ── Theme ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  // ── Constants ────────────────────────────────────────────────────────────────
  const locationOptions = [
    "1303",
    "3310",
    "3301-EOП",
    "3305-АНП",
    "библиотека",
    "Зала Европа",
    "Комп.каб.-ТЧ",
    "Физкултура3",
    "1201",
    "1202",
    "1203",
    "1206",
    "1408-КК",
    "1308-КК",
    "1101",
    "1102",
    "1103",
    "1104",
    "1105",
    "1106",
    "1204",
    "1205",
    "1207",
    "1209",
    "1301",
    "1302",
    "1304",
    "1305",
    "1307",
    "1309",
    "1401",
    "1402",
    "1403",
    "1404",
    "1405",
    "1406",
    "1407",
    "1409",
    "1306",
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
    "Специални колекции",
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
    "Други",
  ];

  const currencies = ["BGN", "EUR", "USD"];

  const taskTypes = [
    {
      value: "reservation",
      label: "Обработка на резервация",
      icon: <Bookmark size={16} />,
    },
    {
      value: "return",
      label: "Връщане на книга",
      icon: <BookOpen size={16} />,
    },
    {
      value: "inventory",
      label: "Инвентаризация",
      icon: <Package size={16} />,
    },
    {
      value: "event",
      label: "Организация на събитие",
      icon: <Calendar size={16} />,
    },
    { value: "maintenance", label: "Поддръжка", icon: <Wrench size={16} /> },
    {
      value: "ordering",
      label: "Поръчка на книги",
      icon: <ShoppingCart size={16} />,
    },
    {
      value: "cataloging",
      label: "Каталогизиране",
      icon: <FileText size={16} />,
    },
  ];

  const priorityOptions = [
    { value: "low", label: "Ниска", color: "#10b981" },
    { value: "medium", label: "Средна", color: "#f59e0b" },
    { value: "high", label: "Висока", color: "#ef4444" },
    { value: "urgent", label: "Спешна", color: "#dc2626" },
  ];

  const orderStatuses = [
    { value: "pending", label: "Чакаща", color: "#f59e0b" },
    { value: "ordered", label: "Поръчана", color: "#3b82f6" },
    { value: "shipped", label: "Изпратена", color: "#8b5cf6" },
    { value: "delivered", label: "Доставена", color: "#10b981" },
    { value: "cancelled", label: "Отменена", color: "#ef4444" },
  ];

  const inventoryStatuses = [
    { value: "planned", label: "Планирана", color: "#3b82f6" },
    { value: "in_progress", label: "В ход", color: "#f59e0b" },
    { value: "completed", label: "Завършена", color: "#10b981" },
    { value: "cancelled", label: "Отменена", color: "#ef4444" },
  ];

  const timeOptionsWithMinutes = (() => {
    const opts: string[] = [];
    for (let h = 7; h <= 19; h++)
      for (let m = 0; m < 60; m += 15)
        opts.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`,
        );
    return opts;
  })();

  // ── Computed ─────────────────────────────────────────────────────────────────
  const { activeEvents, archivedEvents } = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      activeEvents: events
        .filter((e) => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date)),
      archivedEvents: events
        .filter((e) => e.date < today)
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  }, [events]);

  const getMostLikedBooks = () =>
    books
      .filter((b) => (b.rating ?? 0) >= 4)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  const getBooksWithLongestWaiting = () =>
    books
      .filter((b) => (b.reservationQueue || 0) > 0)
      .sort((a, b) => (b.reservationQueue || 0) - (a.reservationQueue || 0))
      .slice(0, 10);
  const getMostViewedBooks = () =>
    books
      .filter((b) => (b.views || 0) > 0)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
  const getTopRatedBooks = () =>
    [...books]
      .sort((a, b) => {
        const d = (b.rating || 0) - (a.rating || 0);
        return d !== 0 ? d : (b.ratingsCount || 0) - (a.ratingsCount || 0);
      })
      .slice(0, 10);

  const getFilteredPopularBooks = () => {
    switch (popularFilter) {
      case "mostLiked":
        return getMostLikedBooks();
      case "mostWaited":
        return getBooksWithLongestWaiting();
      case "mostViewed":
        return getMostViewedBooks();
      default:
        return getTopRatedBooks();
    }
  };

  const calculateStats = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      pendingTasks: tasks.filter((t) => t.status === "pending").length,
      highPriorityTasks: tasks.filter(
        (t) => t.priority === "high" || t.priority === "urgent",
      ).length,
      overdueTasks: tasks.filter(
        (t) => t.dueDate < today && t.status !== "completed",
      ).length,
      activeReservations: reservations.filter((r) => r.status === "active")
        .length,
      pendingPickups: reservations.filter((r) => r.status === "active").length,
      lowStockBooks: books.filter((b) => b.availableCopies <= 2 && b.copies > 0)
        .length,
      totalBooks: books.length,
      todayEvents: events.filter((e) => e.date === today).length,
      upcomingEvents: activeEvents.length,
      pendingOrders: bookOrders.filter((o) => o.status === "pending").length,
      recentAudits: inventoryAudits.filter((a) => a.date === today).length,
    };
  }, [
    tasks,
    reservations,
    books,
    events,
    activeEvents,
    bookOrders,
    inventoryAudits,
  ]);

  const stats = calculateStats();

  const popularStats = useMemo(() => {
    const totalWaitingPeople = books.reduce(
      (s, b) => s + Math.max(0, b.reservationQueue || 0),
      0,
    );
    const averageRating = books.length
      ? books.reduce((s, b) => s + (b.rating || 0), 0) / books.length
      : 0;
    const totalViews = books.reduce((s, b) => s + (b.views || 0), 0);
    return {
      totalWaitingPeople,
      averageRating: averageRating.toFixed(1),
      totalViews,
      highlyRatedCount: books.filter((b) => (b.rating || 0) >= 4).length,
      booksWithWaitingList: books.filter((b) => (b.reservationQueue || 0) > 0)
        .length,
      topRatedBook: getTopRatedBooks()[0] || null,
      mostWaitedBook: getBooksWithLongestWaiting()[0] || null,
      mostViewedBook: getMostViewedBooks()[0] || null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  const orderStats = useMemo(
    () => ({
      totalOrders: bookOrders.length,
      pendingOrders: bookOrders.filter((o) => o.status === "pending").length,
      deliveredOrders: bookOrders.filter((o) => o.status === "delivered")
        .length,
      totalValue: bookOrders
        .reduce((s, o) => s + o.price * o.copies, 0)
        .toFixed(2),
    }),
    [bookOrders],
  );

  const inventoryStats = useMemo(() => {
    const completed = inventoryAudits.filter(
      (a) => a.status === "completed",
    ).length;
    const counted = inventoryAudits.reduce(
      (s, a) => s + (a.countedBooks || 0),
      0,
    );
    const discrepancies = inventoryAudits.reduce(
      (s, a) => s + (a.discrepancies || 0),
      0,
    );
    return {
      totalAudits: inventoryAudits.length,
      completedAudits: completed,
      inProgress: inventoryAudits.filter((a) => a.status === "in_progress")
        .length,
      totalDiscrepancies: discrepancies,
      accuracyRate:
        counted > 0
          ? (((counted - discrepancies) / counted) * 100).toFixed(1)
          : "100",
    };
  }, [inventoryAudits]);

  const getUpcomingTasks = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomStr = tomorrow.toISOString().split("T")[0];
    const po: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return tasks
      .filter(
        (t) =>
          t.dueDate >= today && t.dueDate <= tomStr && t.status !== "completed",
      )
      .sort((a, b) => {
        const d = po[a.priority] - po[b.priority];
        return d !== 0 ? d : a.dueDate.localeCompare(b.dueDate);
      });
  }, [tasks]);

  const getRecentReservations = useCallback(
    () =>
      reservations
        .filter((r) => r.status === "active")
        .sort((a, b) => {
          const resolveFSDate = (v: FSDate): Date => {
            if (!v) return new Date(0);
            if (v instanceof Date) return v;
            if (typeof v === "string") return new Date(v);
            if ("toDate" in v && typeof v.toDate === "function")
              return v.toDate();
            if ("seconds" in v && typeof v.seconds === "number")
              return new Date(v.seconds * 1000);
            return new Date(0);
          };
          return (
            resolveFSDate(b.reservedAt as FSDate).getTime() -
            resolveFSDate(a.reservedAt as FSDate).getTime()
          );
        })
        .slice(0, 5),
    [reservations],
  );

  const getLowStockBooks = useCallback(
    () =>
      books
        .filter((b) => b.availableCopies <= 2 && b.copies > 0)
        .sort((a, b) => a.availableCopies - b.availableCopies)
        .slice(0, 5),
    [books],
  );

  const getUpcomingEvents = useCallback(
    () => activeEvents.slice(0, 5),
    [activeEvents],
  );

  const getRecentOrders = useCallback(
    () =>
      [...bookOrders]
        .sort(
          (a, b) =>
            new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
        )
        .slice(0, 5),
    [bookOrders],
  );

  const getRecentAudits = useCallback(
    () =>
      [...inventoryAudits]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [inventoryAudits],
  );

  const getFilteredOrders = () =>
    orderFilter === "all"
      ? bookOrders
      : bookOrders.filter((o) => o.status === orderFilter);
  const getFilteredAudits = () =>
    inventoryFilter === "all"
      ? inventoryAudits
      : inventoryAudits.filter((a) => a.status === inventoryFilter);

  const filteredReservations = reservations.filter(
    (r) =>
      (r.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (r.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase()),
  );

  const getAvailableSpots = (event: LibraryEvent) =>
    event.maxParticipants - event.currentParticipants;
  const isEventFull = (event: LibraryEvent) =>
    event.currentParticipants >= event.maxParticipants;

  const getBookReservations = useCallback(
    (bookId: string) =>
      reservations.filter((r) => r.bookId === bookId && r.status === "active"),
    [reservations],
  );

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatFirestoreDate = (dateValue: FSDate): string => {
    if (dateValue === null || dateValue === undefined) return "Няма дата";
    try {
      if (typeof dateValue === "string")
        return new Date(dateValue).toLocaleDateString("bg-BG");
      if (dateValue instanceof Date)
        return dateValue.toLocaleDateString("bg-BG");
      if ("toDate" in dateValue && typeof dateValue.toDate === "function") {
        return dateValue.toDate().toLocaleDateString("bg-BG");
      }
      if ("seconds" in dateValue && typeof dateValue.seconds === "number") {
        return new Date(dateValue.seconds * 1000).toLocaleDateString("bg-BG");
      }
      return "Няма дата";
    } catch {
      return "Няма дата";
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("bg-BG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatCurrency = (amount: number, currency = "BGN") =>
    new Intl.NumberFormat("bg-BG", { style: "currency", currency }).format(
      amount,
    );

  const getPriorityColor = (p: string) =>
    ({ urgent: "#dc2626", high: "#ef4444", medium: "#f59e0b", low: "#10b981" })[
      p
    ] || "#6b7280";

  const getStatusColor = (s: string) =>
    ({
      pending: "#f59e0b",
      in_progress: "#3b82f6",
      completed: "#10b981",
      overdue: "#dc2626",
    })[s] || "#6b7280";

  const getOrderStatusColor = (s: string) =>
    ({
      pending: "#f59e0b",
      ordered: "#3b82f6",
      shipped: "#8b5cf6",
      delivered: "#10b981",
      cancelled: "#ef4444",
    })[s] || "#6b7280";

  const getInventoryStatusColor = (s: string) =>
    ({
      planned: "#3b82f6",
      in_progress: "#f59e0b",
      completed: "#10b981",
      cancelled: "#ef4444",
    })[s] || "#6b7280";

  const renderStarRating = (rating: number) => (
    <div className={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={`${styles.starIcon} ${s <= Math.round(rating) ? styles.starFilled : ""}`}
          fill={s <= Math.round(rating) ? "currentColor" : "none"}
        />
      ))}
      <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
    </div>
  );

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    const snap = await getDocs(collection(db, "events"));
    setEvents(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LibraryEvent),
    );
  }, []);

  const fetchBooks = useCallback(async () => {
    try {
      setBooks(await bookService.fetchAllBooks());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchReservations = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "reservations"));
      setReservations(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation),
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "librarian_tasks"), orderBy("dueDate", "asc")),
      );
      setTasks(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LibrarianTask),
      );
    } catch {
      setTasks([]);
    }
  }, []);

  const fetchBookOrders = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "book_orders"), orderBy("orderDate", "desc")),
      );
      setBookOrders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BookOrder),
      );
    } catch {
      setBookOrders([]);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "suppliers"));
      setSuppliers(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Supplier),
      );
    } catch {
      setSuppliers([]);
    }
  }, []);

  const fetchInventoryAudits = useCallback(async () => {
    try {
      const snap = await getDocs(
        query(collection(db, "inventory_audits"), orderBy("date", "desc")),
      );
      setInventoryAudits(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryAudit),
      );
    } catch {
      setInventoryAudits([]);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEvents(),
        fetchBooks(),
        fetchReservations(),
        fetchTasks(),
        fetchBookOrders(),
        fetchSuppliers(),
        fetchInventoryAudits(),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [
    fetchEvents,
    fetchBooks,
    fetchReservations,
    fetchTasks,
    fetchBookOrders,
    fetchSuppliers,
    fetchInventoryAudits,
  ]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ── Groq ─────────────────────────────────────────────────────────────────────
  const loadGroqAnalysis = async () => {
    setGroqLoading(true);
    try {
      const [insights, bookA, eventA, recs] = await Promise.all([
        groqService.getLibrarianInsights({
          books,
          events,
          reservations,
          userStats: stats,
        }),
        groqService.analyzePopularBooks(books),
        groqService.analyzeEvents(events),
        groqService.getOrderRecommendations(books),
      ]);
      setGroqAnalysis(insights);
      setGroqBookAnalysis(bookA);
      setGroqEventAnalysis(eventA);
      setGroqRecommendations(recs);
    } catch (e) {
      console.error(e);
    } finally {
      setGroqLoading(false);
    }
  };

  // ── Book modal ───────────────────────────────────────────────────────────────
  const openCreateBookModal = () => {
    setModalMode("create");
    setModalBookData({
      title: "",
      author: "",
      isbn: "",
      publisher: "",
      year: new Date().getFullYear(),
      category: "",
      genres: [],
      tags: [],
      description: "",
      copies: 1,
      location: "Библиотека",
      coverUrl: "",
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
      digitalVersion: { available: false, format: "", url: "" },
      isActive: true,
      underMaintenance: false,
    });
    setShowBookModal(true);
  };

  const openEditBookModal = (book: BookLibrary) => {
    setModalMode("edit");
    setModalBookData({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      copies: book.copies || 1,
      availableCopies: book.availableCopies ?? (book.copies || 1),
      publisher: book.publisher || "",
      year: book.year || new Date().getFullYear(),
      description: book.description || "",
      location: book.location || "Библиотека",
      coverUrl: book.coverUrl || "",
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
        url: "",
      },
      isActive: book.isActive !== false,
      underMaintenance: book.underMaintenance || false,
    });
    setShowBookModal(true);
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setModalBookData({});
  };

  const handleCreateBook = async (data: Partial<BookLibrary>) => {
    try {
      await bookService.createBook({
        title: data.title || "",
        author: data.author || "",
        isbn: data.isbn || "",
        category: data.category || "",
        copies: data.copies || 1,
        availableCopies: data.availableCopies || data.copies || 1,
        publisher: data.publisher || "",
        year: data.year || new Date().getFullYear(),
        description: data.description || "",
        location: data.location || "Библиотека",
        coverUrl: data.coverUrl || "",
        shelfNumber: data.shelfNumber || "",
        callNumber: data.callNumber || "",
        genres: data.genres || [],
        tags: data.tags || [],
        pages: data.pages || 0,
        language: data.language || "Български",
        edition: data.edition || "Първо издание",
        coverType: data.coverType || "soft",
        condition: data.condition || "good",
        ageRecommendation: data.ageRecommendation || "",
        featured: data.featured || false,
        isActive: data.isActive !== false,
        underMaintenance: data.underMaintenance || false,
        borrowPeriod: data.borrowPeriod || 14,
        maxRenewals: data.maxRenewals || 2,
        summary: data.summary || "",
        tableOfContents: data.tableOfContents || [],
        relatedBooks: data.relatedBooks || [],
        awards: data.awards || [],
        digitalVersion: data.digitalVersion || {
          available: false,
          format: "",
          url: "",
        },
      });
      closeBookModal();
      await fetchBooks();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleUpdateBook = async (data: Partial<BookLibrary>) => {
    if (!modalBookData.id) return;
    try {
      await bookService.updateBook(modalBookData.id, {
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        category: data.category,
        copies: data.copies,
        availableCopies: data.availableCopies,
        publisher: data.publisher,
        year: data.year,
        description: data.description,
        location: data.location,
        coverUrl: data.coverUrl,
        genres: data.genres,
        tags: data.tags,
        pages: data.pages,
        language: data.language,
        edition: data.edition,
        coverType: data.coverType,
        condition: data.condition,
        ageRecommendation: data.ageRecommendation,
        featured: data.featured,
        isActive: data.isActive,
        underMaintenance: data.underMaintenance,
        borrowPeriod: data.borrowPeriod,
        maxRenewals: data.maxRenewals,
        summary: data.summary,
        tableOfContents: data.tableOfContents,
        relatedBooks: data.relatedBooks,
        awards: data.awards,
        digitalVersion: data.digitalVersion,
        shelfNumber: data.shelfNumber,
        callNumber: data.callNumber,
      });
      closeBookModal();
      await fetchBooks();
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const deleteBook = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await bookService.deleteBook(id);
      await fetchAllData();
      alert("Изтрита!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };

  const deleteReservation = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await deleteDoc(doc(db, "reservations", id));
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };

  const approveReservationAndBorrowBook = async (
    reservationId: string,
    bookId: string,
    userId: string,
  ) => {
    try {
      const book = books.find((b) => b.id === bookId);
      const reservation = reservations.find((r) => r.id === reservationId);
      if (!book || !reservation) {
        alert("Не са намерени!");
        return;
      }
      await updateDoc(doc(db, "reservations", reservationId), {
        status: "fulfilled",
        lastUpdated: Timestamp.now(),
      });
      await updateDoc(doc(db, "books", bookId), {
        borrowedBy: [
          ...(book.borrowedBy || []),
          {
            userId,
            userName: reservation.userName,
            userEmail: reservation.userEmail,
            borrowedDate: new Date().toISOString().split("T")[0],
            dueDate: new Date(Date.now() + (book.borrowPeriod || 14) * 86400000)
              .toISOString()
              .split("T")[0],
            returned: false,
            renewed: false,
            renewalCount: 0,
          },
        ],
        availableCopies: Math.max(0, book.availableCopies - 1),
        lastUpdated: Timestamp.now(),
      });
      alert(`"${book.title}" одобрена!`);
      await fetchAllData();
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };

  const updateReservationStatus = async (
    id: string,
    status: Reservation["status"],
  ) => {
    await updateDoc(doc(db, "reservations", id), {
      status,
      updatedAt: Timestamp.now(),
    });
    await fetchAllData();
  };

  // ── Event modal ──────────────────────────────────────────────────────────────
  const openCreateEventModal = () => {
    setModalMode("create");
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
      participants: [],
    });
    setShowEventModal(true);
  };
  const openEditEventModal = (e: LibraryEvent) => {
    setModalMode("edit");
    setModalEventData({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      time: e.time,
      endTime: e.endTime,
      location: e.location,
      maxParticipants: e.maxParticipants,
      allowedRoles: e.allowedRoles,
      organizer: e.organizer,
      imageUrl: e.imageUrl || "",
      currentParticipants: e.currentParticipants,
      participants: e.participants || [],
    });
    setShowEventModal(true);
  };
  const closeEventModal = () => {
    setShowEventModal(false);
    setModalEventData({});
  };
  const handleCreateEvent = async () => {
    if (
      !modalEventData.title?.trim() ||
      !modalEventData.date ||
      !modalEventData.time ||
      !modalEventData.endTime ||
      !modalEventData.location
    ) {
      alert("Попълнете задължителните полета!");
      return;
    }
    try {
      await addDoc(collection(db, "events"), {
        ...modalEventData,
        currentParticipants: 0,
        participants: [],
        createdAt: Timestamp.now(),
      });
      closeEventModal();
      await fetchAllData();
      alert("Събитието е създадено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const handleUpdateEvent = async () => {
    if (!modalEventData.id) return;
    try {
      await updateDoc(doc(db, "events", modalEventData.id), {
        ...modalEventData,
        updatedAt: Timestamp.now(),
      });
      closeEventModal();
      await fetchAllData();
      alert("Обновено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const deleteEvent = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    await deleteDoc(doc(db, "events", id));
    await fetchAllData();
  };

  // ── Task modal ───────────────────────────────────────────────────────────────
  const openCreateTaskModal = () => {
    setModalMode("create");
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    setModalTaskData({
      title: "",
      description: "",
      type: "inventory",
      priority: "medium",
      status: "pending",
      assignedTo: "",
      dueDate: tom.toISOString().split("T")[0],
    });
    setShowTaskModal(true);
  };
  const openEditTaskModal = (t: LibrarianTask) => {
    setModalMode("edit");
    setModalTaskData({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      priority: t.priority,
      status: t.status,
      assignedTo: t.assignedTo,
      dueDate: t.dueDate,
    });
    setShowTaskModal(true);
  };
  const closeTaskModal = () => {
    setShowTaskModal(false);
    setModalTaskData({});
  };
  const handleCreateTask = async () => {
    if (!modalTaskData.title?.trim() || !modalTaskData.dueDate) {
      alert("Попълнете заглавие и дата!");
      return;
    }
    try {
      await addDoc(collection(db, "librarian_tasks"), {
        ...modalTaskData,
        createdAt: Timestamp.now(),
      });
      closeTaskModal();
      await fetchAllData();
      alert("Задачата е добавена!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const handleUpdateTask = async () => {
    if (
      !modalTaskData.id ||
      !modalTaskData.title?.trim() ||
      !modalTaskData.dueDate
    )
      return;
    try {
      await updateDoc(doc(db, "librarian_tasks", modalTaskData.id), {
        ...modalTaskData,
        updatedAt: Timestamp.now(),
      });
      closeTaskModal();
      await fetchAllData();
      alert("Обновено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const updateTaskStatus = async (
    id: string,
    status: LibrarianTask["status"],
  ) => {
    try {
      await updateDoc(doc(db, "librarian_tasks", id), {
        status,
        updatedAt: Timestamp.now(),
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };
  const deleteTask = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await deleteDoc(doc(db, "librarian_tasks", id));
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Order modal ──────────────────────────────────────────────────────────────
  const openCreateOrderModal = () => {
    setModalMode("create");
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(exp.getDate() + 14);
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
      orderDate: today.toISOString().split("T")[0],
      expectedDelivery: exp.toISOString().split("T")[0],
      status: "pending",
      orderNumber: `ORD-${Date.now()}`,
      notes: "",
      createdBy: "Библиотекар",
    });
    setShowOrderModal(true);
  };
  const openEditOrderModal = (o: BookOrder) => {
    setModalMode("edit");
    setModalOrderData({
      id: o.id,
      title: o.title,
      author: o.author,
      isbn: o.isbn,
      publisher: o.publisher,
      year: o.year,
      category: o.category,
      copies: o.copies,
      supplier: o.supplier,
      supplierContact: o.supplierContact,
      price: o.price,
      currency: o.currency,
      orderDate: o.orderDate,
      expectedDelivery: o.expectedDelivery,
      status: o.status,
      orderNumber: o.orderNumber,
      notes: o.notes,
      createdBy: o.createdBy,
    });
    setShowOrderModal(true);
  };
  const closeOrderModal = () => {
    setShowOrderModal(false);
    setModalOrderData({});
  };
  const handleCreateOrder = async () => {
    if (
      !modalOrderData.title?.trim() ||
      !modalOrderData.author?.trim() ||
      !modalOrderData.isbn?.trim() ||
      !modalOrderData.supplier?.trim()
    ) {
      alert("Попълнете задължителните полета!");
      return;
    }
    try {
      await addDoc(collection(db, "book_orders"), {
        ...modalOrderData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      closeOrderModal();
      await fetchAllData();
      alert("Поръчката е създадена!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const handleUpdateOrder = async () => {
    if (!modalOrderData.id) return;
    try {
      await updateDoc(doc(db, "book_orders", modalOrderData.id), {
        ...modalOrderData,
        updatedAt: Timestamp.now(),
      });
      closeOrderModal();
      await fetchAllData();
      alert("Обновено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const updateOrderStatus = async (id: string, status: BookOrder["status"]) => {
    try {
      await updateDoc(doc(db, "book_orders", id), {
        status,
        updatedAt: Timestamp.now(),
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };
  const deleteOrder = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await deleteDoc(doc(db, "book_orders", id));
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Supplier modal ───────────────────────────────────────────────────────────
  const openCreateSupplierModal = () => {
    setModalMode("create");
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
      notes: "",
    });
    setShowSupplierModal(true);
  };
  const openEditSupplierModal = (s: Supplier) => {
    setModalMode("edit");
    setModalSupplierData({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      website: s.website,
      address: s.address,
      rating: s.rating,
      deliveryTime: s.deliveryTime,
      paymentTerms: s.paymentTerms,
      notes: s.notes,
    });
    setShowSupplierModal(true);
  };
  const closeSupplierModal = () => {
    setShowSupplierModal(false);
    setModalSupplierData({});
  };
  const handleCreateSupplier = async () => {
    if (
      !modalSupplierData.name?.trim() ||
      !modalSupplierData.contactPerson?.trim()
    ) {
      alert("Попълнете задължителните полета!");
      return;
    }
    try {
      await addDoc(collection(db, "suppliers"), {
        ...modalSupplierData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      closeSupplierModal();
      await fetchAllData();
      alert("Доставчикът е добавен!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const handleUpdateSupplier = async () => {
    if (!modalSupplierData.id) return;
    try {
      await updateDoc(doc(db, "suppliers", modalSupplierData.id), {
        ...modalSupplierData,
        updatedAt: Timestamp.now(),
      });
      closeSupplierModal();
      await fetchAllData();
      alert("Обновено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const deleteSupplier = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await deleteDoc(doc(db, "suppliers", id));
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Inventory modal ──────────────────────────────────────────────────────────
  const openCreateInventoryModal = () => {
    setModalMode("create");
    setModalInventoryData({
      date: new Date().toISOString().split("T")[0],
      auditor: "",
      section: "",
      totalBooks: 0,
      countedBooks: 0,
      discrepancies: 0,
      status: "planned",
      notes: "",
    });
    setShowInventoryModal(true);
  };
  const openEditInventoryModal = (a: InventoryAudit) => {
    setModalMode("edit");
    setModalInventoryData({
      id: a.id,
      date: a.date,
      auditor: a.auditor,
      section: a.section,
      totalBooks: a.totalBooks,
      countedBooks: a.countedBooks,
      discrepancies: a.discrepancies,
      status: a.status,
      notes: a.notes,
    });
    setShowInventoryModal(true);
  };
  const closeInventoryModal = () => {
    setShowInventoryModal(false);
    setModalInventoryData({});
  };
  const handleCreateInventory = async () => {
    if (
      !modalInventoryData.section?.trim() ||
      !modalInventoryData.auditor?.trim()
    ) {
      alert("Попълнете задължителните полета!");
      return;
    }
    try {
      await addDoc(collection(db, "inventory_audits"), {
        ...modalInventoryData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      closeInventoryModal();
      await fetchAllData();
      alert("Инвентаризацията е планирана!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const handleUpdateInventory = async () => {
    if (!modalInventoryData.id) return;
    try {
      await updateDoc(doc(db, "inventory_audits", modalInventoryData.id), {
        ...modalInventoryData,
        updatedAt: Timestamp.now(),
      });
      closeInventoryModal();
      await fetchAllData();
      alert("Обновено!");
    } catch (e) {
      console.error(e);
      alert("Грешка!");
    }
  };
  const updateInventoryStatus = async (
    id: string,
    status: InventoryAudit["status"],
  ) => {
    try {
      await updateDoc(doc(db, "inventory_audits", id), {
        status,
        updatedAt: Timestamp.now(),
      });
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };
  const deleteInventory = async (id: string) => {
    if (!window.confirm("Сигурни ли сте?")) return;
    try {
      await deleteDoc(doc(db, "inventory_audits", id));
      await fetchAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Зареждане на библиотекарския панел...</p>
      </div>
    );
  }

  const inp = styles.modalFormInput;

  // ── Quick-access cards for digital content (used in Home tab) ────────────────
  const digitalContentCards = [
    {
      id: "onlineBooks" as const,
      label: "Онлайн Книги",
      desc: "Управление на дигитални книги и ресурси",
      color: "#3b82f6",
      Icon: Book,
    },
    {
      id: "aiResources" as const,
      label: "ИИ Ресурси",
      desc: "Ресурси за ИИ в образованието",
      color: "#8b5cf6",
      Icon: Brain,
    },
    {
      id: "studyMaterials" as const,
      label: "Учебни Помагала",
      desc: "Конспекти, тестове, видео уроци",
      color: "#10b981",
      Icon: BookOpen,
    },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div
      className={`${styles.container} ${isDarkMode ? styles.dark : styles.light}`}
    >
      <div className={styles.dashboardContainer}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
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
        </div>

        {/* ── Search ─────────────────────────────────────────────────────── */}
        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Търсене..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className={styles.tabsSection}>
          {[
            { id: "home", label: "Начало", icon: <Home size={18} /> },
            {
              id: "books",
              label: `Книги (${books.length})`,
              icon: <Book size={18} />,
            },
            {
              id: "events",
              label: `Събития (${events.length})`,
              icon: <Calendar size={18} />,
            },
            {
              id: "reservations",
              label: `Резервации (${reservations.filter((r) => r.status === "active").length})`,
              icon: <Bookmark size={18} />,
            },
            {
              id: "tasks",
              label: `Задачи (${tasks.length})`,
              icon: <CheckSquare size={18} />,
            },
            {
              id: "popular",
              label: "Популярни",
              icon: <TrendingUp size={18} />,
            },
            {
              id: "ordering",
              label: `Поръчки (${bookOrders.length})`,
              icon: <ShoppingCart size={18} />,
            },
            {
              id: "inventory",
              label: `Инвентар (${inventoryAudits.length})`,
              icon: <Clipboard size={18} />,
            },
            {
              id: "suppliers",
              label: `Доставчици (${suppliers.length})`,
              icon: <Truck size={18} />,
            },
            { id: "reports", label: "Справки", icon: <BarChart3 size={18} /> },
            { id: "ai", label: "AI Анализ", icon: <Zap size={18} />, ai: true },
            {
              id: "onlineBooks",
              label: "Онлайн Книги",
              icon: <Book size={18} />,
            },
            {
              id: "aiResources",
              label: "ИИ Ресурси",
              icon: <Brain size={18} />,
            },
            {
              id: "studyMaterials",
              label: "Учебни Помагала",
              icon: <BookOpen size={18} />,
            },
          ].map((t) => (
            <button
              key={t.id}
              className={`${styles.tabButton} ${activeTab === t.id ? styles.active : ""} ${t.ai ? styles.aiTab : ""}`}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className={styles.content}>
          {/* ══ HOME TAB ══════════════════════════════════════════════════════ */}
          {activeTab === "home" && (
            <div className={styles.homeTab}>
              <div className={styles.statsGrid}>
                {[
                  {
                    icon: <Book size={22} />,
                    label: "Книги",
                    value: stats.totalBooks,
                    color: "#3b82f6",
                  },
                  {
                    icon: <Bookmark size={22} />,
                    label: "Активни резервации",
                    value: stats.activeReservations,
                    color: "#8b5cf6",
                  },
                  {
                    icon: <CheckSquare size={22} />,
                    label: "Чакащи задачи",
                    value: stats.pendingTasks,
                    color: "#f59e0b",
                  },
                  {
                    icon: <AlertTriangle size={22} />,
                    label: "Просрочени задачи",
                    value: stats.overdueTasks,
                    color: "#ef4444",
                  },
                  {
                    icon: <Calendar size={22} />,
                    label: "Предстоящи събития",
                    value: stats.upcomingEvents,
                    color: "#10b981",
                  },
                  {
                    icon: <ShoppingCart size={22} />,
                    label: "Чакащи поръчки",
                    value: stats.pendingOrders,
                    color: "#ec4899",
                  },
                  {
                    icon: <Package size={22} />,
                    label: "Ниски наличности",
                    value: stats.lowStockBooks,
                    color: "#f97316",
                  },
                  {
                    icon: <Bell size={22} />,
                    label: "Днешни одити",
                    value: stats.recentAudits,
                    color: "#06b6d4",
                  },
                ].map((s, i) => (
                  <div key={i} className={styles.statCard}>
                    <div className={styles.statIcon} style={{ color: s.color }}>
                      {s.icon}
                    </div>
                    <div className={styles.statInfo}>
                      <span className={styles.statNumber}>{s.value}</span>
                      <span className={styles.statLabel}>{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Digital content quick-access ── */}
              <div style={{ marginTop: 20, marginBottom: 8 }}>
                <h3
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Дигитално съдържание
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
                    gap: 10,
                  }}
                >
                  {digitalContentCards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveTab(c.id)}
                      style={{
                        background: "var(--bg-card)",
                        border: `1px solid var(--border-light)`,
                        borderLeft: `4px solid ${c.color}`,
                        borderRadius: 10,
                        padding: "12px 14px",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        transition:
                          "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
                        boxShadow: "0 1px 4px var(--shadow)",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.boxShadow = `0 4px 16px ${c.color}30`;
                        el.style.transform = "translateY(-2px)";
                        el.style.borderColor = c.color;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.boxShadow = "0 1px 4px var(--shadow)";
                        el.style.transform = "none";
                        el.style.borderColor = "var(--border-light)";
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: c.color + "18",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: c.color,
                          flexShrink: 0,
                        }}
                      >
                        <c.Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: 13,
                            color: "var(--text-primary)",
                            margin: 0,
                          }}
                        >
                          {c.label}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: "var(--text-secondary)",
                            margin: "2px 0 0",
                            lineHeight: 1.3,
                          }}
                        >
                          {c.desc}
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        style={{ color: c.color, flexShrink: 0 }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.homeGrid}>
                {/* Upcoming Tasks */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <Clock size={18} />
                    <h3>Предстоящи задачи</h3>
                    <button
                      onClick={openCreateTaskModal}
                      className={styles.addSmallBtn}
                    >
                      <Plus size={14} />
                      Добави
                    </button>
                  </div>
                  {getUpcomingTasks().length === 0 ? (
                    <p className={styles.emptyText}>Няма задачи за днес/утре</p>
                  ) : (
                    getUpcomingTasks().map((t) => (
                      <div key={t.id} className={styles.listItem}>
                        <div
                          className={styles.listItemDot}
                          style={{ background: getPriorityColor(t.priority) }}
                        />
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{t.title}</p>
                          <p className={styles.listItemSub}>
                            <Clock size={12} />
                            {t.dueDate}
                          </p>
                        </div>
                        <div className={styles.listItemActions}>
                          <button
                            onClick={() => openEditTaskModal(t)}
                            className={styles.iconBtn}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => updateTaskStatus(t.id!, "completed")}
                            className={styles.iconBtnGreen}
                          >
                            <CheckCircle size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent Reservations */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <Bookmark size={18} />
                    <h3>Последни резервации</h3>
                    <span className={styles.countBadge}>
                      {stats.activeReservations}
                    </span>
                  </div>
                  {getRecentReservations().length === 0 ? (
                    <p className={styles.emptyText}>Няма активни резервации</p>
                  ) : (
                    getRecentReservations().map((r) => (
                      <div key={r.id} className={styles.listItem}>
                        <UserCheck
                          size={16}
                          style={{ color: "#3b82f6", flexShrink: 0 }}
                        />
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{r.userName}</p>
                          <p className={styles.listItemSub}>
                            {formatFirestoreDate(r.reservedAt as FSDate)}
                          </p>
                        </div>
                        <ChevronRight size={14} className={styles.chevron} />
                      </div>
                    ))
                  )}
                </div>

                {/* Low Stock */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
                    <h3>Ниски наличности</h3>
                  </div>
                  {getLowStockBooks().length === 0 ? (
                    <p className={styles.emptyText}>
                      Всички книги са с добри наличности
                    </p>
                  ) : (
                    getLowStockBooks().map((b) => (
                      <div key={b.id} className={styles.listItem}>
                        <Book
                          size={16}
                          style={{ color: "#f97316", flexShrink: 0 }}
                        />
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{b.title}</p>
                          <p className={styles.listItemSub}>
                            {b.availableCopies}/{b.copies} налични
                          </p>
                        </div>
                        <button
                          onClick={openCreateOrderModal}
                          className={styles.iconBtnOrange}
                          title="Поръчай"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Upcoming Events */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <Calendar size={18} />
                    <h3>Предстоящи събития</h3>
                    <button
                      onClick={openCreateEventModal}
                      className={styles.addSmallBtn}
                    >
                      <Plus size={14} />
                      Добави
                    </button>
                  </div>
                  {getUpcomingEvents().length === 0 ? (
                    <p className={styles.emptyText}>Няма предстоящи събития</p>
                  ) : (
                    getUpcomingEvents().map((e) => (
                      <div key={e.id} className={styles.listItem}>
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{e.title}</p>
                          <p className={styles.listItemSub}>
                            <Calendar size={12} />
                            {e.date} {e.time} · <Users size={12} />
                            {e.currentParticipants}/{e.maxParticipants}
                          </p>
                        </div>
                        {isEventFull(e) && (
                          <span className={styles.fullBadge}>Пълно</span>
                        )}
                        <span className={styles.spotsBadge}>
                          {getAvailableSpots(e)} места
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent Orders */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <ShoppingCart size={18} />
                    <h3>Последни поръчки</h3>
                    <button
                      onClick={openCreateOrderModal}
                      className={styles.addSmallBtn}
                    >
                      <Plus size={14} />
                      Добави
                    </button>
                  </div>
                  {getRecentOrders().length === 0 ? (
                    <p className={styles.emptyText}>Няма поръчки</p>
                  ) : (
                    getRecentOrders().map((o) => (
                      <div key={o.id} className={styles.listItem}>
                        <DollarSign
                          size={16}
                          style={{
                            color: getOrderStatusColor(o.status),
                            flexShrink: 0,
                          }}
                        />
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{o.title}</p>
                          <p className={styles.listItemSub}>
                            {o.supplier} ·{" "}
                            {formatCurrency(o.price * o.copies, o.currency)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent Audits */}
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <Clipboard size={18} />
                    <h3>Последни одити</h3>
                    <button
                      onClick={openCreateInventoryModal}
                      className={styles.addSmallBtn}
                    >
                      <Plus size={14} />
                      Добави
                    </button>
                  </div>
                  {getRecentAudits().length === 0 ? (
                    <p className={styles.emptyText}>Няма одити</p>
                  ) : (
                    getRecentAudits().map((a) => (
                      <div key={a.id} className={styles.listItem}>
                        <div
                          className={styles.listItemDot}
                          style={{
                            background: getInventoryStatusColor(a.status),
                          }}
                        />
                        <div className={styles.listItemContent}>
                          <p className={styles.listItemTitle}>{a.section}</p>
                          <p className={styles.listItemSub}>
                            {a.date} · {a.countedBooks} преброени
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ BOOKS ══════════════════════════════════════════════════════════ */}
          {activeTab === "books" && (
            <BooksTab
              books={books}
              searchTerm={searchTerm}
              onEdit={openEditBookModal}
              onDelete={deleteBook}
              onAdd={openCreateBookModal}
            />
          )}

          {/* ══ EVENTS ══════════════════════════════════════════════════════════ */}
          {activeTab === "events" && (
            <EventsTab
              events={events}
              searchTerm={searchTerm}
              onEdit={openEditEventModal}
              onDelete={deleteEvent}
              onAdd={openCreateEventModal}
            />
          )}

          {/* ══ RESERVATIONS ════════════════════════════════════════════════════ */}
          {activeTab === "reservations" && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2>
                  <Bookmark size={20} />
                  Резервации ({filteredReservations.length})
                </h2>
              </div>
              {filteredReservations.length === 0 ? (
                <div className={styles.emptyState}>
                  <Bookmark size={48} />
                  <p>Няма резервации</p>
                </div>
              ) : (
                filteredReservations.map((r) => {
                  const book = books.find((b) => b.id === r.bookId);
                  return (
                    <div key={r.id} className={styles.reservationCard}>
                      <div className={styles.reservationInfo}>
                        <div className={styles.reservationUser}>
                          <UserCheck size={16} />
                          <div>
                            <p className={styles.reservationName}>
                              {r.userName}
                            </p>
                            <p className={styles.reservationEmail}>
                              {r.userEmail}
                            </p>
                          </div>
                        </div>
                        <div className={styles.reservationBook}>
                          <Book size={16} />
                          <p>{book?.title || "Непозната книга"}</p>
                        </div>
                        <div className={styles.reservationDates}>
                          <p>
                            <Clock size={12} /> Резервирана:{" "}
                            {formatFirestoreDate(r.reservedAt as FSDate)}
                          </p>
                          <p>
                            <Clock size={12} /> Изтича:{" "}
                            {formatFirestoreDate(r.expiresAt as FSDate)}
                          </p>
                        </div>
                        <span
                          className={styles.statusBadge}
                          style={{
                            background: getStatusColor(r.status) + "20",
                            color: getStatusColor(r.status),
                            border: `1px solid ${getStatusColor(r.status)}40`,
                          }}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className={styles.reservationActions}>
                        {r.status === "active" && book && (
                          <button
                            onClick={() =>
                              approveReservationAndBorrowBook(
                                r.id!,
                                r.bookId,
                                r.userId,
                              )
                            }
                            className={styles.approveBtn}
                          >
                            <CheckCircle size={14} />
                            Одобри и дай книгата
                          </button>
                        )}
                        <button
                          onClick={() =>
                            updateReservationStatus(r.id!, "cancelled")
                          }
                          className={styles.cancelSmallBtn}
                        >
                          <X size={14} />
                          Откажи
                        </button>
                        <button
                          onClick={() => deleteReservation(r.id!)}
                          className={styles.deleteBtn}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══ TASKS ═══════════════════════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <TasksTab
              tasks={tasks}
              onEdit={openEditTaskModal}
              onDelete={deleteTask}
              onAdd={openCreateTaskModal}
              onStatusChange={updateTaskStatus}
            />
          )}

          {/* ══ POPULAR ═════════════════════════════════════════════════════════ */}
          {activeTab === "popular" && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2>
                  <TrendingUp size={20} />
                  Популярни книги
                </h2>
              </div>
              <div className={styles.popularStatsRow}>
                {[
                  {
                    icon: <Star size={18} />,
                    label: "Ср. рейтинг",
                    value: popularStats.averageRating,
                    color: "#f59e0b",
                  },
                  {
                    icon: <Eye size={18} />,
                    label: "Общо прегледи",
                    value: popularStats.totalViews,
                    color: "#3b82f6",
                  },
                  {
                    icon: <Users size={18} />,
                    label: "Чакащи хора",
                    value: popularStats.totalWaitingPeople,
                    color: "#8b5cf6",
                  },
                  {
                    icon: <Award size={18} />,
                    label: "Книги ≥4★",
                    value: popularStats.highlyRatedCount,
                    color: "#10b981",
                  },
                ].map((s, i) => (
                  <div key={i} className={styles.miniStatCard}>
                    <div style={{ color: s.color }}>{s.icon}</div>
                    <span className={styles.miniStatValue}>{s.value}</span>
                    <span className={styles.miniStatLabel}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div className={styles.filterRow}>
                {[
                  { id: "mostLiked", label: "Най-харесвани" },
                  { id: "mostWaited", label: "Най-чакани" },
                  { id: "mostViewed", label: "Най-гледани" },
                ].map((f) => (
                  <button
                    key={f.id}
                    className={`${styles.filterBtn} ${popularFilter === f.id ? styles.filterBtnActive : ""}`}
                    onClick={() =>
                      setPopularFilter(f.id as typeof popularFilter)
                    }
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className={styles.popularGrid}>
                {getFilteredPopularBooks().map((b, i) => (
                  <div key={b.id} className={styles.popularCard}>
                    <div className={styles.popularRank}>#{i + 1}</div>
                    {b.coverUrl && (
                      <img
                        src={b.coverUrl}
                        alt={b.title}
                        className={styles.popularCover}
                      />
                    )}
                    <div className={styles.popularInfo}>
                      <p className={styles.popularTitle}>{b.title}</p>
                      <p className={styles.popularAuthor}>{b.author}</p>
                      {renderStarRating(b.rating ?? 0)}
                      <div className={styles.popularMeta}>
                        <span>
                          <Eye size={12} />
                          {b.views || 0}
                        </span>
                        <span>
                          <Users size={12} />
                          {Math.max(0, b.reservationQueue || 0)} чакащи
                        </span>
                        <span>
                          {b.availableCopies}/{b.copies} налични
                        </span>
                      </div>
                    </div>
                    {b.featured && (
                      <Award size={16} className={styles.featuredIcon} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ ORDERING ════════════════════════════════════════════════════════ */}
          {activeTab === "ordering" && (
            <div>
              <div className={styles.filterRow}>
                {(
                  [
                    { id: "all", label: "Всички" },
                    { id: "pending", label: "Чакащи" },
                    { id: "ordered", label: "Поръчани" },
                    { id: "shipped", label: "Изпратени" },
                    { id: "delivered", label: "Доставени" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    className={`${styles.filterBtn} ${orderFilter === f.id ? styles.filterBtnActive : ""}`}
                    onClick={() => setOrderFilter(f.id)}
                  >
                    {f.label}
                    <span className={styles.filterCount}>
                      {f.id === "all"
                        ? bookOrders.length
                        : bookOrders.filter((o) => o.status === f.id).length}
                    </span>
                  </button>
                ))}
              </div>
              <OrdersTab
                orders={getFilteredOrders()}
                onEdit={openEditOrderModal}
                onDelete={deleteOrder}
                onAdd={openCreateOrderModal}
                onStatusChange={updateOrderStatus}
              />
            </div>
          )}

          {/* ══ INVENTORY ═══════════════════════════════════════════════════════ */}
          {activeTab === "inventory" && (
            <div>
              <div className={styles.filterRow}>
                {(
                  [
                    { id: "all", label: "Всички" },
                    { id: "planned", label: "Планирани" },
                    { id: "in_progress", label: "В ход" },
                    { id: "completed", label: "Завършени" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    className={`${styles.filterBtn} ${inventoryFilter === f.id ? styles.filterBtnActive : ""}`}
                    onClick={() => setInventoryFilter(f.id)}
                  >
                    {f.label}
                    <span className={styles.filterCount}>
                      {f.id === "all"
                        ? inventoryAudits.length
                        : inventoryAudits.filter((a) => a.status === f.id)
                            .length}
                    </span>
                  </button>
                ))}
              </div>
              <InventoryTab
                audits={getFilteredAudits()}
                onEdit={openEditInventoryModal}
                onDelete={deleteInventory}
                onAdd={openCreateInventoryModal}
                onStatusChange={updateInventoryStatus}
              />
            </div>
          )}

          {/* ══ SUPPLIERS ═══════════════════════════════════════════════════════ */}
          {activeTab === "suppliers" && (
            <SuppliersTab
              suppliers={suppliers}
              onEdit={openEditSupplierModal}
              onDelete={deleteSupplier}
              onAdd={openCreateSupplierModal}
            />
          )}

          {/* ══ REPORTS ═════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2>
                  <BarChart size={20} />
                  Справки и статистики
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={styles.exportBtn}
                    onClick={() => window.print()}
                  >
                    <Printer size={16} />
                    Печат
                  </button>
                  <button
                    className={styles.exportBtn}
                    onClick={() => alert("Функцията за експорт се разработва")}
                  >
                    <Download size={16} />
                    Експорт CSV
                  </button>
                </div>
              </div>
              <div className={styles.reportsGrid}>
                <div className={styles.reportCard}>
                  <h3>
                    <Book size={16} />
                    Книги
                  </h3>
                  <div className={styles.reportRow}>
                    <span>Общо книги</span>
                    <strong>{books.length}</strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Налични копия</span>
                    <strong>
                      {books.reduce((s, b) => s + b.availableCopies, 0)}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Ниски наличности</span>
                    <strong style={{ color: "#ef4444" }}>
                      {stats.lowStockBooks}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Ср. рейтинг</span>
                    <strong>{popularStats.averageRating}★</strong>
                  </div>
                </div>
                <div className={styles.reportCard}>
                  <h3>
                    <ShoppingCart size={16} />
                    Поръчки
                  </h3>
                  <div className={styles.reportRow}>
                    <span>Общо поръчки</span>
                    <strong>{orderStats.totalOrders}</strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Чакащи</span>
                    <strong style={{ color: "#f59e0b" }}>
                      {orderStats.pendingOrders}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Доставени</span>
                    <strong style={{ color: "#10b981" }}>
                      {orderStats.deliveredOrders}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Обща стойност</span>
                    <strong>
                      {formatCurrency(parseFloat(orderStats.totalValue))}
                    </strong>
                  </div>
                </div>
                <div className={styles.reportCard}>
                  <h3>
                    <Clipboard size={16} />
                    Инвентаризации
                  </h3>
                  <div className={styles.reportRow}>
                    <span>Общо одити</span>
                    <strong>{inventoryStats.totalAudits}</strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Завършени</span>
                    <strong style={{ color: "#10b981" }}>
                      {inventoryStats.completedAudits}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>В ход</span>
                    <strong style={{ color: "#f59e0b" }}>
                      {inventoryStats.inProgress}
                    </strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Точност</span>
                    <strong>{inventoryStats.accuracyRate}%</strong>
                  </div>
                </div>
                <div className={styles.reportCard}>
                  <h3>
                    <TrendingUp size={16} />
                    Популярност
                  </h3>
                  <div className={styles.reportRow}>
                    <span>Общо прегледи</span>
                    <strong>{popularStats.totalViews}</strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Чакащи хора</span>
                    <strong>{popularStats.totalWaitingPeople}</strong>
                  </div>
                  <div className={styles.reportRow}>
                    <span>Книги с чакащи</span>
                    <strong>{popularStats.booksWithWaitingList}</strong>
                  </div>
                  {popularStats.topRatedBook && (
                    <div className={styles.reportRow}>
                      <span>Топ книга</span>
                      <strong>
                        {popularStats.topRatedBook.title.slice(0, 20)}…
                      </strong>
                    </div>
                  )}
                </div>
                <div
                  className={`${styles.reportCard} ${styles.reportCardWide}`}
                >
                  <h3>
                    <FileText size={16} />
                    Последни поръчки
                  </h3>
                  <table className={styles.reportTable}>
                    <thead>
                      <tr>
                        <th>Книга</th>
                        <th>Доставчик</th>
                        <th>Дата</th>
                        <th>Стойност</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRecentOrders().map((o) => (
                        <tr key={o.id}>
                          <td>{o.title}</td>
                          <td>{o.supplier}</td>
                          <td>{formatDate(o.orderDate)}</td>
                          <td>
                            {formatCurrency(o.price * o.copies, o.currency)}
                          </td>
                          <td>
                            <span
                              style={{ color: getOrderStatusColor(o.status) }}
                            >
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className={`${styles.reportCard} ${styles.reportCardWide}`}
                >
                  <h3>
                    <Calendar size={16} />
                    Архивирани събития ({archivedEvents.length})
                  </h3>
                  {archivedEvents.slice(0, 5).map((e) => (
                    <div key={e.id} className={styles.reportRow}>
                      <span>{e.title}</span>
                      <span>{formatDate(e.date)}</span>
                      <strong>{e.currentParticipants} участника</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ AI TAB ══════════════════════════════════════════════════════════ */}
          {activeTab === "ai" && (
            <div>
              <div className={styles.aiSection}>
                <button
                  onClick={loadGroqAnalysis}
                  disabled={groqLoading}
                  className={styles.groqBtn}
                >
                  {groqLoading ? (
                    <>
                      <Loader2 size={16} className={styles.spin} />
                      Анализ…
                    </>
                  ) : (
                    <>
                      <Zap size={16} />
                      Зареди AI анализ
                    </>
                  )}
                </button>
                {groqAnalysis && (
                  <div className={styles.groqCard}>
                    <h4>📊 Общ анализ</h4>
                    <p>{groqAnalysis}</p>
                  </div>
                )}
                {groqBookAnalysis && (
                  <div className={styles.groqCard}>
                    <h4>📚 Анализ на книги</h4>
                    <p>{groqBookAnalysis}</p>
                  </div>
                )}
                {groqEventAnalysis && (
                  <div className={styles.groqCard}>
                    <h4>📅 Анализ на събития</h4>
                    <p>{groqEventAnalysis}</p>
                  </div>
                )}
                {groqRecommendations.length > 0 && (
                  <div className={styles.groqCard}>
                    <h4>🛒 Препоръки за поръчки</h4>
                    {groqRecommendations.map((r, i) => (
                      <div key={i} className={styles.groqRec}>
                        <strong>{r.title}</strong> — {r.reason}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <AIAnalysisTab
                books={books}
                events={events}
                reservations={reservations}
                tasks={tasks}
                bookOrders={bookOrders}
              />
            </div>
          )}

          {/* ══ NEW TABS ════════════════════════════════════════════════════════ */}
          {activeTab === "onlineBooks" && <OnlineBooksTab />}
          {activeTab === "aiResources" && <AIResourcesTab />}
          {activeTab === "studyMaterials" && <StudyMaterialsTab />}
        </div>
        {/* end content */}

        {/* ══════════════════════════════════════════════════════════════════
            MODALS
        ══════════════════════════════════════════════════════════════════ */}

        {/* Book Modal */}
        {showBookModal && (
          <BookFormModal
            mode={modalMode}
            initialData={modalBookData}
            onSave={async (data) => {
              if (modalMode === "create") await handleCreateBook(data);
              else await handleUpdateBook(data);
            }}
            onClose={closeBookModal}
          />
        )}

        {/* Event Modal */}
        {showEventModal && (
          <div className={styles.modalOverlay} onClick={closeEventModal}>
            <div
              className={`${styles.modalContent} ${styles.darkModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === "create"
                    ? "Ново събитие"
                    : "Редактирай събитие"}
                </h3>
                <button onClick={closeEventModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalEventData.title || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Дата *</label>
                    <input
                      className={inp}
                      type="date"
                      value={modalEventData.date || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Начален час *</label>
                    <select
                      className={inp}
                      value={modalEventData.time || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          time: e.target.value,
                        })
                      }
                    >
                      <option value="">Изберете</option>
                      {timeOptionsWithMinutes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Краен час *</label>
                    <select
                      className={inp}
                      value={modalEventData.endTime || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          endTime: e.target.value,
                        })
                      }
                    >
                      <option value="">Изберете</option>
                      {timeOptionsWithMinutes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Зала / Локация *</label>
                    <select
                      className={inp}
                      value={modalEventData.location || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          location: e.target.value,
                        })
                      }
                    >
                      <option value="">Изберете</option>
                      {locationOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Макс. участници</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      value={modalEventData.maxParticipants || 20}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          maxParticipants: parseInt(e.target.value) || 20,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Организатор</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalEventData.organizer || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          organizer: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Снимка (URL)</label>
                    <input
                      className={inp}
                      type="url"
                      value={modalEventData.imageUrl || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          imageUrl: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Описание</label>
                    <textarea
                      className={inp}
                      rows={3}
                      value={modalEventData.description || ""}
                      onChange={(e) =>
                        setModalEventData({
                          ...modalEventData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={
                      modalMode === "create"
                        ? handleCreateEvent
                        : handleUpdateEvent
                    }
                    className={styles.primaryBtn}
                  >
                    <Save size={16} />
                    {modalMode === "create" ? "Създай" : "Запази"}
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

        {/* Task Modal */}
        {showTaskModal && (
          <div className={styles.modalOverlay} onClick={closeTaskModal}>
            <div
              className={`${styles.modalContent} ${styles.darkModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === "create" ? "Нова задача" : "Редактирай задача"}
                </h3>
                <button onClick={closeTaskModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalTaskData.title || ""}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Тип задача</label>
                    <select
                      className={inp}
                      value={modalTaskData.type || "inventory"}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          type: e.target.value as LibrarianTask["type"],
                        })
                      }
                    >
                      {taskTypes.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Приоритет</label>
                    <select
                      className={inp}
                      value={modalTaskData.priority || "medium"}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          priority: e.target.value as LibrarianTask["priority"],
                        })
                      }
                    >
                      {priorityOptions.map((p) => (
                        <option
                          key={p.value}
                          value={p.value}
                          style={{ color: p.color }}
                        >
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Статус</label>
                    <select
                      className={inp}
                      value={modalTaskData.status || "pending"}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          status: e.target.value as LibrarianTask["status"],
                        })
                      }
                    >
                      <option value="pending">Чакаща</option>
                      <option value="in_progress">В ход</option>
                      <option value="completed">Завършена</option>
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Краен срок *</label>
                    <input
                      className={inp}
                      type="date"
                      value={modalTaskData.dueDate || ""}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Отговорник</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalTaskData.assignedTo || ""}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          assignedTo: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Описание</label>
                    <textarea
                      className={inp}
                      rows={3}
                      value={modalTaskData.description || ""}
                      onChange={(e) =>
                        setModalTaskData({
                          ...modalTaskData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={
                      modalMode === "create"
                        ? handleCreateTask
                        : handleUpdateTask
                    }
                    className={styles.primaryBtn}
                  >
                    <Save size={16} />
                    {modalMode === "create" ? "Създай" : "Запази"}
                  </button>
                  <button
                    onClick={closeTaskModal}
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
          <div className={styles.modalOverlay} onClick={closeOrderModal}>
            <div
              className={`${styles.modalContent} ${styles.darkModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === "create"
                    ? "Нова поръчка"
                    : "Редактирай поръчка"}
                </h3>
                <button onClick={closeOrderModal} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Заглавие *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalOrderData.title || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Автор *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalOrderData.author || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          author: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>ISBN *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalOrderData.isbn || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          isbn: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Доставчик *</label>
                    <select
                      className={inp}
                      value={modalOrderData.supplier || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          supplier: e.target.value,
                        })
                      }
                    >
                      <option value="">Изберете</option>
                      {suppliersList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Контакт</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalOrderData.supplierContact || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          supplierContact: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Брой копия</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      value={modalOrderData.copies || 1}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          copies: parseInt(e.target.value) || 1,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Цена</label>
                    <input
                      className={inp}
                      type="number"
                      min="0"
                      step="0.01"
                      value={modalOrderData.price || 0}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Валута</label>
                    <select
                      className={inp}
                      value={modalOrderData.currency || "BGN"}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          currency: e.target.value,
                        })
                      }
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Дата на поръчка</label>
                    <input
                      className={inp}
                      type="date"
                      value={modalOrderData.orderDate || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          orderDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Очаквана доставка</label>
                    <input
                      className={inp}
                      type="date"
                      value={modalOrderData.expectedDelivery || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          expectedDelivery: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Статус</label>
                    <select
                      className={inp}
                      value={modalOrderData.status || "pending"}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          status: e.target.value as BookOrder["status"],
                        })
                      }
                    >
                      {orderStatuses.map((s) => (
                        <option
                          key={s.value}
                          value={s.value}
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Издател</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalOrderData.publisher || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          publisher: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Бележки</label>
                    <textarea
                      className={inp}
                      rows={2}
                      value={modalOrderData.notes || ""}
                      onChange={(e) =>
                        setModalOrderData({
                          ...modalOrderData,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={
                      modalMode === "create"
                        ? handleCreateOrder
                        : handleUpdateOrder
                    }
                    className={styles.primaryBtn}
                  >
                    <Save size={16} />
                    {modalMode === "create" ? "Създай" : "Запази"}
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
          <div className={styles.modalOverlay} onClick={closeSupplierModal}>
            <div
              className={`${styles.modalContent} ${styles.darkModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === "create"
                    ? "Нов доставчик"
                    : "Редактирай доставчик"}
                </h3>
                <button
                  onClick={closeSupplierModal}
                  className={styles.closeBtn}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Фирма *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalSupplierData.name || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Лице за контакт *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalSupplierData.contactPerson || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          contactPerson: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Имейл</label>
                    <input
                      className={inp}
                      type="email"
                      value={modalSupplierData.email || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Телефон</label>
                    <input
                      className={inp}
                      type="tel"
                      value={modalSupplierData.phone || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Уебсайт</label>
                    <input
                      className={inp}
                      type="url"
                      value={modalSupplierData.website || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          website: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Срок на доставка</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalSupplierData.deliveryTime || "7-14 дни"}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          deliveryTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Условия на плащане</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalSupplierData.paymentTerms || "30 дни"}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          paymentTerms: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Рейтинг (1-5)</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      max="5"
                      value={modalSupplierData.rating || 5}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          rating: parseInt(e.target.value) || 5,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Адрес</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalSupplierData.address || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Бележки</label>
                    <textarea
                      className={inp}
                      rows={2}
                      value={modalSupplierData.notes || ""}
                      onChange={(e) =>
                        setModalSupplierData({
                          ...modalSupplierData,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={
                      modalMode === "create"
                        ? handleCreateSupplier
                        : handleUpdateSupplier
                    }
                    className={styles.primaryBtn}
                  >
                    <Save size={16} />
                    {modalMode === "create" ? "Добави" : "Запази"}
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
          <div className={styles.modalOverlay} onClick={closeInventoryModal}>
            <div
              className={`${styles.modalContent} ${styles.darkModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h3>
                  {modalMode === "create"
                    ? "Нова инвентаризация"
                    : "Редактирай инвентаризация"}
                </h3>
                <button
                  onClick={closeInventoryModal}
                  className={styles.closeBtn}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Раздел *</label>
                    <select
                      className={inp}
                      value={modalInventoryData.section || ""}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          section: e.target.value,
                        })
                      }
                    >
                      <option value="">Изберете раздел</option>
                      {bookSections.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label className={styles.required}>Одитор *</label>
                    <input
                      className={inp}
                      type="text"
                      value={modalInventoryData.auditor || ""}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          auditor: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Дата</label>
                    <input
                      className={inp}
                      type="date"
                      value={modalInventoryData.date || ""}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Статус</label>
                    <select
                      className={inp}
                      value={modalInventoryData.status || "planned"}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          status: e.target.value as InventoryAudit["status"],
                        })
                      }
                    >
                      {inventoryStatuses.map((s) => (
                        <option
                          key={s.value}
                          value={s.value}
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Общо книги</label>
                    <input
                      className={inp}
                      type="number"
                      min="0"
                      value={modalInventoryData.totalBooks || 0}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          totalBooks: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Преброени книги</label>
                    <input
                      className={inp}
                      type="number"
                      min="0"
                      value={modalInventoryData.countedBooks || 0}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          countedBooks: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label>Несъответствия</label>
                    <input
                      className={inp}
                      type="number"
                      min="0"
                      value={modalInventoryData.discrepancies || 0}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          discrepancies: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div
                    className={`${styles.modalFormGroup} ${styles.fullWidth}`}
                  >
                    <label>Бележки</label>
                    <textarea
                      className={inp}
                      rows={2}
                      value={modalInventoryData.notes || ""}
                      onChange={(e) =>
                        setModalInventoryData({
                          ...modalInventoryData,
                          notes: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    onClick={
                      modalMode === "create"
                        ? handleCreateInventory
                        : handleUpdateInventory
                    }
                    className={styles.primaryBtn}
                  >
                    <Save size={16} />
                    {modalMode === "create" ? "Планирай" : "Запази"}
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

        {/* Keep getBookReservations in scope */}
        <span
          style={{ display: "none" }}
          data-ref={String(!!getBookReservations)}
        />
      </div>
    </div>
  );
};

export default LibrarianDashboard;