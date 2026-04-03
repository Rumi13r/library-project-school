// src/lib/services/recommendationService.ts
// Removed unused imports: collection, getDocs, query, where, limit, orderBy
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import * as bookService from "./bookService";
import * as userService from "./userService";
import type { BookLibrary } from "./bookTypes";

export interface Recommendation {
  bookId:       string;
  title:        string;
  author:       string;
  coverUrl?:    string;
  score:        number;
  reason:       string;
  bookDetails?: BookLibrary;
}

class RecommendationService {

  async getRecommendations(userId: string | null, limitCount = 6): Promise<Recommendation[]> {
    if (!userId) return this.getPopularRecommendations(limitCount);
    try {
      const personalized = await this.getPersonalizedRecommendations(userId, limitCount);
      if (personalized.length < limitCount) {
        const popular = await this.getPopularRecommendations(limitCount - personalized.length);
        return [...personalized, ...popular];
      }
      return personalized;
    } catch (e) {
      console.error("Грешка при препоръки:", e);
      return this.getPopularRecommendations(limitCount);
    }
  }

  async getPersonalizedRecommendations(userId: string, limitCount = 6): Promise<Recommendation[]> {
    try {
      const allBooks = await bookService.fetchAllBooks();
      const validBooks = allBooks.filter(b => b.isActive !== false && b.title && b.author);

      const [viewedBooks, userRatings, wishlist] = await Promise.all([
        userService.getUserViewedBooks(userId),
        userService.getUserRatings(userId),
        this.getUserWishlist(userId),
      ]);

      if (!viewedBooks.length && !Object.keys(userRatings).length && !wishlist.length) return [];

      const likedBooks = validBooks.filter(b => userRatings[b.id] >= 4 || viewedBooks.includes(b.id));
      const preferredGenres  = this.extractPreferredGenres(likedBooks);
      const preferredAuthors = this.extractPreferredAuthors(likedBooks);

      return validBooks
        .filter(b => !viewedBooks.includes(b.id) && !wishlist.includes(b.id) && !userRatings[b.id])
        .map(b => this.calcPersonalizedScore(b, { preferredGenres, preferredAuthors, userRatings, viewedBooks }))
        .filter(r => r.score > 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, limitCount);
    } catch (e) {
      console.error("Грешка при персонализирани препоръки:", e);
      return [];
    }
  }

  async getPopularRecommendations(limitCount = 6): Promise<Recommendation[]> {
    try {
      const allBooks = await bookService.fetchAllBooks();
      const validBooks = allBooks.filter(b =>
        b.isActive !== false && ((b.rating||0)>0 || (b.views||0)>0 || (b.reservationQueue||0)>0)
      );

      if (!validBooks.length) {
        const fallback = allBooks.filter(b => b.isActive !== false);
        return fallback.slice(0, limitCount).map(b => ({
          bookId: b.id, title: b.title, author: b.author, coverUrl: b.coverUrl,
          score: 50, reason: 'Нова книга в библиотеката', bookDetails: b,
        }));
      }

      return validBooks
        .map(b => ({ bookId:b.id, title:b.title, author:b.author, coverUrl:b.coverUrl,
          score: Math.min(Math.round(this.calcPopularityScore(b)),100),
          reason: this.getPopularReason(b), bookDetails:b }))
        .filter(b => b.score > 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, limitCount);
    } catch (e) {
      console.error("Грешка при популярни препоръки:", e);
      return [];
    }
  }

  async getMixedRecommendations(userId: string | null, limitCount = 6): Promise<Recommendation[]> {
    return this.getRecommendations(userId, limitCount);
  }

  private calcPopularityScore(book: BookLibrary): number {
    let s = (book.rating||0)*10;
    s += Math.min(Math.max(book.reservationQueue||0,0)*5, 20);
    s += Math.min((book.views||0)/3, 20);
    s += Math.min((book.ratingsCount||0)*2, 10);
    if (book.year && book.year >= new Date().getFullYear()-2) s += 5;
    return Math.min(s, 100);
  }

  private calcPersonalizedScore(
    book: BookLibrary,
    prefs: { preferredGenres: Map<string,number>; preferredAuthors: Map<string,number>; userRatings: Record<string,number>; viewedBooks: string[] }
  ): Recommendation {
    let score = 0;
    const reasons: string[] = [];

    score += (book.rating||0)*8;
    if ((book.rating||0)>=4.5) reasons.push('Класика с висок рейтинг');
    else if ((book.rating||0)>=4) reasons.push('Високо оценена');

    score += Math.min((book.views||0)/4, 15);
    score += Math.min(Math.max(book.reservationQueue||0,0)*3, 15);
    if ((book.reservationQueue||0)>2) reasons.push('Най-търсена');
    else if ((book.reservationQueue||0)>0) reasons.push('Търсена книга');

    if (book.genres?.length && prefs.preferredGenres.size) {
      let gScore = 0; const matched: string[] = [];
      book.genres.forEach(g => { const p = prefs.preferredGenres.get(g)||0; if(p>0){ gScore+=p*3; matched.push(g); } });
      if (gScore>0) { score += Math.min(gScore,15); if(matched[0]) reasons.push(`Харесвате ${matched[0].toLowerCase()}`); }
    }

    if (prefs.preferredAuthors.size) {
      const ap = prefs.preferredAuthors.get(book.author)||0;
      if (ap>0) { score += Math.min(ap*5,10); reasons.push('От любим автор'); }
    }

    const yr = new Date().getFullYear();
    if (book.year && book.year >= yr-1) { score+=5; if(!reasons.includes('Нова книга')) reasons.push('Нова книга'); }
    else if (book.year && book.year >= yr-2) score+=2;
    if ((book.rating||0)>=4.8) score+=5;

    const unique = [...new Set(reasons)].slice(0,2);
    if (!unique.length) unique.push((book.rating||0)>=4 ? 'Високо оценена книга' : 'Препоръчана за вас');

    return {
      bookId: book.id, title: book.title, author: book.author, coverUrl: book.coverUrl,
      score: Math.min(Math.round(score),100), reason: unique.join(', '), bookDetails: book,
    };
  }

  private extractPreferredGenres(books: BookLibrary[]): Map<string,number> {
    const m = new Map<string,number>();
    books.forEach(b => b.genres?.forEach(g => { if(g?.trim()) m.set(g,(m.get(g)||0)+1); }));
    return m;
  }

  private extractPreferredAuthors(books: BookLibrary[]): Map<string,number> {
    const m = new Map<string,number>();
    books.forEach(b => { if(b.author?.trim()) m.set(b.author,(m.get(b.author)||0)+1); });
    return m;
  }

  private getPopularReason(book: BookLibrary): string {
    const r: string[] = [];
    if ((book.rating||0)>=4.5) r.push('Класика с висок рейтинг');
    else if ((book.rating||0)>=4) r.push('Високо оценена');
    else if ((book.rating||0)>=3.5) r.push('Добре оценена');
    if ((book.reservationQueue||0)>2) r.push('Най-търсена');
    else if ((book.reservationQueue||0)>0) r.push('Търсена книга');
    if ((book.views||0)>100) r.push('Най-четена');
    else if ((book.views||0)>50) r.push('Популярна');
    else if ((book.views||0)>10) r.push('Често преглеждана');
    if (book.featured) r.push('Препоръчана от библиотекаря');
    return r.length ? r.slice(0,2).join(' • ') : 'Популярна сред читателите';
  }

  private async getUserWishlist(userId: string): Promise<string[]> {
    try {
      const snap = await getDoc(doc(db,"users",userId));
      return snap.data()?.wishlist || [];
    } catch { return []; }
  }
}

export const recommendationService = new RecommendationService();