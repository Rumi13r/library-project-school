// src/components/Dashboard/AIAnalysisTab.tsx
import React, { useState } from 'react';
import {
  Zap, Loader2, X, TrendingUp, Users, Book,
  Calendar, Star, RefreshCw, BarChart3,
  Target, MessageSquare, Lightbulb, AlertTriangle,
  Download, CheckCircle, Globe, GraduationCap, BookOpen,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';
import { groqService } from '../../services/groqService';
import type { GroqRecommendation } from '../../services/groqService';
import type { BookLibrary } from '../../lib/services/bookTypes';

type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface LibraryEvent {
  id: string; title: string; date: string; time: string; endTime: string;
  location: string; maxParticipants: number; currentParticipants: number;
  organizer: string; description?: string; imageUrl?: string;
}

interface LibraryReservation {
  id: string;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired' | 'completed';
  bookId?: string; userId?: string;
  reservedAt?: FSDate; expiresAt?: FSDate;
}

interface BookOrder {
  id: string; status: 'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  title: string; copies: number; price: number;
}

// Generic shapes for the extra collections
interface OnlineBook {
  id?: string; title: string; author: string; format?: string;
  category?: string; views?: number; downloads?: number;
  rating?: number; featured?: boolean; language?: string;
}

interface AIResource {
  id?: string; title: string; type?: string; subject?: string;
  targetGroup?: string; url?: string; featured?: boolean;
}

interface EducationalMaterial {
  id?: string; title: string; subject?: string; grade?: string;
  type?: string; author?: string; downloads?: number;
}

interface AIAnalysisTabProps {
  books:                  BookLibrary[];
  events:                 LibraryEvent[];
  reservations:           LibraryReservation[];
  tasks?:                 unknown[];
  bookOrders?:            BookOrder[];
  onlineBooks?:           OnlineBook[];
  aiResources?:           AIResource[];
  educationalMaterials?:  EducationalMaterial[];
  onClose?:               () => void;
}

const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({
  books,
  events,
  reservations,
  bookOrders = [],
  onlineBooks = [],
  aiResources = [],
  educationalMaterials = [],
  onClose,
}) => {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'books' | 'events' | 'digital' | 'recommendations'>('overview');
  const [analysis, setAnalysis] = useState<{
    overview: string; books: string; events: string; digital: string;
    recommendations: GroqRecommendation[];
    insights: string[]; trends: string[];
  }>({ overview: '', books: '', events: '', digital: '', recommendations: [], insights: [], trends: [] });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    totalBooks:              books.length,
    upcomingEvents:          events.filter(e => new Date(e.date) >= new Date()).length,
    activeReservations:      reservations.filter(r => r.status === 'active').length,
    completedReservations:   reservations.filter(r => r.status === 'completed' || r.status === 'fulfilled').length,
    lowStockBooks:           books.filter(b => b.availableCopies <= 2).length,
    totalViews:              books.reduce((s, b) => s + (b.views || 0), 0),
    avgRating:               (books.reduce((s, b) => s + (b.rating || 0), 0) / (books.length || 1)).toFixed(1),
    pendingOrders:           bookOrders.filter(o => o.status === 'pending').length,
    // Digital collections
    totalOnlineBooks:        onlineBooks.length,
    featuredOnlineBooks:     onlineBooks.filter(b => b.featured).length,
    totalOnlineViews:        onlineBooks.reduce((s, b) => s + (b.views || 0), 0),
    totalAIResources:        aiResources.length,
    featuredAIResources:     aiResources.filter(r => r.featured).length,
    totalEduMaterials:       educationalMaterials.length,
    totalEduDownloads:       educationalMaterials.reduce((s, m) => s + (m.downloads || 0), 0),
  };

  // ── Insights ───────────────────────────────────────────────────────────────
  const generateInsights = (): string[] => {
    const out: string[] = [];

    if (stats.lowStockBooks > 0)
      out.push(`📚 ${stats.lowStockBooks} физически книги са с нисък запас`);

    const top = [...books].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    if (top) out.push(`👑 Най-преглеждана: „${top.title}" — ${top.views || 0} прегледа`);

    const waited = [...books].sort((a, b) => (b.reservationQueue || 0) - (a.reservationQueue || 0))[0];
    if (waited && (waited.reservationQueue || 0) > 0)
      out.push(`⏳ Най-чакана: „${waited.title}" — ${waited.reservationQueue} в опашка`);

    if (stats.activeReservations > 5)
      out.push(`📋 ${stats.activeReservations} активни резервации за обработка`);

    if (stats.upcomingEvents > 0)
      out.push(`🎪 Предстоят ${stats.upcomingEvents} събити${stats.upcomingEvents === 1 ? 'е' : 'я'}`);

    const soon = [...events]
      .filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (soon) {
      const days = Math.ceil((new Date(soon.date).getTime() - Date.now()) / 86_400_000);
      out.push(`📅 Следващо: „${soon.title}" след ${days} ${days === 1 ? 'ден' : 'дни'}`);
    }

    // Online books
    if (stats.totalOnlineBooks > 0)
      out.push(`🌐 ${stats.totalOnlineBooks} онлайн книги (${stats.featuredOnlineBooks} препоръчани)`);

    // AI resources
    if (stats.totalAIResources > 0)
      out.push(`🤖 ${stats.totalAIResources} ИИ ресурса за учители`);

    // Educational materials
    if (stats.totalEduMaterials > 0)
      out.push(`🎓 ${stats.totalEduMaterials} учебни помагала (${stats.totalEduDownloads} изтегляния)`);

    return out;
  };

  // ── Trends ────────────────────────────────────────────────────────────────
  const generateTrends = (): string[] => {
    const out: string[] = [];

    const topRated = books.filter(b => (b.rating || 0) >= 4.5);
    if (topRated.length > 0) out.push(`⭐ ${topRated.length} физически книги с рейтинг ≥ 4.5`);

    const cats = books.reduce<Record<string, number>>((acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1; return acc;
    }, {});
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
    if (topCat) out.push(`📖 Топ категория (физически): „${topCat[0]}" (${topCat[1]} книги)`);

    const borrowed = reservations.filter(r => r.status === 'completed' || r.status === 'fulfilled').length;
    if (borrowed > 0) out.push(`📊 Общо завършени заемания: ${borrowed}`);

    // Online books format trends
    if (onlineBooks.length > 0) {
      const fmts = onlineBooks.reduce<Record<string, number>>((acc, b) => {
        if (b.format) acc[b.format] = (acc[b.format] || 0) + 1; return acc;
      }, {});
      const topFmt = Object.entries(fmts).sort((a, b) => b[1] - a[1])[0];
      if (topFmt) out.push(`💾 Онлайн: преобладаващ формат „${topFmt[0]}" (${topFmt[1]} книги)`);

      const topOnline = [...onlineBooks].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
      if (topOnline && (topOnline.views || 0) > 0)
        out.push(`🌟 Най-четена онлайн: „${topOnline.title}" — ${topOnline.views} прегледа`);
    }

    // AI resources subject trends
    if (aiResources.length > 0) {
      const subjects = aiResources.reduce<Record<string, number>>((acc, r) => {
        if (r.subject) acc[r.subject] = (acc[r.subject] || 0) + 1; return acc;
      }, {});
      const topSubj = Object.entries(subjects).sort((a, b) => b[1] - a[1])[0];
      if (topSubj) out.push(`🤖 ИИ ресурси: топ предмет „${topSubj[0]}" (${topSubj[1]} ресурса)`);
    }

    // Educational materials
    if (educationalMaterials.length > 0) {
      const grades = educationalMaterials.reduce<Record<string, number>>((acc, m) => {
        if (m.grade) acc[m.grade] = (acc[m.grade] || 0) + 1; return acc;
      }, {});
      const topGrade = Object.entries(grades).sort((a, b) => b[1] - a[1])[0];
      if (topGrade) out.push(`🎓 Учебни помагала: най-много за ${topGrade[0]} клас (${topGrade[1]})`);
    }

    return out;
  };

  // ── Load analysis ──────────────────────────────────────────────────────────
  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const extendedStats = {
        ...stats,
        onlineBooksCount:         onlineBooks.length,
        aiResourcesCount:         aiResources.length,
        educationalMaterialsCount: educationalMaterials.length,
      };

      const [overviewAnalysis, booksAnalysis, eventsAnalysis, recommendations] = await Promise.all([
        groqService.getLibrarianInsights({
          books,
          events,
          reservations,
          userStats: extendedStats,
        }),
        groqService.analyzePopularBooks(books),
        groqService.analyzeEvents(events),
        groqService.getOrderRecommendations(books),
      ]);

      // Build digital resources summary for display
      const digitalSummary = buildDigitalSummary();

      setAnalysis({
        overview:         overviewAnalysis,
        books:            booksAnalysis,
        events:           eventsAnalysis,
        digital:          digitalSummary,
        recommendations,
        insights:         generateInsights(),
        trends:           generateTrends(),
      });
    } catch (e) {
      console.error('Грешка при AI анализ:', e);
      setError('Възникна грешка при анализа. Моля, опитайте отново.');
    } finally {
      setLoading(false);
    }
  };

  // ── Digital summary (local, no API call needed) ───────────────────────────
  const buildDigitalSummary = (): string => {
    const lines: string[] = [];

    lines.push('## Онлайн Книги');
    if (onlineBooks.length === 0) {
      lines.push('Все още няма добавени онлайн книги.');
    } else {
      lines.push(`Общо: ${onlineBooks.length} онлайн книги`);
      lines.push(`Препоръчани: ${onlineBooks.filter(b => b.featured).length}`);
      lines.push(`Общо прегледи: ${onlineBooks.reduce((s, b) => s + (b.views || 0), 0)}`);
      lines.push(`Общо изтегляния: ${onlineBooks.reduce((s, b) => s + (b.downloads || 0), 0)}`);

      const formats = onlineBooks.reduce<Record<string, number>>((acc, b) => {
        if (b.format) acc[b.format] = (acc[b.format] || 0) + 1; return acc;
      }, {});
      const fmtStr = Object.entries(formats).map(([f, n]) => `${f}: ${n}`).join(', ');
      if (fmtStr) lines.push(`Формати: ${fmtStr}`);
    }

    lines.push('');
    lines.push('## ИИ Ресурси за Учители');
    if (aiResources.length === 0) {
      lines.push('Все още няма добавени ИИ ресурси.');
    } else {
      lines.push(`Общо: ${aiResources.length} ресурса`);
      lines.push(`Препоръчани: ${aiResources.filter(r => r.featured).length}`);
      const types = aiResources.reduce<Record<string, number>>((acc, r) => {
        if (r.type) acc[r.type] = (acc[r.type] || 0) + 1; return acc;
      }, {});
      const typStr = Object.entries(types).map(([t, n]) => `${t}: ${n}`).join(', ');
      if (typStr) lines.push(`Видове: ${typStr}`);
      const subjects = [...new Set(aiResources.map(r => r.subject).filter(Boolean))];
      if (subjects.length > 0) lines.push(`Предмети: ${subjects.slice(0, 5).join(', ')}${subjects.length > 5 ? '…' : ''}`);
    }

    lines.push('');
    lines.push('## Учебни Помагала');
    if (educationalMaterials.length === 0) {
      lines.push('Все още няма добавени учебни помагала.');
    } else {
      lines.push(`Общо: ${educationalMaterials.length} помагала`);
      lines.push(`Общо изтегляния: ${educationalMaterials.reduce((s, m) => s + (m.downloads || 0), 0)}`);
      const grades = [...new Set(educationalMaterials.map(m => m.grade).filter(Boolean))].sort();
      if (grades.length > 0) lines.push(`Класове: ${grades.join(', ')}`);
      const subjects = [...new Set(educationalMaterials.map(m => m.subject).filter(Boolean))];
      if (subjects.length > 0) lines.push(`Предмети: ${subjects.slice(0, 6).join(', ')}${subjects.length > 6 ? '…' : ''}`);
    }

    return lines.join('\n');
  };

  // ── Format markdown ────────────────────────────────────────────────────────
  const formatMarkdown = (text: string) =>
    text.split('\n').map((line, i) => {
      if (line.startsWith('## '))  return <h5 key={i} className={styles.markdownH5}>{line.slice(3)}</h5>;
      if (line.startsWith('# '))   return <h4 key={i} className={styles.markdownH4}>{line.slice(2)}</h4>;
      if (line.startsWith('- ') || line.startsWith('* '))
        return <li key={i} className={styles.markdownLi}>{line.slice(2)}</li>;
      if (/^\d+\./.test(line))     return <li key={i} className={styles.markdownLi}>{line}</li>;
      if (line.trim() === '')      return <br key={i} />;
      return <p key={i} className={styles.markdownP}>{line}</p>;
    });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.tabContent}>

      {/* Tab header */}
      <div className={styles.tabHeader}>
        <h2><Zap size={20} />AI Анализ на библиотеката</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={loadAnalysis} className={styles.primaryBtn} disabled={loading}>
            {loading
              ? <><Loader2 size={16} className={styles.spin} />Анализирам...</>
              : <><RefreshCw size={16} />Анализирай</>}
          </button>
          {onClose && (
            <button onClick={onClose} className={styles.deleteBtn} title="Затвори">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className={styles.statsGrid} style={{ marginBottom: '1.5rem' }}>
        {[
          { icon: <Book size={20} />,            label: 'Физ. книги',    value: stats.totalBooks,            color: '#3b82f6' },
          { icon: <Globe size={20} />,           label: 'Онлайн книги', value: stats.totalOnlineBooks,       color: '#0ea5e9' },
          { icon: <Calendar size={20} />,        label: 'Предстоящи',   value: stats.upcomingEvents,         color: '#10b981' },
          { icon: <Users size={20} />,           label: 'Резервации',   value: stats.activeReservations,     color: '#8b5cf6' },
          { icon: <Star size={20} />,            label: 'Ср. рейтинг',  value: stats.avgRating,              color: '#f59e0b' },
          { icon: <AlertTriangle size={20} />,   label: 'Нисък запас',  value: stats.lowStockBooks,          color: '#ef4444' },
          { icon: <GraduationCap size={20} />,   label: 'ИИ ресурси',   value: stats.totalAIResources,       color: '#7c3aed' },
          { icon: <BookOpen size={20} />,        label: 'Помагала',     value: stats.totalEduMaterials,      color: '#059669' },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon} style={{ color: s.color }}>{s.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statNumber}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={48} />
          <p>AI анализира данните на библиотеката…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className={styles.emptyState}>
          <AlertTriangle size={48} style={{ color: '#ef4444' }} />
          <p style={{ color: '#ef4444' }}>{error}</p>
          <button onClick={loadAnalysis} className={styles.primaryBtn} style={{ marginTop: '1rem' }}>
            <RefreshCw size={16} />Опитай отново
          </button>
        </div>
      )}

      {/* Initial prompt */}
      {!loading && !error && !analysis.overview && (
        <div className={styles.emptyState}>
          <Zap size={48} style={{ color: '#f59e0b' }} />
          <p style={{ fontWeight: 600 }}>Натиснете „Анализирай" за интелигентни прозрения от AI</p>
          <p style={{ fontSize: '0.85rem', opacity: 0.65, marginTop: -8 }}>
            Анализира физически книги, онлайн библиотека, ИИ ресурси и учебни помагала
          </p>
          <button onClick={loadAnalysis} className={styles.primaryBtn} style={{ marginTop: '0.75rem' }}>
            <Zap size={16} />Стартирай AI анализ
          </button>
        </div>
      )}

      {/* Full analysis */}
      {!loading && !error && analysis.overview && (
        <>
          {/* Insights + Trends */}
          {(analysis.insights.length > 0 || analysis.trends.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: '1.5rem' }}>
              {analysis.insights.length > 0 && (
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <MessageSquare size={18} /><h3>Ключови инсайти</h3>
                  </div>
                  {analysis.insights.map((ins, i) => (
                    <div key={i} className={styles.listItem}>
                      <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                      <div className={styles.listItemContent}>
                        <p className={styles.listItemTitle}>{ins}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {analysis.trends.length > 0 && (
                <div className={styles.homeCard}>
                  <div className={styles.homeCardHeader}>
                    <TrendingUp size={18} /><h3>Тенденции</h3>
                  </div>
                  {analysis.trends.map((t, i) => (
                    <div key={i} className={styles.listItem}>
                      <TrendingUp size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                      <div className={styles.listItemContent}>
                        <p className={styles.listItemTitle}>{t}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section tabs */}
          <div className={styles.filterRow} style={{ marginBottom: '1.25rem' }}>
            {([
              { id: 'overview',         label: 'Общ преглед',    icon: <BarChart3 size={15} /> },
              { id: 'books',            label: 'Книги',          icon: <Book size={15} /> },
              { id: 'events',           label: 'Събития',        icon: <Calendar size={15} /> },
              { id: 'digital',          label: 'Дигитални',      icon: <Globe size={15} /> },
              { id: 'recommendations',  label: 'Препоръки',      icon: <Lightbulb size={15} /> },
            ] as const).map(t => (
              <button
                key={t.id}
                className={`${styles.filterBtn} ${activeSection === t.id ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveSection(t.id)}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Content card */}
          <div className={styles.groqCard}>
            {activeSection === 'overview' && (
              <>
                <h4>📊 Общ анализ</h4>
                <div className={styles.aiMarkdownBody}>{formatMarkdown(analysis.overview)}</div>
              </>
            )}
            {activeSection === 'books' && (
              <>
                <h4>📚 Анализ на физическите книги</h4>
                <div className={styles.aiMarkdownBody}>{formatMarkdown(analysis.books)}</div>
              </>
            )}
            {activeSection === 'events' && (
              <>
                <h4>📅 Анализ на събитията</h4>
                <div className={styles.aiMarkdownBody}>{formatMarkdown(analysis.events)}</div>
              </>
            )}
            {activeSection === 'digital' && (
              <>
                <h4>🌐 Дигитални ресурси</h4>
                <div className={styles.aiMarkdownBody}>{formatMarkdown(analysis.digital)}</div>
              </>
            )}
            {activeSection === 'recommendations' && (
              <>
                <h4>🛒 Препоръки за поръчки</h4>
                {analysis.recommendations.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {analysis.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className={styles.groqRec}
                        style={{
                          borderLeft: `4px solid ${rec.priority === 'high' ? '#ef4444' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'}`,
                          paddingLeft: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{rec.title}</strong>
                          <span style={{
                            padding: '2px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700,
                            background: rec.priority === 'high' ? 'rgba(239,68,68,.12)' : rec.priority === 'medium' ? 'rgba(245,158,11,.12)' : 'rgba(16,185,129,.12)',
                            color: rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#d97706' : '#059669',
                            border: `1px solid ${rec.priority === 'high' ? 'rgba(239,68,68,.25)' : rec.priority === 'medium' ? 'rgba(245,158,11,.25)' : 'rgba(16,185,129,.25)'}`,
                          }}>
                            {rec.priority === 'high' ? 'Висок' : rec.priority === 'medium' ? 'Среден' : 'Нисък'} приоритет
                          </span>
                        </div>
                        <p style={{ fontSize: '.875rem', color: 'var(--text-secondary)', margin: '0 0 6px' }}>{rec.reason}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.8rem', color: 'var(--primary)' }}>
                          <Target size={13} />{rec.action}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '.875rem', marginTop: 8 }}>Няма препоръки в момента.</p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 8 }}>
            <button className={styles.exportBtn} onClick={() => alert('Функцията за експорт се разработва')}>
              <Download size={16} />Експортирай анализа
            </button>
            <span style={{ fontSize: '.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={13} />Генерира се от Groq AI
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAnalysisTab;