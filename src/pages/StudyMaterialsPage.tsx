import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  BookOpen, 
  Notebook, 
  Calculator, 
  Microscope,
  Globe,
  FileText,
  Search, 
  Download, 
  Eye, 
  Heart, 
  Share2, 
  Bookmark,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Layers,
  Target,
  Award,
  TrendingUp,
  Calendar,
  Users,
  CheckCircle,
  Brain,
  Lightbulb,
  ExternalLink,
  PlayCircle,
  Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StudyMaterialsPage.css';

interface StudyMaterial {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  grade?: string; // 1-12 клас
  category: string; // Конспекти, Тестове, Решени задачи и др.
  tags: string[];
  language: string;
  format: string; // PDF, DOC, PPT, VIDEO, INTERACTIVE
  url: string;
  thumbnailUrl: string;
  fileSize?: string;
  duration?: string;
  pages?: number;
  exercises?: number;
  solutions?: boolean;
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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  requirements?: string[];
  relatedMaterials?: string[];
  learningObjectives?: string[];
  additionalLinks?: {
    title: string;
    url: string;
    type: string;
  }[];
}

const StudyMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchStudyMaterials();
  }, []);

  useEffect(() => {
    filterAndSortMaterials();
  }, [materials, searchTerm, subjectFilter, categoryFilter, gradeFilter, formatFilter, difficultyFilter, sortBy]);

  const fetchStudyMaterials = async () => {
    try {
      setLoading(true);
      const materialsQuery = query(
        collection(db, "studyMaterials"),
        orderBy("createdAt", "desc")
      );
      
      const snapshot = await getDocs(materialsQuery);
      const materialsData: StudyMaterial[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudyMaterial));

      setMaterials(materialsData);
      extractFiltersData(materialsData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching study materials:", error);
      const fallbackMaterials: StudyMaterial[] = [
        {
          id: '1',
          title: 'Конспект по математика за 10. клас',
          author: 'Проф. Георги Иванов',
          description: 'Пълен конспект по математика за 10. клас. Включва теория, формули и решени примери по всички теми от учебната програма.',
          subject: 'Математика',
          grade: '10',
          category: 'Конспекти',
          tags: ['математика', 'конспект', '10 клас', 'формули', 'решени задачи'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/math-10-conspect.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '3.2 MB',
          pages: 85,
          exercises: 120,
          solutions: true,
          rating: 4.8,
          ratingsCount: 245,
          views: 1850,
          downloads: 1240,
          featured: true,
          createdAt: new Date('2024-01-15'),
          lastUpdated: new Date('2024-02-20'),
          difficulty: 'intermediate',
          learningObjectives: ['Разбиране на основни математически концепции', 'Прилагане на формули в задачи', 'Развиване на логическо мислене'],
          additionalLinks: [
            { title: 'Видео уроци', url: 'https://youtube.com/math-10-videos', type: 'video' },
            { title: 'Интерактивни тестове', url: 'https://example.com/math-10-tests', type: 'interactive' },
            { title: 'Допълнителни упражнения', url: 'https://example.com/math-10-extra.pdf', type: 'pdf' }
          ]
        },
        {
          id: '2',
          title: 'Тестове по български език за матура',
          author: 'Д-р Елена Петрова',
          description: 'Сборник с тестове по български език и литература за подготовка за държавния зрелостен изпит. Включва отговори и обяснения.',
          subject: 'Български език',
          grade: '12',
          category: 'Тестове',
          tags: ['български език', 'матура', 'тестове', 'зрелостен изпит', 'подготовка'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/bulgarian-matura-tests.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '4.1 MB',
          pages: 92,
          exercises: 75,
          solutions: true,
          rating: 4.7,
          ratingsCount: 189,
          views: 1420,
          downloads: 980,
          featured: true,
          createdAt: new Date('2023-11-20'),
          lastUpdated: new Date('2024-01-30'),
          difficulty: 'advanced',
          learningObjectives: ['Подготовка за матура', 'Усъвършенстване на правопис', 'Анализ на литературни текстове'],
          additionalLinks: [
            { title: 'Матура от предишни години', url: 'https://example.com/past-matura-exams.pdf', type: 'pdf' },
            { title: 'Правописен тренинг', url: 'https://example.com/spelling-practice', type: 'interactive' }
          ]
        },
        {
          id: '3',
          title: 'Физика - Видео уроци за 11. клас',
          author: 'Проф. Александър Димитров',
          description: 'Цялостна поредица от видео уроци по физика за 11. клас. Обхваща механика, термодинамика и електромагнетизъм с ясни обяснения и демонстрации.',
          subject: 'Физика',
          grade: '11',
          category: 'Видео уроци',
          tags: ['физика', 'видео уроци', '11 клас', 'механика', 'демонстрации'],
          language: 'Български',
          format: 'VIDEO',
          url: 'https://youtube.com/playlist?list=physics-11',
          thumbnailUrl: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          duration: '15 часа 30 минути',
          rating: 4.9,
          ratingsCount: 312,
          views: 3250,
          downloads: 1850,
          featured: true,
          createdAt: new Date('2024-02-01'),
          lastUpdated: new Date('2024-03-10'),
          difficulty: 'intermediate',
          learningObjectives: ['Разбиране на физични закони', 'Прилагане на формули', 'Развиване на научно мислене'],
          additionalLinks: [
            { title: 'PDF конспект', url: 'https://example.com/physics-11-notes.pdf', type: 'pdf' },
            { title: 'Лабораторни упражнения', url: 'https://example.com/physics-labs.pdf', type: 'pdf' },
            { title: 'Интерактивни симулации', url: 'https://phet.colorado.edu/bg/', type: 'web' }
          ]
        },
        {
          id: '4',
          title: 'Химия - Презентации за 9. клас',
          author: 'Д-р Мария Георгиева',
          description: 'Интерактивни презентации по химия за 9. клас. Включва анимации, 3D модели на молекули и интерактивни тестове за всеки урок.',
          subject: 'Химия',
          grade: '9',
          category: 'Презентации',
          tags: ['химия', 'презентации', '9 клас', 'интерактивни', 'молекули'],
          language: 'Български',
          format: 'PPT',
          url: 'https://example.com/chemistry-9-presentations.zip',
          thumbnailUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '58 MB',
          pages: 42,
          rating: 4.6,
          ratingsCount: 156,
          views: 980,
          downloads: 720,
          featured: false,
          createdAt: new Date('2023-10-15'),
          lastUpdated: new Date('2024-01-25'),
          difficulty: 'beginner',
          learningObjectives: ['Запознаване с основни химични понятия', 'Разбиране на периодичната система', 'Усвояване на химични реакции'],
          additionalLinks: [
            { title: '3D молекулярни модели', url: 'https://example.com/molecule-viewer', type: 'interactive' },
            { title: 'Виртуална лаборатория', url: 'https://labster.com/virtual-labs/chemistry/', type: 'web' }
          ]
        },
        {
          id: '5',
          title: 'Интерактивни тестове по история',
          author: 'Колектив',
          description: 'Интерактивни тестове и игри за проверка на знанията по история на България и световна история. Незабавна обратна връзка и статистика.',
          subject: 'История',
          grade: '8',
          category: 'Интерактивни материали',
          tags: ['история', 'интерактивни тестове', 'игри', 'знания', 'обратна връзка'],
          language: 'Български',
          format: 'INTERACTIVE',
          url: 'https://example.com/history-interactive-tests',
          thumbnailUrl: 'https://images.unsplash.com/photo-1543332143-4e8c27e3256f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          exercises: 250,
          rating: 4.8,
          ratingsCount: 221,
          views: 1950,
          downloads: 1250,
          featured: true,
          createdAt: new Date('2024-01-05'),
          lastUpdated: new Date('2024-02-28'),
          difficulty: 'beginner',
          learningObjectives: ['Запознаване с исторически събития', 'Усвояване на дати и личности', 'Развиване на историческо мислене'],
          additionalLinks: [
            { title: 'Исторически карти и линии на времето', url: 'https://example.com/history-timelines.pdf', type: 'pdf' },
            { title: 'Документални филми', url: 'https://example.com/history-documentaries', type: 'video' }
          ]
        },
        {
          id: '6',
          title: 'Решени задачи по информатика',
          author: 'Инж. Петър Стоянов',
          description: 'Подробно решени задачи по информатика и програмиране за 11-12 клас. Включва задачи от олимпиади и състезания по програмиране.',
          subject: 'Информатика',
          grade: '11',
          category: 'Решени задачи',
          tags: ['информатика', 'програмиране', 'решени задачи', 'олимпиади', 'алгоритми'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/informatics-solved-problems.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '2.8 MB',
          pages: 78,
          exercises: 95,
          solutions: true,
          rating: 4.7,
          ratingsCount: 178,
          views: 1320,
          downloads: 890,
          featured: false,
          createdAt: new Date('2023-09-10'),
          lastUpdated: new Date('2024-01-15'),
          difficulty: 'advanced',
          learningObjectives: ['Развиване на алгоритмично мислене', 'Усвояване на програмни конструкции', 'Подготовка за олимпиади'],
          additionalLinks: [
            { title: 'Онлайн компилатор', url: 'https://replit.com/', type: 'web' },
            { title: 'Допълнителни задачи', url: 'https://example.com/informatics-extra-problems.pdf', type: 'pdf' }
          ]
        },
        {
          id: '7',
          title: 'Биология - Флаш карти за учене',
          author: 'Д-р Анна Василева',
          description: 'Дигитални флаш карти за учене на термини по биология. Автоматично повторение на трудните термини и статистика за напредъка.',
          subject: 'Биология',
          grade: '10',
          category: 'Интерактивни материали',
          tags: ['биология', 'флаш карти', 'термини', 'памет', 'учене'],
          language: 'Български',
          format: 'INTERACTIVE',
          url: 'https://example.com/biology-flashcards',
          thumbnailUrl: 'https://images.unsplash.com/photo-1530026405186-1d6d6e7e41b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          exercises: 300,
          rating: 4.5,
          ratingsCount: 142,
          views: 850,
          downloads: 620,
          featured: false,
          createdAt: new Date('2023-11-05'),
          lastUpdated: new Date('2024-02-15'),
          difficulty: 'beginner',
          learningObjectives: ['Запомняне на биологични термини', 'Разбиране на биологични процеси', 'Подготовка за контролни'],
          additionalLinks: [
            { title: '3D модели на организми', url: 'https://example.com/biology-3d-models', type: 'interactive' },
            { title: 'Виртуално дисекция', url: 'https://example.com/virtual-dissection', type: 'web' }
          ]
        },
        {
          id: '8',
          title: 'География - Интерактивни карти',
          author: 'Проф. Никола Тодоров',
          description: 'Интерактивни физически и политически карти на света. Можете да кликнете върху държави, градове и природни обекти за повече информация.',
          subject: 'География',
          grade: '7',
          category: 'Интерактивни материали',
          tags: ['география', 'интерактивни карти', 'държави', 'природни обекти', 'учене'],
          language: 'Български',
          format: 'INTERACTIVE',
          url: 'https://example.com/interactive-maps',
          thumbnailUrl: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          rating: 4.9,
          ratingsCount: 267,
          views: 2150,
          downloads: 1520,
          featured: true,
          createdAt: new Date('2024-02-10'),
          lastUpdated: new Date('2024-03-05'),
          difficulty: 'intermediate',
          learningObjectives: ['Запознаване с географското разположение', 'Изучаване на климати и природни зони', 'Разбиране на политическото устройство'],
          additionalLinks: [
            { title: 'Карти за печат', url: 'https://example.com/printable-maps.pdf', type: 'pdf' },
            { title: 'Географски викторини', url: 'https://example.com/geography-quizzes', type: 'interactive' }
          ]
        },
        {
          id: '9',
          title: 'Английски език - Грамматически упражнения',
          author: 'Лора Джоунс',
          description: 'Сборник от упражнения по английска граматика с автоматична проверка и обяснения на грешките. Подходящ за самоподготовка.',
          subject: 'Английски език',
          grade: '8',
          category: 'Упражнения',
          tags: ['английски език', 'граматика', 'упражнения', 'самоподготовка', 'езиково обучение'],
          language: 'Български',
          format: 'INTERACTIVE',
          url: 'https://example.com/english-grammar-exercises',
          thumbnailUrl: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          exercises: 500,
          rating: 4.6,
          ratingsCount: 189,
          views: 1250,
          downloads: 850,
          featured: false,
          createdAt: new Date('2023-12-01'),
          lastUpdated: new Date('2024-02-20'),
          difficulty: 'beginner',
          learningObjectives: ['Усвояване на английска граматика', 'Подобряване на писмено изражение', 'Подготовка за изпити'],
          additionalLinks: [
            { title: 'Говорещ речник', url: 'https://example.com/speaking-dictionary', type: 'interactive' },
            { title: 'Уроци по произношение', url: 'https://example.com/pronunciation-lessons', type: 'video' }
          ]
        },
        {
          id: '10',
          title: 'Философия - Теми за есета и дискусии',
          author: 'Д-р Стефан Костов',
          description: 'Теми за есета, дискусионни въпроси и материали за самостоятелна работа по философия за гимназиалния етап.',
          subject: 'Философия',
          grade: '12',
          category: 'Теми за есета',
          tags: ['философия', 'есе', 'дискусии', 'критическо мислене', 'философски теми'],
          language: 'Български',
          format: 'PDF',
          url: 'https://example.com/philosophy-essay-topics.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
          fileSize: '1.5 MB',
          pages: 45,
          rating: 4.4,
          ratingsCount: 98,
          views: 620,
          downloads: 430,
          featured: false,
          createdAt: new Date('2023-10-20'),
          lastUpdated: new Date('2024-01-10'),
          difficulty: 'advanced',
          learningObjectives: ['Развиване на критическо мислене', 'Усвояване на философски концепции', 'Умението да се аргументира'],
          additionalLinks: [
            { title: 'Философски текстове онлайн', url: 'https://philpapers.org/', type: 'web' },
            { title: 'Методика на писане на есе', url: 'https://example.com/essay-writing-guide.pdf', type: 'pdf' }
          ]
        }
      ];
      
      setMaterials(fallbackMaterials);
      extractFiltersData(fallbackMaterials);
      setLoading(false);
    }
  };

  const extractFiltersData = (materialsData: StudyMaterial[]) => {
    const subjects = new Set<string>();
    const categories = new Set<string>();
    const grades = new Set<string>();
    
    materialsData.forEach(material => {
      subjects.add(material.subject);
      categories.add(material.category);
      if (material.grade) grades.add(material.grade);
    });
    
    setAvailableSubjects(Array.from(subjects).sort());
    setAvailableCategories(Array.from(categories).sort());
    setAvailableGrades(Array.from(grades).sort((a, b) => parseInt(a) - parseInt(b)));
  };

  const filterAndSortMaterials = () => {
    let filtered = [...materials];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(material =>
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(material => material.subject === subjectFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(material => material.category === categoryFilter);
    }

    // Grade filter
    if (gradeFilter !== 'all') {
      filtered = filtered.filter(material => material.grade === gradeFilter);
    }

    // Format filter
    if (formatFilter !== 'all') {
      filtered = filtered.filter(material => material.format === formatFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(material => material.difficulty === difficultyFilter);
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
      case 'grade':
        filtered.sort((a, b) => parseInt(a.grade || '0') - parseInt(b.grade || '0'));
        break;
    }

    setFilteredMaterials(filtered);
  };

  const handleMaterialClick = (material: StudyMaterial) => {
    setSelectedMaterial(material);
    setShowMaterialDetails(true);
  };

  const handleOpenMaterial = (material: StudyMaterial) => {
    try {
      const newWindow = window.open(material.url, '_blank');
      
      if (newWindow) {
        console.log(`Material "${material.title}" opened in new tab`);
        // Тук може да се добави логика за проследяване
      } else {
        window.location.href = material.url;
      }
    } catch (error) {
      console.error('Error opening material:', error);
      alert('Възникна грешка при отварянето на материала.');
    }
  };

  const handleDownload = async (material: StudyMaterial) => {
    try {
      const link = document.createElement('a');
      link.href = material.url;
      link.download = `${material.title.replace(/\s+/g, '_')}.${material.format.toLowerCase()}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      link.onclick = () => {
        setTimeout(() => {
          console.log(`Material "${material.title}" downloaded`);
          alert(`Материалът "${material.title}" започва да се сваля!`);
        }, 100);
      };
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading material:', error);
      alert('Възникна грешка при свалянето на материала.');
    }
  };

  const handleShareMaterial = (material: StudyMaterial) => {
    if (navigator.share) {
      navigator.share({
        title: material.title,
        text: `Разгледай "${material.title}" - ${material.description.substring(0, 100)}...`,
        url: material.url,
      }).catch(() => fallbackShare(material));
    } else {
      fallbackShare(material);
    }
  };

  const fallbackShare = (material: StudyMaterial) => {
    const shareText = `${material.title} от ${material.author}\n\n${material.description.substring(0, 150)}...\n\nЛинк: ${material.url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
        .then(() => alert('Информацията за материала е копирана в клипборда!'))
        .catch(() => prompt('Копирайте следния текст:', shareText));
    } else {
      prompt('Копирайте следния текст:', shareText);
    }
  };

  const toggleMaterialExpansion = (materialId: string) => {
    setExpandedMaterialId(expandedMaterialId === materialId ? null : materialId);
  };

  const getSubjectIcon = (subject: string) => {
    switch (subject) {
      case 'Математика': return Calculator;
      case 'Български език': return BookOpen;
      case 'Физика': return Microscope;
      case 'Химия': return Layers;
      case 'История': return Globe;
      case 'Информатика': return Brain;
      case 'Биология': return Target;
      case 'География': return Globe;
      case 'Английски език': return Globe;
      case 'Философия': return Lightbulb;
      default: return BookOpen;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Конспекти': return Notebook;
      case 'Тестове': return FileText;
      case 'Видео уроци': return Video;
      case 'Презентации': return Layers;
      case 'Интерактивни материали': return Target;
      case 'Решени задачи': return CheckCircle;
      case 'Упражнения': return Brain;
      case 'Теми за есета': return FileText;
      default: return BookOpen;
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'PDF': return FileText;
      case 'DOC': return FileText;
      case 'PPT': return Layers;
      case 'VIDEO': return PlayCircle;
      case 'INTERACTIVE': return Target;
      default: return FileText;
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'PDF': return '#ef4444';
      case 'DOC': return '#2563eb';
      case 'PPT': return '#f59e0b';
      case 'VIDEO': return '#8b5cf6';
      case 'INTERACTIVE': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeNum = parseInt(grade);
    if (gradeNum <= 4) return '#10b981';
    if (gradeNum <= 8) return '#f59e0b';
    return '#ef4444';
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
    setSubjectFilter('all');
    setCategoryFilter('all');
    setGradeFilter('all');
    setFormatFilter('all');
    setDifficultyFilter('all');
    setSortBy('newest');
  };

  const handleSuggestMaterial = () => {
    if (user) {
      navigate('/suggest-material');
    } else {
      navigate('/login', { 
        state: { 
          redirectTo: '/study-materials',
          message: 'Моля, влезте в профила си, за да предложите учебен материал.' 
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="study-materials-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на учебни материали...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="study-materials-page">
      <div className="study-materials-container">
        {/* Header */}
        <div className="study-materials-header">
          <div className="study-materials-title-section">
            <div className="title-icon-wrapper study">
              <GraduationCap className="study-materials-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Учебни Помагала</h1>
              <p className="study-materials-subtitle">
                Конспекти, тестове, видео уроци и интерактивни материали за ученици и студенти
              </p>
            </div>
          </div>

          <div className="study-materials-actions">
            <button 
              className="suggest-material-btn"
              onClick={handleSuggestMaterial}
            >
              <BookOpen size={18} />
              <span>Предложи материал</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="study-materials-filters">
          <div className="main-search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсете материали, предмети, теми..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-info">
              <BookOpen size={16} />
              <span>{materials.length} учебни материала</span>
            </div>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label className="filter-label">
                <GraduationCap size={16} />
                Предмет
              </label>
              <select 
                className="filter-select"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
              >
                <option value="all">Всички предмети</option>
                {availableSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">
                <Layers size={16} />
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
                <Users size={16} />
                Клас
              </label>
              <select 
                className="filter-select"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="all">Всички класове</option>
                {availableGrades.map(grade => (
                  <option key={grade} value={grade}>{grade}. клас</option>
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
                <option value="DOC">Word документи</option>
                <option value="PPT">Презентации</option>
                <option value="VIDEO">Видео уроци</option>
                <option value="INTERACTIVE">Интерактивни</option>
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
                <option value="downloads">Най-сваляни</option>
                <option value="grade">Клас (възходящо)</option>
              </select>
            </div>

            {(searchTerm || subjectFilter !== 'all' || categoryFilter !== 'all' || 
              gradeFilter !== 'all' || formatFilter !== 'all' || difficultyFilter !== 'all' || sortBy !== 'newest') && (
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Изчисти филтрите
              </button>
            )}
          </div>
        </div>

        {/* Materials Grid */}
        <div className="study-materials-content">
          {filteredMaterials.length > 0 ? (
            <>
              <div className="materials-stats">
                <BookOpen className="stats-icon" />
                <span className="materials-count">
                  Намерени {filteredMaterials.length} материала
                </span>
                {searchTerm && (
                  <span className="search-results">
                    Резултати за "{searchTerm}"
                  </span>
                )}
              </div>

              <div className="materials-grid">
                {filteredMaterials.map((material) => {
                  const SubjectIcon = getSubjectIcon(material.subject);
                  const CategoryIcon = getCategoryIcon(material.category);
                  const FormatIcon = getFormatIcon(material.format);
                  const isExpanded = expandedMaterialId === material.id;
                  
                  return (
                    <div 
                      key={material.id} 
                      className={`material-card ${material.featured ? 'featured' : ''}`}
                      onClick={() => handleMaterialClick(material)}
                    >
                      {/* Material Header */}
                      <div className="material-header">
                        <div className="material-thumbnail">
                          <img 
                            src={material.thumbnailUrl} 
                            alt={material.title}
                            className="material-image"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                          <div className="material-image-fallback hidden">
                            <BookOpen className="fallback-icon" />
                          </div>
                          {material.featured && (
                            <div className="featured-badge">
                              <Award size={14} />
                              <span>Препоръчано</span>
                            </div>
                          )}
                        </div>

                        <div className="material-main-info">
                          <div className="material-title-section">
                            <h3 className="material-title">{material.title}</h3>
                            <p className="material-author">{material.author}</p>
                          </div>

                          <div className="material-meta">
                            <div className="material-subject">
                              <SubjectIcon size={14} />
                              <span>{material.subject}</span>
                            </div>
                            <div className="material-category">
                              <CategoryIcon size={14} />
                              <span>{material.category}</span>
                            </div>
                            <div 
                              className="material-grade"
                              style={{ color: getGradeColor(material.grade || '1') }}
                            >
                              <Users size={14} />
                              <span>{material.grade}. клас</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Material Description */}
                      <div className="material-description">
                        <p>{material.description}</p>
                      </div>

                      {/* Material Details (Expandable) */}
                      {isExpanded && (
                        <div className="material-details-expanded">
                          <div className="material-format-difficulty">
                            <div 
                              className="material-format"
                              style={{ color: getFormatColor(material.format) }}
                            >
                              <FormatIcon size={14} />
                              <span>{material.format}</span>
                            </div>
                            <div 
                              className="material-difficulty"
                              style={{ color: getDifficultyColor(material.difficulty) }}
                            >
                              <TrendingUp size={14} />
                              <span>
                                {material.difficulty === 'beginner' && 'Начинаещ'}
                                {material.difficulty === 'intermediate' && 'Напреднал'}
                                {material.difficulty === 'advanced' && 'Експерт'}
                              </span>
                            </div>
                          </div>
                          
                          {material.exercises && (
                            <div className="material-detail">
                              <Brain size={14} />
                              <span>{material.exercises} упражнения</span>
                            </div>
                          )}
                          
                          {material.solutions && (
                            <div className="material-detail">
                              <CheckCircle size={14} />
                              <span>С включени решения</span>
                            </div>
                          )}
                          
                          {material.pages && (
                            <div className="material-detail">
                              <FileText size={14} />
                              <span>{material.pages} страници</span>
                            </div>
                          )}
                          
                          {material.fileSize && (
                            <div className="material-detail">
                              <Download size={14} />
                              <span>{material.fileSize}</span>
                            </div>
                          )}
                          
                          {material.duration && (
                            <div className="material-detail">
                              <Clock size={14} />
                              <span>{material.duration}</span>
                            </div>
                          )}
                          
                          {material.learningObjectives && material.learningObjectives.length > 0 && (
                            <div className="learning-objectives">
                              <h4>Учебни цели:</h4>
                              <ul className="objectives-list">
                                {material.learningObjectives.map((objective, index) => (
                                  <li key={index} className="objective-item">
                                    <Lightbulb size={12} />
                                    <span>{objective}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {material.tags && material.tags.length > 0 && (
                            <div className="material-tags">
                              {material.tags.map((tag, index) => (
                                <span key={index} className="material-tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Material Stats */}
                      <div className="material-stats">
                        <div className="stat-group">
                          {renderStars(material.rating)}
                          <span className="ratings-count">({material.ratingsCount})</span>
                        </div>
                        <div className="stat-group">
                          <Eye size={14} />
                          <span>{material.views} прегледа</span>
                        </div>
                        <div className="stat-group">
                          <Download size={14} />
                          <span>{material.downloads} сваляния</span>
                        </div>
                      </div>

                      {/* Material Actions */}
                      <div className="material-actions">
                        <button 
                          className="open-material-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMaterial(material);
                          }}
                        >
                          {material.format === 'VIDEO' ? (
                            <>
                              <PlayCircle size={16} />
                              <span>Гледай</span>
                            </>
                          ) : material.format === 'INTERACTIVE' ? (
                            <>
                              <Target size={16} />
                              <span>Започни</span>
                            </>
                          ) : (
                            <>
                              <Eye size={16} />
                              <span>Преглед</span>
                            </>
                          )}
                        </button>
                        
                        {(material.format === 'PDF' || material.format === 'DOC' || material.format === 'PPT') && (
                          <button 
                            className="download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(material);
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
                              toggleMaterialExpansion(material.id);
                            }}
                            title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          
                          <button 
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareMaterial(material);
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
                      <div className="material-link">
                        <a 
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="direct-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} />
                          <span>Директен линк към материала</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="no-materials-found">
              <BookOpen size={80} className="no-materials-icon" />
              <h3 className="handwritten-title-small">
                {searchTerm ? 'Няма намерени материали' : 'Все още няма учебни материали'}
              </h3>
              <p>
                {searchTerm 
                  ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                  : 'Библиотеката с учебни материали все още се попълва. Проверете отново по-късно за нови материали.'
                }
              </p>
              {(searchTerm || subjectFilter !== 'all' || categoryFilter !== 'all' || 
                gradeFilter !== 'all' || formatFilter !== 'all' || difficultyFilter !== 'all') && (
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
        <div className="study-materials-info">
          <div className="info-card">
            <div className="info-icon">
              <GraduationCap size={24} />
            </div>
            <div className="info-content">
              <h4>Подготовка за училище</h4>
              <p>
                Всички материали са съобразени с учебните програми и подходящи 
                за подготовка за училище, контролни и изпити. Организирани по 
                предмети, класове и нива на трудност.
              </p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon">
              <Target size={24} />
            </div>
            <div className="info-content">
              <h4>Интерактивно учене</h4>
              <p>
                Интерактивни материали, видео уроци и автоматични тестове с 
                незабавна обратна връзка. Идеални за самостоятелна подготовка 
                и затвърждаване на знанията.
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
                Учители и ученици могат да споделят свои материали и ресурси. 
                Всички материали са проверени и подходящи за образователни цели.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Material Details Modal */}
      {showMaterialDetails && selectedMaterial && (
        <div 
          className="material-modal-overlay"
          onClick={() => setShowMaterialDetails(false)}
        >
          <div 
            className="material-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="material-modal-content">
              <div className="material-modal-header">
                <div className="material-modal-thumbnail">
                  <img 
                    src={selectedMaterial.thumbnailUrl} 
                    alt={selectedMaterial.title}
                    className="material-modal-image"
                  />
                </div>
                <div className="material-modal-info">
                  <h2>{selectedMaterial.title}</h2>
                  <p className="material-modal-author">от {selectedMaterial.author}</p>
                  <div className="material-modal-meta">
                    <span className="material-modal-subject">{selectedMaterial.subject}</span>
                    <span className="material-modal-category">{selectedMaterial.category}</span>
                    <span className="material-modal-grade">{selectedMaterial.grade}. клас</span>
                  </div>
                  <div className="material-modal-rating">
                    {renderStars(selectedMaterial.rating)}
                    <span>{selectedMaterial.ratingsCount} ревюта</span>
                  </div>
                </div>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowMaterialDetails(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="material-modal-body">
                <div className="material-modal-description">
                  <h3>Описание</h3>
                  <p>{selectedMaterial.description}</p>
                </div>
                
                <div className="material-modal-details">
                  <h3>Детайли</h3>
                  <div className="details-grid">
                    {selectedMaterial.pages && (
                      <div className="detail-item">
                        <span className="detail-label">Страници:</span>
                        <span className="detail-value">{selectedMaterial.pages}</span>
                      </div>
                    )}
                    {selectedMaterial.fileSize && (
                      <div className="detail-item">
                        <span className="detail-label">Размер на файла:</span>
                        <span className="detail-value">{selectedMaterial.fileSize}</span>
                      </div>
                    )}
                    {selectedMaterial.exercises && (
                      <div className="detail-item">
                        <span className="detail-label">Упражнения:</span>
                        <span className="detail-value">{selectedMaterial.exercises}</span>
                      </div>
                    )}
                    {selectedMaterial.solutions && (
                      <div className="detail-item">
                        <span className="detail-label">Решения:</span>
                        <span className="detail-value">Да</span>
                      </div>
                    )}
                    {selectedMaterial.difficulty && (
                      <div className="detail-item">
                        <span className="detail-label">Ниво на трудност:</span>
                        <span className="detail-value">
                          {selectedMaterial.difficulty === 'beginner' && 'Начинаещ'}
                          {selectedMaterial.difficulty === 'intermediate' && 'Напреднал'}
                          {selectedMaterial.difficulty === 'advanced' && 'Експерт'}
                        </span>
                      </div>
                    )}
                    {selectedMaterial.format && (
                      <div className="detail-item">
                        <span className="detail-label">Формат:</span>
                        <span className="detail-value">{selectedMaterial.format}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedMaterial.learningObjectives && selectedMaterial.learningObjectives.length > 0 && (
                  <div className="material-modal-objectives">
                    <h3>Учебни цели</h3>
                    <ul className="modal-objectives-list">
                      {selectedMaterial.learningObjectives.map((objective, index) => (
                        <li key={index} className="modal-objective-item">
                          <Lightbulb size={14} />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {selectedMaterial.additionalLinks && selectedMaterial.additionalLinks.length > 0 && (
                  <div className="material-modal-links">
                    <h3>Допълнителни ресурси</h3>
                    <div className="links-list">
                      {selectedMaterial.additionalLinks.map((link, index) => (
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
              
              <div className="material-modal-footer">
                <button 
                  className="modal-open-btn"
                  onClick={() => {
                    handleOpenMaterial(selectedMaterial);
                    setShowMaterialDetails(false);
                  }}
                >
                  {selectedMaterial.format === 'VIDEO' ? (
                    <>
                      <PlayCircle size={18} />
                      <span>Гледай видео</span>
                    </>
                  ) : selectedMaterial.format === 'INTERACTIVE' ? (
                    <>
                      <Target size={18} />
                      <span>Започни интерактивно</span>
                    </>
                  ) : (
                    <>
                      <Eye size={18} />
                      <span>Отвори материал</span>
                    </>
                  )}
                </button>
                
                {(selectedMaterial.format === 'PDF' || selectedMaterial.format === 'DOC' || selectedMaterial.format === 'PPT') && (
                  <button 
                    className="modal-download-btn"
                    onClick={() => {
                      handleDownload(selectedMaterial);
                      setShowMaterialDetails(false);
                    }}
                  >
                    <Download size={18} />
                    <span>Свали</span>
                  </button>
                )}
                
                <button 
                  className="modal-share-btn"
                  onClick={() => handleShareMaterial(selectedMaterial)}
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

export default StudyMaterialsPage;