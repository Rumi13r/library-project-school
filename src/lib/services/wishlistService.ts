// services/wishlistService.ts
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

// Добавяне в списък с желания
export const addToWishlist = async (userId: string, bookId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      wishlist: arrayUnion(bookId),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    throw error;
  }
};

// Премахване от списък с желания
export const removeFromWishlist = async (userId: string, bookId: string): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      wishlist: arrayRemove(bookId),
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    throw error;
  }
};

// Проверка дали книга е в списъка с желания
export const isBookInWishlist = async (userId: string, bookId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    const wishlist = userData?.wishlist || [];
    return wishlist.includes(bookId);
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return false;
  }
};

// Вземане на списък с желания
export const getUserWishlist = async (userId: string): Promise<string[]> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    return userData?.wishlist || [];
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return [];
  }
};