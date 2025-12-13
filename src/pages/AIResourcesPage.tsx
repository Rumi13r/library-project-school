import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  Brain, 
  BookOpen, 
  FileText, 
  Video,  
  Search, 
  Filter,
  ExternalLink,
  Bookmark,
  Share2,
  Calendar,
  User,
  Tag,
  Globe,
  Clock,
  Star,
  BookMarked,
  GraduationCap,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AIResourcesPage.css';
import { useAuth } from '../contexts/AuthContext';

interface AIResource {
  id: string;
  title: string;
  description: string;
  type: 'book' | 'article' | 'video' | 'course' | 'tool' | 'research' | 'website';
  url: string;
  author: string;
  publisher?: string;
  publishDate: string;
  language: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail?: string;
  estimatedTime?: string; // Време за прочитане/гледане
  rating?: number;
  downloads?: number;
  isFree: boolean;
  featured?: boolean;
  addedBy: string;
  addedAt: any;
  lastUpdated?: any;
}

const AIResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<AIResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<AIResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchAIResources();
  }, []);

  useEffect(() => {
    filterResources();
  }, [resources, searchTerm, typeFilter, difficultyFilter, languageFilter, tagFilter]);

  const fetchAIResources = async () => {
    try {
      setLoading(true);
      const resourcesQuery = query(collection(db, "ai_resources"), orderBy("addedAt", "desc"));
      const snapshot = await getDocs(resourcesQuery);
      const fetchedResources: AIResource[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AIResource));

      setResources(fetchedResources);
      extractFiltersData(fetchedResources);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching AI resources:", error);
      setResources([]);
      setLoading(false);
    }
  };

  const extractFiltersData = (resources: AIResource[]) => {
    const types = new Set<string>();
    const tags = new Set<string>();
    const languages = new Set<string>();
    
    resources.forEach(resource => {
      types.add(resource.type);
      resource.tags.forEach(tag => tags.add(tag));
      languages.add(resource.language);
    });
    
    setAvailableTypes(Array.from(types).sort());
    setAvailableTags(Array.from(tags).sort());
    setAvailableLanguages(Array.from(languages).sort());
  };

  const filterResources = () => {
    let filtered = resources;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(resource => resource.type === typeFilter);
    }

    // Difficulty filter
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(resource => resource.difficulty === difficultyFilter);
    }

    // Language filter
    if (languageFilter !== 'all') {
      filtered = filtered.filter(resource => resource.language === languageFilter);
    }

    // Tag filter
    if (tagFilter !== 'all') {
      filtered = filtered.filter(resource => resource.tags.includes(tagFilter));
    }

    setFilteredResources(filtered);
  };

  const getTypeIcon = (type: AIResource['type']) => {
    switch (type) {
      case 'book': return <BookOpen size={20} />;
      case 'article': return <FileText size={20} />;
      case 'video': return <Video size={20} />;
      case 'course': return <GraduationCap size={20} />;
      case 'tool': return <Cpu size={20} />;
      case 'research': return <BookMarked size={20} />;
      case 'website': return <Globe size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const getTypeColor = (type: AIResource['type']) => {
    switch (type) {
      case 'book': return '#3b82f6';
      case 'article': return '#10b981';
      case 'video': return '#ef4444';
      case 'course': return '#8b5cf6';
      case 'tool': return '#f59e0b';
      case 'research': return '#ec4899';
      case 'website': return '#6366f1';
      default: return '#6b7280';
    }
  };

  const getTypeLabel = (type: AIResource['type']) => {
    switch (type) {
      case 'book': return 'Книга';
      case 'article': return 'Статия';
      case 'video': return 'Видео';
      case 'course': return 'Курс';
      case 'tool': return 'Инструмент';
      case 'research': return 'Изследване';
      case 'website': return 'Уебсайт';
      default: return type;
    }
  };

  const getDifficultyLabel = (difficulty: AIResource['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return 'Начинаещ';
      case 'intermediate': return 'Напреднал';
      case 'advanced': return 'Експерт';
      default: return difficulty;
    }
  };

  const getDifficultyColor = (difficulty: AIResource['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long'
    });
  };

  const handleViewResource = (resource: AIResource) => {
    // Отваряне в нов таб за външни ресурси
    window.open(resource.url, '_blank');
    
    // Може и да се записва статистика за прегледи
    // trackView(resource.id);
  };

  const handleSaveResource = async (resource: AIResource) => {
    if (!user) {
      alert('Моля, влезте в профила си, за да запазвате ресурси!');
      return;
    }
    
    try {
      // Добавете логика за запазване в "любими"
      // await saveToUserFavorites(user.uid, resource.id);
      alert(`Ресурсът "${resource.title}" е запазен в любими!`);
    } catch (error) {
      console.error("Error saving resource:", error);
      alert("Грешка при запазване на ресурса!");
    }
  };

  const handleShareResource = (resource: AIResource) => {
    if (navigator.share) {
      navigator.share({
        title: resource.title,
        text: resource.description,
        url: resource.url,
      });
    } else {
      // Копиране на линк в клипборда
      navigator.clipboard.writeText(resource.url);
      alert('Линкът е копиран в клипборда!');
    }
  };

  const handleAddResource = () => {
    navigate('/ai-resources/add');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setDifficultyFilter('all');
    setLanguageFilter('all');
    setTagFilter('all');
  };

  // Ако все още зареждаме
  if (loading) {
    return (
      <div className="ai-resources-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <span>Зареждане на ИИ ресурси...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-resources-page">
      <div className="ai-resources-container">
        {/* Header */}
        <div className="ai-resources-header">
          <div className="ai-resources-title-section">
            <div className="title-icon-wrapper ai">
              <Brain className="ai-resources-title-icon" />
            </div>
            <div className="title-content">
              <h1 className="handwritten-title">ИИ Ресурси за Учители</h1>
              <p className="ai-resources-subtitle">
                Колекция от книги, статии, курсове и инструменти за изкуствен интелект в образованието
              </p>
            </div>
          </div>

          <div className="ai-resources-actions">
            {user && (user.role === 'admin' || user.role === 'reader') && (
              <button 
                className="add-resource-btn"
                onClick={handleAddResource}
              >
                <span>+ Добави Ресурс</span>
              </button>
            )}
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Мрежов изглед"
              >
                ▫▫
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Списъчен изглед"
              >
                ≡
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="ai-resources-stats">
          <div className="stat-card ai">
            <div className="stat-content">
              <div className="stat-number">
                {resources.filter(r => r.type === 'book').length}
              </div>
              <div className="stat-label">Книги</div>
            </div>
          </div>
          <div className="stat-card ai">
            <div className="stat-content">
              <div className="stat-number">
                {resources.filter(r => r.type === 'video').length}
              </div>
              <div className="stat-label">Видеа</div>
            </div>
          </div>
          <div className="stat-card ai">
            <div className="stat-content">
              <div className="stat-number">
                {resources.filter(r => r.type === 'course').length}
              </div>
              <div className="stat-label">Курсове</div>
            </div>
          </div>
          <div className="stat-card ai">
            <div className="stat-content">
              <div className="stat-number">
                {resources.filter(r => r.type === 'tool').length}
              </div>
              <div className="stat-label">Инструменти</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="ai-resources-filters">
          <div className="search-box ai">
            <Search className="search-icon" />
            <input
              type="text"
              placeholder="Търсете ресурси по заглавие, автор, тагове..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="advanced-filters ai">
            <div className="filter-group">
              <Filter size={16} />
              <span className="filter-label">Филтрирай по:</span>
            </div>

            <select 
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Всички типове</option>
              {availableTypes.map(type => (
                <option key={type} value={type}>{getTypeLabel(type as AIResource['type'])}</option>
              ))}
            </select>

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

            <select 
              className="filter-select"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
            >
              <option value="all">Всички езици</option>
              {availableLanguages.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <select 
              className="filter-select"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="all">Всички тагове</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            {(searchTerm || typeFilter !== 'all' || difficultyFilter !== 'all' || languageFilter !== 'all' || tagFilter !== 'all') && (
              <button 
                className="clear-filters-btn"
                onClick={clearFilters}
              >
                Изчисти филтрите
              </button>
            )}
          </div>

          {/* Popular Tags */}
          <div className="popular-tags">
            <span className="tags-label">Популярни тагове:</span>
            <div className="tags-list">
              {['ChatGPT', 'Образование', 'Педагогика', 'ML', 'Етика', 'Примери', 'Планове'].map(tag => (
                <button
                  key={tag}
                  className="tag-btn"
                  onClick={() => setTagFilter(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Resources Content */}
        <div className="ai-resources-content">
          <div className="resources-stats">
            <Brain className="stats-icon" />
            <span className="resources-count">
              Намерени {filteredResources.length} от {resources.length} ресурса
            </span>
            {searchTerm && (
              <span className="search-results">
                Резултати за "{searchTerm}"
              </span>
            )}
          </div>

          {filteredResources.length > 0 ? (
            viewMode === 'grid' ? (
              // Grid View
              <div className="resources-grid">
                {filteredResources.map((resource, _index) => (
                  <div 
                    key={resource.id} 
                    className={`resource-card ${resource.featured ? 'featured' : ''}`}
                  >
                    {resource.featured && (
                      <div className="featured-badge">
                        <Star size={14} />
                        <span>Препоръчан</span>
                      </div>
                    )}

                    <div className="resource-card-header">
                      <div 
                        className="resource-type-badge"
                        style={{ backgroundColor: getTypeColor(resource.type) }}
                      >
                        {getTypeIcon(resource.type)}
                        <span>{getTypeLabel(resource.type)}</span>
                      </div>
                      <div className="resource-actions">
                        <button 
                          className="action-btn save"
                          onClick={() => handleSaveResource(resource)}
                          title="Запази в любими"
                        >
                          <Bookmark size={16} />
                        </button>
                        <button 
                          className="action-btn share"
                          onClick={() => handleShareResource(resource)}
                          title="Сподели"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="resource-card-content">
                      <h3 className="resource-title">{resource.title}</h3>
                      <p className="resource-description">{resource.description}</p>
                      
                      <div className="resource-meta">
                        <div className="meta-item">
                          <User size={14} />
                          <span>{resource.author}</span>
                        </div>
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span>{formatDate(resource.publishDate)}</span>
                        </div>
                        {resource.estimatedTime && (
                          <div className="meta-item">
                            <Clock size={14} />
                            <span>{resource.estimatedTime}</span>
                          </div>
                        )}
                      </div>

                      <div className="resource-tags">
                        {resource.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="resource-tag">
                            <Tag size={12} />
                            {tag}
                          </span>
                        ))}
                        {resource.tags.length > 3 && (
                          <span className="resource-tag more">+{resource.tags.length - 3}</span>
                        )}
                      </div>

                      <div className="resource-footer">
                        <div className="resource-difficulty">
                          <span 
                            className="difficulty-badge"
                            style={{ 
                              backgroundColor: getDifficultyColor(resource.difficulty),
                              color: 'white'
                            }}
                          >
                            {getDifficultyLabel(resource.difficulty)}
                          </span>
                          {resource.isFree && (
                            <span className="free-badge">Безплатен</span>
                          )}
                        </div>
                        
                        <button 
                          className="view-resource-btn"
                          onClick={() => handleViewResource(resource)}
                        >
                          <span>Преглед</span>
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="resources-list">
                <table className="ai-resources-table">
                  <thead>
                    <tr>
                      <th>Ресурс</th>
                      <th>Тип</th>
                      <th>Автор</th>
                      <th>Ниво</th>
                      <th>Език</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResources.map(resource => (
                      <tr key={resource.id} className="resource-row">
                        <td>
                          <div className="resource-title-cell">
                            <h4>{resource.title}</h4>
                            <p className="resource-desc-truncated">{resource.description}</p>
                            <div className="resource-tags-small">
                              {resource.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="tag-small">{tag}</span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="type-cell">
                            <div 
                              className="type-indicator"
                              style={{ backgroundColor: getTypeColor(resource.type) }}
                            />
                            {getTypeLabel(resource.type)}
                          </div>
                        </td>
                        <td>{resource.author}</td>
                        <td>
                          <span className="difficulty-cell">
                            {getDifficultyLabel(resource.difficulty)}
                          </span>
                        </td>
                        <td>{resource.language}</td>
                        <td>
                          <div className="resource-actions-cell">
                            <button 
                              className="action-icon-btn"
                              onClick={() => handleViewResource(resource)}
                              title="Преглед"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button 
                              className="action-icon-btn"
                              onClick={() => handleSaveResource(resource)}
                              title="Запази"
                            >
                              <Bookmark size={16} />
                            </button>
                            <button 
                              className="action-icon-btn"
                              onClick={() => handleShareResource(resource)}
                              title="Сподели"
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="no-resources">
              <Brain size={80} className="no-resources-icon" />
              <h3 className="handwritten-title-small">
                {searchTerm ? 'Няма намерени ресурси' : 'Все още няма ресурси'}
              </h3>
              <p>
                {searchTerm 
                  ? `Няма резултати за "${searchTerm}". Опитайте с различна ключова дума.`
                  : 'Бъдете първият, който добавя ресурс за изкуствен интелект в образованието!'
                }
              </p>
              {user && (user.role === 'admin' || user.role === 'reader') && (
                <button 
                  className="add-first-resource-btn"
                  onClick={handleAddResource}
                >
                  <span>+ Добави първи ресурс</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Information */}
        <div className="resources-footer">
          <div className="resources-info">
            <div className="info-content">
              <h4>Как да използвате ресурсите?</h4>
              <ul className="usage-tips">
                <li><strong>Филтрирайте</strong> по тип и ниво на трудност</li>
                <li><strong>Запазвайте</strong> любими ресурси за бърз достъп</li>
                <li><strong>Споделяйте</strong> полезни материали с колеги</li>
                <li><strong>Предложете</strong> нов ресурс чрез бутона "Добави Ресурс"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResourcesPage;