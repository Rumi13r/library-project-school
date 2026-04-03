// services/groqService.ts
import Groq from 'groq-sdk';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// ── Local data-shape types ────────────────────────────────────────────────────
interface BookRecord {
  title?: string;
  author?: string;
  rating?: number;
  ratingsCount?: number;
  views?: number;
  reservationQueue?: number;
  copies?: number;
  availableCopies?: number;
  category?: string;
}

interface EventRecord {
  title?: string;
  date?: string;
  time?: string;
  location?: string;
  currentParticipants?: number;
  maxParticipants?: number;
}

interface ReservationRecord {
  status?: string;
}

export interface GroqAnalysisRequest {
  books: BookRecord[];
  events: EventRecord[];
  reservations: ReservationRecord[];
  userStats?: Record<string, unknown>;
}

export interface GroqRecommendation {
  type: 'book' | 'event' | 'order' | 'promotion';
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

class GroqService {
  private groq: Groq | null = null;

  constructor() {
    if (GROQ_API_KEY) {
      this.groq = new Groq({
        apiKey: GROQ_API_KEY,
        dangerouslyAllowBrowser: true, 
      });
      console.log('✅ Groq SDK инициализиран');
    } else {
      console.warn('⚠️ Groq API ключ липсва');
    }
  }

  private async callGroq(prompt: string, temperature: number = 0.7) {
    if (!this.groq) {
      console.error('❌ Groq не е инициализиран - няма API ключ');
      return null;
    }

    try {
      console.log('📤 Изпращам заявка към Groq...');
      
      const completion = await this.groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Ти си AI асистент за библиотека. Анализираш данни и даваш интелигентни препоръки. Отговаряш само на български език.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: 2000,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || '';
      console.log('✅ Получен отговор от Groq');
      return reply;

    } catch (error: unknown) {
      console.error('❌ Грешка при комуникация с Groq:', error);
      
      if (error instanceof Error) {
        if (error.message?.includes('API key')) {
          console.error('🔑 Проблем с API ключа');
        } else if (error.message?.includes('model')) {
          console.error('🤖 Проблем с модела');
        }
      }
      
      return null;
    }
  }

  // Анализ на популярни книги със Groq
  async analyzePopularBooks(books: BookRecord[]): Promise<string> {
    const topBooks = books
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10)
      .map(book => ({
        title: book.title,
        author: book.author,
        rating: book.rating || 0,
        ratingsCount: book.ratingsCount || 0,
        views: book.views || 0,
        reservationQueue: book.reservationQueue || 0,
        copies: book.copies || 1,
        availableCopies: book.availableCopies || 0,
        category: book.category
      }));

    const prompt = `
      Като библиотечен AI, анализирай тези топ 10 книги:

      ${JSON.stringify(topBooks, null, 2)}

      Моля, направи следния анализ на български език:
      1. Кои са 3-те най-забележителни книги и защо?
      2. Има ли книги, които са високо оценени, но имат малко прегледи?
      3. Кои книги се нуждаят от повече копия според опашката?
      4. Какви тенденции забелязваш в категориите?
      5. Дай 3 конкретни препоръки за библиотекаря.
      
      Форматирай отговора с емоджи и раздели за по-добра четимост.
    `;

    return await this.callGroq(prompt, 0.5) || 'Няма данни за анализ';
  }

  // AI препоръки за поръчки на нови книги
  async getOrderRecommendations(books: BookRecord[]): Promise<GroqRecommendation[]> {
    const highDemandBooks = books
      .filter(book => (book.reservationQueue || 0) > 2)
      .map(book => ({
        title: book.title,
        author: book.author,
        queueLength: book.reservationQueue || 0,
        copies: book.copies || 1,
        rating: book.rating || 0,
        views: book.views || 0
      }));

    if (highDemandBooks.length === 0) {
      return [];
    }

    const prompt = `
      Като библиотечен експерт, анализирай тези книги с високо търсене:

      ${JSON.stringify(highDemandBooks, null, 2)}

      Върни ми само JSON масив с препоръки за поръчки в следния формат:
      [
        {
          "type": "order",
          "title": "заглавие на книгата",
          "reason": "кратко обяснение защо да се поръча",
          "priority": "high/medium/low",
          "action": "конкретно действие (напр. 'Поръчай 3 допълнителни копия')"
        }
      ]
      
      Ограничи до максимум 5 препоръки. Върни САМО JSON, без друг текст.
    `;

    const response = await this.callGroq(prompt, 0.3);
    try {
      return JSON.parse(response || '[]');
    } catch {
      return [];
    }
  }

  // Анализ на събития
  async analyzeEvents(events: EventRecord[]): Promise<string> {
    if (events.length === 0) {
      return 'Няма събития за анализ';
    }

    const eventsData = events.slice(0, 10).map(event => ({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      participants: event.currentParticipants,
      maxParticipants: event.maxParticipants,
      occupancyRate: Math.round(((event.currentParticipants ?? 0) / (event.maxParticipants ?? 1)) * 100) + '%'
    }));

    const prompt = `
      Анализирай тези библиотечни събития:

      ${JSON.stringify(eventsData, null, 2)}

      На български език:
      1. Кои събития са най-успешни и защо?
      2. Има ли събития със слаб интерес?
      3. Какви тенденции забелязваш в дните и часовете?
      4. Препоръки за подобряване на посещаемостта.
      
      Добави емоджи за по-добра визуализация.
    `;

    return await this.callGroq(prompt, 0.5) || 'Няма данни за анализ';
  }

  // Персонализирани препоръки за библиотекаря
  async getLibrarianInsights(data: GroqAnalysisRequest): Promise<string> {
    const summary = {
      totalBooks: data.books.length,
      totalEvents: data.events.length,
      totalReservations: data.reservations.length,
      activeReservations: data.reservations.filter(r => r.status === 'active').length,
      averageRating: (data.books.reduce((sum, b) => sum + (b.rating || 0), 0) / (data.books.length || 1)).toFixed(1),
      booksWithQueue: data.books.filter(b => (b.reservationQueue || 0) > 0).length,
      upcomingEvents: data.events.filter(e => new Date(e.date ?? '') > new Date()).length
    };

    const prompt = `
      Като AI библиотекар, анализирай следните данни:

      ОБОБЩЕНИ СТАТИСТИКИ:
      ${JSON.stringify(summary, null, 2)}

      ДЕТАЙЛИ ЗА ТОП 10 КНИГИ:
      ${JSON.stringify(data.books.slice(0, 10).map(b => ({
        title: b.title,
        rating: b.rating || 0,
        queue: b.reservationQueue || 0,
        views: b.views || 0
      })), null, 2)}

      Дай ми:
      1. 🔥 **ГОРЕЩИ ТЕНДЕНЦИИ**: Кои книги набират популярност?
      2. ⚠️ **ПРОБЛЕМИ**: Какво трябва да се адресира спешно?
      3. 💡 **ПРЕПОРЪКИ**: 5 конкретни действия за следващата седмица
      4. 📊 **КЛЮЧОВИ ИЗВОДИ**: 3 най-важни неща, които трябва да знам
      
      Форматирай отговора с емоджи и раздели. Пиши на български.
    `;

    return await this.callGroq(prompt, 0.4) || 'Няма данни за анализ';
  }

  // Генериране на AI обобщение за популярния таб
  async generatePopularSummary(books: BookRecord[]): Promise<string> {
    if (books.length === 0) {
      return 'Няма книги за анализ';
    }

    const topRated = [...books].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
    const mostWanted = [...books].sort((a, b) => (b.reservationQueue || 0) - (a.reservationQueue || 0)).slice(0, 3);
    const mostViewed = [...books].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);

    const prompt = `
      Като библиотечен експерт, обобщи тези данни за популярни книги:

      НАЙ-ВИСОКО ОЦЕНЕНИ:
      ${JSON.stringify(topRated.map(b => `${b.title} (${b.rating}/5)`))}

      НАЙ-ЧАКАНИ:
      ${JSON.stringify(mostWanted.map(b => `${b.title} (${b.reservationQueue} чакащи)`))}

      НАЙ-ГЛЕДАНИ:
      ${JSON.stringify(mostViewed.map(b => `${b.title} (${b.views} прегледа)`))}

      Напиши кратък, забавен и информативен текст (3-4 изречения) за библиотекаря, 
      който обобщава кои книги са хит в момента. Добави емоджи.
    `;

    return await this.callGroq(prompt, 0.8) || 'Няма данни за обобщение';
  }
}

export const groqService = new GroqService();
export default groqService;