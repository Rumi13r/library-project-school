// src/components/Dashboard/BooksTab.tsx
import React, { useMemo } from 'react';
import {
  Book, Plus, Edit, Trash2, Star, Eye, Users,
  MapPin, Tag, Award, BookOpen, Copy,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';
import type { BookLibrary } from '../../lib/services/bookTypes';

interface BooksTabProps {
  books: BookLibrary[];
  searchTerm: string;
  onEdit: (book: BookLibrary) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const BooksTab: React.FC<BooksTabProps> = ({ books, searchTerm, onEdit, onDelete, onAdd }) => {
  const filteredBooks = useMemo(() => {
    if (!searchTerm.trim()) return books;
    const q = searchTerm.toLowerCase();
    return books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn ?? '').toLowerCase().includes(q) ||
      (b.category ?? '').toLowerCase().includes(q)
    );
  }, [books, searchTerm]);

  const renderStars = (rating: number) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={13}
          fill={s <= Math.round(rating) ? '#f59e0b' : 'none'}
          color={s <= Math.round(rating) ? '#f59e0b' : 'var(--admin-border)'}
        />
      ))}
      <span style={{ fontSize: 11, color: 'var(--admin-text-muted)', marginLeft: 3 }}>
        {(rating || 0).toFixed(1)}
      </span>
    </div>
  );

  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <h2><Book size={20} />Книги ({filteredBooks.length})</h2>
        <button className={styles.primaryBtn} onClick={onAdd}>
          <Plus size={16} />Добави книга
        </button>
      </div>

      {/* Empty state */}
      {filteredBooks.length === 0 && (
        <div className={styles.emptyState}>
          <BookOpen size={48} />
          <p>{searchTerm ? 'Не са намерени резултати за търсенето' : 'Няма добавени книги'}</p>
          {!searchTerm && (
            <button className={styles.primaryBtn} onClick={onAdd} style={{ marginTop: 12 }}>
              <Plus size={16} />Добави първа книга
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {filteredBooks.map(book => {
          // Fix: waiting count cannot be negative
          const waitingCount = Math.max(0, book.reservationQueue || 0);
          const stockColor = book.availableCopies > 2
            ? '#10b981'
            : book.availableCopies > 0
              ? '#f59e0b'
              : '#ef4444';

          return (
            <div
              key={book.id}
              style={{
                background: 'var(--admin-card-bg)',
                border: `1px solid ${book.featured ? '#f59e0b55' : 'var(--admin-border)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: book.featured ? '0 0 0 2px rgba(245,158,11,0.25)' : 'none',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  book.featured
                    ? '0 6px 20px rgba(245,158,11,0.3)'
                    : '0 4px 16px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.transform = 'none';
                (e.currentTarget as HTMLElement).style.boxShadow =
                  book.featured ? '0 0 0 2px rgba(245,158,11,0.25)' : 'none';
              }}
            >
              {/* ── Featured badge ─────────────────────────────────────────── */}
              {book.featured && (
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 3,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: '0 2px 10px rgba(245,158,11,0.55)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.02em',
                }}>
                  <Award size={11} />Препоръчана
                </div>
              )}

              {/* ── Cover image ─────────────────────────────────────────────── */}
              <div style={{
                height: 170,
                background: 'var(--admin-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
              }}>
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                    color: 'var(--admin-text-muted)',
                  }}>
                    <Book size={44} />
                    <span style={{ fontSize: 11 }}>Без корица</span>
                  </div>
                )}

                {/* Stock pill on cover */}
                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  background: stockColor + 'ee',
                  color: '#fff',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                }}>
                  {book.availableCopies}/{book.copies} налични
                </div>
              </div>

              {/* ── Card body ───────────────────────────────────────────────── */}
              <div style={{ padding: '12px 14px 14px' }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: 'var(--admin-text-primary)',
                  margin: '0 0 3px',
                  lineHeight: 1.35,
                  // Show full title on smaller cards
                  wordBreak: 'break-word',
                }}>
                  {book.title}
                </p>
                <p style={{
                  fontSize: 12,
                  color: 'var(--admin-text-secondary)',
                  margin: '0 0 10px',
                }}>
                  {book.author}
                </p>

                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {book.category && (
                    <span style={{
                      background: 'var(--admin-bg)',
                      color: 'var(--admin-text-secondary)',
                      border: '1px solid var(--admin-border)',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}>
                      <Tag size={10} />{book.category}
                    </span>
                  )}
                  {book.location && (
                    <span style={{
                      background: 'var(--admin-bg)',
                      color: 'var(--admin-text-secondary)',
                      border: '1px solid var(--admin-border)',
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}>
                      <MapPin size={10} />{book.location}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: 14,
                  fontSize: 11,
                  color: 'var(--admin-text-muted)',
                  padding: '8px 0',
                  borderTop: '1px solid var(--admin-border)',
                  borderBottom: '1px solid var(--admin-border)',
                  marginBottom: 8,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Copy size={11} />{book.copies || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Eye size={11} />{book.views || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    {/* Fix: no negatives */}
                    <Users size={11} />{waitingCount}
                  </span>
                </div>

                {/* Rating */}
                <div style={{ marginBottom: 8 }}>
                  {renderStars(book.rating || 0)}
                </div>

                {/* Genre tags */}
                {book.genres && book.genres.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {book.genres.slice(0, 3).map(g => (
                      <span key={g} style={{
                        background: 'rgba(59,130,246,0.12)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59,130,246,0.2)',
                        padding: '1px 7px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 600,
                      }}>
                        {g}
                      </span>
                    ))}
                    {book.genres.length > 3 && (
                      <span style={{
                        background: 'var(--admin-bg)',
                        color: 'var(--admin-text-muted)',
                        padding: '1px 7px',
                        borderRadius: 12,
                        fontSize: 10,
                        border: '1px solid var(--admin-border)',
                      }}>
                        +{book.genres.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={styles.iconBtn}
                    onClick={() => onEdit(book)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 8,
                    }}
                  >
                    <Edit size={14} />Редактирай
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDelete(book.id!)}
                    style={{ padding: '8px 14px', borderRadius: 8 }}
                    title="Изтрий"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BooksTab;