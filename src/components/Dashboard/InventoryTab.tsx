// src/components/Dashboard/InventoryTab.tsx
import React, { useState } from 'react';
import {
  Clipboard, Plus, Edit, Trash2, Calendar, User,
  Target, CheckCircle, Activity, X, Search,
  BookOpen, AlertTriangle,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface InventoryAudit {
  id:            string;
  date:          string;
  auditor:       string;
  section:       string;
  totalBooks:    number;
  countedBooks:  number;
  discrepancies: number;
  status:        'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes:         string;
  createdAt:     FSDate;   
  updatedAt?:    FSDate;   
}

interface InventoryTabProps {
  audits:         InventoryAudit[];
  onEdit:         (audit: InventoryAudit) => void;
  onDelete:       (auditId: string) => void;
  onAdd:          () => void;
  onStatusChange: (auditId: string, status: InventoryAudit['status']) => void;
}

// ── Inventory statuses config ─────────────────────────────────────────────────

const STATUSES = [
  { value:'planned',     label:'Планирана', color:'#3b82f6', icon:<Calendar size={14}/> },
  { value:'in_progress', label:'В ход',     color:'#f59e0b', icon:<Activity size={14}/> },
  { value:'completed',   label:'Завършена', color:'#10b981', icon:<CheckCircle size={14}/> },
  { value:'cancelled',   label:'Отменена',  color:'#ef4444', icon:<X size={14}/> },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

const InventoryTab: React.FC<InventoryTabProps> = ({
  audits, onEdit, onDelete, onAdd, onStatusChange,
}) => {
  const [filter,     setFilter]     = useState<'all'|'planned'|'in_progress'|'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getNextStatus = (current: string): InventoryAudit['status'] | null => {
    if (current === 'planned')     return 'in_progress';
    if (current === 'in_progress') return 'completed';
    return null;
  };

  const filtered = audits
    .filter(a => filter === 'all' || a.status === filter)
    .filter(a =>
      a.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.auditor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('bg-BG', { day:'numeric', month:'long', year:'numeric' });

  const getStatusStyle = (status: string) => {
    const s = STATUSES.find(st => st.value === status);
    return {
      backgroundColor: `${s?.color}20`,
      color:            s?.color,
      border:          `1px solid ${s?.color}40`,
    };
  };

  const calcAccuracy = (a: InventoryAudit) =>
    a.totalBooks === 0
      ? '100.0'
      : ((a.countedBooks - a.discrepancies) / a.totalBooks * 100).toFixed(1);

  const stats = {
    total:             audits.length,
    planned:           audits.filter(a => a.status === 'planned').length,
    inProgress:        audits.filter(a => a.status === 'in_progress').length,
    completed:         audits.filter(a => a.status === 'completed').length,
    totalDiscrepancies:audits.reduce((s, a) => s + a.discrepancies, 0),
    totalCounted:      audits.reduce((s, a) => s + a.countedBooks, 0),
  };

  if (audits.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <h2>Инвентаризация</h2>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова инвентаризация</button>
        </div>
        <div className={styles.emptyState}>
          <Clipboard size={48}/>
          <h3>Няма инвентаризации</h3>
          <p>Все още няма планирани инвентаризации</p>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Планирай първата</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div className={styles.headerLeft}>
          <h2>Инвентаризация</h2>
          <div className={styles.statsBadges}>
            <span className={styles.statBadge}><Clipboard size={14}/>{stats.total} общо</span>
            <span className={styles.statBadge} style={{background:'#dbeafe',color:'#1e40af'}}><Calendar size={14}/>{stats.planned} планирани</span>
            <span className={styles.statBadge} style={{background:'#fef3c7',color:'#92400e'}}><Activity size={14}/>{stats.inProgress} в ход</span>
            <span className={styles.statBadge} style={{background:'#d1fae5',color:'#065f46'}}><CheckCircle size={14}/>{stats.completed} завършени</span>
          </div>
        </div>
        <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова инвентаризация</button>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <Search size={16}/>
          <input type="text" placeholder="Търси по секция, извършител..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className={styles.filterButtons}>
          {(['all','planned','in_progress','completed'] as const).map(f => (
            <button key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'Всички' : f === 'planned' ? 'Планирани' : f === 'in_progress' ? 'В ход' : 'Завършени'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.inventoryTable}>
          <thead>
            <tr>
              <th>Дата</th><th>Секция</th><th>Извършител</th>
              <th>Преброени</th><th>Разминавания</th><th>Точност</th>
              <th>Статус</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(audit => {
              const acc        = calcAccuracy(audit);
              const nextStatus = getNextStatus(audit.status);
              const accNum     = parseFloat(acc);

              return (
                <tr key={audit.id}>
                  <td><div className={styles.dateCell}><Calendar size={14}/>{formatDate(audit.date)}</div></td>
                  <td><div className={styles.sectionCell}><BookOpen size={14}/><strong>{audit.section}</strong></div></td>
                  <td><div className={styles.auditorCell}><User size={14}/>{audit.auditor}</div></td>
                  <td>
                    <div className={styles.countsCell}>
                      <span className={styles.counted}>{audit.countedBooks}</span>
                      <span className={styles.separator}>/</span>
                      <span className={styles.total}>{audit.totalBooks}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.discrepancyCell} ${audit.discrepancies > 0 ? styles.hasDiscrepancy : ''}`}>
                      {audit.discrepancies > 0
                        ? <><AlertTriangle size={14}/><span>{audit.discrepancies}</span></>
                        : <span className={styles.noDiscrepancy}>0</span>
                      }
                    </div>
                  </td>
                  <td>
                    <div className={`${styles.accuracyCell} ${
                      accNum >= 98 ? styles.highAccuracy :
                      accNum >= 95 ? styles.mediumAccuracy :
                      styles.lowAccuracy
                    }`}>
                      <Target size={14}/><span>{acc}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={getStatusStyle(audit.status)}>
                      {STATUSES.find(s => s.value === audit.status)?.icon}
                      {STATUSES.find(s => s.value === audit.status)?.label}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button onClick={() => onEdit(audit)} className={styles.editBtn} title="Редактирай"><Edit size={16}/></button>
                      {nextStatus && (
                        <button onClick={() => onStatusChange(audit.id, nextStatus)}
                          className={styles.nextStatusBtn}
                          title={`Промени на ${STATUSES.find(s=>s.value===nextStatus)?.label}`}>
                          <CheckCircle size={16}/>
                        </button>
                      )}
                      <button onClick={() => onDelete(audit.id)} className={styles.deleteBtn} title="Изтрий"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className={styles.inventorySummary}>
        {[
          { icon:<Clipboard size={24}/>, bg:'#dbeafe', col:'#1e40af', val:stats.totalCounted,        label:'Преброени книги' },
          { icon:<AlertTriangle size={24}/>, bg:'#fee2e2', col:'#991b1b', val:stats.totalDiscrepancies, label:'Разминавания' },
          {
            icon:<Target size={24}/>, bg:'#d1fae5', col:'#065f46',
            val: stats.totalCounted > 0
              ? `${((stats.totalCounted - stats.totalDiscrepancies) / stats.totalCounted * 100).toFixed(1)}%`
              : '100%',
            label:'Средна точност',
          },
        ].map(s => (
          <div key={s.label} className={styles.summaryCard}>
            <div className={styles.summaryIcon} style={{background:s.bg,color:s.col}}>{s.icon}</div>
            <div className={styles.summaryInfo}>
              <span className={styles.summaryValue}>{s.val}</span>
              <span className={styles.summaryLabel}>{s.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventoryTab;