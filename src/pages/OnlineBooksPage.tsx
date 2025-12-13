import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Book, 
  ExternalLink, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Heart, 
  Share2, 
  Bookmark,
  Star,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Video,
  Headphones,
  Award,
  TrendingUp,
  Calendar,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './OnlineBooksPage.css';

interface OnlineBook {
  id: string;
  title: string;
  author: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;
  format: string; // PDF, EPUB, MOBI, AUDIO, VIDEO
  url: string;
  thumbnailUrl: string;
  fileSize?: string;
  duration?: string; // За аудио/видео книги
  pages?: number;
  rating: number;
  ratingsCount: number;
  views: number;
  downloads: number;
  featured: boolean;
  createdAt: any;
  lastUpdated: any;
  license?: string;
  publisher?: string;
  year?: number;
  isbn?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ageGroup?: string;
  requirements?: string[];
  additionalLinks?: {
    title: string;
    url: string;
    type: string;
  }[];
}

const OnlineBooksPage: React.FC = () => {
  const [books, setBooks] = useState<OnlineBook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<OnlineBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedBook, setSelectedBook] = useState<OnlineBook | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [showVazovStories, setShowVazovStories] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchOnlineBooks();
  }, []);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, searchTerm, categoryFilter, formatFilter, languageFilter, difficultyFilter, sortBy]);

  const fetchOnlineBooks = async () => {
    try {
      setLoading(true);
      // Заявка към Firestore
      const booksQuery = query(
        collection(db, "onlineBooks"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(booksQuery);
      const booksData: OnlineBook[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as OnlineBook));

      setBooks(booksData);
      extractFiltersData(booksData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching online books:", error);
      // Fallback data за демонстрация - Всички книги включително разказите на Вазов
      const allBooks: OnlineBook[] = [
        {
          id: '1',
  title: 'Гръмна гръм',
  author: 'Рей Бредбъри',
  description: 'Класически научнофантастичен разказ за пътуване назад във времето, в който дребна, на пръв поглед незначителна промяна, води до драматични последици в бъдещето.',
  category: 'Фантастика',
  subcategory: 'Кратък разказ',
  tags: ['бредбъри', 'фантастика', 'science fiction', 'времеви пътувания', 'ефект на пеперудата', 'класика'],
  language: 'Български',
  format: 'PDF',
  url: 'https://chitanka.info/book/4662-grymna-grym',
  thumbnailUrl: 'https://assets2.chitanka.info/thumb/book-cover/12/4662.max.jpg',
  fileSize: '1.2 MB',
  pages: 12,
  rating: 4.9,
  ratingsCount: 1240,
  views: 5120,
  downloads: 3410,
  featured: true,
  createdAt: new Date('2023-07-15'),
  lastUpdated: new Date('2024-02-01'),
  publisher: 'Ray Bradbury Estate',
  year: 1952,
  difficulty: 'intermediate',
  ageGroup: '12+',
  additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4662-grymna-grym/export/epub', type: 'pdf' },
            { title: 'Текст онлайн', url: 'https://chitanka.info/text/4662-grymna-grym', type: 'web' },
            { title: 'Анализ на разказа', url: 'https://literature.bg/analysis/grymna-grym', type: 'web' }
          ]
        },
        {
          id: '2',
          title: 'Въведение в програмирането с Python',
          author: 'Джон Дое',
          description: 'Пълно ръководство за начинаещи в програмирането с Python. Подходящо за ученици и студенти.',
          category: 'Образование',
          subcategory: 'Програмиране',
          tags: ['програмиране', 'python', 'учебник', 'кодиране', 'технологии'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/books/python-intro.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '5.1 MB',
          pages: 320,
          rating: 4.6,
          ratingsCount: 210,
          views: 980,
          downloads: 650,
          featured: true,
          createdAt: new Date('2023-10-15'),
          lastUpdated: new Date('2024-01-20'),
          license: 'Creative Commons',
          requirements: ['Базови познания по математика'],
          year: 2023,
          difficulty: 'beginner',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'Упражнения', url: 'https://exercises.example.com/python-exercises.pdf', type: 'pdf' },
            { title: 'Видео уроци', url: 'https://youtube.com/playlist?list=python-intro', type: 'video' },
            { title: 'Код примери', url: 'https://github.com/example/python-intro-code', type: 'web' }
          ]
        },
        {
          id: '3',
          title: 'Физика за 10. клас',
          author: 'Проф. Иван Петров',
          description: 'Пълен учебник по физика за средното образование, съответстващ на държавните образователни стандарти.',
          category: 'Учебници',
          subcategory: 'Физика',
          tags: ['физика', 'учебник', '10 клас', 'образование', 'наука'],
          language: 'Български',
          format: 'PDF',
          url: 'https://minedu.government.bg/textbooks/physics-10.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '8.4 MB',
          pages: 280,
          rating: 4.5,
          ratingsCount: 180,
          views: 750,
          downloads: 520,
          featured: false,
          createdAt: new Date('2023-08-01'),
          lastUpdated: new Date('2023-12-15'),
          publisher: 'Министерство на образованието',
          year: 2023,
          difficulty: 'beginner',
          ageGroup: '15+',
          additionalLinks: [
            { title: 'Решения на задачи', url: 'https://minedu.government.bg/textbooks/physics-10-solutions.pdf', type: 'pdf' },
            { title: 'Тестове', url: 'https://minedu.government.bg/textbooks/physics-10-tests.pdf', type: 'pdf' }
          ]
        },
        {
          id: '4',
          title: 'The Great Gatsby (Audio Book)',
          author: 'F. Scott Fitzgerald',
          description: 'Classic American novel in audio format. Experience the Jazz Age through this timeless masterpiece.',
          category: 'Чуждоезична литература',
          subcategory: 'Американска литература',
          tags: ['аудио книга', 'английски', 'класика', 'фицджералд', 'джаз ера'],
          language: 'Английски',
          format: 'AUDIO',
          url: 'https://librivox.org/the-great-gatsby/',
          thumbnailUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          duration: '7 часа 15 минути',
          rating: 4.7,
          ratingsCount: 420,
          views: 1560,
          downloads: 920,
          featured: true,
          createdAt: new Date('2023-11-05'),
          lastUpdated: new Date('2024-02-10'),
          publisher: 'Librivox',
          year: 1925,
          difficulty: 'intermediate',
          ageGroup: '16+',
          additionalLinks: [
            { title: 'Текст на книгата', url: 'https://gutenberg.org/ebooks/64317', type: 'text' },
            { title: 'Анализ и ревюта', url: 'https://sparknotes.com/lit/gatsby/', type: 'web' },
            { title: 'Учебен гид', url: 'https://example.com/gatsby-study-guide.pdf', type: 'pdf' }
          ]
        },
        {
          id: '5',
          title: 'История на България - Видео курс',
          author: 'Д-р Мария Иванова',
          description: 'Цялостен видео курс по история на България от древността до наши дни. Подходящ за ученици и ентусиасти.',
          category: 'Образование',
          subcategory: 'История',
          tags: ['история', 'видео курс', 'българия', 'образование', 'исторически'],
          language: 'Български',
          format: 'VIDEO',
          url: 'https://youtube.com/playlist?list=example123',
          thumbnailUrl: 'https://www.book.store.bg/lrgimg/40558/istoria-na-bylgarite-tom-i-ot-drevnostta-do-kraia-na-xvi-vek.jpg',
          duration: '12 часа 30 минути',
          rating: 4.9,
          ratingsCount: 310,
          views: 2450,
          downloads: 1250,
          featured: true,
          createdAt: new Date('2024-01-15'),
          lastUpdated: new Date('2024-03-01'),
          license: 'YouTube',
          requirements: ['Интернет връзка'],
          year: 2024,
          difficulty: 'beginner',
          ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF конспекти', url: 'https://notes.example.com/history-bg-notes.pdf', type: 'pdf' },
            { title: 'Тестове', url: 'https://tests.example.com/history-bg-tests.pdf', type: 'pdf' },
            { title: 'Хронологична таблица', url: 'https://resources.example.com/bg-history-timeline.pdf', type: 'pdf' }
          ]
        },
        {
          id: '6',
          title: 'Математика за матура',
          author: 'Колектив',
          description: 'Изчерпателен сборник задачи и решения за матура по математика. Подготовка за държавния зрелостен изпит.',
          category: 'Учебници',
          subcategory: 'Математика',
          tags: ['математика', 'матура', 'задачи', 'зрелостен изпит', 'подготовка'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/books/matura-math.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '3.8 MB',
          pages: 210,
          rating: 4.4,
          ratingsCount: 190,
          views: 680,
          downloads: 430,
          featured: false,
          createdAt: new Date('2023-09-20'),
          lastUpdated: new Date('2024-01-10'),
          publisher: 'Образователни ресурси',
          year: 2023,
          difficulty: 'advanced',
          ageGroup: '17+',
          additionalLinks: [
            { title: 'Решение на задачите', url: 'https://example.com/books/matura-math-solutions.pdf', type: 'pdf' },
            { title: 'Допълнителни упражнения', url: 'https://example.com/books/matura-math-extra.pdf', type: 'pdf' }
          ]
        },
        {
          id: '7',
          title: 'Под игото',
          author: 'Иван Вазов',
          description: 'Класическият български роман за Априлското въстание. История за българския народ по време на Османското владичество.',
          category: 'Българска литература',
          subcategory: 'Исторически роман',
          tags: ['класика', 'история', 'българска литература', 'вазов', 'роман'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/1',
          thumbnailUrl: 'https://www.ciela.com/media/catalog/product/cache/32bb0748c82325b02c55df3c2a9a9856/p/o/pod-igoto_1.jpg',
          fileSize: '2.3 MB',
          pages: 450,
          rating: 4.8,
          ratingsCount: 345,
          views: 1250,
          downloads: 890,
          featured: true,
          createdAt: new Date('2024-01-01'),
          lastUpdated: new Date('2024-02-01'),
          publisher: 'Българска класика',
          year: 1894,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'Аудио книга', url: 'https://chitanka.info/book/1/export/epub', type: 'audio' },
            { title: 'Учебно помагало', url: 'https://resources.example.com/pod-igoto-guide.pdf', type: 'pdf' },
            { title: 'Анализ на творбата', url: 'https://literature.bg/analysis/pod-igoto', type: 'web' }
          ]
        },
        {
          id: '8',
          title: 'Немили-недраги',
          author: 'Иван Вазов',
          description: 'Разказ за братя, разделени от различното си отношение към освободителните борби на българския народ.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'братя', 'освобождение', 'семейство', 'патриотизъм'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4663-nemili-nedragi',
          thumbnailUrl: 'https://knigomania.bg/product_images/700/146444.jpg',
          fileSize: '1.5 MB',
          pages: 52,
          rating: 4.6,
          ratingsCount: 156,
          views: 890,
          downloads: 620,
          featured: false,
          createdAt: new Date('2023-06-20'),
          lastUpdated: new Date('2024-01-15'),
          publisher: 'Българска класика',
          year: 1884,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4663-nemili-nedragi/export/epub', type: 'pdf' },
            { title: 'Аудио версия', url: 'https://librivox.org/search?title=nemili-nedragi&author=vazov', type: 'audio' },
            { title: 'Тематичен анализ', url: 'https://literature.bg/analysis/nemili-nedragi', type: 'web' }
          ]
        },
        {
          id: '9',
          title: 'Една българка',
          author: 'Иван Вазов',
          description: 'Разказ за българската жена и нейната героична роля в националноосвободителните борби.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'българка', 'жена', 'патриотизъм', 'героизъм'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4664-edna-balgarka',
          thumbnailUrl: 'https://artivet.com/2939-large_default/diamanten-goblen-balgarka.jpg',
          fileSize: '1.1 MB',
          pages: 38,
          rating: 4.5,
          ratingsCount: 142,
          views: 760,
          downloads: 540,
          featured: false,
          createdAt: new Date('2023-08-10'),
          lastUpdated: new Date('2024-01-20'),
          publisher: 'Български писател',
          year: 1885,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4664-edna-balgarka/export/epub', type: 'pdf' },
            { title: 'Анализ на разказа', url: 'https://literature.bg/analysis/edna-balgarka', type: 'web' },
            { title: 'Исторически контекст', url: 'https://history.bg/women-in-bulgarian-history', type: 'web' }
          ]
        },
        {
          id: '10',
          title: 'В Пирин',
          author: 'Иван Вазов',
          description: 'Разказ за силата на народната памет, традициите и изворът като символ на живота и продължението.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'традиции', 'народна памет', 'природа', 'символика'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4665-izvorov',
          thumbnailUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '0.9 MB',
          pages: 32,
          rating: 4.4,
          ratingsCount: 128,
          views: 680,
          downloads: 490,
          featured: false,
          createdAt: new Date('2023-09-05'),
          lastUpdated: new Date('2024-01-25'),
          publisher: 'Българска класика',
          year: 1887,
          difficulty: 'beginner',
          ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4665-izvorov/export/epub', type: 'pdf' },
            { title: 'Учебни материали', url: 'https://resources.example.com/izvorov-study-guide.pdf', type: 'pdf' },
            { title: 'Символичен анализ', url: 'https://literature.bg/analysis/izvorov-symbolism', type: 'web' }
          ]
        },
        {
          id: '11',
          title: 'Иде ли?',
          author: 'Иван Вазов',
          description: 'Разказ за предчувствията, подготовката и очакванията за предстоящи освободителни борби.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'освобождение', 'подготовка', 'революция', 'предчувствие'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4666-neshto-se-gotvi',
          thumbnailUrl: 'https://images.unsplash.com/photo-1544716278-e513176f20b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.3 MB',
          pages: 41,
          rating: 4.6,
          ratingsCount: 165,
          views: 820,
          downloads: 580,
          featured: true,
          createdAt: new Date('2023-10-12'),
          lastUpdated: new Date('2024-02-05'),
          publisher: 'Български писател',
          year: 1889,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4666-neshto-se-gotvi/export/epub', type: 'pdf' },
            { title: 'Исторически контекст', url: 'https://history.bg/neshto-se-gotvi-context', type: 'web' },
            { title: 'Анализ на образите', url: 'https://literature.bg/analysis/neshto-se-gotvi-characters', type: 'web' }
          ]
        },
        {
          id: '12',
          title: 'Вълко на война',
          author: 'Иван Вазов',
          description: 'Разказ за живота, вярата и традициите в българските манастири през Възраждането.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'манастир', 'религия', 'традиции', 'възраждане'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4667-pod-manastirskata-loza',
          thumbnailUrl: 'https://images.unsplash.com/photo-1542662565-7e4b66bae529?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.4 MB',
          pages: 48,
          rating: 4.7,
          ratingsCount: 178,
          views: 910,
          downloads: 640,
          featured: false,
          createdAt: new Date('2023-11-18'),
          lastUpdated: new Date('2024-02-10'),
          publisher: 'Българска класика',
          year: 1890,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4667-pod-manastirskata-loza/export/epub', type: 'pdf' },
            { title: 'Аудио разказ', url: 'https://audio.example.com/pod-manastirskata-loza.mp3', type: 'audio' },
            { title: 'Исторически реалности', url: 'https://history.bg/bulgarian-monasteries', type: 'web' }
          ]
        },
        {
          id: '13',
          title: 'Апостола в премеждие',
          author: 'Иван Вазов',
          description: 'Патриотичен разказ за любовта, предаността и жертвите за родината.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'патриотизъм', 'родина', 'любов', 'жертва'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4668-otechestvo-lyubezno',
          thumbnailUrl: 'https://images.unsplash.com/photo-1543332143-4e8c27e3256f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.0 MB',
          pages: 35,
          rating: 4.8,
          ratingsCount: 195,
          views: 1050,
          downloads: 720,
          featured: true,
          createdAt: new Date('2023-12-05'),
          lastUpdated: new Date('2024-02-15'),
          publisher: 'Български писател',
          year: 1892,
          difficulty: 'beginner',
          ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4668-otechestvo-lyubezno/export/epub', type: 'pdf' },
            { title: 'Ученически анализ', url: 'https://school.bg/otechestvo-lyubezno-analysis.pdf', type: 'pdf' },
            { title: 'Патриотични теми', url: 'https://literature.bg/patriotism-in-vazov', type: 'web' }
          ]
        },
        {
          id: '14',
          title: 'Дядо Нистор',
          author: 'Иван Вазов',
          description: 'Разказ за продължаващата борба за свобода, справедливост и национално достойнство.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'борба', 'свобода', 'справедливост', 'устойчивост'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4669-borbata-prodalzhava',
          thumbnailUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.2 MB',
          pages: 42,
          rating: 4.5,
          ratingsCount: 152,
          views: 790,
          downloads: 560,
          featured: false,
          createdAt: new Date('2024-01-08'),
          lastUpdated: new Date('2024-02-20'),
          publisher: 'Българска класика',
          year: 1893,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4669-borbata-prodalzhava/export/epub', type: 'pdf' },
            { title: 'Исторически референции', url: 'https://history.bg/borbata-prodalzhava-references', type: 'web' },
            { title: 'Тема за съпротивата', url: 'https://literature.bg/resistance-themes', type: 'web' }
          ]
        },
        {
          id: '15',
          title: 'Среща',
          author: 'Иван Вазов',
          description: 'Разказ за духовния завет на предците към следващите поколения и отговорността за наследството.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'завет', 'поколения', 'традиции', 'наследство'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4670-zavet',
          thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.1 MB',
          pages: 37,
          rating: 4.6,
          ratingsCount: 168,
          views: 870,
          downloads: 610,
          featured: false,
          createdAt: new Date('2024-01-22'),
          lastUpdated: new Date('2024-02-25'),
          publisher: 'Български писател',
          year: 1894,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4670-zavet/export/epub', type: 'pdf' },
            { title: 'Тематичен анализ', url: 'https://literature.bg/analysis/zavet-themes', type: 'web' },
            { title: 'Междупоколенчески отношения', url: 'https://sociology.bg/intergenerational-relations', type: 'web' }
          ]
        },
        // ДОПЪЛНИТЕЛНИ РАЗКАЗИ ОТ ДРУГИ АВТОРИ
        {
          id: '16',
          title: 'Чичовци',
          author: 'Иван Вазов',
          description: 'Разказ за живота, мъдростта и хумора на селските хора в българското село.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['вазов', 'разказ', 'селски живот', 'традиции', 'хумор', 'селска мъдрост'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4671-chichovci',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.3 MB',
          pages: 44,
          rating: 4.5,
          ratingsCount: 145,
          views: 730,
          downloads: 520,
          featured: false,
          createdAt: new Date('2024-01-30'),
          lastUpdated: new Date('2024-02-28'),
          publisher: 'Българска класика',
          year: 1885,
          difficulty: 'beginner',
          ageGroup: '12+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4671-chichovci/export/epub', type: 'pdf' },
            { title: 'Фолклорни елементи', url: 'https://folklore.bg/vazov-folk-elements', type: 'web' }
          ]
        },
        {
          id: '17',
          title: 'Гераците',
          author: 'Елин Пелин',
          description: 'Класически хумористичен разказ за селския живот и забавните ситуации с героите Гераци.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['елин пелин', 'разказ', 'хумористичен', 'селски живот', 'класика', 'български хумор'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/1000-geratsite',
          thumbnailUrl: 'https://knigomania.bg/product_images/700/146445.jpg',
          fileSize: '0.8 MB',
          pages: 28,
          rating: 4.7,
          ratingsCount: 210,
          views: 950,
          downloads: 670,
          featured: true,
          createdAt: new Date('2023-05-15'),
          lastUpdated: new Date('2024-01-10'),
          publisher: 'Българска класика',
          year: 1911,
          difficulty: 'beginner',
          ageGroup: '10+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/1000-geratsite/export/epub', type: 'pdf' },
            { title: 'Аудио версия', url: 'https://audio.example.com/geratsite-audio.mp3', type: 'audio' },
            { title: 'Хумористичен анализ', url: 'https://literature.bg/humor-in-geratsite', type: 'web' }
          ]
        },
        {
          id: '18',
          title: 'В полите на Витоша',
          author: 'Пейо Яворов',
          description: 'Лирически разказ за природата, човешката душа и философските размишления в сърцето на планината.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['яворов', 'разказ', 'природа', 'лирически', 'философски', 'витоша'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/2000-v-polite-na-vitosha',
          thumbnailUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '0.9 MB',
          pages: 31,
          rating: 4.6,
          ratingsCount: 178,
          views: 810,
          downloads: 590,
          featured: false,
          createdAt: new Date('2023-06-25'),
          lastUpdated: new Date('2024-01-18'),
          publisher: 'Поетична библиотека',
          year: 1910,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/2000-v-polite-na-vitosha/export/epub', type: 'pdf' },
            { title: 'Поетичен анализ', url: 'https://poetry.bg/yavorov-nature-poetry', type: 'web' }
          ]
        },
        {
          id: '19',
          title: 'Септември',
          author: 'Гео Милев',
          description: 'Поетичен разказ за Септемврийското въстание, революционния патос и историческите събития.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['гео милев', 'разказ', 'септемврийско въстание', 'поетичен', 'революция', 'исторически'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/3000-septemvri',
          thumbnailUrl: 'https://images.unsplash.com/photo-1543332143-4e8c27e3256f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.0 MB',
          pages: 36,
          rating: 4.8,
          ratingsCount: 195,
          views: 920,
          downloads: 680,
          featured: true,
          createdAt: new Date('2023-07-30'),
          lastUpdated: new Date('2024-01-25'),
          publisher: 'Революционна литература',
          year: 1924,
          difficulty: 'advanced',
          ageGroup: '16+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/3000-septemvri/export/epub', type: 'pdf' },
            { title: 'Исторически контекст', url: 'https://history.bg/septemvri-1923-context', type: 'web' },
            { title: 'Литературен анализ', url: 'https://literature.bg/milev-september-analysis', type: 'web' }
          ]
        },
        {
          id: '20',
          title: 'Майстори',
          author: 'Йордан Йовков',
          description: 'Класически разказ за българските майстори, тяхното изкуство и хуманизъм.',
          category: 'Българска литература',
          subcategory: 'Разказ',
          tags: ['йовков', 'разказ', 'майстори', 'български дух', 'традиции', 'изкуство'],
          language: 'Български',
          format: 'PDF',
          url: 'https://chitanka.info/book/4000-maistori',
          thumbnailUrl: 'https://uchiteli.bg/public/uploads/files/Yovkov.jpg',
          fileSize: '1.1 MB',
          pages: 39,
          rating: 4.7,
          ratingsCount: 182,
          views: 840,
          downloads: 600,
          featured: false,
          createdAt: new Date('2023-08-15'),
          lastUpdated: new Date('2024-01-30'),
          publisher: 'Българска класика',
          year: 1927,
          difficulty: 'intermediate',
          ageGroup: '14+',
          additionalLinks: [
            { title: 'PDF за сваляне', url: 'https://chitanka.info/book/4000-maistori/export/epub', type: 'pdf' },
            { title: 'Анализ на героите', url: 'https://literature.bg/yovkov-characters-analysis', type: 'web' }
          ]
        }
      ];
      
      setBooks(allBooks);
      extractFiltersData(allBooks);
      setLoading(false);
    }
  };

  const extractFiltersData = (booksData: OnlineBook[]) => {
    // Извличане на уникални категории
    const categories = new Set<string>();
    const languages = new Set<string>();
    
    booksData.forEach(book => {
      categories.add(book.category);
      languages.add(book.language);
    });
    
    setAvailableCategories(Array.from(categories).sort());
    setAvailableLanguages(Array.from(languages).sort());
  };

  const filterAndSortBooks = () => {
    let filtered = [...books];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(book => book.category === categoryFilter);
    }

    // Format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter(book => book.format === formatFilter);
    }

    // Language filter
    if (languageFilter !== 'all') {
      filtered = filtered.filter(book => book.language === languageFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(book => book.difficulty === difficultyFilter);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => b.views - a.views);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'downloads':
        filtered.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'author':
        filtered.sort((a, b) => a.author.localeCompare(b.author));
        break;
    }

    setFilteredBooks(filtered);
  };

  const handleBookClick = (book: OnlineBook) => {
    setSelectedBook(book);
    setShowBookDetails(true);
  };

  const handleReadOnline = (book: OnlineBook) => {
    try {
      // Отваряне на книгата в нов таб
      const newWindow = window.open(book.url, '_blank');
      
      if (newWindow) {
        // Логика за проследяване на прегледи
        console.log(`Book "${book.title}" opened in new tab`);
        
        // Можете да добавите код за проследяване тук
        // await updateDoc(doc(db, "onlineBooks", book.id), {
        //   views: increment(1)
        // });
      } else {
        // Ако браузърът блокира popup, препращаме в същия таб
        window.location.href = book.url;
      }
      
    } catch (error) {
      console.error('Error opening book:', error);
      alert('Възникна грешка при отварянето на книгата.');
    }
  };

  const handleDownload = async (book: OnlineBook) => {
    try {
      // За книги от chitanka.info използваме export ендпойнта
      let downloadUrl = book.url;
      
      if (book.url.includes('chitanka.info')) {
        // Заменяме /book/ с /export/ и добавяме epub (има и pdf опция)
        downloadUrl = book.url.replace('/book/', '/export/') + '/epub';
        
        // Алтернативно, ако има специален линк за PDF в additionalLinks
        const pdfLink = book.additionalLinks?.find(link => 
          link.title.toLowerCase().includes('pdf') || link.type === 'pdf'
        );
        
        if (pdfLink) {
          downloadUrl = pdfLink.url;
        }
      }
      
      // Създаваме временен линк за сваляне
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Добавяме евент листенър за след сваляне
      link.onclick = () => {
        setTimeout(() => {
          // Логика за проследяване на свалянията
          console.log(`Book "${book.title}" downloaded`);
          
          // Можете да извикате функция за update на downloads в базата данни
          // await updateDoc(doc(db, "onlineBooks", book.id), {
          //   downloads: increment(1)
          // });
          
          // Показване на съобщение за успех
          alert(`Книгата "${book.title}" започва да се сваля!`);
        }, 100);
      };
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading book:', error);
      alert('Възникна грешка при свалянето на книгата. Моля, опитайте отново.');
    }
  };

  const handleShareBook = (book: OnlineBook) => {
    if (navigator.share) {
      navigator.share({
        title: book.title,
        text: `Прочети "${book.title}" от ${book.author} - ${book.description.substring(0, 100)}...`,
        url: book.url,
      }).catch(error => {
        console.log('Error sharing:', error);
        fallbackShare(book);
      });
    } else {
      fallbackShare(book);
    }
  };

  const fallbackShare = (book: OnlineBook) => {
    // Fallback за браузъри без Web Share API
    const shareText = `${book.title} от ${book.author}\n\n${book.description.substring(0, 150)}...\n\nПрочети онлайн: ${book.url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Информацията за книгата е копирана в клипборда!'))
        .catch(err => {
          console.error('Failed to copy: ', err);
          prompt('Копирайте следния текст:', shareText);
        });
    } else {
      prompt('Копирайте следния текст:', shareText);
    }
  };

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBookId(expandedBookId === bookId ? null : bookId);
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return FileText;
      case 'EPUB': return Book;
      case 'MOBI': return Book;
      case 'AUDIO': return Headphones;
      case 'VIDEO': return Video;
      default: return FileText;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'PDF': return '#ef4444';
      case 'EPUB': return '#3b82f6';
      case 'MOBI': return '#8b5cf6';
      case 'AUDIO': return '#10b981';
      case 'VIDEO': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="stars-container">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <Star key={index} className="star-icon star-filled" />;
          } else if (index === fullStars && hasHalfStar) {
            return <Star key={index} className="star-icon star-half" />;
          } else {
            return <Star key={index} className="star-icon star-empty" />;
          }
        })}
        <span className="rating-number">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setFormatFilter('all');
    setLanguageFilter('all');
    setDifficultyFilter('all');
    setSortBy('newest');
  };

  const handleSuggestBook = () => {
    if (user) {
      navigate('/suggest-book');
    } else {
      navigate('/login', { 
        state: { 
          redirectTo: '/online-books',
          message: 'Моля, влезте в профила си, за да предложите книга.' 
        }
      });
    }
  };

  const getVazovStories = () => {
    return books.filter(book => 
      book.author.toLowerCase().includes('вазов') && 
      book.category === 'Българска литература' &&
      book.subcategory === 'Разказ'
    );
  };

  const toggleVazovStories = () => {
    setShowVazovStories(!showVazovStories);
  };
console.log(toggleVazovStories);
  // Ако все още зареждаме
  if (loading) {
    return (
      <div className="online-books-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на онлайн книги...</span>
        </div>
      </div>
    );
  }

  const vazovStories = getVazovStories();
  const hasVazovStories = vazovStories.length > 0;

  return (
    <div className="online-books-page">
      <div className="online-books-container">
        {/* Header */}
        <div className="online-books-header">
          <div className="online-books-title-section">
            <div className="title-icon-wrapper online">
              <Book className="online-books-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Онлайн Библиотека</h1>
              <p className="online-books-subtitle">
                Дигитални книги, учебници и ресурси за свободен достъп
              </p>
            </div>
          </div>

          <div className="online-books-actions">
            <button 
              className="suggest-book-btn"
              onClick={handleSuggestBook}
            >
              <BookOpen size={18} />
              <span>Предложи книга</span>
            </button>
          </div>
        </div>
        {/* Search and Filters */}
        <div className="online-books-filters">
          <div className="main-search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсете книги, автори, теми..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-info">
              <Book size={16} />
              <span>{books.length} книги налично</span>
            </div>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">
                <Filter size={16} />
                Категория
              </label>
              <select 
                className="filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Всички категории</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <FileText size={16} />
                Формат
              </label>
              <select 
                className="filter-select"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
              >
                <option value="all">Всички формати</option>
                <option value="PDF">PDF документи</option>
                <option value="EPUB">EPUB книги</option>
                <option value="AUDIO">Аудио книги</option>
                <option value="VIDEO">Видео курсове</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <Globe size={16} />
                Език
              </label>
              <select 
                className="filter-select"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                <option value="all">Всички езици</option>
                {availableLanguages.map(language => (
                  <option key={language} value={language}>{language}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <TrendingUp size={16} />
                Трудност
              </label>
              <select 
                className="filter-select"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="all">Всички нива</option>
                <option value="beginner">Начинаещ</option>
                <option value="intermediate">Напреднал</option>
                <option value="advanced">Експерт</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <Calendar size={16} />
                Подреди по
              </label>
              <select 
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Най-нови</option>
                <option value="popular">Най-популярни</option>
                <option value="rating">Най-висок рейтинг</option>
                <option value="title">Име (А-Я)</option>
                <option value="author">Автор (А-Я)</option>
                <option value="downloads">Най-сваляни</option>
              </select>
            </div>

            {(searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' || 
              languageFilter !== 'all' || difficultyFilter !== 'all' || sortBy !== 'newest') && (
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Изчисти филтрите
              </button>
            )}
          </div>
        </div>

        {/* Vazov Stories Collection */}
        {hasVazovStories && showVazovStories && (
          <div className="vazov-collection">
            <div className="collection-header">
              <h3 className="collection-title">
                <span className="author-name">Иван Вазов</span>
                <span className="collection-count">({vazovStories.length} разказа)</span>
              </h3>
              <p className="collection-description">
                Класически разкази от патриарха на българската литература
              </p>
            </div>
            
            <div className="collection-books">
              {vazovStories.map((book) => {
                const FormatIcon = getFormatIcon(book.format);
                const isExpanded = expandedBookId === book.id;
                console.log(isExpanded);
                return (
                  <div 
                    key={book.id} 
                    className={`book-card collection-card ${book.featured ? 'featured' : ''}`}
                  >
                    <div className="book-header">
                      <div className="book-thumbnail">
                        <img 
                          src={book.thumbnailUrl} 
                          alt={book.title}
                          className="book-image"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                        <div className="book-image-fallback hidden">
                          <Book className="fallback-icon" />
                        </div>
                        {book.featured && (
                          <div className="featured-badge">
                            <Award size={14} />
                            <span>Препоръчано</span>
                          </div>
                        )}
                      </div>

                      <div className="book-main-info">
                        <div className="book-title-section">
                          <h3 className="book-title">{book.title}</h3>
                          <p className="book-author">{book.author}</p>
                        </div>

                        <div className="book-meta">
                          <div className="book-category">
                            <Tag size={14} />
                            <span>{book.category}</span>
                          </div>
                          <div 
                            className="book-format"
                            style={{ color: getFormatColor(book.format) }}
                          >
                            <FormatIcon size={14} />
                            <span>{book.format}</span>
                          </div>
                          {book.year && (
                            <div className="book-year">
                              <Calendar size={14} />
                              <span>{book.year}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="book-description">
                      <p>{book.description}</p>
                    </div>

                    <div className="book-actions">
                      <button 
                        className="read-online-btn"
                        onClick={() => handleReadOnline(book)}
                      >
                        <Eye size={16} />
                        <span>Прочети онлайн</span>
                      </button>
                      
                      <button 
                        className="download-btn"
                        onClick={() => handleDownload(book)}
                      >
                        <Download size={16} />
                        <span>Свали PDF</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Books Grid */}
        <div className="online-books-content">
          {filteredBooks.length > 0 ? (
            <>
              <div className="books-stats">
                <BookOpen className="stats-icon" />
                <span className="books-count">
                  Намерени {filteredBooks.length} книги
                </span>
                {searchTerm && (
                  <span className="search-results">
                    Резултати за "{searchTerm}"
                  </span>
                )}
              </div>

              <div className="books-grid">
                {filteredBooks
                  .filter(book => !showVazovStories || !vazovStories.some(v => v.id === book.id))
                  .map((book) => {
                  const FormatIcon = getFormatIcon(book.format);
                  const isExpanded = expandedBookId === book.id;
                  
                  return (
                    <div 
                      key={book.id} 
                      className={`book-card ${book.featured ? 'featured' : ''}`}
                      onClick={() => handleBookClick(book)}
                    >
                      {/* Book Header */}
                      <div className="book-header">
                        <div className="book-thumbnail">
                          <img 
                            src={book.thumbnailUrl} 
                            alt={book.title}
                            className="book-image"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="book-image-fallback hidden">
                            <Book className="fallback-icon" />
                          </div>
                          {book.featured && (
                            <div className="featured-badge">
                              <Award size={14} />
                              <span>Препоръчано</span>
                            </div>
                          )}
                        </div>

                        <div className="book-main-info">
                          <div className="book-title-section">
                            <h3 className="book-title">{book.title}</h3>
                            <p className="book-author">{book.author}</p>
                          </div>

                          <div className="book-meta">
                            <div className="book-category">
                              <Tag size={14} />
                              <span>{book.category}</span>
                            </div>
                            <div 
                              className="book-format"
                              style={{ color: getFormatColor(book.format) }}
                            >
                              <FormatIcon size={14} />
                              <span>{book.format}</span>
                            </div>
                            {book.difficulty && (
                              <div 
                                className="book-difficulty"
                                style={{ color: getDifficultyColor(book.difficulty) }}
                              >
                                <TrendingUp size={14} />
                                <span>
                                  {book.difficulty === 'beginner' && 'Начинаещ'}
                                  {book.difficulty === 'intermediate' && 'Напреднал'}
                                  {book.difficulty === 'advanced' && 'Експерт'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Book Description */}
                      <div className="book-description">
                        <p>{book.description}</p>
                      </div>

                      {/* Book Details (Expandable) */}
                      {isExpanded && (
                        <div className="book-details-expanded">
                          {book.pages && (
                            <div className="book-detail">
                              <FileText size={14} />
                              <span>{book.pages} страници</span>
                            </div>
                          )}
                          {book.fileSize && (
                            <div className="book-detail">
                              <Download size={14} />
                              <span>{book.fileSize}</span>
                            </div>
                          )}
                          {book.duration && (
                            <div className="book-detail">
                              <Clock size={14} />
                              <span>{book.duration}</span>
                            </div>
                          )}
                          {book.language && (
                            <div className="book-detail">
                              <Globe size={14} />
                              <span>{book.language}</span>
                            </div>
                          )}
                          {book.year && (
                            <div className="book-detail">
                              <Calendar size={14} />
                              <span>{book.year} година</span>
                            </div>
                          )}
                          
                          {book.additionalLinks && book.additionalLinks.length > 0 && (
                            <div className="additional-links">
                              <h4>Допълнителни ресурси:</h4>
                              <div className="links-list">
                                {book.additionalLinks.map((link, index) => (
                                  <a 
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="additional-link"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink size={12} />
                                    <span>{link.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {book.tags && book.tags.length > 0 && (
                            <div className="book-tags">
                              {book.tags.map((tag, index) => (
                                <span key={index} className="book-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Book Stats */}
                      <div className="book-stats">
                        <div className="stat-group">
                          {renderStars(book.rating)}
                          <span className="ratings-count">({book.ratingsCount})</span>
                        </div>
                        <div className="stat-group">
                          <Eye size={14} />
                          <span>{book.views} прегледа</span>
                        </div>
                        <div className="stat-group">
                          <Download size={14} />
                          <span>{book.downloads} сваляния</span>
                        </div>
                      </div>

                      {/* Book Actions */}
                      <div className="book-actions">
                        <button 
                          className="read-online-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReadOnline(book);
                          }}
                        >
                          <Eye size={16} />
                          <span>Прочети онлайн</span>
                        </button>
                        
                        {(book.format === 'PDF' || book.format === 'EPUB' || book.format === 'MOBI') && (
                          <button 
                            className="download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(book);
                            }}
                          >
                            <Download size={16} />
                            <span>Свали</span>
                          </button>
                        )}

                        <div className="action-buttons">
                          <button 
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBookExpansion(book.id);
                            }}
                            title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          
                          <button 
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareBook(book);
                            }}
                            title="Сподели"
                          >
                            <Share2 size={16} />
                          </button>
                          
                          {user && (
                            <>
                              <button 
                                className="action-btn"
                                title="Добави в любими"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Heart size={16} />
                              </button>
                              
                              <button 
                                className="action-btn"
                                title="Запази за по-късно"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Bookmark size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Direct Link */}
                      <div className="book-link">
                        <a 
                          href={book.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="direct-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                          <span>Директен линк към книгата</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="no-books-found">
              <Book size={80} className="no-books-icon" />
              <h3 className="handwritten-title-small">
                {searchTerm ? 'Няма намерени книги' : 'Все още няма онлайн книги'}
              </h3>
              <p>
                {searchTerm 
                  ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                  : 'Библиотеката с онлайн книги все още се попълва. Проверете отново по-късно за нови книги и ресурси.'
                }
              </p>
              {(searchTerm || categoryFilter !== 'all' || formatFilter !== 'all' || 
                languageFilter !== 'all' || difficultyFilter !== 'all') && (
                <button 
                  className="clear-filters-btn"
                  onClick={clearFilters}
                >
                  Изчисти филтрите
                </button>
              )}
            </div>
          )}
        </div>

        {/* Information Section */}
        <div className="online-books-info">
          <div className="info-card">
            <div className="info-icon">
              <Globe size={24} />
            </div>
            <div className="info-content">
              <h4>Достъп до знание отвсякъде</h4>
              <p>
                Нашата онлайн библиотека предлага свободен достъп до образователни 
                ресурси, книги и курсове. Всички материали са проверени и подходящи 
                за учебни цели. Четете на всяко устройство, по всяко време.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Award size={24} />
            </div>
            <div className="info-content">
              <h4>Качество и разнообразие</h4>
              <p>
                Поддържаме високи стандарти за качество на съдържанието. 
                Книгите са организирани по категории, формати и нива на трудност 
                за по-лесно търсене. От класическа литература до съвременни учебници.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Share2 size={24} />
            </div>
            <div className="info-content">
              <h4>Споделяне на знания</h4>
              <p>
                Всички ресурси са с отворен достъп или под свободни лицензи. 
                Можете свободно да ги използвате, споделяте и препращате, 
                спазвайки условията на лицензите. Знанието трябва да бъде свободно.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Book Details Modal */}
      {showBookDetails && selectedBook && (
        <div 
          className="book-modal-overlay"
          onClick={() => setShowBookDetails(false)}
        >
          <div 
            className="book-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="book-modal-content">
              <div className="book-modal-header">
                <div className="book-modal-thumbnail">
                  <img 
                    src={selectedBook.thumbnailUrl} 
                    alt={selectedBook.title}
                    className="book-modal-image"
                  />
                </div>
                <div className="book-modal-info">
                  <h2>{selectedBook.title}</h2>
                  <p className="book-modal-author">от {selectedBook.author}</p>
                  <div className="book-modal-meta">
                    <span className="book-modal-category">{selectedBook.category}</span>
                    <span className="book-modal-format">{selectedBook.format}</span>
                    {selectedBook.year && (
                      <span className="book-modal-year">{selectedBook.year}</span>
                    )}
                  </div>
                  <div className="book-modal-rating">
                    {renderStars(selectedBook.rating)}
                    <span>{selectedBook.ratingsCount} ревюта</span>
                  </div>
                </div>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowBookDetails(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="book-modal-body">
                <div className="book-modal-description">
                  <h3>Описание</h3>
                  <p>{selectedBook.description}</p>
                </div>
                
                <div className="book-modal-details">
                  <h3>Детайли</h3>
                  <div className="details-grid">
                    {selectedBook.pages && (
                      <div className="detail-item">
                        <span className="detail-label">Страници:</span>
                        <span className="detail-value">{selectedBook.pages}</span>
                      </div>
                    )}
                    {selectedBook.fileSize && (
                      <div className="detail-item">
                        <span className="detail-label">Размер на файла:</span>
                        <span className="detail-value">{selectedBook.fileSize}</span>
                      </div>
                    )}
                    {selectedBook.language && (
                      <div className="detail-item">
                        <span className="detail-label">Език:</span>
                        <span className="detail-value">{selectedBook.language}</span>
                      </div>
                    )}
                    {selectedBook.difficulty && (
                      <div className="detail-item">
                        <span className="detail-label">Ниво на трудност:</span>
                        <span className="detail-value">
                          {selectedBook.difficulty === 'beginner' && 'Начинаещ'}
                          {selectedBook.difficulty === 'intermediate' && 'Напреднал'}
                          {selectedBook.difficulty === 'advanced' && 'Експерт'}
                        </span>
                      </div>
                    )}
                    {selectedBook.ageGroup && (
                      <div className="detail-item">
                        <span className="detail-label">Възрастова група:</span>
                        <span className="detail-value">{selectedBook.ageGroup}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedBook.additionalLinks && selectedBook.additionalLinks.length > 0 && (
                  <div className="book-modal-links">
                    <h3>Допълнителни ресурси</h3>
                    <div className="links-list">
                      {selectedBook.additionalLinks.map((link, index) => (
                        <a 
                          key={index}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="modal-link"
                        >
                          <ExternalLink size={14} />
                          <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="book-modal-footer">
                <button 
                  className="modal-read-btn"
                  onClick={() => {
                    handleReadOnline(selectedBook);
                    setShowBookDetails(false);
                  }}
                >
                  <Eye size={18} />
                  <span>Прочети онлайн</span>
                </button>
                
                {(selectedBook.format === 'PDF' || selectedBook.format === 'EPUB' || selectedBook.format === 'MOBI') && (
                  <button 
                    className="modal-download-btn"
                    onClick={() => {
                      handleDownload(selectedBook);
                      setShowBookDetails(false);
                    }}
                  >
                    <Download size={18} />
                    <span>Свали PDF</span>
                  </button>
                )}
                
                <button 
                  className="modal-share-btn"
                  onClick={() => handleShareBook(selectedBook)}
                >
                  <Share2 size={18} />
                  <span>Сподели</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineBooksPage;