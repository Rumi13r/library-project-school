// Добави това в края на src/lib/services/bookTypes.ts
// (Замества предишните type exports с any)

// Firestore date union type — използвай навсякъде вместо any
export type FSDate =
  | { toDate?: () => Date; seconds?: number }
  | Date
  | string
  | null
  | undefined;

// ─── Типове за събития ───────────────────────────────────────────────────────

export interface LibraryEvent {
  id:                  string;
  title:               string;
  description:         string;
  date:                string;
  time:                string;
  endTime:             string;
  location:            string;
  maxParticipants:     number;
  currentParticipants: number;
  allowedRoles:        string[];
  organizer:           string;
  createdAt:           FSDate;     
  imageUrl?:           string;
  participants:        string[];
}

// ─── Типове за резервации ────────────────────────────────────────────────────

export interface Reservation {
  id:          string;
  bookId:      string;
  userId:      string;
  userName:    string;
  userEmail:   string;
  reservedAt:  FSDate;   // was any
  status:      'active' | 'completed' | 'cancelled' | 'fulfilled';
  pickupDate?: string;
  returnDate?: string;
  expiresAt?:  FSDate;   // was any
}

// ─── Типове за задачи ────────────────────────────────────────────────────────

export interface LibrarianTask {
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

// ─── Типове за поръчки ───────────────────────────────────────────────────────

export interface BookOrder {
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
  status:           'pending'|'ordered'|'shipped'|'delivered'|'cancelled';
  orderNumber:      string;
  notes:            string;
  createdBy:        string;
  createdAt:        FSDate;   // was any
  updatedAt:        FSDate;   // was any
}

// ─── Типове за доставчици ────────────────────────────────────────────────────

export interface Supplier {
  id:            string;
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  website:       string;
  address:       string;
  rating:        number;
  deliveryTime:  string;
  paymentTerms:  string;
  notes:         string;
  createdAt?:    FSDate;   // was any
  updatedAt?:    FSDate;   // was any
}

// ─── Типове за инвентаризация ────────────────────────────────────────────────

export interface InventoryAudit {
  id:            string;
  date:          string;
  auditor:       string;
  section:       string;
  totalBooks:    number;
  countedBooks:  number;
  discrepancies: number;
  status:        'planned'|'in_progress'|'completed'|'cancelled';
  notes:         string;
  createdAt:     FSDate;   // was any
  updatedAt?:    FSDate;   // was any
}