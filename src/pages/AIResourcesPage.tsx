import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Brain, BookOpen, FileText, Video, Search, Filter, ExternalLink,
  Bookmark, Share2, Calendar, User, Tag as TagIcon, Globe, Clock,
  Star, BookMarked, GraduationCap, Cpu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './AIResourcesPage.css';
import { useAuth } from '../contexts/AuthContext';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface AIResource {
  id:            string;
  title:         string;
  description:   string;
  type:          'book'|'article'|'video'|'course'|'tool'|'research'|'website';
  url:           string;
  author:        string;
  publisher?:    string;
  publishDate:   string;
  language:      string;
  difficulty:    'beginner'|'intermediate'|'advanced';
  tags:          string[];
  thumbnail?:    string;
  estimatedTime?:string;
  rating?:       number;
  downloads?:    number;
  isFree:        boolean;
  featured?:     boolean;
  addedBy:       string;
  addedAt:       FSDate;      // was any
  lastUpdated?:  FSDate;      // was any
}

const DEMO_RESOURCES: AIResource[] = [
  { id:'1', title:'Изкуствен интелект в образованието', description:'Пълно ръководство за прилагане на ИИ в учебния процес', type:'book', url:'https://example.com/ai-in-education', author:'Д-р Иван Петров', publishDate:'2023-05-15', language:'Български', difficulty:'intermediate', tags:['Образование','ИИ','Педагогика'], estimatedTime:'4 часа', rating:4.8, downloads:1200, isFree:true, featured:true, addedBy:'admin', addedAt:new Date() },
  { id:'2', title:'ChatGPT за учители', description:'Практическо ръководство за използване на ChatGPT в класната стая', type:'course', url:'https://example.com/chatgpt-for-teachers', author:'Проф. Мария Иванова', publishDate:'2023-08-20', language:'Български', difficulty:'beginner', tags:['ChatGPT','Образование','Примери'], estimatedTime:'3 часа', rating:4.9, downloads:1800, isFree:false, featured:true, addedBy:'admin', addedAt:new Date() },
  { id:'3', title:'Етични аспекти на ИИ в училище', description:'Анализ на етичните предизвикателства при внедряване на ИИ', type:'article', url:'https://example.com/ai-ethics', author:'Д-р Георги Димитров', publishDate:'2023-11-10', language:'Български', difficulty:'advanced', tags:['Етика','ИИ','Изследване'], estimatedTime:'30 минути', rating:4.5, downloads:850, isFree:true, featured:false, addedBy:'reader', addedAt:new Date() },
  { id:'4', title:'Инструменти за генериране на тестове', description:'Преглед на съвременни ИИ инструменти за създаване на тестове', type:'tool', url:'https://example.com/test-generators', author:'Екип EdTech', publishDate:'2023-09-05', language:'Английски', difficulty:'intermediate', tags:['Инструменти','Тестове','Автоматизация'], estimatedTime:'2 часа', rating:4.7, downloads:950, isFree:true, featured:true, addedBy:'admin', addedAt:new Date() },
];

const AIResourcesPage: React.FC = () => {
  const [resources,         setResources]         = useState<AIResource[]>([]);
  const [filteredResources, setFilteredResources] = useState<AIResource[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [searchTerm,        setSearchTerm]        = useState('');
  const [typeFilter,        setTypeFilter]        = useState('all');
  const [difficultyFilter,  setDifficultyFilter]  = useState('all');
  const [languageFilter,    setLanguageFilter]    = useState('all');
  const [tagFilter,         setTagFilter]         = useState('all');
  const [availableTypes,    setAvailableTypes]    = useState<string[]>([]);
  const [availableTags,     setAvailableTags]     = useState<string[]>([]);
  const [availableLanguages,setAvailableLanguages]= useState<string[]>([]);
  const [viewMode,          setViewMode]          = useState<'grid'|'list'>('grid');
  const [isMobileView,      setIsMobileView]      = useState(window.innerWidth < 768);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const navigate   = useNavigate();
  const { user }   = useAuth();

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Helper: extract filter data ──────────────────────────────────────────────
  const extractFiltersData = useCallback((list: AIResource[]) => {
    const types     = new Set<string>();
    const tags      = new Set<string>();
    const languages = new Set<string>();
    list.forEach(r => {
      types.add(r.type);
      r.tags.forEach(t => tags.add(t));
      languages.add(r.language);
    });
    setAvailableTypes(Array.from(types).sort());
    setAvailableTags(Array.from(tags).sort());
    setAvailableLanguages(Array.from(languages).sort());
  }, []);

  // ── fetchAIResources — declared BEFORE the useEffect that calls it ───────────
  const fetchAIResources = useCallback(async () => {
    try {
      setLoading(true);
      const q    = query(collection(db, "ai_resources"), orderBy("addedAt", "desc"));
      const snap = await getDocs(q);
      const list: AIResource[] = snap.docs.map(d => ({ id:d.id, ...d.data() } as AIResource));
      setResources(list);
      extractFiltersData(list);
    } catch {
      setResources(DEMO_RESOURCES);
      extractFiltersData(DEMO_RESOURCES);
    } finally {
      setLoading(false);
    }
  }, [extractFiltersData]);

  // ── filterResources — declared BEFORE the useEffect that calls it ────────────
  const filterResources = useCallback(() => {
    let filtered = resources;
    if (searchTerm)
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    if (typeFilter       !== 'all') filtered = filtered.filter(r => r.type       === typeFilter);
    if (difficultyFilter !== 'all') filtered = filtered.filter(r => r.difficulty === difficultyFilter);
    if (languageFilter   !== 'all') filtered = filtered.filter(r => r.language   === languageFilter);
    if (tagFilter        !== 'all') filtered = filtered.filter(r => r.tags.includes(tagFilter));
    setFilteredResources(filtered);
  }, [resources, searchTerm, typeFilter, difficultyFilter, languageFilter, tagFilter]);

  // ── Effects — AFTER function declarations ────────────────────────────────────
  useEffect(() => { fetchAIResources(); }, [fetchAIResources]);
  useEffect(() => { filterResources(); }, [filterResources]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const getTypeIcon = (type: AIResource['type']) => {
    switch (type) {
      case 'book':     return <BookOpen size={20}/>;
      case 'article':  return <FileText size={20}/>;
      case 'video':    return <Video size={20}/>;
      case 'course':   return <GraduationCap size={20}/>;
      case 'tool':     return <Cpu size={20}/>;
      case 'research': return <BookMarked size={20}/>;
      case 'website':  return <Globe size={20}/>;
      default:         return <BookOpen size={20}/>;
    }
  };

  const getTypeColor = (type: AIResource['type']) => ({
    book:'#3b82f6', article:'#10b981', video:'#ef4444', course:'#8b5cf6',
    tool:'#f59e0b', research:'#ec4899', website:'#6366f1',
  }[type] || '#6b7280');

  const getTypeLabel = (type: AIResource['type']) => ({
    book:'Книга', article:'Статия', video:'Видео', course:'Курс',
    tool:'Инструмент', research:'Изследване', website:'Уебсайт',
  }[type] || type);

  const getDifficultyLabel = (d: AIResource['difficulty']) =>
    ({ beginner:'Начинаещ', intermediate:'Напреднал', advanced:'Експерт' }[d] || d);

  const getDifficultyColor = (d: AIResource['difficulty']) =>
    ({ beginner:'#10b981', intermediate:'#f59e0b', advanced:'#ef4444' }[d] || '#6b7280');

  const formatDate = (ds: string) =>
    new Date(ds).toLocaleDateString('bg-BG', { year:'numeric', month:'long' });

  const handleViewResource   = (r: AIResource) => window.open(r.url, '_blank');
  const handleSaveResource   = async (r: AIResource) => {
    if (!user) { alert('Моля, влезте!'); return; }
    alert(`"${r.title}" е запазен в любими!`);
  };
  const handleShareResource  = (r: AIResource) => {
    if (navigator.share) navigator.share({ title:r.title, text:r.description, url:r.url });
    else { navigator.clipboard.writeText(r.url); alert('Линкът е копиран!'); }
  };
  const handleAddResource    = () => navigate('/ai-resources/add');
  const clearFilters         = () => { setSearchTerm(''); setTypeFilter('all'); setDifficultyFilter('all'); setLanguageFilter('all'); setTagFilter('all'); };
  const toggleMobileFilters  = () => setShowMobileFilters(v => !v);
  const applyMobileFilters   = () => { filterResources(); setShowMobileFilters(false); };

  if (loading) return (
    <div className="ai-resources-page">
      <div className="loading-spinner"><div className="spinner"/><span>Зареждане на ИИ ресурси...</span></div>
    </div>
  );

  return (
    <div className="ai-resources-page">
      <div className="ai-resources-container">
        {/* Header */}
        <div className="ai-resources-header">
          <div className="ai-resources-title-section">
            <div className="title-icon-wrapper ai"><Brain className="ai-resources-title-icon"/></div>
            <div className="title-content">
              <h1 className="handwritten-title">ИИ Ресурси за Учители</h1>
              <p className="ai-resources-subtitle">Колекция от книги, статии, курсове и инструменти за изкуствен интелект в образованието</p>
            </div>
          </div>
          <div className="ai-resources-actions">
            {user && (user.role === 'admin' || user.role === 'reader') && (
              <button className="add-resource-btn mobile-hidden" onClick={handleAddResource}>+ Добави Ресурс</button>
            )}
            {isMobileView && (
              <button className="mobile-filters-toggle" onClick={toggleMobileFilters}>
                <Filter size={20}/><span>Филтри</span>
              </button>
            )}
            <div className="view-toggle">
              <button className={`view-btn ${viewMode==='grid'?'active':''}`} onClick={()=>setViewMode('grid')} title="Мрежов изглед">▫▫</button>
              <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={()=>setViewMode('list')} title="Списъчен изглед">≡</button>
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal */}
        {showMobileFilters && (
          <div className="mobile-filters-modal">
            <div className="mobile-filters-header">
              <h3>Филтриране на ресурси</h3>
              <button className="close-filters-btn" onClick={()=>setShowMobileFilters(false)}>×</button>
            </div>
            <div className="mobile-filters-content">
              <div className="filter-group mobile">
                <label className="filter-label"><Search size={16}/>Търсене</label>
                <input type="text" placeholder="Търсете ресурси..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="filter-input mobile"/>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><BookOpen size={16}/>Тип</label>
                <select className="filter-select mobile" value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
                  <option value="all">Всички типове</option>
                  {availableTypes.map(t=><option key={t} value={t}>{getTypeLabel(t as AIResource['type'])}</option>)}
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><GraduationCap size={16}/>Ниво на трудност</label>
                <select className="filter-select mobile" value={difficultyFilter} onChange={e=>setDifficultyFilter(e.target.value)}>
                  <option value="all">Всички нива</option>
                  <option value="beginner">Начинаещ</option>
                  <option value="intermediate">Напреднал</option>
                  <option value="advanced">Експерт</option>
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><Globe size={16}/>Език</label>
                <select className="filter-select mobile" value={languageFilter} onChange={e=>setLanguageFilter(e.target.value)}>
                  <option value="all">Всички езици</option>
                  {availableLanguages.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="filter-group mobile">
                <label className="filter-label"><TagIcon size={16}/>Таг</label>
                <select className="filter-select mobile" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}>
                  <option value="all">Всички тагове</option>
                  {availableTags.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="mobile-filters-actions">
              <button className="clear-filters-btn mobile" onClick={()=>{clearFilters();setShowMobileFilters(false);}}>Изчисти</button>
              <button className="apply-filters-btn" onClick={applyMobileFilters}>Приложи</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="ai-resources-stats">
          {(['book','video','course','tool'] as const).map(t=>(
            <div key={t} className="stat-card ai">
              <div className="stat-content">
                <div className="stat-number">{resources.filter(r=>r.type===t).length}</div>
                <div className="stat-label">{getTypeLabel(t)}{'е'}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Filters */}
        {!isMobileView && (
          <div className="ai-resources-filters desktop-filters">
            <div className="main-search-box">
              <Search className="search-icon"/>
              <input type="text" placeholder="Търсете ресурси..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="search-input"/>
              <div className="search-info"><Brain size={16}/><span>{resources.length} ресурса</span></div>
            </div>
            <div className="filters-grid">
              {[
                { label:'Тип', icon:<Filter size={14}/>, value:typeFilter, set:setTypeFilter, options:availableTypes.map(t=>({ v:t, l:getTypeLabel(t as AIResource['type']) })) },
                { label:'Ниво', icon:<GraduationCap size={14}/>, value:difficultyFilter, set:setDifficultyFilter, options:[{v:'beginner',l:'Начинаещ'},{v:'intermediate',l:'Напреднал'},{v:'advanced',l:'Експерт'}] },
                { label:'Език', icon:<Globe size={14}/>, value:languageFilter, set:setLanguageFilter, options:availableLanguages.map(l=>({v:l,l})) },
                { label:'Таг', icon:<TagIcon size={14}/>, value:tagFilter, set:setTagFilter, options:availableTags.map(t=>({v:t,l:t})) },
              ].map(f=>(
                <div key={f.label} className="filter-group">
                  <label className="filter-label">{f.icon}{f.label}</label>
                  <select className="filter-select" value={f.value} onChange={e=>f.set(e.target.value)}>
                    <option value="all">Всички</option>
                    {f.options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
              {(searchTerm||typeFilter!=='all'||difficultyFilter!=='all'||languageFilter!=='all'||tagFilter!=='all')&&(
                <button className="clear-filters-btn" onClick={clearFilters}>Изчисти</button>
              )}
            </div>
            <div className="popular-tags">
              <span className="tags-label">Популярни тагове:</span>
              <div className="tags-list">
                {['ChatGPT','Образование','Педагогика','ML','Етика','Примери','Планове'].map(tag=>(
                  <button key={tag} className={`tag-btn ${tagFilter===tag?'active':''}`} onClick={()=>setTagFilter(tagFilter===tag?'all':tag)}>{tag}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Search */}
        {isMobileView && (
          <div className="mobile-search-container">
            <div className="mobile-search-box">
              <Search className="search-icon"/>
              <input type="text" placeholder="Търсене..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="mobile-search-input"/>
              <div className="mobile-search-info"><span>{resources.length} ресурса</span></div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="ai-resources-content">
          <div className="resources-stats">
            <Brain className="stats-icon"/>
            <span className="resources-count">Намерени {filteredResources.length} от {resources.length}</span>
            {searchTerm && <span className="search-results">Резултати за "{searchTerm}"</span>}
            {isMobileView&&user&&(user.role==='admin'||user.role==='reader')&&(
              <button className="mobile-add-btn" onClick={handleAddResource}>+ Добави</button>
            )}
          </div>

          {filteredResources.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="resources-grid">
                {filteredResources.map(resource => (
                  <div key={resource.id} className={`resource-card ${resource.featured?'featured':''}`}>
                    {resource.featured&&<div className="featured-badge"><Star size={14}/><span>Препоръчан</span></div>}
                    <div className="resource-card-header">
                      <div className="resource-type-badge" style={{backgroundColor:getTypeColor(resource.type)}}>
                        {getTypeIcon(resource.type)}<span>{getTypeLabel(resource.type)}</span>
                      </div>
                      <div className="resource-actions">
                        <button className="action-btn save" onClick={e=>{e.stopPropagation();handleSaveResource(resource);}} title="Запази"><Bookmark size={16}/></button>
                        <button className="action-btn share" onClick={e=>{e.stopPropagation();handleShareResource(resource);}} title="Сподели"><Share2 size={16}/></button>
                      </div>
                    </div>
                    <div className="resource-card-content">
                      <h3 className="resource-title">{resource.title}</h3>
                      <p className="resource-description">{resource.description}</p>
                      <div className="resource-meta">
                        <div className="meta-item"><User size={14}/><span>{resource.author}</span></div>
                        <div className="meta-item"><Calendar size={14}/><span>{formatDate(resource.publishDate)}</span></div>
                        {resource.estimatedTime&&<div className="meta-item"><Clock size={14}/><span>{resource.estimatedTime}</span></div>}
                      </div>
                      <div className="resource-tags">
                        {resource.tags.slice(0,3).map(tag=><span key={tag} className="resource-tag"><TagIcon size={12}/>{tag}</span>)}
                        {resource.tags.length>3&&<span className="resource-tag more">+{resource.tags.length-3}</span>}
                      </div>
                      <div className="resource-footer">
                        <div className="resource-difficulty">
                          <span className="difficulty-badge" style={{backgroundColor:getDifficultyColor(resource.difficulty),color:'white'}}>{getDifficultyLabel(resource.difficulty)}</span>
                          {resource.isFree&&<span className="free-badge">Безплатен</span>}
                        </div>
                        <button className="view-resource-btn" onClick={e=>{e.stopPropagation();handleViewResource(resource);}}>
                          <span>Преглед</span><ExternalLink size={16}/>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="resources-list">
                <table className="ai-resources-table">
                  <thead><tr><th>Ресурс</th><th>Тип</th><th>Автор</th><th>Ниво</th><th>Език</th><th>Действия</th></tr></thead>
                  <tbody>
                    {filteredResources.map(r=>(
                      <tr key={r.id} className="resource-row">
                        <td><div className="resource-title-cell"><h4>{r.title}</h4><p className="resource-desc-truncated">{r.description}</p><div className="resource-tags-small">{r.tags.slice(0,2).map(t=><span key={t} className="tag-small">{t}</span>)}</div></div></td>
                        <td><div className="type-cell"><div className="type-indicator" style={{backgroundColor:getTypeColor(r.type)}}/>{getTypeLabel(r.type)}</div></td>
                        <td>{r.author}</td>
                        <td><span className="difficulty-cell">{getDifficultyLabel(r.difficulty)}</span></td>
                        <td>{r.language}</td>
                        <td>
                          <div className="resource-actions-cell">
                            <button className="action-icon-btn" onClick={()=>handleViewResource(r)}><ExternalLink size={16}/></button>
                            <button className="action-icon-btn" onClick={()=>handleSaveResource(r)}><Bookmark size={16}/></button>
                            <button className="action-icon-btn" onClick={()=>handleShareResource(r)}><Share2 size={16}/></button>
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
              <Brain size={80} className="no-resources-icon"/>
              <h3 className="handwritten-title-small">{searchTerm?'Няма намерени ресурси':'Все още няма ресурси'}</h3>
              <p>{searchTerm?`Няма резултати за "${searchTerm}".`:'Бъдете първият, който добавя ресурс!'}</p>
              {user&&(user.role==='admin'||user.role==='reader')&&(
                <button className="add-first-resource-btn" onClick={handleAddResource}>+ Добави първи ресурс</button>
              )}
            </div>
          )}
        </div>

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