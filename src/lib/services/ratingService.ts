// services/ratingService.ts
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

// Оценяване на книга
export const rateBook = async (
  bookId: string,
  userId: string,
  rating: number,
  userOldRating: number = 0
): Promise<{newRating: number, newCount: number}> => {
  try {
    const bookRef = doc(db, "books", bookId);
    const bookDoc = await getDoc(bookRef);
    const bookData = bookDoc.data();
    
    if (!bookData) {
      throw new Error("Book not found");
    }

    const currentRating = bookData.rating || 0;
    const currentCount = bookData.ratingsCount || 0;

    let newRating: number;
    let newCount: number;
    
    if (userOldRating > 0) {
      // Обновяване на съществуваща оценка
      newRating = ((currentRating * currentCount) - userOldRating + rating) / currentCount;
      newCount = currentCount;
    } else {
      // Добавяне на нова оценка
      newRating = ((currentRating * currentCount) + rating) / (currentCount + 1);
      newCount = currentCount + 1;
    }

    await updateDoc(bookRef, {
      rating: parseFloat(newRating.toFixed(1)),
      ratingsCount: newCount,
      lastUpdated: Timestamp.now()
    });

    // Запазване на оценката на потребителя
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`ratings.${bookId}`]: rating,
      lastUpdated: Timestamp.now()
    });

    return {
      newRating: parseFloat(newRating.toFixed(1)),
      newCount
    };

  } catch (error) {
    console.error("Error rating book:", error);
    throw error;
  }
};

// Вземане на оценка на потребителя за книга
export const getUserRatingForBook = async (userId: string, bookId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    return userData?.ratings?.[bookId] || 0;
  } catch (error) {
    console.error("Error getting user rating:", error);
    return 0;
  }
};