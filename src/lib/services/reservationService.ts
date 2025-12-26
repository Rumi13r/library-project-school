// services/reservationService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  Timestamp
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
    await updateDoc(doc(db, "reservations", reservationId), {
      status: 'cancelled',
      lastUpdated: Timestamp.now()
    });
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