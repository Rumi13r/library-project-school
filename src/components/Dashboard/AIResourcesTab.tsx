// src/components/Dashboard/AIResourcesTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import {
  Brain, Plus, Edit, Trash2, Search,
  Award, ExternalLink, BookOpen, FileText, Video,
  GraduationCap, Globe, Clock, Tag, Cpu, BookMarked, X,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';
import type { AIResourceFormData, AIResourceType, Difficulty } from './AIResorcesForm';
import AIResourcesForm from './AIResorcesForm';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AIResource {
  id?: string;
  title: string;
  description: string;
  type: AIResourceType;
  url: string;
  author: string;
  publisher?: string;
  publishDate: string;
  language: string;
  difficulty: Difficulty;
  tags: string[];
  thumbnail?: string;
  estimatedTime?: string;
  rating?: number;
  downloads?: number;
  isFree: boolean;
  featured?: boolean;
  addedBy: string;
}

const TYPES: { value: AIResourceType; label: string; icon: React.ReactNode; color: string }[] = [
  { value:'book',     label:'Книга',       icon:<BookOpen size={14}/>,    color:'#3b82f6' },
  { value:'article',  label:'Статия',      icon:<FileText size={14}/>,    color:'#10b981' },
  { value:'video',    label:'Видео',       icon:<Video size={14}/>,       color:'#ef4444' },
  { value:'course',   label:'Курс',        icon:<GraduationCap size={14}/>, color:'#8b5cf6' },
  { value:'tool',     label:'Инструмент',  icon:<Cpu size={14}/>,         color:'#f59e0b' },
  { value:'research', label:'Изследване',  icon:<BookMarked size={14}/>,  color:'#ec4899' },
  { value:'website',  label:'Уебсайт',     icon:<Globe size={14}/>,       color:'#6366f1' },
];

const DIFFICULTIES = [
  { value:'beginner',     label:'Начинаещ',  color:'#10b981' },
  { value:'intermediate', label:'Напреднал', color:'#f59e0b' },
  { value:'advanced',     label:'Експерт',   color:'#ef4444' },
];

const typeInfo = (t: AIResourceType) => TYPES.find(x => x.value===t) ?? TYPES[0];
const diffInfo = (d: Difficulty)     => DIFFICULTIES.find(x => x.value===d) ?? DIFFICULTIES[0];

// ─────────────────────────────────────────────────────────────────────────────
const AIResourcesTab: React.FC = () => {
  const [resources,  setResources]  = useState<AIResource[]>([]);
  const [filtered,   setFiltered]   = useState<AIResource[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showModal,  setShowModal]  = useState(false);
  const [modalMode,  setModalMode]  = useState<'create'|'edit'>('create');
  const [editData,   setEditData]   = useState<Partial<AIResource>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db,'ai_resources'), orderBy('addedAt','desc')));
      setResources(snap.docs.map(d => ({ id:d.id, ...d.data() } as AIResource)));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  useEffect(() => {
    let f = [...resources];
    if (searchTerm) f = f.filter(r =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));
    if (typeFilter !== 'all') f = f.filter(r => r.type===typeFilter);
    setFiltered(f);
  }, [resources, searchTerm, typeFilter]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditData({}); setModalMode('create'); setShowModal(true); };
  const openEdit   = (r: AIResource) => { setEditData(r); setModalMode('edit'); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  // ── Save (FIXED: proper spread) ────────────────────────────────────────────
  const handleSave = async (data: AIResourceFormData) => {
    const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload: Omit<AIResource,'id'> = {
      title: data.title, description: data.description, type: data.type,
      url: data.url, author: data.author, publisher: data.publisher,
      publishDate: data.publishDate, language: data.language,
      difficulty: data.difficulty, tags, thumbnail: data.thumbnail,
      estimatedTime: data.estimatedTime, rating: data.rating,
      downloads: data.downloads, isFree: data.isFree,
      featured: data.featured, addedBy: data.addedBy,
    };

    if (modalMode === 'create') {
      await addDoc(collection(db,'ai_resources'), { ...payload, addedAt:Timestamp.now(), lastUpdated:Timestamp.now() });
    } else {
      if (!editData.id) return;
      await updateDoc(doc(db,'ai_resources',editData.id), { ...payload, lastUpdated:Timestamp.now() });
    }
    closeModal();
    fetchResources();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Изтриване на "${title}"?`)) return;
    try { await deleteDoc(doc(db,'ai_resources',id)); fetchResources(); }
    catch(e) { console.error(e); alert('Грешка!'); }
  };

  const toggleFeatured = async (r: AIResource) => {
    if (!r.id) return;
    await updateDoc(doc(db,'ai_resources',r.id), { featured:!r.featured });
    fetchResources();
  };

  const inp = styles.modalFormInput;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <h2 style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Brain size={20}/>ИИ Ресурси за Учители ({filtered.length})
        </h2>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16}/>Добави ресурс
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterRow} style={{ flexWrap:'wrap', gap:8, marginBottom:16 }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input type="text" placeholder="Търсене..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className={inp} style={{ paddingLeft:32 }}/>
        </div>
        <select className={inp} style={{ flex:'0 0 180px' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Всички типове</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {(searchTerm||typeFilter!=='all') && (
          <button className={styles.secondaryBtn} onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}>
            <X size={14}/>Изчисти
          </button>
        )}
      </div>

      {/* Type chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
        {TYPES.map(t => {
          const count = resources.filter(r => r.type===t.value).length;
          if (count===0) return null;
          return (
            <button key={t.value} onClick={() => setTypeFilter(typeFilter===t.value?'all':t.value)}
              style={{ background:typeFilter===t.value?t.color+'20':'var(--bg-card)', border:`1px solid ${typeFilter===t.value?t.color:'var(--border-light)'}`, color:typeFilter===t.value?t.color:'var(--text-secondary)', borderRadius:20, padding:'4px 12px', cursor:'pointer', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              {t.icon}{t.label} ({count})
            </button>
          );
        })}
      </div>

      {loading && <div className={styles.emptyState}><div className={styles.spinner}/><p>Зареждане...</p></div>}

      {!loading && filtered.length===0 && (
        <div className={styles.emptyState}>
          <Brain size={48}/><p>Няма намерени ИИ ресурси</p>
          <button className={styles.primaryBtn} onClick={openCreate} style={{ marginTop:12 }}>
            <Plus size={16}/>Добави първи ресурс
          </button>
        </div>
      )}

      {!loading && filtered.length>0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.map(resource => {
            const ti = typeInfo(resource.type);
            const di = diffInfo(resource.difficulty);
            return (
              <div key={resource.id} style={{ background:'var(--bg-card)', border:`1px solid ${resource.featured?'#f59e0b':'var(--border-light)'}`, borderRadius:12, padding:16, position:'relative', boxShadow:resource.featured?'0 0 0 2px rgba(245,158,11,0.2)':'none', display:'flex', gap:14, alignItems:'flex-start' }}>
                {resource.featured && (
                  <div style={{ position:'absolute', top:10, right:10, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 8px rgba(245,158,11,0.4)' }}>
                    <Award size={12}/>Препоръчано
                  </div>
                )}
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background:ti.color+'20', color:ti.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {ti.icon}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:'0 0 2px' }}>{resource.title}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 6px' }}>{resource.author}{resource.publisher?` · ${resource.publisher}`:''}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 8px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{resource.description}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                    <span style={{ background:ti.color+'20', color:ti.color, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>{ti.icon}{ti.label}</span>
                    <span style={{ background:di.color+'20', color:di.color, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>{di.label}</span>
                    <span style={{ background:'var(--bg-section)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Globe size={11}/>{resource.language}</span>
                    {resource.estimatedTime && <span style={{ background:'var(--bg-section)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Clock size={11}/>{resource.estimatedTime}</span>}
                    {resource.isFree && <span style={{ background:'#10b98120', color:'#10b981', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600 }}>Безплатен</span>}
                    {resource.tags.slice(0,3).map(tag => (
                      <span key={tag} style={{ background:'var(--bg-section)', color:'var(--text-muted)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Tag size={10}/>{tag}</span>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button title={resource.featured?'Премахни':'Препоряано'} onClick={() => toggleFeatured(resource)}
                      style={{ background:resource.featured?'#f59e0b20':'transparent', border:`1px solid ${resource.featured?'#f59e0b':'var(--border-light)'}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', color:resource.featured?'#f59e0b':'var(--text-muted)', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                      <Award size={13}/>{resource.featured?'Препоряано':'Препоряай'}
                    </button>
                    <a href={resource.url} target="_blank" rel="noopener noreferrer"
                      style={{ background:'var(--bg-section)', border:'1px solid var(--border-light)', borderRadius:6, padding:'4px 10px', color:'var(--text-secondary)', fontSize:12, display:'flex', alignItems:'center', gap:4, textDecoration:'none' }}>
                      <ExternalLink size={12}/>Отвори
                    </a>
                    <button className={styles.iconBtn} onClick={() => openEdit(resource)} title="Редактирай"><Edit size={14}/></button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(resource.id!, resource.title)} title="Изтрий"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AIResourcesForm
          mode={modalMode}
          initialData={editData}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default AIResourcesTab;