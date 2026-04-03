// src/components/Dashboard/TasksTab.tsx
import React, { useState } from 'react';
import {
  Bell, CheckCircle, Clock, AlertTriangle, Edit, Trash2,
  Search, Calendar, User, BookOpen, Bookmark,
  Package, Wrench, ShoppingCart, FileText, Plus, X,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface LibrarianTask {
  id:             string;
  title:          string;
  description:    string;
  type:           'reservation'|'return'|'inventory'|'event'|'maintenance'|'ordering'|'cataloging';
  priority:       'low'|'medium'|'high'|'urgent';
  status:         'pending'|'in_progress'|'completed'|'overdue';
  assignedTo:     string;
  dueDate:        string;
  createdAt:      FSDate;   // was any
  bookId?:        string;
  eventId?:       string;
  reservationId?: string;
  orderId?:       string;
}

interface TasksTabProps {
  tasks:          LibrarianTask[];
  onEdit:         (task: LibrarianTask) => void;
  onDelete:       (taskId: string) => void;
  onAdd:          () => void;
  onStatusChange: (taskId: string, status: LibrarianTask['status']) => void;
}

// ── Config constants (outside component to avoid react-hooks/static-components) ─

const PRIORITY_COLORS: Record<string,string> = {
  urgent: '#dc2626', high: '#ef4444', medium: '#f59e0b', low: '#10b981',
};
const STATUS_COLORS: Record<string,string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', overdue: '#dc2626',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  reservation: <Bookmark size={14}/>, return: <BookOpen size={14}/>,
  inventory: <Package size={14}/>, event: <Calendar size={14}/>,
  maintenance: <Wrench size={14}/>, ordering: <ShoppingCart size={14}/>,
  cataloging: <FileText size={14}/>,
};
const TYPE_LABELS: Record<string,string> = {
  reservation:'Резервация', return:'Връщане', inventory:'Инвентаризация',
  event:'Събитие', maintenance:'Поддръжка', ordering:'Поръчка', cataloging:'Каталогизиране',
};
const PRIORITY_LABELS: Record<string,string> = {
  urgent:'Спешна', high:'Висока', medium:'Средна', low:'Ниска',
};
const STATUS_LABELS: Record<string,string> = {
  pending:'Чакаща', in_progress:'В прогрес', completed:'Завършена', overdue:'Закъсняла',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const normDay = (d: Date) => { d.setHours(0,0,0,0); return d; };

const isOverdue  = (due: string) => normDay(new Date(due)) < normDay(new Date());
const isToday    = (due: string) => normDay(new Date(due)).getTime() === normDay(new Date()).getTime();
const isUpcoming = (due: string) => {
  const diff = Math.ceil((normDay(new Date(due)).getTime() - normDay(new Date()).getTime()) / 86400000);
  return diff > 1 && diff <= 7;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const todayD = normDay(new Date());
  const tomorrowD = normDay(new Date()); tomorrowD.setDate(tomorrowD.getDate()+1);
  if (normDay(new Date(date)).getTime() === todayD.getTime()) return 'Днес';
  if (normDay(new Date(date)).getTime() === tomorrowD.getTime()) return 'Утре';
  return date.toLocaleDateString('bg-BG', { day:'numeric', month:'long' });
};

// ── Component ─────────────────────────────────────────────────────────────────

const TasksTab: React.FC<TasksTabProps> = ({
  tasks, onEdit, onDelete, onAdd, onStatusChange,
}) => {
  const [filter,     setFilter]     = useState<'all'|'pending'|'today'|'upcoming'|'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = tasks
    .filter(task => {
      if (filter === 'today')    return isToday(task.dueDate) && task.status !== 'completed';
      if (filter === 'upcoming') return isUpcoming(task.dueDate) && task.status !== 'completed';
      if (filter === 'overdue')  return isOverdue(task.dueDate) && task.status !== 'completed';
      if (filter === 'pending')  return task.status === 'pending' || task.status === 'in_progress';
      return true;
    })
    .filter(task => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return task.title.toLowerCase().includes(q) ||
             task.description?.toLowerCase().includes(q) ||
             task.assignedTo?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const po = { urgent:0, high:1, medium:2, low:3 };
      const diff = po[a.priority] - po[b.priority];
      return diff !== 0 ? diff : new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const stats = {
    total:    tasks.length,
    today:    tasks.filter(t => isToday(t.dueDate) && t.status !== 'completed').length,
    upcoming: tasks.filter(t => isUpcoming(t.dueDate) && t.status !== 'completed').length,
    overdue:  tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length,
    urgent:   tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
  };

  if (tasks.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <h2>Задачи</h2>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова задача</button>
        </div>
        <div className={styles.emptyState}>
          <CheckCircle size={48}/><h3>Няма задачи</h3>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Създай</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div className={styles.headerLeft}>
          <h2>Задачи</h2>
          <div className={styles.statsBadges}>
            <span className={styles.statBadge}><Bell size={14}/>{stats.total} общо</span>
            {stats.urgent>0&&<span className={styles.statBadge} style={{background:'#fee2e2',color:'#991b1b'}}><AlertTriangle size={14}/>{stats.urgent} спешни</span>}
            <span className={styles.statBadge} style={{background:'#fef3c7',color:'#92400e'}}><Clock size={14}/>{stats.today} за днес</span>
            <span className={styles.statBadge} style={{background:'#dbeafe',color:'#1e40af'}}><Calendar size={14}/>{stats.upcoming} предстоящи</span>
            {stats.overdue>0&&<span className={styles.statBadge} style={{background:'#fee2e2',color:'#991b1b'}}><AlertTriangle size={14}/>{stats.overdue} закъснели</span>}
          </div>
        </div>
        <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова задача</button>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <Search size={18}/>
          <input type="text" placeholder="Търси по заглавие, описание..."
            value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
          {searchTerm&&<button onClick={()=>setSearchTerm('')}><X size={14}/></button>}
        </div>
        <div className={styles.filterButtons}>
          {([
            ['all','Всички'],['today','Днес'],['upcoming','Предстоящи'],
            ['overdue','Закъснели'],['pending','Активни'],
          ] as const).map(([f,l])=>(
            <button key={f} className={`${styles.filterBtn} ${filter===f?styles.active:''}`}
              onClick={()=>setFilter(f)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Task list */}
      <div className={styles.tasksList}>
        {filtered.map(task => {
          const overdue  = isOverdue(task.dueDate) && task.status !== 'completed';
          const todayTask = isToday(task.dueDate);

          return (
            <div key={task.id}
              className={`${styles.taskItem} ${overdue?styles.overdueTask:''} ${todayTask?styles.todayTask:''}`}>
              <div className={styles.taskInfo}>
                <div className={styles.taskHeader}>
                  <div className={styles.taskType}>{TYPE_ICONS[task.type]}<span>{TYPE_LABELS[task.type]}</span></div>
                  <div className={styles.taskPriority}
                    style={{backgroundColor:`${PRIORITY_COLORS[task.priority]}20`,color:PRIORITY_COLORS[task.priority]}}>
                    {PRIORITY_LABELS[task.priority]}
                  </div>
                </div>
                <div className={styles.taskTitle}>
                  <h4>{task.title}</h4>
                  {overdue&&<span className={styles.overdueBadge}>Закъсняла</span>}
                  {todayTask&&!overdue&&task.status!=='completed'&&<span className={styles.todayBadge}>Днес</span>}
                </div>
                {task.description&&<p className={styles.taskDescription}>{task.description}</p>}
                <div className={styles.taskFooter}>
                  <div className={styles.taskDueDate}><Clock size={14}/><span>Краен срок: {formatDate(task.dueDate)}</span></div>
                  {task.assignedTo&&<div className={styles.taskAssigned}><User size={14}/><span>{task.assignedTo}</span></div>}
                  <div className={styles.taskStatus}
                    style={{backgroundColor:`${STATUS_COLORS[task.status]}20`,color:STATUS_COLORS[task.status]}}>
                    {STATUS_LABELS[task.status]}
                  </div>
                </div>
              </div>

              <div className={styles.taskActions}>
                {task.status!=='completed'&&(
                  <>
                    {task.status==='pending'&&<button onClick={()=>onStatusChange(task.id,'in_progress')} className={styles.startTaskBtn} title="Започни"><Clock size={16}/></button>}
                    {task.status==='in_progress'&&<button onClick={()=>onStatusChange(task.id,'completed')} className={styles.completeTaskBtn} title="Завърши"><CheckCircle size={16}/></button>}
                  </>
                )}
                <button onClick={()=>onEdit(task)} className={styles.editTaskBtn} title="Редактирай"><Edit size={16}/></button>
                <button onClick={()=>onDelete(task.id)} className={styles.deleteTaskBtn} title="Изтрий"><Trash2 size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length===0&&(
        <div className={styles.emptyState}>
          <CheckCircle size={32}/><p>Няма задачи за този период</p>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Създай задача</button>
        </div>
      )}
    </div>
  );
};

export default TasksTab;