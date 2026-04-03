// src/components/Dashboard/StudyMaterialsTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import {
  BookOpen, Plus, Edit, Trash2, Eye, Download,
  Award, Search, FileText, Video, Layers,
  Brain, Target, CheckCircle, Users, TrendingUp, X,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';
import StudyMaterialFormModal from './StudyMaterialForm';
import type { StudyMaterialFormData, Difficulty } from './StudyMaterialForm';

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudyMaterial {
  id?: string;
  title: string; author: string; description: string;
  subject: string; grade?: string; category: string;
  tags: string[]; language: string; format: string;
  url: string; thumbnailUrl: string;
  fileSize?: string; duration?: string;
  pages?: number; exercises?: number; solutions?: boolean;
  rating: number; ratingsCount: number; views: number; downloads: number;
  featured: boolean; difficulty: Difficulty;
  learningObjectives?: string[];
  additionalLinks?: { title: string; url: string; type: string }[];
}

type IconComp = React.ComponentType<{ size?: number }>;
const formatIconMap: Record<string,IconComp> = { PDF:FileText, DOC:FileText, PPT:Layers, VIDEO:Video, INTERACTIVE:Target };
const getFormatIcon = (f: string): IconComp => formatIconMap[f] ?? FileText;
const formatColor  = (f: string) => ({ PDF:'#ef4444', DOC:'#2563eb', PPT:'#f59e0b', VIDEO:'#8b5cf6', INTERACTIVE:'#10b981' }[f] ?? '#6b7280');
const gradeColor   = (g: string) => { const n=parseInt(g); return n<=4?'#10b981':n<=8?'#f59e0b':'#ef4444'; };
const diffLabel    = (d?: string) => ({ beginner:'Начинаещ', intermediate:'Напреднал', advanced:'Експерт' }[d??''] ?? '—');
const diffColor    = (d?: string) => ({ beginner:'#10b981', intermediate:'#f59e0b', advanced:'#ef4444' }[d??''] ?? '#6b7280');

// ─────────────────────────────────────────────────────────────────────────────
const StudyMaterialsTab: React.FC = () => {
  const [materials,  setMaterials]  = useState<StudyMaterial[]>([]);
  const [filtered,   setFiltered]   = useState<StudyMaterial[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectF,   setSubjectF]   = useState('all');
  const [gradeF,     setGradeF]     = useState('all');
  const [showModal,  setShowModal]  = useState(false);
  const [modalMode,  setModalMode]  = useState<'create'|'edit'>('create');
  const [editData,   setEditData]   = useState<Partial<StudyMaterial>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db,'studyMaterials'), orderBy('createdAt','desc')));
      setMaterials(snap.docs.map(d => ({ id:d.id, ...d.data() } as StudyMaterial)));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  useEffect(() => {
    let f = [...materials];
    if (searchTerm) f = f.filter(m =>
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    if (subjectF!=='all') f = f.filter(m => m.subject===subjectF);
    if (gradeF  !=='all') f = f.filter(m => m.grade  ===gradeF);
    setFiltered(f);
  }, [materials, searchTerm, subjectF, gradeF]);

  const availableSubjects = Array.from(new Set(materials.map(m => m.subject))).filter(Boolean).sort();

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditData({}); setModalMode('create'); setShowModal(true); };
  const openEdit   = (m: StudyMaterial) => { setEditData(m); setModalMode('edit'); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (data: StudyMaterialFormData) => {
    const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    const learningObjectives = data.learningObjectives.split('\n').map(o => o.trim()).filter(Boolean);
    const payload: Omit<StudyMaterial,'id'> = {
      title: data.title, author: data.author, description: data.description,
      subject: data.subject, grade: data.grade, category: data.category,
      tags, language: data.language, format: data.format,
      url: data.url, thumbnailUrl: data.thumbnailUrl,
      fileSize: data.fileSize, duration: data.duration,
      pages: data.pages, exercises: data.exercises, solutions: data.solutions,
      rating: data.rating, ratingsCount: data.ratingsCount,
      views: data.views, downloads: data.downloads,
      featured: data.featured, difficulty: data.difficulty,
      learningObjectives, additionalLinks: data.additionalLinks,
    };

    if (modalMode === 'create') {
      await addDoc(collection(db,'studyMaterials'), { ...payload, createdAt:Timestamp.now(), lastUpdated:Timestamp.now() });
    } else {
      if (!editData.id) return;
      await updateDoc(doc(db,'studyMaterials',editData.id), { ...payload, lastUpdated:Timestamp.now() });
    }
    closeModal();
    fetchMaterials();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Изтриване на "${title}"?`)) return;
    try { await deleteDoc(doc(db,'studyMaterials',id)); fetchMaterials(); }
    catch(e) { console.error(e); alert('Грешка!'); }
  };

  const toggleFeatured = async (m: StudyMaterial) => {
    if (!m.id) return;
    await updateDoc(doc(db,'studyMaterials',m.id), { featured:!m.featured });
    fetchMaterials();
  };

  const inp = styles.modalFormInput;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <h2 style={{ display:'flex', alignItems:'center', gap:8 }}>
          <BookOpen size={20}/>Учебни Помагала ({filtered.length})
        </h2>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16}/>Добави материал
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterRow} style={{ flexWrap:'wrap', gap:8, marginBottom:16 }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input type="text" placeholder="Търсене..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className={inp} style={{ paddingLeft:32 }}/>
        </div>
        <select className={inp} style={{ flex:'0 0 160px' }} value={subjectF} onChange={e => setSubjectF(e.target.value)}>
          <option value="all">Всички предмети</option>
          {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={inp} style={{ flex:'0 0 130px' }} value={gradeF} onChange={e => setGradeF(e.target.value)}>
          <option value="all">Всички класове</option>
          {Array.from({ length:12 },(_,i) => String(i+1)).map(g => <option key={g} value={g}>{g}. клас</option>)}
        </select>
        {(searchTerm||subjectF!=='all'||gradeF!=='all') && (
          <button className={styles.secondaryBtn} onClick={() => { setSearchTerm(''); setSubjectF('all'); setGradeF('all'); }}>
            <X size={14}/>Изчисти
          </button>
        )}
      </div>

      {loading && <div className={styles.emptyState}><div className={styles.spinner}/><p>Зареждане...</p></div>}

      {!loading && filtered.length===0 && (
        <div className={styles.emptyState}>
          <BookOpen size={48}/><p>Няма намерени учебни материали</p>
          <button className={styles.primaryBtn} onClick={openCreate} style={{ marginTop:12 }}>
            <Plus size={16}/>Добави първи материал
          </button>
        </div>
      )}

      {!loading && filtered.length>0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
          {filtered.map(material => {
            const FmtIcon = getFormatIcon(material.format);
            return (
              <div key={material.id} style={{ background:'var(--bg-card)', border:`1px solid ${material.featured?'#f59e0b':'var(--border-light)'}`, borderRadius:12, overflow:'hidden', position:'relative', boxShadow:material.featured?'0 0 0 2px rgba(245,158,11,0.25)':'none' }}>
                {material.featured && (
                  <div style={{ position:'absolute', top:10, right:10, zIndex:2, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 8px rgba(245,158,11,0.4)' }}>
                    <Award size={12}/>Препоряано
                  </div>
                )}
                <div style={{ height:130, background:'var(--bg-section)', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  {material.thumbnailUrl
                    ? <img src={material.thumbnailUrl} alt={material.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}/>
                    : <BookOpen size={40} style={{ color:'var(--text-muted)' }}/>}
                  <div style={{ position:'absolute', bottom:8, left:8, background:formatColor(material.format), color:'#fff', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
                    <FmtIcon size={11}/>{material.format}
                  </div>
                </div>
                <div style={{ padding:'12px 14px' }}>
                  <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:'0 0 2px' }}>{material.title}</p>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 6px' }}>{material.author}</p>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                    {material.subject   && <span style={{ background:'var(--bg-section)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Brain size={11}/>{material.subject}</span>}
                    {material.grade     && <span style={{ background:gradeColor(material.grade)+'20', color:gradeColor(material.grade), padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><Users size={11}/>{material.grade}. клас</span>}
                    {material.difficulty && <span style={{ background:diffColor(material.difficulty)+'20', color:diffColor(material.difficulty), padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><TrendingUp size={11}/>{diffLabel(material.difficulty)}</span>}
                    {material.solutions && <span style={{ background:'#10b98120', color:'#10b981', padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}><CheckCircle size={11}/>С решения</span>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 10px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {material.description}
                  </p>
                  <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--text-muted)', marginBottom:10, borderTop:'1px solid var(--border-light)', paddingTop:8 }}>
                    {material.pages     ? <span style={{ display:'flex', alignItems:'center', gap:3 }}><FileText size={11}/>{material.pages} стр.</span> : null}
                    {material.exercises ? <span style={{ display:'flex', alignItems:'center', gap:3 }}><Brain size={11}/>{material.exercises} упр.</span> : null}
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Eye size={11}/>{material.views}</span>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Download size={11}/>{material.downloads}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button title={material.featured?'Премахни':'Препоряай'} onClick={() => toggleFeatured(material)}
                      style={{ background:material.featured?'#f59e0b20':'transparent', border:`1px solid ${material.featured?'#f59e0b':'var(--border-light)'}`, borderRadius:6, padding:'4px 10px', cursor:'pointer', color:material.featured?'#f59e0b':'var(--text-muted)', fontSize:12, display:'flex', alignItems:'center', gap:4 }}>
                      <Award size={13}/>{material.featured?'Препоряано':'Препоряай'}
                    </button>
                    <button className={styles.iconBtn} onClick={() => openEdit(material)} title="Редактирай"><Edit size={14}/></button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(material.id!, material.title)} title="Изтрий"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <StudyMaterialFormModal
          mode={modalMode}
          initialData={editData}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default StudyMaterialsTab;