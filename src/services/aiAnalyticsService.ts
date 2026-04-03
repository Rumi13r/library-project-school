// services/aiAnalyticsService.ts

// ── Local data-shape types ────────────────────────────────────────────────────
interface BookData {
  id?: string;
  title?: string;
  author?: string;
  category?: string;
  rating?: number;
  ratingsCount?: number;
  views?: number;
  reservationQueue?: number;
  copies?: number;
  availableCopies?: number;
  lastViewed?: { toDate?: () => Date };
  dailyViews?: Record<string, number>;
}

interface EventData {
  id?: string;
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

export interface AIBookInsight {
  bookId: string;
  title: string;
  author: string;
  category: string;
  
  // Основни метрики
  rating: number;
  ratingsCount: number;
  views: number;
  reservationQueue: number;
  
  // Изчислени от AI
  popularityScore: number; // 0-100
  demandScore: number; // 0-100 (колко е търсена)
  satisfactionScore: number; // 0-100 (колко е харесвана)
  trend: 'rising' | 'stable' | 'falling';
  
  // Прогнози
  predictedDemand: number; // Очакван брой резервации следващия месец
  recommendedCopies: number; // Препоръчителен брой копия
  
  // Сравнение
  rankByRating: number;
  rankByDemand: number;
  rankByViews: number;
}

export interface AIEventInsight {
  eventId: string;
  title: string;
  date: string;
  location: string;
  
  // Основни метрики
  currentParticipants: number;
  maxParticipants: number;
  occupancyRate: number; // % запълняемост
  
  // AI анализи
  popularityTrend: 'rising' | 'stable' | 'falling';
  predictedParticipants: number; // Прогноза за следващото събитие
  similarEvents: string[]; // Подобни събития за comparison
  
  // Препоръки
  recommendedCapacity: number; // Препоръчителен капацитет за бъдещи събития
  bestTimeSlot: string; // Най-добър час за провеждане
  bestDayOfWeek: string; // Най-добър ден от седмицата
}

class AIAnalyticsService {
  
  // ИЗЧИСЛЯВАНЕ НА ПОПУЛЯРНОСТ - комбинация от всички фактори
  calculatePopularityScore(book: BookData): number {
    const weights = {
      rating: 0.25,
      views: 0.20,
      reservationQueue: 0.30,
      ratingsCount: 0.15,
      recency: 0.10
    };

    // Нормализиране на стойностите
    const ratingScore = (book.rating || 0) * 20; // 5 stars * 20 = 100 max
    
    const maxViews = 1000; // Очакван максимум
    const viewsScore = Math.min((book.views || 0) / maxViews * 100, 100);
    
    const maxQueue = 50; // Очакван максимум опашка
    const queueScore = Math.min((book.reservationQueue || 0) / maxQueue * 100, 100);
    
    const maxRatings = 100; // Очакван максимум оценки
    const ratingsCountScore = Math.min((book.ratingsCount || 0) / maxRatings * 100, 100);
    
    // Проверка за скорошна активност
    const lastViewed = book.lastViewed?.toDate?.() || new Date(0);
    const daysSinceLastView = (Date.now() - lastViewed.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 100 - daysSinceLastView * 5); // Пада с 5% на ден

    return (
      ratingScore * weights.rating +
      viewsScore * weights.views +
      queueScore * weights.reservationQueue +
      ratingsCountScore * weights.ratingsCount +
      recencyScore * weights.recency
    );
  }

  // ИЗЧИСЛЯВАНЕ НА ТЪРСЕНЕ (demand) - базирано на опашки и прегледи
  calculateDemandScore(book: BookData): number {
    const queueWeight = 0.6;
    const viewsWeight = 0.4;
    
    const maxQueue = 50;
    const maxViews = 1000;
    
    const queueScore = Math.min((book.reservationQueue || 0) / maxQueue * 100, 100);
    const viewsScore = Math.min((book.views || 0) / maxViews * 100, 100);
    
    return queueScore * queueWeight + viewsScore * viewsWeight;
  }

  // ИЗЧИСЛЯВАНЕ НА УДОВЛЕТВОРЕНИЕ (satisfaction) - базирано на рейтинги
  calculateSatisfactionScore(book: BookData): number {
    if ((book.ratingsCount || 0) === 0) return 0;
    
    const ratingScore = (book.rating || 0) * 20; // 5 stars = 100
    const confidenceFactor = Math.min((book.ratingsCount || 0) / 10, 1); // Колкото повече оценки, толкова по-достоверно
    
    return ratingScore * confidenceFactor;
  }

  // ОПРЕДЕЛЯНЕ НА ТРЕНД
  determineTrend(book: BookData): 'rising' | 'stable' | 'falling' {
    const today = new Date();
    const lastWeek = new Date(today.setDate(today.getDate() - 7));
    const previousWeek = new Date(today.setDate(today.getDate() - 14));
    
    // Анализ на прегледите по дни
    const dailyViews = book.dailyViews || {};
    
    let viewsThisWeek = 0;
    let viewsLastWeek = 0;
    
    Object.entries(dailyViews).forEach(([dateStr, count]) => {
      const date = new Date(dateStr);
      if (date > lastWeek) {
        viewsThisWeek += count;
      } else if (date > previousWeek) {
        viewsLastWeek += count;
      }
    });
    
    if (viewsThisWeek > viewsLastWeek * 1.2) return 'rising';
    if (viewsThisWeek < viewsLastWeek * 0.8) return 'falling';
    return 'stable';
  }

  // ПРОГНОЗА ЗА ТЪРСЕНЕ (използвайки moving average)
  predictDemand(book: BookData): number {
    const dailyViews = book.dailyViews || {};
    const last30Days = Object.entries(dailyViews)
      .filter(([date]) => {
        const daysAgo = (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 30;
      })
      .map(([, count]) => count);
    
    if (last30Days.length === 0) return book.reservationQueue || 0;
    
    // Moving average с по-голяма тежест на последните дни
    const weights = last30Days.map((_, i) => i + 1);
    const weightedSum = last30Days.reduce((sum, views, i) => sum + views * weights[i], 0);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    
    const avgDailyViews = weightedSum / weightSum;
    const predictedMonthlyDemand = avgDailyViews * 30;
    
    return Math.round(predictedMonthlyDemand);
  }

  // ПРЕПОРЪКА ЗА БРОЙ КОПИЯ
  recommendCopies(book: BookData): number {
    const currentQueue = book.reservationQueue || 0;
    const currentCopies = book.copies || 1;
    
    if (currentQueue === 0) return currentCopies;
    
    // Ако има опашка, препоръчваме достатъчно копия да покрият търсенето
    const recommended = Math.ceil(currentQueue / 3) + currentCopies; // 1 копие на всеки 3 чакащи
    
    return Math.min(recommended, 10); // Максимум 10 копия
  }

  // AI АНАЛИЗ ЗА КНИГИ
  async analyzeBooks(books: BookData[]): Promise<AIBookInsight[]> {
    // Първо сортираме за ранговете
    const byRating = [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    const byDemand = [...books].sort((a, b) => (b.reservationQueue || 0) - (a.reservationQueue || 0));
    const byViews = [...books].sort((a, b) => (b.views || 0) - (a.views || 0));
    
    return books.map(book => {
      const popularityScore = this.calculatePopularityScore(book);
      const demandScore = this.calculateDemandScore(book);
      const satisfactionScore = this.calculateSatisfactionScore(book);
      const trend = this.determineTrend(book);
      const predictedDemand = this.predictDemand(book);
      const recommendedCopies = this.recommendCopies(book);
      
      // Намиране на ранговете
      const rankByRating = byRating.findIndex(b => b.id === book.id) + 1;
      const rankByDemand = byDemand.findIndex(b => b.id === book.id) + 1;
      const rankByViews = byViews.findIndex(b => b.id === book.id) + 1;
      
      return {
        bookId: book.id ?? '',
        title: book.title ?? '',
        author: book.author ?? '',
        category: book.category ?? '',
        
        rating: book.rating || 0,
        ratingsCount: book.ratingsCount || 0,
        views: book.views || 0,
        reservationQueue: book.reservationQueue || 0,
        
        popularityScore,
        demandScore,
        satisfactionScore,
        trend,
        
        predictedDemand,
        recommendedCopies,
        
        rankByRating,
        rankByDemand,
        rankByViews
      };
    });
  }

  // AI АНАЛИЗ ЗА СЪБИТИЯ
  async analyzeEvents(events: EventData[]): Promise<AIEventInsight[]> {
    // Анализ на най-добрите часове
    const timeSlots: Record<string, number[]> = {};
    const dayOfWeek: Record<string, number[]> = {};
    
    events.forEach(event => {
      const participants = event.currentParticipants ?? 0;
      const maxParticipants = event.maxParticipants ?? 1;
      const occupancy = participants / maxParticipants;

      if (event.time) {
        if (!timeSlots[event.time]) timeSlots[event.time] = [];
        timeSlots[event.time].push(occupancy);
      }
      
      if (event.date) {
        const day = new Date(event.date).toLocaleDateString('bg-BG', { weekday: 'long' });
        if (!dayOfWeek[day]) dayOfWeek[day] = [];
        dayOfWeek[day].push(occupancy);
      }
    });
    
    // Намиране на най-успешния час
    let bestTimeSlot = '';
    let bestTimeScore = 0;
    Object.entries(timeSlots).forEach(([time, occupancies]) => {
      const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
      if (avgOccupancy > bestTimeScore) {
        bestTimeScore = avgOccupancy;
        bestTimeSlot = time;
      }
    });
    
    // Намиране на най-успешния ден
    let bestDayOfWeek = '';
    let bestDayScore = 0;
    Object.entries(dayOfWeek).forEach(([day, occupancies]) => {
      const avgOccupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
      if (avgOccupancy > bestDayScore) {
        bestDayScore = avgOccupancy;
        bestDayOfWeek = day;
      }
    });
    
    return events.map(event => {
      const currentParticipants = event.currentParticipants ?? 0;
      const maxParticipants = event.maxParticipants ?? 1;
      const occupancyRate = (currentParticipants / maxParticipants) * 100;
      
      // Определяне на тренд за събитието
      // Тук може да се добави по-сложна логика с исторически данни
      const trend: 'rising' | 'stable' | 'falling' = 'stable';
      
      // Прогноза за следващото събитие (просто moving average)
      const predictedParticipants = Math.round(currentParticipants * 1.1); // 10% ръст
      
      // Препоръчителен капацитет
      let recommendedCapacity = maxParticipants;
      if (occupancyRate > 90) {
        recommendedCapacity = Math.round(maxParticipants * 1.2); // +20%
      } else if (occupancyRate < 50) {
        recommendedCapacity = Math.round(maxParticipants * 0.8); // -20%
      }
      
      return {
        eventId: event.id ?? '',
        title: event.title ?? '',
        date: event.date ?? '',
        location: event.location ?? '',
        
        currentParticipants,
        maxParticipants,
        occupancyRate,
        
        popularityTrend: trend,
        predictedParticipants,
        similarEvents: [],
        
        recommendedCapacity,
        bestTimeSlot,
        bestDayOfWeek
      };
    });
  }

  // ВЗЕМАНЕ НА ТОП ПРЕПОРЪКИ ЗА ПОРЪЧКИ
  async getRecommendedOrders(books: BookData[]): Promise<AIBookInsight[]> {
    const analyzed = await this.analyzeBooks(books);
    
    // Книги с високо търсене, но малко копия
    return analyzed
      .filter(book => 
        book.demandScore > 70 && // Високо търсене
        book.recommendedCopies > (books.find(b => b.id === book.bookId)?.copies || 1) // Нуждаят се от още копия
      )
      .sort((a, b) => b.demandScore - a.demandScore)
      .slice(0, 10);
  }

  // ВЗЕМАНЕ НА КНИГИ, КОИТО СЕ НУЖДАЯТ ОТ ПРОМОЦИЯ
  async getUnderperformingBooks(books: BookData[]): Promise<AIBookInsight[]> {
    const analyzed = await this.analyzeBooks(books);
    
    // Книги с нисък рейтинг или малко прегледи, но потенциал
    return analyzed
      .filter(book => 
        book.views < 50 && // Малко прегледи
        book.rating > 3.5 && // Добър рейтинг (значи ако я прочетат я харесват)
        book.ratingsCount < 5 // Малко оценки
      )
      .sort((a, b) => b.rating - a.rating);
  }
}

export const aiAnalyticsService = new AIAnalyticsService();