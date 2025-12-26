// types/bookTypes.ts
import { Timestamp } from 'firebase/firestore';

export interface BookLibrary {
  // Основни полета
  id: string;
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  year: number;
  pages?: number;
  
  // Категория и жанрове
  category: string;
  genres: string[];
  
  // Тагове
  tags?: string[];
  
  // Описание
  description: string;
  
  // Наличност
  copies: number;
  availableCopies: number;
  location: string;
  shelfNumber?: string;
  callNumber?: string;
  
  // Външен вид
  coverUrl?: string;
  coverType?: 'hard' | 'soft';
  condition?: 'new' | 'good' | 'fair' | 'poor';
  
  // Метаданни
  language?: string;
  edition?: string;
  ageRecommendation?: string;
  
  // Системни полета
  status?: 'available' | 'borrowed' | 'reserved' | 'maintenance';
  rating?: number;
  ratingsCount?: number;
  views?: number;
  featured?: boolean;
  isActive?: boolean;
  underMaintenance?: boolean;
  
  // Заемане и резервации
  borrowPeriod?: number;
  maxRenewals?: number;
  reservationQueue?: number;
  waitingList?: string[];
  
  // Допълнителна информация
  summary?: string;
  tableOfContents?: string[];
  relatedBooks?: string[];
  awards?: string[];
  digitalVersion?: {
    available: boolean;
    format?: string;
    url?: string;
  };
  
  // Дати
  createdAt: Timestamp | Date | string | null;
  lastUpdated?: Timestamp | Date | string | null;

  // Потребители
  borrowedBy?: {
    userId: string;
    userName: string;
    userEmail: string;
    borrowedDate: string;
    dueDate: string;
    returned: boolean;
    returnDate?: string;
    userGrade?: string;
    userPhone?: string;
  }[];
  
  borrowStatus?: 'reserved' | 'borrowed' | 'returned';
}

export type BookInput = Omit<BookLibrary, 'id' | 'createdAt' | 'lastUpdated'> & {
  // Опционални полета при създаване
  createdAt?: Timestamp | Date | string;
  lastUpdated?: Timestamp | Date | string;
};

export type BookUpdateInput = Partial<Omit<BookLibrary, 'id' | 'createdAt'>>;

export type BookFilter = {
  category?: string;
  genre?: string;
  author?: string;
  yearFrom?: number;
  yearTo?: number;
  availableOnly?: boolean;
  featured?: boolean;
  searchTerm?: string;
};

export type BookStatus = 'available' | 'borrowed' | 'reserved' | 'maintenance';
export type CoverType = 'hard' | 'soft';
export type BookCondition = 'new' | 'good' | 'fair' | 'poor';