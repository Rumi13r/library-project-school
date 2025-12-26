// services/bookService.ts
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  Timestamp,
  arrayUnion,   
  arrayRemove,   
  type DocumentData,
  increment
} from "firebase/firestore";
import type { BookLibrary, BookInput, BookUpdateInput } from "../services/bookTypes";
import { db } from "../../firebase/firebase";

// Константи за жанрове и категории
export const BOOK_GENRES = [
  "Класическа литература",
  "Съвременна литература",
  "Литературна проза",
  "Исторически роман",
  "Фантастика",
  "Фентъзи",
  "Криминален роман",
  "Детективски роман",
  "Трилър",
  "Хорър",
  "Любовен роман",
  "Приключенски роман",
  "Биография",
  "Автобиография",
  "История",
  "Философия",
  "Психология",
  "Научнопопулярна",
  "Бизнес литература",
  "Самоусъвършенстване",
  "Детска литература",
  "Приказки",
  "Юношески роман (YA)",
  "Поезия",
  "Драма",
  "Комикс/Графичен роман",
  "Кулинария",
  "Пътеписи",
  "Изкуство и култура"
] as const;

export const BOOK_CATEGORIES = [
  "Художествена литература",
  "Документална литература",
  "Детска и юношеска литература",
  "Наука и техника",
  "Образование",
  "Изкуство и култура",
  "Друго"
] as const;

// Превръща Firestore документ в Book обект
export const mapFirestoreDocToBook = (docId: string, data: DocumentData): BookLibrary => {
  return {
    id: docId,
    title: data.title || '',
    author: data.author || '',
    isbn: data.isbn || '',
    publisher: data.publisher || '',
    year: data.year || new Date().getFullYear(),
    pages: data.pages || 0,
    category: data.category || '',
    genres: data.genres || [],
    tags: data.tags || [],
    description: data.description || '',
    copies: data.copies || 1,
    availableCopies: data.availableCopies !== undefined ? data.availableCopies : (data.copies || 1),
    location: data.location || 'Библиотека',
    shelfNumber: data.shelfNumber || '',
    callNumber: data.callNumber || '',
    coverUrl: data.coverUrl || '',
    coverType: data.coverType || 'soft',
    condition: data.condition || 'good',
    language: data.language || 'Български',
    edition: data.edition || 'Първо издание',
    ageRecommendation: data.ageRecommendation || '',
    status: data.status || 'available',
    rating: data.rating || 0,
    ratingsCount: data.ratingsCount || 0,
    views: data.views || 0,
    featured: data.featured || false,
    isActive: data.isActive !== false,
    underMaintenance: data.underMaintenance || false,
    borrowPeriod: data.borrowPeriod || 14,
    maxRenewals: data.maxRenewals || 2,
    reservationQueue: data.reservationQueue || 0,
    waitingList: data.waitingList || [],
    summary: data.summary || '',
    tableOfContents: data.tableOfContents || [],
    relatedBooks: data.relatedBooks || [],
    awards: data.awards || [],
    digitalVersion: data.digitalVersion || {
      available: false,
      format: "",
      url: ""
    },
    createdAt: data.createdAt || null,
    lastUpdated: data.lastUpdated || null,
    borrowedBy: data.borrowedBy || []
  } as BookLibrary;
};

// Взема всички книги
export const fetchAllBooks = async (): Promise<BookLibrary[]> => {
  try {
    const snapshot = await getDocs(collection(db, "books"));
    return snapshot.docs.map(doc => mapFirestoreDocToBook(doc.id, doc.data()));
  } catch (error) {
    console.error("Error fetching books:", error);
    throw error;
  }
};

// Взема книга по ID
export const fetchBookById = async (bookId: string): Promise<BookLibrary | null> => {
  try {
    const docRef = doc(db, "books", bookId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return mapFirestoreDocToBook(docSnap.id, docSnap.data());
    }
    return null;
  } catch (error) {
    console.error("Error fetching book by ID:", error);
    throw error;
  }
};

// Търсене на книги
export const searchBooks = async (searchTerm: string): Promise<BookLibrary[]> => {
  try {
    const allBooks = await fetchAllBooks();
    
    return allBooks.filter(book =>
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
  } catch (error) {
    console.error("Error searching books:", error);
    throw error;
  }
};

// Създаване на нова книга
export const createBook = async (bookData: BookInput): Promise<string> => {
  try {
    const copies = bookData.copies || 1;
    const availableCopies = copies;
    const underMaintenance = bookData.underMaintenance || false;
    
    let status: 'available' | 'borrowed' | 'reserved' | 'maintenance';
    if (underMaintenance) {
      status = 'maintenance';
    } else if (availableCopies > 0) {
      status = 'available';
    } else {
      status = 'available';
    }

    const newBook = {
      // Основни полета
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn,
      publisher: bookData.publisher || "",
      year: bookData.year || new Date().getFullYear(),
      category: bookData.category,
      description: bookData.description || "",
      
      // Наличност и статус
      copies: copies,
      availableCopies: availableCopies,
      status: status,
      reservationQueue: 0,
      waitingList: [],
      
      // Местоположение
      location: bookData.location || "Библиотека",
      shelfNumber: bookData.shelfNumber || '',
      callNumber: bookData.callNumber || '',
      
      // Външен вид
      coverUrl: bookData.coverUrl || "",
      coverType: bookData.coverType || 'soft',
      condition: bookData.condition || 'good',
      
      // Метаданни
      language: bookData.language || 'Български',
      edition: bookData.edition || 'Първо издание',
      tags: bookData.tags || [],
      genres: bookData.genres || [],
      ageRecommendation: bookData.ageRecommendation || '',
      pages: bookData.pages || 0,
      
      // Флагове
      featured: bookData.featured || false,
      isActive: bookData.isActive !== false,
      underMaintenance: underMaintenance,
      
      // Системни метрики
      rating: 0,
      ratingsCount: 0,
      views: 0,
      
      // Заемане
      borrowPeriod: bookData.borrowPeriod || 14,
      maxRenewals: bookData.maxRenewals || 2,
      
      // Допълнителни полета
      summary: bookData.summary || "",
      tableOfContents: bookData.tableOfContents || [],
      relatedBooks: bookData.relatedBooks || [],
      awards: bookData.awards || [],
      digitalVersion: bookData.digitalVersion || {
        available: false,
        format: "",
        url: ""
      },
      
      // Дати
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "books"), newBook);
    return docRef.id;
    
  } catch (error) {
    console.error("Error creating book:", error);
    throw error;
  }
};

// Обновяване на книга
export const updateBook = async (bookId: string, bookData: BookUpdateInput): Promise<void> => {
  try {
    const currentBook = await fetchBookById(bookId);
    if (!currentBook) {
      throw new Error("Book not found");
    }

    // Вземане на текущи стойности
    const currentCopies = currentBook.copies || 1;
    const currentAvailable = currentBook.availableCopies || currentCopies;
    const currentReservationQueue = currentBook.reservationQueue || 0;
    
    // Нови стойности
    const newCopies = bookData.copies || currentCopies;
    const newAvailableCopies = bookData.availableCopies !== undefined 
      ? bookData.availableCopies 
      : currentAvailable;
    
    // Ако се увеличават копията, увеличаваме и наличните
    let adjustedAvailableCopies = newAvailableCopies;
    if (newCopies > currentCopies) {
      const difference = newCopies - currentCopies;
      adjustedAvailableCopies = Math.min(newAvailableCopies + difference, newCopies);
    } else if (newCopies < currentCopies) {
      adjustedAvailableCopies = Math.min(adjustedAvailableCopies, newCopies);
    }
    
    const underMaintenance = bookData.underMaintenance || false;
    
    // Автоматично определяне на статус
    let newStatus: 'available' | 'borrowed' | 'reserved' | 'maintenance';
    if (underMaintenance) {
      newStatus = 'maintenance';
    } else if (adjustedAvailableCopies > 0) {
      newStatus = 'available';
    } else if (currentReservationQueue > 0) {
      newStatus = 'reserved';
    } else {
      newStatus = 'borrowed';
    }

    const updateData = {
      // Основни полета
      title: bookData.title || currentBook.title,
      author: bookData.author || currentBook.author,
      isbn: bookData.isbn || currentBook.isbn,
      publisher: bookData.publisher || currentBook.publisher,
      year: bookData.year || currentBook.year,
      category: bookData.category || currentBook.category,
      description: bookData.description || currentBook.description,
      
      // Наличност и статус
      copies: newCopies,
      availableCopies: adjustedAvailableCopies,
      status: newStatus,
      
      // Местоположение
      location: bookData.location || currentBook.location,
      shelfNumber: bookData.shelfNumber || currentBook.shelfNumber,
      callNumber: bookData.callNumber || currentBook.callNumber,
      
      // Външен вид
      coverUrl: bookData.coverUrl || currentBook.coverUrl,
      coverType: bookData.coverType || currentBook.coverType,
      condition: bookData.condition || currentBook.condition,
      
      // Метаданни
      language: bookData.language || currentBook.language,
      edition: bookData.edition || currentBook.edition,
      tags: bookData.tags || currentBook.tags,
      genres: bookData.genres || currentBook.genres,
      ageRecommendation: bookData.ageRecommendation || currentBook.ageRecommendation,
      pages: bookData.pages || currentBook.pages,
      
      // Флагове
      featured: bookData.featured !== undefined ? bookData.featured : currentBook.featured,
      isActive: bookData.isActive !== undefined ? bookData.isActive : currentBook.isActive,
      underMaintenance: underMaintenance,
      
      // Заемане
      borrowPeriod: bookData.borrowPeriod || currentBook.borrowPeriod,
      maxRenewals: bookData.maxRenewals || currentBook.maxRenewals,
      
      // Допълнителни полета
      summary: bookData.summary || currentBook.summary,
      tableOfContents: bookData.tableOfContents || currentBook.tableOfContents,
      relatedBooks: bookData.relatedBooks || currentBook.relatedBooks,
      awards: bookData.awards || currentBook.awards,
      digitalVersion: bookData.digitalVersion || currentBook.digitalVersion,
      
      // Последна промяна
      lastUpdated: Timestamp.now()
    };

    await updateDoc(doc(db, "books", bookId), updateData);
    
  } catch (error) {
    console.error("Error updating book:", error);
    throw error;
  }
};

// Изтриване на книга
export const deleteBook = async (bookId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "books", bookId));
  } catch (error) {
    console.error("Error deleting book:", error);
    throw error;
  }
};

// Допълнителни функции за заемане/връщане

// Заемане на книга
export const borrowBook = async (
  bookId: string, 
  userId: string, 
  userName: string,
  userEmail: string,
  userGrade?: string,
  userPhone?: string
): Promise<void> => {
  try {
    const book = await fetchBookById(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    if (book.availableCopies <= 0) {
      throw new Error("No available copies");
    }

    const borrowedDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (book.borrowPeriod || 14));
    const dueDateString = dueDate.toISOString().split('T')[0];

    const borrowedRecord = {
      userId,
      userName,
      userEmail,
      borrowedDate,
      dueDate: dueDateString,
      returned: false,
      userGrade,
      userPhone
    };

    const updatedBorrowedBy = [...(book.borrowedBy || []), borrowedRecord];

    await updateDoc(doc(db, "books", bookId), {
      availableCopies: book.availableCopies - 1,
      borrowedBy: updatedBorrowedBy,
      status: book.availableCopies - 1 === 0 ? 'borrowed' : 'available',
      lastUpdated: Timestamp.now()
    });
    
  } catch (error) {
    console.error("Error borrowing book:", error);
    throw error;
  }
};

// Връщане на книга
export const returnBook = async (bookId: string, userId: string): Promise<void> => {
  try {
    const book = await fetchBookById(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const updatedBorrowedBy = (book.borrowedBy || []).map(record => {
      if (record.userId === userId && !record.returned) {
        return {
          ...record,
          returned: true,
          returnDate: new Date().toISOString().split('T')[0]
        };
      }
      return record;
    });

    // Преброяваме колко активни заемания има
    const activeBorrowings = updatedBorrowedBy.filter(record => !record.returned).length;
    const totalCopies = book.copies || 1;
    const newAvailableCopies = totalCopies - activeBorrowings;

    let newStatus: 'available' | 'borrowed' | 'reserved' | 'maintenance' = 'available';
    if (book.underMaintenance) {
      newStatus = 'maintenance';
    } else if (newAvailableCopies > 0) {
      newStatus = 'available';
    } else if ((book.reservationQueue ?? 0) > 0) {
      newStatus = 'reserved';
    } else {
      newStatus = 'borrowed';
    }

    await updateDoc(doc(db, "books", bookId), {
      availableCopies: newAvailableCopies,
      borrowedBy: updatedBorrowedBy,
      status: newStatus,
      lastUpdated: Timestamp.now()
    });
    
  } catch (error) {
    console.error("Error returning book:", error);
    throw error;
  }
};

// Резервиране на книга
export const reserveBook = async (bookId: string, userId: string): Promise<void> => {
  try {
    const book = await fetchBookById(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    const updatedWaitingList = [...(book.waitingList || []), userId];

    await updateDoc(doc(db, "books", bookId), {
      reservationQueue: (book.reservationQueue || 0) + 1,
      waitingList: updatedWaitingList,
      status: 'reserved',
      lastUpdated: Timestamp.now()
    });
    
  } catch (error) {
    console.error("Error reserving book:", error);
    throw error;
  }
};

// Взимане на популярни книги
export const getFeaturedBooks = async (count: number = 5): Promise<BookLibrary[]> => {
  try {
    const allBooks = await fetchAllBooks();
    return allBooks
      .filter(book => book.featured)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, count);
  } catch (error) {
    console.error("Error getting featured books:", error);
    throw error;
  }
};

// Взимане на книги по категория
export const getBooksByCategory = async (category: string): Promise<BookLibrary[]> => {
  try {
    const allBooks = await fetchAllBooks();
    return allBooks.filter(book => book.category === category);
  } catch (error) {
    console.error("Error getting books by category:", error);
    throw error;
  }
};

// Взимане на книги по жанр
export const getBooksByGenre = async (genre: string): Promise<BookLibrary[]> => {
  try {
    const allBooks = await fetchAllBooks();
    return allBooks.filter(book => book.genres?.includes(genre));
  } catch (error) {
    console.error("Error getting books by genre:", error);
    throw error;
  }
};

// Валидиране на ISBN
export const validateISBN = (isbn: string): boolean => {
  const isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;
  return isbnRegex.test(isbn);
};

// Генериране на нов ISBN (за тестване)
export const generateTestISBN = (): string => {
  const prefix = '978';
  const group = Math.floor(Math.random() * 5 + 1).toString();
  const publisher = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  const title = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  
  let checkDigit = 0;
  const isbnWithoutCheck = prefix + group + publisher + title;
  
  // Изчисляване на контролната цифра за ISBN-13
  let sum = 0;
  for (let i = 0; i < isbnWithoutCheck.length; i++) {
    const digit = parseInt(isbnWithoutCheck[i]);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  checkDigit = (10 - (sum % 10)) % 10;
  
  return `${prefix}-${group}-${publisher}-${title}-${checkDigit}`;
};

// Добавяне в списъка на чакащите
export const addToWaitingList = async (bookId: string, userId: string): Promise<void> => {
  try {
    const bookRef = doc(db, "books", bookId);
    await updateDoc(bookRef, {
      waitingList: arrayUnion(userId),
      reservationQueue: increment(1),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding to waiting list:", error);
    throw error;
  }
};

// Премахване от списъка на чакащите
export const removeFromWaitingList = async (bookId: string, userId: string): Promise<void> => {
  try {
    const bookRef = doc(db, "books", bookId);
    await updateDoc(bookRef, {
      waitingList: arrayRemove(userId),
      reservationQueue: increment(-1),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error removing from waiting list:", error);
    throw error;
  }
};

// Проверка дали потребителят е в списъка на чакащите
export const isUserInWaitingList = async (bookId: string, userId: string): Promise<boolean> => {
  try {
    const book = await fetchBookById(bookId);
    if (!book) return false;
    return (book.waitingList || []).includes(userId);
  } catch (error) {
    console.error("Error checking waiting list:", error);
    return false;
  }
};

export const incrementBookViews = async (bookId: string): Promise<void> => {
  try {
    const bookRef = doc(db, "books", bookId);
    await updateDoc(bookRef, {
      views: increment(1),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error incrementing book views:", error);
    throw error;
  }
};

// ✅ НОВИ ФУНКЦИИ ЗА РЕЗЕРВАЦИИ:

// Функция за обновяване на наличните копия на книга
export const updateBookAvailableCopies = async (bookId: string, change: number): Promise<void> => {
  try {
    const bookRef = doc(db, "books", bookId);
    const bookDoc = await getDoc(bookRef);
    const bookData = bookDoc.data();
    
    if (!bookData) {
      throw new Error("Book not found");
    }

    const currentAvailableCopies = bookData.availableCopies || 0;
    const newAvailableCopies = Math.max(0, currentAvailableCopies + change);
    
    let newStatus: 'available' | 'borrowed' | 'reserved' | 'maintenance';
    
    if (bookData.underMaintenance) {
      newStatus = 'maintenance';
    } else if (newAvailableCopies > 0) {
      newStatus = 'available';
    } else if ((bookData.reservationQueue || 0) > 0) {
      newStatus = 'reserved';
    } else {
      newStatus = 'borrowed';
    }

    await updateDoc(bookRef, {
      availableCopies: newAvailableCopies,
      status: newStatus,
      lastUpdated: Timestamp.now()
    });
    
  } catch (error) {
    console.error("Error updating book available copies:", error);
    throw error;
  }
};

// Функция за проверка дали потребителят е в списъка на чакащите
export const checkUserInWaitingList = async (bookId: string, userId: string): Promise<boolean> => {
  try {
    const bookDoc = await getDoc(doc(db, "books", bookId));
    const bookData = bookDoc.data();
    
    if (!bookData) return false;
    
    const waitingList = bookData.waitingList || [];
    return waitingList.includes(userId);
  } catch (error) {
    console.error("Error checking waiting list:", error);
    return false;
  }
};

// Функция за вземане на детайли за книга с по-бързо изпълнение
export const getBookDetails = async (bookId: string): Promise<{
  availableCopies: number;
  waitingList: string[];
  reservationQueue: number;
} | null> => {
  try {
    const bookDoc = await getDoc(doc(db, "books", bookId));
    const bookData = bookDoc.data();
    
    if (!bookData) return null;
    
    return {
      availableCopies: bookData.availableCopies || 0,
      waitingList: bookData.waitingList || [],
      reservationQueue: bookData.reservationQueue || 0
    };
  } catch (error) {
    console.error("Error getting book details:", error);
    return null;
  }
};

// Функция за проверка дали има налични копия
export const hasAvailableCopies = async (bookId: string): Promise<boolean> => {
  try {
    const details = await getBookDetails(bookId);
    if (!details) return false;
    return details.availableCopies > 0;
  } catch (error) {
    console.error("Error checking available copies:", error);
    return false;
  }
};

// Функция за получаване на позиция в опашката
export const getUserPositionInQueue = async (bookId: string, userId: string): Promise<number> => {
  try {
    const details = await getBookDetails(bookId);
    if (!details) return 0;
    
    const index = details.waitingList.indexOf(userId);
    return index === -1 ? 0 : index + 1;
  } catch (error) {
    console.error("Error getting user position in queue:", error);
    return 0;
  }
};

// Функция за проверка на статуса на книгата
export const checkBookStatus = async (bookId: string): Promise<{
  status: 'available' | 'borrowed' | 'reserved' | 'maintenance';
  availableCopies: number;
  canReserve: boolean;
}> => {
  try {
    const bookDoc = await getDoc(doc(db, "books", bookId));
    const bookData = bookDoc.data();
    
    if (!bookData) {
      throw new Error("Book not found");
    }
    
    const availableCopies = bookData.availableCopies || 0;
    const status = bookData.status || 'available';
    const canReserve = availableCopies > 0 && status === 'available';
    
    return {
      status,
      availableCopies,
      canReserve
    };
  } catch (error) {
    console.error("Error checking book status:", error);
    throw error;
  }
};

// Вземане на всички рафтове
export const fetchAvailableShelves = async (): Promise<string[]> => {
  const books = await fetchAllBooks();

  const shelves = books
    .map(book => book.shelfNumber)
    .filter((shelf): shelf is string => !!shelf && shelf.trim() !== '');

  return Array.from(new Set(shelves));
};
