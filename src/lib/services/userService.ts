// services/userService.ts
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

// Добавяне на прегледани книги
export const addToViewedBooks = async (userId: string, bookId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      viewedBooks: arrayUnion(bookId),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding to viewed books:", error);
    throw error;
  }
};

// Вземане на прегледани книги
export const getUserViewedBooks = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    return userData?.viewedBooks || [];
  } catch (error) {
    console.error("Error fetching viewed books:", error);
    return [];
  }
};

// Вземане на потребителски оценки
export const getUserRatings = async (userId: string): Promise<{[key: string]: number}> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    return userData?.ratings || {};
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    return {};
  }
};