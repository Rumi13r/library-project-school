// src/components/Dashboard/OnlineBooksTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebase';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import {
  Book, Plus, Edit, Trash2, Eye, Download,
  Award, ExternalLink, Search, Globe, FileText,
  Headphones, Video, TrendingUp, Star, Tag, X,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';
import OnlineBooksForm from './OnlineBooksForm';
import type { OnlineBookFormData } from './OnlineBooksForm';


// ── Types ─────────────────────────────────────────────────────────────────────
interface OnlineBook {
  id?: string;
  title: string;
  author: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  language: string;
  format: string;
  url: string;
  thumbnailUrl: string;
  fileSize?: string;
  duration?: string;
  pages?: number;
  rating: number;
  ratingsCount: number;
  views: number;
  downloads: number;
  featured: boolean;
  year?: number | '';
  publisher?: string;
  isbn?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  ageGroup?: string;
  license?: string;
  additionalLinks?: { title: string; url: string; type: string }[];
}

const FORMATS = ['PDF', 'EPUB', 'MOBI', 'AUDIO', 'VIDEO'];

// ── Icon helpers ──────────────────────────────────────────────────────────────
const FormatIcon: React.FC<{ format: string }> = ({ format }) => {
  const icons: Record<string, React.ReactNode> = {
    PDF: <FileText size={14}/>, EPUB: <Book size={14}/>, MOBI: <Book size={14}/>,
    AUDIO: <Headphones size={14}/>, VIDEO: <Video size={14}/>,
  };
  return <>{icons[format] ?? <FileText size={14}/>}</>;
};

const formatColor = (f: string) =>
  ({ PDF:'#ef4444', EPUB:'#3b82f6', MOBI:'#8b5cf6', AUDIO:'#10b981', VIDEO:'#f59e0b' }[f] ?? '#6b7280');

const diffLabel = (d?: string) =>
  ({ beginner:'Начинаещ', intermediate:'Напреднал', advanced:'Експерт' }[d ?? ''] ?? '—');

// ─────────────────────────────────────────────────────────────────────────────
const OnlineBooksTab: React.FC = () => {
  const [onlineBooks, setOnlineBooks] = useState<OnlineBook[]>([]);
  const [filtered,    setFiltered]    = useState<OnlineBook[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [formatF,     setFormatF]     = useState('all');
  const [showModal,   setShowModal]   = useState(false);
  const [modalMode,   setModalMode]   = useState<'create'|'edit'>('create');
  const [editData,    setEditData]    = useState<Partial<OnlineBook>>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const snap = await getDocs(query(collection(db,'onlineBooks'), orderBy('createdAt','desc')));
      setOnlineBooks(snap.docs.map(d => ({ id:d.id, ...d.data() } as OnlineBook)));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  useEffect(() => {
    let f = [...onlineBooks];
    if (searchTerm) f = f.filter(b =>
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.author.toLowerCase().includes(searchTerm.toLowerCase()));
    if (formatF !== 'all') f = f.filter(b => b.format === formatF);
    setFiltered(f);
  }, [onlineBooks, searchTerm, formatF]);

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditData({}); setModalMode('create'); setShowModal(true); };
  const openEdit   = (book: OnlineBook) => { setEditData(book); setModalMode('edit'); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  // ── Save (FIXED: proper destructuring) ────────────────────────────────────
  const handleSave = async (data: OnlineBookFormData) => {
    const tags = data.tags.split(',').map(t => t.trim()).filter(Boolean);
    const payload: Omit<OnlineBook,'id'> = {
      title: data.title, author: data.author, description: data.description,
      category: data.category, subcategory: data.subcategory, tags,
      language: data.language, format: data.format, url: data.url,
      thumbnailUrl: data.thumbnailUrl, fileSize: data.fileSize, duration: data.duration,
      pages: data.pages, rating: data.rating, ratingsCount: data.ratingsCount,
      views: data.views, downloads: data.downloads, featured: data.featured,
      year: data.year, publisher: data.publisher, isbn: data.isbn,
      difficulty: data.difficulty, ageGroup: data.ageGroup, license: data.license,
      additionalLinks: data.additionalLinks,
    };

    if (modalMode === 'create') {
      await addDoc(collection(db,'onlineBooks'), { ...payload, createdAt:Timestamp.now(), updatedAt:Timestamp.now() });
    } else {
      if (!editData.id) return;
      await updateDoc(doc(db,'onlineBooks', editData.id), { ...payload, updatedAt:Timestamp.now() });
    }
    closeModal();
    fetchBooks();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Изтриване на "${title}"?`)) return;
    try { await deleteDoc(doc(db,'onlineBooks',id)); fetchBooks(); }
    catch(e) { console.error(e); alert('Грешка!'); }
  };

  const toggleFeatured = async (book: OnlineBook) => {
    if (!book.id) return;
    await updateDoc(doc(db,'onlineBooks',book.id), { featured:!book.featured });
    fetchBooks();
  };

  const inp = styles.modalFormInput;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <h2 style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Book size={20}/>Онлайн Библиотека ({filtered.length})
        </h2>
        <button className={styles.primaryBtn} onClick={openCreate}>
          <Plus size={16}/>Добави книга
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filterRow} style={{ flexWrap:'wrap', gap:8, marginBottom:16 }}>
        <div style={{ position:'relative', flex:'1 1 200px' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input type="text" placeholder="Търсене по заглавие или автор..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} className={inp} style={{ paddingLeft:32 }}/>
        </div>
        <select className={inp} style={{ flex:'0 0 160px' }} value={formatF} onChange={e => setFormatF(e.target.value)}>
          <option value="all">Всички формати</option>
          {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {(searchTerm||formatF!=='all') && (
          <button className={styles.secondaryBtn} onClick={() => { setSearchTerm(''); setFormatF('all'); }}>
            <X size={14}/>Изчисти
          </button>
        )}
      </div>

      {loading && <div className={styles.emptyState}><div className={styles.spinner}/><p>Зареждане...</p></div>}

      {!loading && filtered.length === 0 && (
        <div className={styles.emptyState}>
          <Book size={48}/><p>Няма намерени онлайн книги</p>
          <button className={styles.primaryBtn} onClick={openCreate} style={{ marginTop:12 }}>
            <Plus size={16}/>Добави първа книга
          </button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
          {filtered.map(book => (
            <div key={book.id} style={{
              background:'var(--bg-card)', border:`1px solid ${book.featured?'#f59e0b':'var(--border-light)'}`,
              borderRadius:12, overflow:'hidden', position:'relative',
              boxShadow:book.featured?'0 0 0 2px rgba(245,158,11,0.3)':'none',
              transition:'transform 0.2s',
            }}>
              {book.featured && (
                <div style={{ position:'absolute', top:10, right:10, zIndex:2, background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, boxShadow:'0 2px 8px rgba(245,158,11,0.4)' }}>
                  <Award size={12}/>Препоръчано
                </div>
              )}
              <div style={{ height:140, background:'var(--bg-section)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
                {book.thumbnailUrl
                  ? <img src={book.thumbnailUrl} alt={book.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}/>
                  : <Book size={48} style={{ color:'var(--text-muted)' }}/>}
              </div>
              <div style={{ padding:'12px 14px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', margin:0, lineHeight:1.3 }}>{book.title}</p>
                    <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'2px 0 0' }}>{book.author}</p>
                  </div>
                  <span style={{ background:formatColor(book.format)+'20', color:formatColor(book.format), border:`1px solid ${formatColor(book.format)}40`, padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
                    <FormatIcon format={book.format}/>{book.format}
                  </span>
                </div>
                <p style={{ fontSize:12, color:'var(--text-secondary)', margin:'0 0 8px', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                  {book.description}
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:10 }}>
                  {book.category  && <span style={{ background:'var(--bg-section)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Tag size={11}/>{book.category}</span>}
                  {book.difficulty && <span style={{ background:'var(--bg-section)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><TrendingUp size={11}/>{diffLabel(book.difficulty)}</span>}
                  {book.language  && <span style={{ background:'var(--bg-section)', color:'var(--text-secondary)', padding:'2px 8px', borderRadius:20, fontSize:11, display:'flex', alignItems:'center', gap:3 }}><Globe size={11}/>{book.language}</span>}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border-light)', paddingTop:10 }}>
                  <div style={{ display:'flex', gap:10, fontSize:11, color:'var(--text-muted)' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Star size={11} fill="#f59e0b" color="#f59e0b"/>{book.rating.toFixed(1)}</span>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Eye size={11}/>{book.views}</span>
                    <span style={{ display:'flex', alignItems:'center', gap:3 }}><Download size={11}/>{book.downloads}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button title={book.featured?'Премахни от препоръчани':'Препоряано'} onClick={() => toggleFeatured(book)}
                      style={{ background:book.featured?'#f59e0b20':'transparent', border:`1px solid ${book.featured?'#f59e0b':'var(--border-light)'}`, borderRadius:6, padding:'4px 8px', cursor:'pointer', color:book.featured?'#f59e0b':'var(--text-muted)' }}>
                      <Award size={14}/>
                    </button>
                    <a href={book.url} target="_blank" rel="noopener noreferrer"
                      style={{ background:'transparent', border:'1px solid var(--border-light)', borderRadius:6, padding:'4px 8px', color:'var(--text-secondary)', display:'flex', alignItems:'center' }}>
                      <ExternalLink size={14}/>
                    </a>
                    <button className={styles.iconBtn} onClick={() => openEdit(book)} title="Редактирай"><Edit size={14}/></button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(book.id!, book.title)} title="Изтрий"><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <OnlineBooksForm
          mode={modalMode}
          initialData={editData}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default OnlineBooksTab;