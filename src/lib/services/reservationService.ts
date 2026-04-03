// services/reservationService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
  getDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../../firebase/firebase";

export interface Reservation {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  userEmail: string;
  reservedAt: Date | Timestamp;
  expiresAt: Date | Timestamp;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  createdAt: Date | Timestamp;
  lastUpdated?: Date | Timestamp;
}

export interface ReservationInput {
  bookId: string;
  userId: string;
  userName: string;
  userEmail: string;
  borrowPeriod: number;
}

// Създаване на резервация
export const createReservation = async (reservationData: ReservationInput): Promise<string> => {
  try {
    // 1. Провери дали книгата съществува
    const bookRef = doc(db, "books", reservationData.bookId);
    const bookDoc = await getDoc(bookRef);
    
    if (!bookDoc.exists()) {
      throw new Error("Книгата не съществува");
    }
    
    const bookData = bookDoc.data();
    const currentQueue = bookData.reservationQueue || 0;
    
    // 2. Създай резервацията
    const reservedAt = Timestamp.now();
    const expiresAt = Timestamp.fromMillis(
      Date.now() + reservationData.borrowPeriod * 24 * 60 * 60 * 1000
    );

    const reservation = {
      ...reservationData,
      reservedAt,
      expiresAt,
      status: 'active',
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "reservations"), reservation);
    
    // 3. 🔥 ВАЖНО: Увеличи reservationQueue и добави в waitingList
    await updateDoc(bookRef, {
      reservationQueue: currentQueue + 1,
      waitingList: arrayUnion(reservationData.userId),
      lastUpdated: Timestamp.now()
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating reservation:", error);
    throw error;
  }
};

// Вземане на активни резервации за потребител
export const getUserActiveReservations = async (userId: string): Promise<Reservation[]> => {
  try {
    const reservationsQuery = query(
      collection(db, "reservations"),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    
    const snapshot = await getDocs(reservationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reservation));
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    throw error;
  }
};

// Отмяна на резервация
export const cancelReservation = async (reservationId: string): Promise<void> => {
  try {
    // 1. Вземи резервацията, за да разберем за коя книга става въпрос
    const reservationRef = doc(db, "reservations", reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      throw new Error("Резервацията не съществува");
    }
    
    const reservationData = reservationDoc.data();
    const bookId = reservationData.bookId;
    const userId = reservationData.userId;
    
    // 2. Обнови статуса на резервацията
    await updateDoc(reservationRef, {
      status: 'cancelled',
      lastUpdated: Timestamp.now()
    });
    
    // 3. 🔥 ВАЖНО: Намали reservationQueue и премахни от waitingList
    const bookRef = doc(db, "books", bookId);
    const bookDoc = await getDoc(bookRef);
    
    if (bookDoc.exists()) {
      const bookData = bookDoc.data();
      const currentQueue = bookData.reservationQueue || 0;
      
      await updateDoc(bookRef, {
        reservationQueue: Math.max(0, currentQueue - 1), // предотврати негативни стойности
        waitingList: arrayRemove(userId),
        lastUpdated: Timestamp.now()
      });
    }
    
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    throw error;
  }
};

// Проверка дали потребителят има активна резервация за книга
export const checkUserReservationForBook = async (userId: string, bookId: string): Promise<boolean> => {
  try {
    const reservationsQuery = query(
      collection(db, "reservations"),
      where("userId", "==", userId),
      where("bookId", "==", bookId),
      where("status", "==", "active")
    );
    
    const snapshot = await getDocs(reservationsQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking user reservation:", error);
    return false;
  }
};

// Маркиране на резервация като изпълнена (когато потребителят вземе книгата)
export const fulfillReservation = async (reservationId: string): Promise<void> => {
  try {
    const reservationRef = doc(db, "reservations", reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (!reservationDoc.exists()) {
      throw new Error("Резервацията не съществува");
    }
    
    const reservationData = reservationDoc.data();
    const bookId = reservationData.bookId;
    const userId = reservationData.userId;
    
    // 1. Обнови статуса на резервацията
    await updateDoc(reservationRef, {
      status: 'fulfilled',
      lastUpdated: Timestamp.now()
    });
    
    // 2. 🔥 Премахни от waitingList (вече е взел книгата)
    const bookRef = doc(db, "books", bookId);
    const bookDoc = await getDoc(bookRef);
    
    if (bookDoc.exists()) {
      const bookData = bookDoc.data();
      const currentQueue = bookData.reservationQueue || 0;
      
      await updateDoc(bookRef, {
        reservationQueue: Math.max(0, currentQueue - 1),
        waitingList: arrayRemove(userId),
        lastUpdated: Timestamp.now()
      });
    }
    
  } catch (error) {
    console.error("Error fulfilling reservation:", error);
    throw error;
  }
};

// Вземане на всички резервации
export const getAllReservations = async (): Promise<Reservation[]> => {
  try {
    const snapshot = await getDocs(collection(db, "reservations"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Reservation));
  } catch (error) {
    console.error("Error fetching all reservations:", error);
    return [];
  }
};

// Изтриване на резервация (само за администратори)
export const deleteReservation = async (reservationId: string): Promise<void> => {
  try {
    // Вземи резервацията преди да я изтрием
    const reservationRef = doc(db, "reservations", reservationId);
    const reservationDoc = await getDoc(reservationRef);
    
    if (reservationDoc.exists()) {
      const reservationData = reservationDoc.data();
      const bookId = reservationData.bookId;
      const userId = reservationData.userId;
      
      // Обнови книгата (намали опашката)
      const bookRef = doc(db, "books", bookId);
      const bookDoc = await getDoc(bookRef);
      
      if (bookDoc.exists()) {
        const bookData = bookDoc.data();
        const currentQueue = bookData.reservationQueue || 0;
        
        await updateDoc(bookRef, {
          reservationQueue: Math.max(0, currentQueue - 1),
          waitingList: arrayRemove(userId),
          lastUpdated: Timestamp.now()
        });
      }
    }
    
    // Изтрий резервацията
    await deleteDoc(reservationRef);
    
  } catch (error) {
    console.error("Error deleting reservation:", error);
    throw error;
  }
};