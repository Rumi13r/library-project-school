// src/components/Dashboard/OrdersTab.tsx
import React, { useState } from 'react';
import {
  ShoppingCart, Plus, Edit, Trash2, Hash, Clock,
  CheckCircle, DollarSign, Truck, Package, X,
  Search, Calendar,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface BookOrder {
  id:               string;
  title:            string;
  author:           string;
  isbn:             string;
  publisher:        string;
  year:             number;
  category:         string;
  copies:           number;
  supplier:         string;
  supplierContact:  string;
  price:            number;
  currency:         string;
  orderDate:        string;
  expectedDelivery: string;
  status:           'pending' | 'ordered' | 'shipped' | 'delivered' | 'cancelled';
  orderNumber:      string;
  notes:            string;
  createdBy:        string;
  createdAt:        FSDate;   // was any
  updatedAt:        FSDate;   // was any
}

interface OrdersTabProps {
  orders:         BookOrder[];
  onEdit:         (order: BookOrder) => void;
  onDelete:       (orderId: string) => void;
  onAdd:          () => void;
  onStatusChange: (orderId: string, status: BookOrder['status']) => void;
}

// ── Status config (defined outside component — no react-hooks/static-components warning) ─

const ORDER_STATUSES = [
  { value:'pending',   label:'Чакаща',   color:'#f59e0b', icon:<Clock size={14}/> },
  { value:'ordered',   label:'Поръчана', color:'#3b82f6', icon:<Package size={14}/> },
  { value:'shipped',   label:'Изпратена',color:'#8b5cf6', icon:<Truck size={14}/> },
  { value:'delivered', label:'Доставена',color:'#10b981', icon:<CheckCircle size={14}/> },
  { value:'cancelled', label:'Отменена', color:'#ef4444', icon:<X size={14}/> },
] as const;

const getNextStatus = (current: string): BookOrder['status'] | null => {
  if (current === 'pending')  return 'ordered';
  if (current === 'ordered')  return 'shipped';
  if (current === 'shipped')  return 'delivered';
  return null;
};

const getStatusStyle = (status: string) => {
  const s = ORDER_STATUSES.find(st => st.value === status);
  return { backgroundColor:`${s?.color}20`, color:s?.color, border:`1px solid ${s?.color}40` };
};

const formatDate = (d: string) => new Date(d).toLocaleDateString('bg-BG');

const formatCurrency = (amount: number, currency = 'BGN') =>
  new Intl.NumberFormat('bg-BG', { style:'currency', currency }).format(amount);

// ── Component ─────────────────────────────────────────────────────────────────

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders, onEdit, onDelete, onAdd, onStatusChange,
}) => {
  const [filter,     setFilter]     = useState<'all'|'pending'|'ordered'|'shipped'|'delivered'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = orders
    .filter(o => filter === 'all' || o.status === filter)
    .filter(o =>
      o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.isbn.includes(searchTerm) ||
      o.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  const stats = {
    total:      orders.length,
    pending:    orders.filter(o => o.status === 'pending').length,
    delivered:  orders.filter(o => o.status === 'delivered').length,
    totalValue: orders.reduce((s, o) => s + o.price * o.copies, 0),
  };

  if (orders.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <h2>Поръчки на книги</h2>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова поръчка</button>
        </div>
        <div className={styles.emptyState}>
          <ShoppingCart size={48}/><h3>Няма поръчки</h3>
          <p>Все още няма създадени поръчки за книги</p>
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
          <h2>Поръчки на книги</h2>
          <div className={styles.statsBadges}>
            <span className={styles.statBadge}><ShoppingCart size={14}/>{stats.total} общо</span>
            <span className={styles.statBadge} style={{background:'#fef3c7',color:'#92400e'}}><Clock size={14}/>{stats.pending} чакащи</span>
            <span className={styles.statBadge} style={{background:'#d1fae5',color:'#065f46'}}><DollarSign size={14}/>{formatCurrency(stats.totalValue)}</span>
          </div>
        </div>
        <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Нова поръчка</button>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <Search size={16}/>
          <input type="text" placeholder="Търси по заглавие, автор, ISBN, доставчик..."
            value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
        <div className={styles.filterButtons}>
          {(['all','pending','ordered','shipped','delivered'] as const).map(f=>(
            <button key={f}
              className={`${styles.filterBtn} ${filter===f?styles.active:''}`}
              onClick={()=>setFilter(f)}>
              {f==='all'?'Всички':f==='pending'?'Чакащи':f==='ordered'?'Поръчани':f==='shipped'?'Изпратени':'Доставени'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.ordersTable}>
          <thead><tr><th>Номер</th><th>Книга</th><th>Доставчик</th><th>Дата</th><th>Количество</th><th>Стойност</th><th>Статус</th><th>Действия</th></tr></thead>
          <tbody>
            {filtered.map(order => {
              const next = getNextStatus(order.status);
              return (
                <tr key={order.id}>
                  <td><div className={styles.orderNumber}><Hash size={12}/>{order.orderNumber}</div></td>
                  <td>
                    <div className={styles.bookInfo}>
                      <div className={styles.bookTitle}>{order.title}</div>
                      <div className={styles.bookAuthor}>{order.author}</div>
                      <div className={styles.bookIsbn}>ISBN: {order.isbn}</div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.supplierInfo}>
                      <div className={styles.supplierName}>{order.supplier}</div>
                      {order.supplierContact&&<div className={styles.supplierContact}>{order.supplierContact}</div>}
                    </div>
                  </td>
                  <td>
                    <div className={styles.dateInfo}>
                      <div>{formatDate(order.orderDate)}</div>
                      {order.expectedDelivery&&<div className={styles.expectedDate}><Calendar size={12}/><span>до {formatDate(order.expectedDelivery)}</span></div>}
                    </div>
                  </td>
                  <td><div className={styles.copiesBadge}>{order.copies} бр.</div></td>
                  <td>
                    <div className={styles.priceValue}>
                      {formatCurrency(order.price*order.copies,order.currency)}
                      <small>{order.price} {order.currency}/бр.</small>
                    </div>
                  </td>
                  <td>
                    <span className={styles.statusBadge} style={getStatusStyle(order.status)}>
                      {ORDER_STATUSES.find(s=>s.value===order.status)?.icon}
                      {ORDER_STATUSES.find(s=>s.value===order.status)?.label}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <button onClick={()=>onEdit(order)} className={styles.editBtn} title="Редактирай"><Edit size={16}/></button>
                      {next&&<button onClick={()=>onStatusChange(order.id,next)} className={styles.nextStatusBtn} title={`→ ${ORDER_STATUSES.find(s=>s.value===next)?.label}`}><CheckCircle size={16}/></button>}
                      <button onClick={()=>onDelete(order.id)} className={styles.deleteBtn} title="Изтрий"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className={styles.ordersFooter}>
        <div className={styles.footerStats}>
          <div><strong>Общо:</strong> {stats.total}</div>
          <div><strong>Чакащи:</strong> {stats.pending}</div>
          <div><strong>Доставени:</strong> {stats.delivered}</div>
          <div><strong>Стойност:</strong> {formatCurrency(stats.totalValue)}</div>
        </div>
      </div>
    </div>
  );
};

export default OrdersTab;