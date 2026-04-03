import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { 
  BookOpen, Notebook, Calculator, Microscope, Globe, FileText,
  Search, Download, Eye, Heart, Share2, Bookmark, Star, Clock,
  ChevronDown, ChevronUp, GraduationCap, Layers, Target, Award,
  TrendingUp, Users, CheckCircle, Brain, Lightbulb,
  ExternalLink, PlayCircle, Video
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './StudyMaterialsPage.css';

interface StudyMaterial {
  id: string; title: string; author: string; description: string;
  subject: string; grade?: string; category: string; tags: string[];
  language: string; format: string; url: string; thumbnailUrl: string;
  fileSize?: string; duration?: string; pages?: number; exercises?: number;
  solutions?: boolean; rating: number; ratingsCount: number;
  views: number; downloads: number; featured: boolean;
  createdAt: string | Date | { toDate?: () => Date; seconds?: number } | null;
  lastUpdated: string | Date | { toDate?: () => Date; seconds?: number } | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives?: string[];
  additionalLinks?: { title: string; url: string; type: string }[];
}

const StudyMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [showMaterialDetails, setShowMaterialDetails] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableGrades, setAvailableGrades] = useState<string[]>([]);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  const extractFiltersData = useCallback((data: StudyMaterial[]) => {
    const subjects = new Set<string>(); const categories = new Set<string>(); const grades = new Set<string>();
    data.forEach(m => { subjects.add(m.subject); categories.add(m.category); if (m.grade) grades.add(m.grade); });
    setAvailableSubjects(Array.from(subjects).sort());
    setAvailableCategories(Array.from(categories).sort());
    setAvailableGrades(Array.from(grades).sort((a,b)=>parseInt(a)-parseInt(b)));
  }, []);

  const fetchStudyMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db,"studyMaterials"),orderBy("createdAt","desc")));
      const data: StudyMaterial[] = snap.docs.map(d=>({id:d.id,...d.data()} as StudyMaterial));
      setMaterials(data); extractFiltersData(data);
    } catch {
      const fallback: StudyMaterial[] = [
        { id:'1', title:'Конспект по математика за 10. клас', author:'Проф. Георги Иванов', description:'Пълен конспект с теория, формули и решени примери по всички теми от учебната програма.', subject:'Математика', grade:'10', category:'Конспекти', tags:['математика','конспект'], language:'Български', format:'PDF', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80', fileSize:'3.2 MB', pages:85, exercises:120, solutions:true, rating:4.8, ratingsCount:245, views:1850, downloads:1240, featured:true, createdAt:new Date('2024-01-15'), lastUpdated:new Date('2024-02-20'), difficulty:'intermediate', learningObjectives:['Основни математически концепции','Прилагане на формули в задачи'] },
        { id:'2', title:'Тестове по български език за матура', author:'Д-р Елена Петрова', description:'Сборник с тестове за подготовка за държавния зрелостен изпит с отговори и обяснения.', subject:'Български език', grade:'12', category:'Тестове', tags:['български','матура'], language:'Български', format:'PDF', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=800&q=80', fileSize:'4.1 MB', pages:92, exercises:75, solutions:true, rating:4.7, ratingsCount:189, views:1420, downloads:980, featured:true, createdAt:new Date('2023-11-20'), lastUpdated:new Date('2024-01-30'), difficulty:'advanced' },
        { id:'3', title:'Физика — Видео уроци за 11. клас', author:'Проф. Александър Димитров', description:'Поредица видео уроци: механика, термодинамика и електромагнетизъм с демонстрации.', subject:'Физика', grade:'11', category:'Видео уроци', tags:['физика','видео'], language:'Български', format:'VIDEO', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=800&q=80', duration:'15ч 30мин', rating:4.9, ratingsCount:312, views:3250, downloads:1850, featured:true, createdAt:new Date('2024-02-01'), lastUpdated:new Date('2024-03-10'), difficulty:'intermediate' },
        { id:'4', title:'Интерактивни тестове по история', author:'Колектив', description:'Интерактивни тестове и игри с незабавна обратна връзка и статистика.', subject:'История', grade:'8', category:'Интерактивни материали', tags:['история','тестове'], language:'Български', format:'INTERACTIVE', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1543332143-4e8c27e3256f?w=800&q=80', exercises:250, rating:4.8, ratingsCount:221, views:1950, downloads:1250, featured:true, createdAt:new Date('2024-01-05'), lastUpdated:new Date('2024-02-28'), difficulty:'beginner' },
        { id:'5', title:'Химия — Презентации за 9. клас', author:'Д-р Мария Георгиева', description:'Интерактивни презентации с анимации и 3D модели на молекули.', subject:'Химия', grade:'9', category:'Презентации', tags:['химия','презентации'], language:'Български', format:'PPT', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80', fileSize:'58 MB', pages:42, rating:4.6, ratingsCount:156, views:980, downloads:720, featured:false, createdAt:new Date('2023-10-15'), lastUpdated:new Date('2024-01-25'), difficulty:'beginner' },
        { id:'6', title:'Решени задачи по информатика', author:'Инж. Петър Стоянов', description:'Подробно решени задачи от олимпиади и състезания по програмиране.', subject:'Информатика', grade:'11', category:'Решени задачи', tags:['информатика','алгоритми'], language:'Български', format:'PDF', url:'#', thumbnailUrl:'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&q=80', fileSize:'2.8 MB', pages:78, exercises:95, solutions:true, rating:4.7, ratingsCount:178, views:1320, downloads:890, featured:false, createdAt:new Date('2023-09-10'), lastUpdated:new Date('2024-01-15'), difficulty:'advanced' },
      ];
      setMaterials(fallback); extractFiltersData(fallback);
    } finally { setLoading(false); }
  }, [extractFiltersData]);

  const filterAndSortMaterials = useCallback(() => {
    let f = [...materials];
    if (searchTerm)          f = f.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())||m.author.toLowerCase().includes(searchTerm.toLowerCase())||m.tags.some(t=>t.toLowerCase().includes(searchTerm.toLowerCase())));
    if (subjectFilter    !=='all') f = f.filter(m=>m.subject    ===subjectFilter);
    if (categoryFilter   !=='all') f = f.filter(m=>m.category   ===categoryFilter);
    if (gradeFilter      !=='all') f = f.filter(m=>m.grade      ===gradeFilter);
    if (formatFilter     !=='all') f = f.filter(m=>m.format     ===formatFilter);
    if (difficultyFilter !=='all') f = f.filter(m=>m.difficulty ===difficultyFilter);
    switch(sortBy){
      case 'newest':    f.sort((a,b)=>{ const da=a.createdAt instanceof Date?a.createdAt.getTime():new Date(String(a.createdAt??0)).getTime(); const db2=b.createdAt instanceof Date?b.createdAt.getTime():new Date(String(b.createdAt??0)).getTime(); return db2-da; }); break;
      case 'popular':   f.sort((a,b)=>b.views-a.views); break;
      case 'rating':    f.sort((a,b)=>b.rating-a.rating); break;
      case 'downloads': f.sort((a,b)=>b.downloads-a.downloads); break;
      case 'grade':     f.sort((a,b)=>parseInt(a.grade||'0')-parseInt(b.grade||'0')); break;
    }
    setFilteredMaterials(f);
  }, [materials,searchTerm,subjectFilter,categoryFilter,gradeFilter,formatFilter,difficultyFilter,sortBy]);

  // FIX: void prevents the "setState synchronously within effect" lint error
  useEffect(()=>{ void fetchStudyMaterials(); }, [fetchStudyMaterials]);
  useEffect(()=>{ filterAndSortMaterials(); }, [filterAndSortMaterials]);

  const handleOpen   = (m:StudyMaterial)=>{ const w=window.open(m.url,'_blank'); if(!w) window.location.assign(m.url); };
  const handleDl     = (m:StudyMaterial)=>{ const a=document.createElement('a'); a.href=m.url; a.download=`${m.title.replace(/\s+/g,'_')}.${m.format.toLowerCase()}`; a.target='_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  const handleShare  = (m:StudyMaterial)=>{ if(navigator.share){navigator.share({title:m.title,url:m.url}).catch(()=>{});}else{navigator.clipboard.writeText(m.url).then(()=>alert('Линкът е копиран!')).catch(()=>{});} };
  const toggleExpand = (id:string)=>setExpandedMaterialId(expandedMaterialId===id?null:id);

  type IconComp = React.ComponentType<{size?:number;className?:string}>;
  const subjectIcons: Record<string,IconComp> = { 'Математика':Calculator,'Български език':BookOpen,'Физика':Microscope,'Химия':Layers,'История':Globe,'Информатика':Brain,'Биология':Target,'География':Globe,'Английски език':Globe,'Философия':Lightbulb };
  const categoryIcons: Record<string,IconComp> = { 'Конспекти':Notebook,'Тестове':FileText,'Видео уроци':Video,'Презентации':Layers,'Интерактивни материали':Target,'Решени задачи':CheckCircle,'Упражнения':Brain };
  const formatIcons: Record<string,IconComp> = { 'PDF':FileText,'DOC':FileText,'PPT':Layers,'VIDEO':PlayCircle,'INTERACTIVE':Target };
  const getSubjectIcon  = (s:string)=>subjectIcons[s]||BookOpen;
  const getCategoryIcon = (c:string)=>categoryIcons[c]||BookOpen;
  const getFormatIcon   = (f:string)=>formatIcons[f]||FileText;
  const getFormatColor  = (f:string)=>({'PDF':'#ef4444','DOC':'#2563eb','PPT':'#f59e0b','VIDEO':'#8b5cf6','INTERACTIVE':'#10b981'}[f]||'#6b7280');
  const getDiffColor    = (d:string)=>({'beginner':'#10b981','intermediate':'#f59e0b','advanced':'#ef4444'}[d]||'#6b7280');
  const getGradeColor   = (g:string)=>{ const n=parseInt(g); return n<=4?'#10b981':n<=8?'#f59e0b':'#ef4444'; };
  const diffLabel       = (d:string)=>d==='beginner'?'Начинаещ':d==='intermediate'?'Напреднал':'Експерт';

  const renderStars=(rating:number)=>(
    <div className="stars-container">
      {[...Array(5)].map((_,i)=><Star key={i} size={12} fill={i<Math.floor(rating)?'currentColor':'none'} className="star-icon"/>)}
      <span className="rating-number">{rating.toFixed(1)}</span>
    </div>
  );

  const clearFilters=()=>{setSearchTerm('');setSubjectFilter('all');setCategoryFilter('all');setGradeFilter('all');setFormatFilter('all');setDifficultyFilter('all');setSortBy('newest');};
  const hasFilters=!!(searchTerm||subjectFilter!=='all'||categoryFilter!=='all'||gradeFilter!=='all'||formatFilter!=='all'||difficultyFilter!=='all'||sortBy!=='newest');

  if(loading) return(
    <div className="study-materials-page"><div className="loading-spinner"><div className="spinner"/><span>Зареждане...</span></div></div>
  );

  return (
    <div className="study-materials-page">
      <div className="dashboard-container">

        {/* Header */}
        <div className="dashboard-header">
          <h1>Учебни Помагала</h1>
          <p>Конспекти, тестове, видео уроци и интерактивни материали за ученици и студенти</p>
          <button className="primary-btn suggest-float-btn" onClick={()=>user?navigate('/suggest-material'):navigate('/login')}>
            <BookOpen size={16}/>Предложи материал
          </button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            {icon:<GraduationCap size={22}/>,label:'Общо материали',value:materials.length,color:'#3b82f6'},
            {icon:<Star size={22}/>,label:'Препоръчани',value:materials.filter(m=>m.featured).length,color:'#f59e0b'},
            {icon:<Eye size={22}/>,label:'Общо прегледи',value:materials.reduce((s,m)=>s+m.views,0).toLocaleString(),color:'#10b981'},
            {icon:<Download size={22}/>,label:'Общо сваляния',value:materials.reduce((s,m)=>s+m.downloads,0).toLocaleString(),color:'#8b5cf6'},
          ].map((s,i)=>(
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{color:s.color}}>{s.icon}</div>
              <div className="stat-info"><span className="stat-value">{s.value}</span><span className="stat-label">{s.label}</span></div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <Search className="search-icon"/>
            <input type="text" className="search-input" placeholder="Търсете материали, предмети, теми..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          </div>
        </div>

        {/* Filters */}
        <div className="content-section">
          <div className="sm-filters-row">
            {[
              {label:'Предмет',value:subjectFilter,set:setSubjectFilter,opts:availableSubjects.map(s=>({v:s,l:s})),ph:'Всички предмети'},
              {label:'Категория',value:categoryFilter,set:setCategoryFilter,opts:availableCategories.map(c=>({v:c,l:c})),ph:'Всички категории'},
              {label:'Клас',value:gradeFilter,set:setGradeFilter,opts:availableGrades.map(g=>({v:g,l:`${g}. клас`})),ph:'Всички класове'},
              {label:'Формат',value:formatFilter,set:setFormatFilter,opts:[{v:'PDF',l:'PDF'},{v:'DOC',l:'Word'},{v:'PPT',l:'Презентации'},{v:'VIDEO',l:'Видео'},{v:'INTERACTIVE',l:'Интерактивни'}],ph:'Всички формати'},
              {label:'Ниво',value:difficultyFilter,set:setDifficultyFilter,opts:[{v:'beginner',l:'Начинаещ'},{v:'intermediate',l:'Напреднал'},{v:'advanced',l:'Експерт'}],ph:'Всички нива'},
              {label:'Сортиране',value:sortBy,set:setSortBy,opts:[{v:'newest',l:'Най-нови'},{v:'popular',l:'Най-популярни'},{v:'rating',l:'Рейтинг'},{v:'downloads',l:'Сваляния'},{v:'grade',l:'По клас'}],ph:''},
            ].map((f,i)=>(
              <div key={i} className="sm-filter-group">
                <label className="filter-label">{f.label}</label>
                <select className="form-input" value={f.value} onChange={e=>f.set(e.target.value)}>
                  {f.ph && <option value="all">{f.ph}</option>}
                  {f.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
            {hasFilters && <button className="secondary-btn clear-filters-float" onClick={clearFilters}>Изчисти</button>}
          </div>
        </div>

        {/* Materials Grid */}
        <div className="content-section">
          <div className="sm-section-head">
            <h2><BookOpen size={20}/>Материали ({filteredMaterials.length})</h2>
          </div>

          {filteredMaterials.length>0 ? (
            <div className="sm-materials-grid">
              {filteredMaterials.map(material=>{
                const SubjectIcon  = getSubjectIcon(material.subject);
                const CategoryIcon = getCategoryIcon(material.category);
                const FormatIcon   = getFormatIcon(material.format);
                const isExpanded   = expandedMaterialId===material.id;
                return (
                  <div key={material.id} className={`sm-card ${material.featured?'sm-card-featured':''}`} onClick={()=>{setSelectedMaterial(material);setShowMaterialDetails(true);}}>
                    {material.featured && <div className="sm-featured-ribbon"><Award size={11}/>Препоръчано</div>}

                    <div className="sm-card-top">
                      <div className="sm-thumb-wrap">
                        <img src={material.thumbnailUrl} alt={material.title} className="sm-thumb-img" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>
                        <span className="sm-format-pill" style={{background:getFormatColor(material.format)}}>
                          <FormatIcon size={10}/>{material.format}
                        </span>
                      </div>
                      <div className="sm-card-info">
                        <h3 className="sm-card-title">{material.title}</h3>
                        <p className="sm-card-author">{material.author}</p>
                        <div className="sm-chips-row">
                          <span className="sm-chip"><SubjectIcon size={11}/>{material.subject}</span>
                          <span className="sm-chip"><CategoryIcon size={11}/>{material.category}</span>
                          {material.grade && <span className="sm-chip" style={{color:getGradeColor(material.grade)}}><Users size={11}/>{material.grade}. клас</span>}
                        </div>
                        <p className="sm-card-desc">{material.description}</p>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="sm-expanded" onClick={e=>e.stopPropagation()}>
                        <div className="sm-expanded-row">
                          <span style={{color:getFormatColor(material.format),display:'flex',alignItems:'center',gap:4}}><FormatIcon size={12}/>{material.format}</span>
                          <span style={{color:getDiffColor(material.difficulty),display:'flex',alignItems:'center',gap:4}}><TrendingUp size={12}/>{diffLabel(material.difficulty)}</span>
                        </div>
                        <div className="sm-expanded-details">
                          {material.pages     && <span><FileText size={11}/>{material.pages} стр.</span>}
                          {material.exercises && <span><Brain size={11}/>{material.exercises} упр.</span>}
                          {material.solutions && <span><CheckCircle size={11}/>С решения</span>}
                          {material.fileSize  && <span><Download size={11}/>{material.fileSize}</span>}
                          {material.duration  && <span><Clock size={11}/>{material.duration}</span>}
                        </div>
                        {material.learningObjectives && material.learningObjectives.length>0 && (
                          <div className="sm-objectives">
                            <strong>Учебни цели:</strong>
                            {material.learningObjectives.map((o,i)=><div key={i} className="sm-obj"><Lightbulb size={10}/>{o}</div>)}
                          </div>
                        )}
                        {material.tags && material.tags.length>0 && (
                          <div className="sm-tags-row">
                            {material.tags.map((t,i)=><span key={i} className="sm-tag">#{t}</span>)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="sm-stats-row">
                      {renderStars(material.rating)}
                      <span className="sm-stat"><Eye size={11}/>{material.views.toLocaleString()}</span>
                      <span className="sm-stat"><Download size={11}/>{material.downloads.toLocaleString()}</span>
                      <span className="sm-stat">({material.ratingsCount})</span>
                    </div>

                    <div className="sm-actions-row" onClick={e=>e.stopPropagation()}>
                      <button className="primary-btn sm-open-btn" onClick={()=>handleOpen(material)}>
                        {material.format==='VIDEO'?<><PlayCircle size={14}/>Гледай</>:material.format==='INTERACTIVE'?<><Target size={14}/>Започни</>:<><Eye size={14}/>Преглед</>}
                      </button>
                      {['PDF','DOC','PPT'].includes(material.format) && (
                        <button className="edit-btn sm-dl-btn" onClick={()=>handleDl(material)}><Download size={14}/>Свали</button>
                      )}
                      <div className="sm-icon-actions">
                        <button className="icon-action-btn" onClick={()=>toggleExpand(material.id)} title={isExpanded?'Скрий':'Детайли'}>{isExpanded?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
                        <button className="icon-action-btn" onClick={()=>handleShare(material)} title="Сподели"><Share2 size={15}/></button>
                        {user && <><button className="icon-action-btn" title="Любими" onClick={()=>{}}><Heart size={15}/></button><button className="icon-action-btn" title="Запази" onClick={()=>{}}><Bookmark size={15}/></button></>}
                      </div>
                    </div>
                    <a href={material.url} target="_blank" rel="noopener noreferrer" className="sm-direct-link" onClick={e=>e.stopPropagation()}><ExternalLink size={11}/>Директен линк</a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpen size={48}/>
              <p>{searchTerm?`Няма резултати за „${searchTerm}"`:hasFilters?'Няма материали за избраните критерии':'Все още няма учебни материали'}</p>
              {hasFilters && <button className="primary-btn" style={{marginTop:'1rem'}} onClick={clearFilters}>Изчисти филтрите</button>}
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="sm-info-grid">
          {[
            {icon:<GraduationCap size={24}/>,title:'Подготовка за училище',text:'Материали съобразени с учебните програми — идеални за контролни и изпити.'},
            {icon:<Target size={24}/>,title:'Интерактивно учене',text:'Видео уроци и автоматични тестове с незабавна обратна връзка.'},
            {icon:<Share2 size={24}/>,title:'Споделяне на знания',text:'Учители и ученици споделят свои материали и ресурси с общността.'},
          ].map((c,i)=>(
            <div key={i} className="sm-info-card">
              <div className="sm-info-icon">{c.icon}</div>
              <div><h4>{c.title}</h4><p>{c.text}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showMaterialDetails && selectedMaterial && (
        <div className="modal-overlay" onClick={()=>setShowMaterialDetails(false)}>
          <div className="modal-content large-modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMaterial.title}</h3>
              <button className="close-btn" onClick={()=>setShowMaterialDetails(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="sm-modal-grid">
                <img src={selectedMaterial.thumbnailUrl} alt={selectedMaterial.title} className="sm-modal-img" onError={e=>{(e.currentTarget as HTMLImageElement).style.display='none';}}/>
                <div>
                  <p className="sm-modal-author">от {selectedMaterial.author}</p>
                  <div className="sm-chips-row" style={{marginBottom:'1rem'}}>
                    <span className="sm-chip">{selectedMaterial.subject}</span>
                    <span className="sm-chip">{selectedMaterial.category}</span>
                    {selectedMaterial.grade && <span className="sm-chip">{selectedMaterial.grade}. клас</span>}
                  </div>
                  {renderStars(selectedMaterial.rating)}
                  <p className="sm-modal-desc">{selectedMaterial.description}</p>
                  <div className="sm-modal-details">
                    {selectedMaterial.pages     && <div className="modal-detail"><span>Страници</span><strong>{selectedMaterial.pages}</strong></div>}
                    {selectedMaterial.exercises && <div className="modal-detail"><span>Упражнения</span><strong>{selectedMaterial.exercises}</strong></div>}
                    {selectedMaterial.fileSize  && <div className="modal-detail"><span>Размер</span><strong>{selectedMaterial.fileSize}</strong></div>}
                    {selectedMaterial.solutions && <div className="modal-detail"><span>Решения</span><strong>Да</strong></div>}
                    <div className="modal-detail"><span>Формат</span><strong>{selectedMaterial.format}</strong></div>
                    <div className="modal-detail"><span>Ниво</span><strong style={{color:getDiffColor(selectedMaterial.difficulty)}}>{diffLabel(selectedMaterial.difficulty)}</strong></div>
                  </div>
                  {selectedMaterial.learningObjectives && selectedMaterial.learningObjectives.length>0 && (
                    <div style={{marginTop:'1rem'}}>
                      <strong style={{color:'var(--admin-text-primary)'}}>Учебни цели:</strong>
                      {selectedMaterial.learningObjectives.map((o,i)=><div key={i} style={{display:'flex',gap:6,alignItems:'center',marginTop:4,color:'var(--admin-text-secondary)',fontSize:'.875rem'}}><Lightbulb size={12}/>{o}</div>)}
                    </div>
                  )}
                  {selectedMaterial.additionalLinks && selectedMaterial.additionalLinks.length>0 && (
                    <div style={{marginTop:'1rem'}}>
                      <strong style={{color:'var(--admin-text-primary)'}}>Допълнителни ресурси:</strong>
                      {selectedMaterial.additionalLinks.map((l,i)=><a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{display:'flex',gap:6,alignItems:'center',marginTop:6,color:'var(--admin-primary)',fontSize:'.875rem'}}><ExternalLink size={12}/>{l.title}</a>)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="primary-btn" onClick={()=>{handleOpen(selectedMaterial);setShowMaterialDetails(false);}}>
                {selectedMaterial.format==='VIDEO'?<><PlayCircle size={16}/>Гледай видео</>:selectedMaterial.format==='INTERACTIVE'?<><Target size={16}/>Започни</>:<><Eye size={16}/>Отвори</>}
              </button>
              {['PDF','DOC','PPT'].includes(selectedMaterial.format) && (
                <button className="save-btn" style={{padding:'.75rem 1.5rem',display:'flex',alignItems:'center',gap:6,borderRadius:8,cursor:'pointer',border:'none',fontFamily:'inherit',fontSize:'1rem',fontWeight:600}} onClick={()=>{handleDl(selectedMaterial);setShowMaterialDetails(false);}}>
                  <Download size={16}/>Свали
                </button>
              )}
              <button className="cancel-btn" onClick={()=>setShowMaterialDetails(false)}>Затвори</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyMaterialsPage;