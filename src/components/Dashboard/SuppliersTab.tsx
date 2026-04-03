// src/components/Dashboard/SuppliersTab.tsx
import React, { useState } from 'react';
import {
  Truck, Plus, Edit, Trash2, Mail, Phone, Globe,
  MapPin, User, Star, Search, Award,
  Clock, DollarSign, MessageSquare, Filter, X,
} from 'lucide-react';
import styles from './LibrarianDashboard.module.css';

// Firestore date union type
type FSDate = { toDate?: () => Date; seconds?: number } | Date | string | null | undefined;

interface Supplier {
  id:             string;
  name:           string;
  contactPerson:  string;
  email:          string;
  phone:          string;
  website:        string;
  address:        string;
  rating:         number;
  deliveryTime:   string;
  paymentTerms:   string;
  notes:          string;
  createdAt?:     FSDate;   
  updatedAt?:     FSDate;   
}

interface SuppliersTabProps {
  suppliers: Supplier[];
  onEdit:    (supplier: Supplier) => void;
  onDelete:  (supplierId: string) => void;
  onAdd:     () => void;
}

const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers, onEdit, onDelete, onAdd,
}) => {
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const filtered = suppliers
    .filter(s => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(q) ||
        s.contactPerson.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.phone.includes(searchTerm);
      const matchRating = filterRating ? s.rating >= filterRating : true;
      return matchSearch && matchRating;
    })
    .sort((a, b) => b.rating - a.rating);

  const renderStars = (rating: number) => (
    <div className={styles.starsContainer}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={14}
          className={`${styles.starIcon} ${s<=rating?styles.starFilled:''}`}
          fill={s<=rating?'currentColor':'none'}/>
      ))}
      <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
    </div>
  );

  const stats = {
    total:     suppliers.length,
    avgRating: suppliers.length > 0
      ? (suppliers.reduce((s,x)=>s+x.rating,0)/suppliers.length).toFixed(1) : '0.0',
    topRated:  suppliers.filter(s=>s.rating>=4.5).length,
    withEmail: suppliers.filter(s=>s.email).length,
    withPhone: suppliers.filter(s=>s.phone).length,
  };

  if (suppliers.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.tabHeader}>
          <div className={styles.headerLeft}><h2>Доставчици</h2></div>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Добави доставчик</button>
        </div>
        <div className={styles.emptyState}>
          <Truck size={48}/><h3>Няма доставчици</h3>
          <p>Все още няма добавени доставчици.</p>
          <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Добави първия</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      {/* Header */}
      <div className={styles.tabHeader}>
        <div className={styles.headerLeft}>
          <h2>Доставчици</h2>
          <div className={styles.statsBadges}>
            <span className={styles.statBadge}><Truck size={14}/>{stats.total}</span>
            <span className={styles.statBadge} style={{background:'#fef3c7',color:'#92400e'}}><Star size={14}/>{stats.avgRating} ср. рейтинг</span>
            <span className={styles.statBadge} style={{background:'#d1fae5',color:'#065f46'}}><Award size={14}/>{stats.topRated} топ</span>
          </div>
        </div>
        <button onClick={onAdd} className={styles.primaryBtn}><Plus size={16}/> Добави доставчик</button>
      </div>

      {/* Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.searchBox}>
          <Search size={18}/>
          <input type="text" placeholder="Търси по име, контакт, имейл или телефон..."
            value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className={styles.searchInput}/>
          {searchTerm && <button className={styles.clearSearch} onClick={()=>setSearchTerm('')}><X size={14}/></button>}
        </div>
        <div className={styles.filterDropdown}>
          <button className={styles.filterBtn}><Filter size={16}/>Рейтинг</button>
          <div className={styles.dropdownContent}>
            {[null, 4.5, 4, 3.5].map(r=>(
              <button key={String(r)}
                className={`${styles.dropdownItem} ${filterRating===r?styles.active:''}`}
                onClick={()=>setFilterRating(r)}>
                {r===null?'Всички':`⭐ ${r}+ звезди`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mini stats */}
      <div className={styles.statsMiniGrid}>
        <div className={styles.statMiniCard}><Mail size={16}/><span>{stats.withEmail} с имейл</span></div>
        <div className={styles.statMiniCard}><Phone size={16}/><span>{stats.withPhone} с телефон</span></div>
      </div>

      {/* Grid */}
      <div className={styles.suppliersGrid}>
        {filtered.map(supplier => (
          <div key={supplier.id} className={styles.supplierCard}>
            <div className={styles.supplierHeader}>
              <div className={styles.supplierIcon}><Truck size={24}/></div>
              <div className={styles.supplierTitle}>
                <h3>{supplier.name}</h3>
                <div className={styles.contactPerson}><User size={14}/><span>{supplier.contactPerson}</span></div>
              </div>
              <div className={styles.supplierRating}>{renderStars(supplier.rating)}</div>
            </div>

            <div className={styles.supplierDetails}>
              {supplier.email&&<div className={styles.detailRow}><Mail size={14}/><a href={`mailto:${supplier.email}`} className={styles.emailLink}>{supplier.email}</a></div>}
              {supplier.phone&&<div className={styles.detailRow}><Phone size={14}/><a href={`tel:${supplier.phone}`} className={styles.phoneLink}>{supplier.phone}</a></div>}
              {supplier.website&&(
                <div className={styles.detailRow}>
                  <Globe size={14}/>
                  <a href={supplier.website.startsWith('http')?supplier.website:`https://${supplier.website}`}
                    target="_blank" rel="noopener noreferrer" className={styles.websiteLink}>
                    {supplier.website.replace(/^https?:\/\//,'')}
                  </a>
                </div>
              )}
              {supplier.address&&<div className={styles.detailRow}><MapPin size={14}/><span>{supplier.address}</span></div>}
            </div>

            <div className={styles.supplierMeta}>
              {supplier.deliveryTime&&<div className={styles.metaItem}><Clock size={14}/><span>Доставка: {supplier.deliveryTime}</span></div>}
              {supplier.paymentTerms&&<div className={styles.metaItem}><DollarSign size={14}/><span>Плащане: {supplier.paymentTerms}</span></div>}
            </div>

            {supplier.notes&&<div className={styles.supplierNotes}><MessageSquare size={14}/><p>{supplier.notes}</p></div>}

            <div className={styles.supplierActions}>
              <button onClick={()=>onEdit(supplier)} className={styles.editBtn}><Edit size={16}/><span>Редактирай</span></button>
              <button onClick={()=>{ if(window.confirm(`Изтрий "${supplier.name}"?`)) onDelete(supplier.id); }} className={styles.deleteBtn}><Trash2 size={16}/><span>Изтрий</span></button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length===0&&(
        <div className={styles.noResults}>
          <Truck size={32}/><h4>Няма намерени доставчици</h4>
          <button onClick={()=>{setSearchTerm('');setFilterRating(null);}} className={styles.secondaryBtn}>Изчисти филтрите</button>
        </div>
      )}
    </div>
  );
};

export default SuppliersTab;