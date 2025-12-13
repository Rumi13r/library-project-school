import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Users,
  BookOpen,
  MessageSquare,
  Calendar,
  Clock,
  MapPin,
  User,
  Star,
  Heart,
  Share2,
  Bookmark,
  Search,
  Filter,
  Award,
  Quote,
  Users as _UsersIcon,
  Book,
  ExternalLink,
  Plus,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  MessageCircle,
  ThumbsUp,
  BookmarkCheck,
  Tag,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './ReadersClubPage.css';

interface ClubMeeting {
  id: string;
  title: string;
  description: string;
  bookTitle: string;
  bookAuthor: string;
  date: string;
  time: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  organizer: string;
  organizerAvatar?: string;
  discussionPoints: string[];
  readingProgress: string;
  featured: boolean;
  createdAt: any;
  status: 'upcoming' | 'ongoing' | 'completed';
  joinLink?: string;
  materials?: {
    type: 'pdf' | 'link' | 'video';
    title: string;
    url: string;
  }[];
}

interface ClubMember {
  id: string;
  name: string;
  role: 'organizer' | 'member' | 'moderator';
  booksRead: number;
  joinedAt: string;
  avatar?: string;
  favoriteGenres: string[];
  currentlyReading?: string;
  bio?: string;
}

interface ClubDiscussion {
  id: string;
  bookId: string;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  comments: number;
  createdAt: any;
  tags: string[];
}

interface BookOfMonth {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  genre: string;
  rating: number;
  pages: number;
  readingSchedule: {
    startDate: string;
    endDate: string;
    weeklyPages: number;
  };
  discussionQuestions: string[];
  resources?: {
    title: string;
    type: 'guide' | 'interview' | 'analysis';
    url: string;
  }[];
}

const ReadersClubPage: React.FC = () => {
  const [meetings, setMeetings] = useState<ClubMeeting[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [discussions, setDiscussions] = useState<ClubDiscussion[]>([]);
  const [bookOfMonth, setBookOfMonth] = useState<BookOfMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'meetings' | 'discussions' | 'members'>('meetings');
  const [selectedMeeting, setSelectedMeeting] = useState<ClubMeeting | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [userReview, setUserReview] = useState('');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchClubData();
  }, []);

  const fetchClubData = async () => {
    try {
      setLoading(true);
      
      // Зареждане на срещи
      const meetingsQuery = query(collection(db, "readers_club_meetings"), orderBy("date", "asc"));
      const meetingsSnapshot = await getDocs(meetingsQuery);
      const meetingsData: ClubMeeting[] = meetingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClubMeeting));
      
      setMeetings(meetingsData);

      // Зареждане на членове
      const membersQuery = query(collection(db, "readers_club_members"), orderBy("joinedAt", "desc"));
      const membersSnapshot = await getDocs(membersQuery);
      const membersData: ClubMember[] = membersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClubMember));
      
      setMembers(membersData);

      // Зареждане на дискусии
      const discussionsQuery = query(collection(db, "readers_club_discussions"), orderBy("createdAt", "desc"));
      const discussionsSnapshot = await getDocs(discussionsQuery);
      const discussionsData: ClubDiscussion[] = discussionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ClubDiscussion));
      
      setDiscussions(discussionsData);

      // Зареждане на книга на месеца
      const currentMonth = new Date().getMonth();
      const bookQuery = query(
        collection(db, "books_of_month"), 
        where("readingSchedule.startDate", ">=", new Date(new Date().getFullYear(), currentMonth, 1))
      );
      const bookSnapshot = await getDocs(bookQuery);
      if (!bookSnapshot.empty) {
        const doc = bookSnapshot.docs[0];
        const bookData = doc.data() as Omit<BookOfMonth, 'id'>;
        setBookOfMonth({ 
          id: doc.id, 
          ...bookData 
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching club data:", error);
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (meeting: ClubMeeting) => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/readers-club',
          message: 'Моля, влезте в профила си, за да се присъедините към среща.' 
        }
      });
      return;
    }

    if (meeting.currentParticipants >= meeting.maxParticipants) {
      alert('Срещата е пълна! Моля, изчакайте следващата.');
      return;
    }

    try {
      setShowJoinForm(true);
    } catch (error) {
      console.error("Error joining meeting:", error);
      alert('Възникна грешка при присъединяването.');
    }
  };

  const handleSubmitJoinForm = async () => {
    if (!selectedMeeting) return;
    
    try {
      alert(`Успешно се присъединихте към срещата "${selectedMeeting.title}"!`);
      setShowJoinForm(false);
      
      // Обновяване на местоположението на срещата
      setMeetings(prev => prev.map(meeting => 
        meeting.id === selectedMeeting.id 
          ? { ...meeting, currentParticipants: meeting.currentParticipants + 1 }
          : meeting
      ));
    } catch (error) {
      console.error("Error submitting join form:", error);
      alert('Възникна грешка при присъединяването.');
    }
  };

  const handleStartDiscussion = () => {
    if (!user) {
      navigate('/login', { 
        state: { 
          redirectTo: '/readers-club',
          message: 'Моля, влезте в профила си, за да започнете дискусия.' 
        }
      });
      return;
    }
    navigate('/readers-club/discussions/new');
  };

  const handleViewMemberProfile = (memberId: string) => {
    navigate(`/profile/${memberId}`);
  };

  const handleLikeDiscussion = (discussionId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setDiscussions(prev => prev.map(discussion => 
      discussion.id === discussionId 
        ? { ...discussion, likes: discussion.likes + 1 }
        : discussion
    ));
    
    alert('Харесахте дискусията!');
  };

  const handleSaveDiscussion = (_discussionId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    alert('Дискусията е запазена в любими!');
  };

  const handleShareDiscussion = (discussion: ClubDiscussion) => {
    if (navigator.share) {
      navigator.share({
        title: discussion.title,
        text: `Прочетете тази интересна дискусия за книги: ${discussion.title}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Линкът е копиран в клипборда!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#3b82f6';
      case 'ongoing': return '#10b981';
      case 'completed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getTimeUntilMeeting = (dateString: string, timeString: string) => {
    const meetingTime = new Date(`${dateString}T${timeString}`);
    const now = new Date();
    const diff = meetingTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} ${days === 1 ? 'ден' : 'дни'}`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'час' : 'часа'}`;
    } else {
      return 'Мене от сега';
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    if (statusFilter !== 'all' && meeting.status !== statusFilter) return false;
    if (searchTerm && !meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !meeting.bookTitle.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="readers-club-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на читателския клуб...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="readers-club-page">
      <div className="readers-club-container">
        {/* НОВ ХЕДЪР по модел на AIResourcesPage */}
        <div className="readers-club-header">
          <div className="readers-club-title-section">
            <div className="title-icon-wrapper club">
              <BookOpen className="readers-club-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">Читателски Клуб</h1>
              <p className="readers-club-subtitle">
                Споделете вашите книжни приключения, обсъждайте и откривайте нови светове с други читатели
              </p>
            </div>
          </div>

          <div className="readers-club-actions">
            {user && (
              <button 
                className="join-club-btn"
                onClick={() => navigate('/readers-club/join')}
              >
                <span>Присъедини се</span>
              </button>
            )}
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'meetings' ? 'active' : ''}`}
                onClick={() => setViewMode('meetings')}
                title="Срещи"
              >
                ▫▫
              </button>
              <button 
                className={`view-btn ${viewMode === 'discussions' ? 'active' : ''}`}
                onClick={() => setViewMode('discussions')}
                title="Дискусии"
              >
                ≡
              </button>
              <button 
                className={`view-btn ${viewMode === 'members' ? 'active' : ''}`}
                onClick={() => setViewMode('members')}
                title="Членове"
              >
                ≡
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary - подобно на AIResourcesPage */}
        <div className="readers-club-stats">
          <div className="stat-card club">
            <div className="stat-content">
              <div className="stat-number">
                {members.length}
              </div>
              <div className="stat-label">Членове</div>
            </div>
          </div>
          <div className="stat-card club">
            <div className="stat-content">
              <div className="stat-number">
                {meetings.filter(m => m.status === 'upcoming').length}
              </div>
              <div className="stat-label">Предстоящи срещи</div>
            </div>
          </div>
          <div className="stat-card club">
            <div className="stat-content">
              <div className="stat-number">
                {discussions.length}
              </div>
              <div className="stat-label">Активни дискусии</div>
            </div>
          </div>
          <div className="stat-card club">
            <div className="stat-content">
              <div className="stat-number">
                {bookOfMonth ? 1 : 0}
              </div>
              <div className="stat-label">Книга на месеца</div>
            </div>
          </div>
        </div>

        {/* Книга на месеца */}
        {bookOfMonth && (
          <div className="book-of-month-section">
            <div className="book-of-month-header">
              <Award className="section-icon" />
              <h3>Книга на месеца</h3>
              <span className="month-badge">{new Date().toLocaleDateString('bg-BG', { month: 'long' })}</span>
            </div>
            
            <div className="book-of-month-content">
              <div className="book-cover">
                <div className="book-cover-placeholder">
                  <Book className="cover-icon" />
                </div>
                <div className="reading-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '45%' }}></div>
                  </div>
                  <span className="progress-text">45% прочетени</span>
                </div>
              </div>
              
              <div className="book-info">
                <h4>{bookOfMonth.title}</h4>
                <p className="book-author">от {bookOfMonth.author}</p>
                <p className="book-description">{bookOfMonth.description}</p>
                
                <div className="book-meta">
                  <div className="meta-item">
                    <Book size={14} />
                    <span>{bookOfMonth.pages} страници</span>
                  </div>
                  <div className="meta-item">
                    <Star size={14} />
                    <span>{bookOfMonth.rating}/5.0</span>
                  </div>
                  <div className="meta-item">
                    <Tag size={14} />
                    <span>{bookOfMonth.genre}</span>
                  </div>
                </div>
                
                <div className="reading-schedule">
                  <h5>График за четене:</h5>
                  <div className="schedule-dates">
                    <span>{new Date(bookOfMonth.readingSchedule.startDate).toLocaleDateString('bg-BG')}</span>
                    <ArrowRight size={12} />
                    <span>{new Date(bookOfMonth.readingSchedule.endDate).toLocaleDateString('bg-BG')}</span>
                  </div>
                  <p className="weekly-target">{bookOfMonth.readingSchedule.weeklyPages} страници седмично</p>
                </div>
                
                <div className="book-actions">
                  <button className="btn-discuss">
                    <MessageCircle size={16} />
                    <span>Присъедини се към дискусията</span>
                  </button>
                  <button className="btn-save">
                    <BookmarkCheck size={16} />
                    <span>Запази книгата</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters - обновен */}
        <div className="readers-club-filters">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсете срещи, книги или дискусии..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="advanced-filters">
            <div className="filter-group">
              <Filter size={16} />
              <span className="filter-label">Филтрирай по:</span>
            </div>
            
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Всички срещи</option>
              <option value="upcoming">Предстоящи</option>
              <option value="ongoing">Текущи</option>
              <option value="completed">Завършили</option>
            </select>

            <div className="view-mode-toggle">
              <button 
                className={`view-mode-btn ${viewMode === 'meetings' ? 'active' : ''}`}
                onClick={() => setViewMode('meetings')}
              >
                <Calendar size={16} />
                <span>Срещи</span>
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'discussions' ? 'active' : ''}`}
                onClick={() => setViewMode('discussions')}
              >
                <MessageSquare size={16} />
                <span>Дискусии</span>
              </button>
              <button 
                className={`view-mode-btn ${viewMode === 'members' ? 'active' : ''}`}
                onClick={() => setViewMode('members')}
              >
                <Users size={16} />
                <span>Членове</span>
              </button>
            </div>
            
            {user && (
              <button 
                className="create-meeting-btn"
                onClick={() => navigate('/readers-club/meetings/new')}
              >
                <Plus size={16} />
                <span>Предложи среща</span>
              </button>
            )}
          </div>

          {/* Popular Genres */}
          <div className="popular-genres">
            <span className="genres-label">Популярни жанрове:</span>
            <div className="genres-list">
              {['Фантастика', 'Биография', 'История', 'Научна литература', 'Поетика', 'Роман', 'Класика'].map(genre => (
                <button
                  key={genre}
                  className="genre-btn"
                  onClick={() => setSearchTerm(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content based on view mode */}
        <div className="readers-club-content">
          <div className="content-header">
            <div className="header-left">
              <BookOpen className="content-icon" />
              <span className="content-title">
                {viewMode === 'meetings' ? 'Предстоящи срещи' : 
                 viewMode === 'discussions' ? 'Активни дискусии' : 'Членове на клуба'}
              </span>
            </div>
            <div className="header-right">
              <span className="results-count">
                {viewMode === 'meetings' && `${filteredMeetings.length} от ${meetings.length} срещи`}
                {viewMode === 'discussions' && `${discussions.length} дискусии`}
                {viewMode === 'members' && `${members.length} членове`}
              </span>
              {viewMode === 'discussions' && user && (
                <button 
                  className="start-discussion-btn"
                  onClick={handleStartDiscussion}
                >
                  <MessageSquare size={16} />
                  <span>Започни дискусия</span>
                </button>
              )}
            </div>
          </div>
          
          {viewMode === 'meetings' ? (
            <>
              {filteredMeetings.length > 0 ? (
                <div className="meetings-grid">
                  {filteredMeetings.map((meeting, index) => {
                    const timeUntil = getTimeUntilMeeting(meeting.date, meeting.time);
                    const isExpanded = expandedMeetingId === meeting.id;
                    
                    return (
                      <div 
                        key={meeting.id} 
                        className={`meeting-card ${meeting.featured ? 'featured' : ''}`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="meeting-header">
                          <div className="meeting-date">
                            <Calendar size={20} />
                            <div className="date-content">
                              <div className="date-day">{new Date(meeting.date).getDate()}</div>
                              <div className="date-month">
                                {new Date(meeting.date).toLocaleDateString('bg-BG', { month: 'short' })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="meeting-main-info">
                            <h4>{meeting.title}</h4>
                            <div className="meeting-book">
                              <Book size={14} />
                              <span>{meeting.bookTitle}</span>
                              <span className="book-author">от {meeting.bookAuthor}</span>
                            </div>
                          </div>
                          
                          <div className="meeting-status">
                            <span 
                              className="status-badge"
                              style={{ backgroundColor: getStatusColor(meeting.status) }}
                            >
                              {meeting.status === 'upcoming' ? 'Предстои' : 
                               meeting.status === 'ongoing' ? 'В ход' : 'Завършила'}
                            </span>
                            {timeUntil && (
                              <span className="time-until">още {timeUntil}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="meeting-details">
                          <div className="detail-row">
                            <Clock size={16} />
                            <span>{meeting.time} - {meeting.endTime}</span>
                          </div>
                          <div className="detail-row">
                            <MapPin size={16} />
                            <span>{meeting.location}</span>
                          </div>
                          <div className="detail-row">
                            <User size={16} />
                            <span>Организатор: {meeting.organizer}</span>
                          </div>
                          <div className="detail-row">
                            <Users size={16} />
                            <span>{meeting.currentParticipants}/{meeting.maxParticipants} участници</span>
                          </div>
                        </div>
                        
                        <div className="meeting-description">
                          <p>{meeting.description}</p>
                        </div>
                        
                        {isExpanded && (
                          <div className="meeting-expanded">
                            <div className="discussion-points">
                              <h5>Теми за дискусия:</h5>
                              <ul>
                                {meeting.discussionPoints.map((point, idx) => (
                                  <li key={idx}>{point}</li>
                                ))}
                              </ul>
                            </div>
                            
                            {meeting.materials && meeting.materials.length > 0 && (
                              <div className="meeting-materials">
                                <h5>Материали:</h5>
                                <div className="materials-list">
                                  {meeting.materials.map((material, idx) => (
                                    <a 
                                      key={idx}
                                      href={material.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="material-link"
                                    >
                                      <FileText size={14} />
                                      <span>{material.title}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="meeting-actions">
                          <button 
                            className="join-btn"
                            onClick={() => {
                              setSelectedMeeting(meeting);
                              handleJoinMeeting(meeting);
                            }}
                            disabled={meeting.currentParticipants >= meeting.maxParticipants}
                          >
                            {meeting.currentParticipants >= meeting.maxParticipants 
                              ? 'Срещата е пълна'
                              : 'Присъедини се'}
                          </button>
                          
                          <div className="action-buttons">
                            <button 
                              className="action-btn"
                              onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                              title={isExpanded ? 'Скрий детайли' : 'Покажи детайли'}
                            >
                              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button 
                              className="action-btn"
                              onClick={() => {
                                setSelectedMeeting(meeting);
                                setShowMeetingModal(true);
                              }}
                              title="Виж повече"
                            >
                              <ExternalLink size={18} />
                            </button>
                            {user && (
                              <button className="action-btn" title="Запази срещата">
                                <Bookmark size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-meetings">
                  <Calendar size={60} />
                  <h4>Няма предстоящи срещи</h4>
                  <p>Бъдете първият, който организира среща!</p>
                  {user && (
                    <button 
                      className="organize-btn"
                      onClick={() => navigate('/readers-club/meetings/new')}
                    >
                      Организирай среща
                    </button>
                  )}
                </div>
              )}
            </>
          ) : viewMode === 'discussions' ? (
            <>
              {discussions.length > 0 ? (
                <div className="discussions-grid">
                  {discussions.map((discussion, index) => (
                    <div 
                      key={discussion.id} 
                      className="discussion-card"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="discussion-header">
                        <div className="author-info">
                          <div className="author-avatar">
                            <User size={24} />
                          </div>
                          <div className="author-details">
                            <h5>{discussion.author}</h5>
                            <span className="discussion-date">
                              {new Date(discussion.createdAt).toLocaleDateString('bg-BG')}
                            </span>
                          </div>
                        </div>
                        
                        <div className="discussion-tags">
                          {discussion.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="discussion-content">
                        <h4>{discussion.title}</h4>
                        <p>{discussion.content.substring(0, 200)}...</p>
                      </div>
                      
                      <div className="discussion-stats">
                        <div className="stat">
                          <ThumbsUp size={16} />
                          <span>{discussion.likes} харесвания</span>
                        </div>
                        <div className="stat">
                          <MessageCircle size={16} />
                          <span>{discussion.comments} коментара</span>
                        </div>
                      </div>
                      
                      <div className="discussion-actions">
                        <button 
                          className="like-btn"
                          onClick={() => handleLikeDiscussion(discussion.id)}
                        >
                          <Heart size={16} />
                          <span>Харесай</span>
                        </button>
                        <button 
                          className="comment-btn"
                          onClick={() => navigate(`/readers-club/discussions/${discussion.id}`)}
                        >
                          <MessageSquare size={16} />
                          <span>Коментирай</span>
                        </button>
                        <div className="action-buttons">
                          <button 
                            className="action-btn"
                            onClick={() => handleSaveDiscussion(discussion.id)}
                            title="Запази"
                          >
                            <Bookmark size={16} />
                          </button>
                          <button 
                            className="action-btn"
                            onClick={() => handleShareDiscussion(discussion)}
                            title="Сподели"
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-discussions">
                  <MessageSquare size={60} />
                  <h4>Все още няма дискусии</h4>
                  <p>Бъдете първият, който започне разговор!</p>
                  {user && (
                    <button 
                      className="start-discussion-btn-large"
                      onClick={handleStartDiscussion}
                    >
                      <MessageSquare size={20} />
                      <span>Започни първата дискусия</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="members-grid">
                {members.map((member, index) => (
                  <div 
                    key={member.id} 
                    className="member-card"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="member-header">
                      <div className="member-avatar">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} />
                        ) : (
                          <User size={32} />
                        )}
                        {member.role === 'organizer' && (
                          <span className="role-badge organizer">Организатор</span>
                        )}
                      </div>
                      
                      <div className="member-info">
                        <h4>{member.name}</h4>
                        <p className="member-role">
                          {member.role === 'organizer' ? 'Основател' : 
                           member.role === 'moderator' ? 'Модератор' : 'Член'}
                        </p>
                        <div className="member-stats">
                          <div className="stat">
                            <Book size={14} />
                            <span>{member.booksRead} книги</span>
                          </div>
                          <div className="stat">
                            <Calendar size={14} />
                            <span>{new Date(member.joinedAt).toLocaleDateString('bg-BG')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {member.bio && (
                      <div className="member-bio">
                        <p>{member.bio}</p>
                      </div>
                    )}
                    
                    <div className="member-genres">
                      <h5>Любими жанрове:</h5>
                      <div className="genres-list">
                        {member.favoriteGenres.map(genre => (
                          <span key={genre} className="genre-tag">{genre}</span>
                        ))}
                      </div>
                    </div>
                    
                    {member.currentlyReading && (
                      <div className="currently-reading">
                        <h5>Чете в момента:</h5>
                        <p>{member.currentlyReading}</p>
                      </div>
                    )}
                    
                    <div className="member-actions">
                      <button 
                        className="view-profile-btn"
                        onClick={() => handleViewMemberProfile(member.id)}
                      >
                        Виж профил
                      </button>
                      <button 
                        className="message-btn"
                        onClick={() => navigate(`/messages?user=${member.id}`)}
                      >
                        <MessageSquare size={16} />
                        <span>Съобщение</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quote of the Day */}
        <div className="quote-section">
          <Quote className="quote-icon" />
          <blockquote>
            "Един читател живее хиляди животи, преди да умре. Човекът, който никога не чете, живее само един."
          </blockquote>
          <cite>— Джордж Р. Р. Мартин</cite>
        </div>

        {/* Benefits Section */}
        <div className="benefits-section">
          <h3>Защо да се присъедините?</h3>
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">
                <Users size={24} />
              </div>
              <h4>Социална общност</h4>
              <p>Запознайте се с хора, които споделят вашата любов към книгите</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <BookOpen size={24} />
              </div>
              <h4>Разширете хоризонтите си</h4>
              <p>Открийте нови жанрове и автори чрез препоръките на други читатели</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <MessageSquare size={24} />
              </div>
              <h4>Дълбоки дискусии</h4>
              <p>Споделете вашите мисли и разберете нови перспективи за книгите</p>
            </div>
            <div className="benefit-card">
              <div className="benefit-icon">
                <Award size={24} />
              </div>
              <h4>Предизвикателства</h4>
              <p>Участвайте в книжни предизвикателства и получавайте награди</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Details Modal */}
      {showMeetingModal && selectedMeeting && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="meeting-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMeeting.title}</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowMeetingModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-section">
                <h4>Информация за срещата</h4>
                <div className="modal-details">
                  <div className="detail">
                    <Calendar size={18} />
                    <span>{formatDate(selectedMeeting.date)}</span>
                  </div>
                  <div className="detail">
                    <Clock size={18} />
                    <span>{selectedMeeting.time} - {selectedMeeting.endTime}</span>
                  </div>
                  <div className="detail">
                    <MapPin size={18} />
                    <span>{selectedMeeting.location}</span>
                  </div>
                  <div className="detail">
                    <Book size={18} />
                    <span>Книга: {selectedMeeting.bookTitle}</span>
                  </div>
                  <div className="detail">
                    <User size={18} />
                    <span>Автор: {selectedMeeting.bookAuthor}</span>
                  </div>
                </div>
              </div>
              
              <div className="modal-section">
                <h4>Описание</h4>
                <p>{selectedMeeting.description}</p>
              </div>
              
              <div className="modal-section">
                <h4>Теми за дискусия</h4>
                <ul className="discussion-list">
                  {selectedMeeting.discussionPoints.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
              
              <div className="modal-section">
                <h4>Прогрес в четенето</h4>
                <p>{selectedMeeting.readingProgress}</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="modal-join-btn"
                onClick={() => {
                  setShowMeetingModal(false);
                  handleJoinMeeting(selectedMeeting);
                }}
              >
                Присъедини се към срещата
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Meeting Form */}
      {showJoinForm && selectedMeeting && (
        <div className="modal-overlay" onClick={() => setShowJoinForm(false)}>
          <div className="join-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Присъединяване към "{selectedMeeting.title}"</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowJoinForm(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="form-group">
                <label>Вашето име:</label>
                <input 
                  type="text" 
                  defaultValue={user?.displayName || ''}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Имейл за потвърждение:</label>
                <input 
                  type="email" 
                  defaultValue={user?.email || ''}
                  className="form-input"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>Защо искате да се присъедините? (по избор)</label>
                <textarea 
                  className="form-textarea"
                  placeholder="Споделете защо ви интересува тази среща..."
                  value={userReview}
                  onChange={(e) => setUserReview(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="meeting-info-summary">
                <h5>Детайли за срещата:</h5>
                <div className="info-row">
                  <Calendar size={14} />
                  <span>{formatDate(selectedMeeting.date)}</span>
                </div>
                <div className="info-row">
                  <Clock size={14} />
                  <span>{selectedMeeting.time} - {selectedMeeting.endTime}</span>
                </div>
                <div className="info-row">
                  <MapPin size={14} />
                  <span>{selectedMeeting.location}</span>
                </div>
                <div className="info-row">
                  <Users size={14} />
                  <span>Свободни места: {selectedMeeting.maxParticipants - selectedMeeting.currentParticipants}</span>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowJoinForm(false)}
              >
                Откажи
              </button>
              <button 
                className="submit-join-btn"
                onClick={handleSubmitJoinForm}
              >
                Потвърди присъединяването
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadersClubPage;