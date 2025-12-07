// src/components/EventTicketModal.tsx
import React, { useRef, useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Calendar, MapPin, Clock, User, Download, Printer } from "lucide-react";
import { auth, db } from '../firebase/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import "./EventTicketModal.css";

interface EventTicketModalProps {
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  endTime: string;
  eventLocation: string;
  userEmail: string;
  eventImageUrl?: string;
  onClose: () => void;
}

interface UserData {
  role?: 'admin' | 'librarian' | 'reader';
  profile?: {
    displayName?: string;
  };
}

const EventTicketModal: React.FC<EventTicketModalProps> = ({
  ticketId,
  eventTitle,
  eventDate,
  eventTime,
  endTime,
  eventLocation,
  userEmail,
  eventImageUrl,
  onClose
}) => {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Зареждане на потребителските данни
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as UserData;
            
            // Определяне на displayName
            let displayName = 'Потребител';
            
            if (userData?.profile?.displayName) {
              displayName = userData.profile.displayName;
            } else if (user.email) {
              displayName = user.email.split('@')[0];
            }
            
            setUserDisplayName(displayName);
          } else {
            // Ако няма запис в users, използваме email
            const displayName = user.email?.split('@')[0] || 'Потребител';
            setUserDisplayName(displayName);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // При грешка използваме email
          const displayName = user.email?.split('@')[0] || 'Потребител';
          setUserDisplayName(displayName);
        }
      } else {
        setUserDisplayName('Потребител');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ticketData = JSON.stringify({
    ticketId,
    eventTitle,
    eventDate,
    eventTime,
    eventLocation,
    userName: userDisplayName,
    userEmail,
    timestamp: new Date().toISOString()
  });

  const downloadTicket = () => {
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `билет-${eventTitle.substring(0, 20)}-${ticketId.substring(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  const printFullTicket = () => {
    const downloadButton = document.querySelector('.download-ticket-btn');
    const printButton = document.querySelector('.print-ticket-btn');
    const closeButton = document.querySelector('.ticket-close-btn');
    
    if (downloadButton) {
      (downloadButton as HTMLElement).style.display = 'none';
    }
    if (printButton) {
      (printButton as HTMLElement).style.display = 'none';
    }
    if (closeButton) {
      (closeButton as HTMLElement).style.display = 'none';
    }

    window.print();

    setTimeout(() => {
      if (downloadButton) {
        (downloadButton as HTMLElement).style.display = '';
      }
      if (printButton) {
        (printButton as HTMLElement).style.display = '';
      }
      if (closeButton) {
        (closeButton as HTMLElement).style.display = '';
      }
    }, 100);
  };

  const formatEventTitle = (title: string): string => {
    if (title.length > 50) {
      return title.substring(0, 47) + '...';
    }
    return title;
  };

  return (
    <div className="ticket-modal-overlay" ref={ticketRef}>
      <div className="ticket-modal">
        <div className="ticket-modal-header">
          <h2>Вашият билет за събитие</h2>
          <button onClick={onClose} className="ticket-close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="ticket-content">
          {eventImageUrl && (
            <div className="ticket-background">
              <img 
                src={eventImageUrl} 
                alt={eventTitle} 
                className="background-image"
              />
            </div>
          )}

          <div className="ticket-header">
            <div className="ticket-logo">
              <Calendar size={28} />
              <span>Билет</span>
            </div>
            <div className="ticket-id">
              БИЛЕТ №: {ticketId.substring(0, 8).toUpperCase()}
            </div>
          </div>

          <div className="event-info-section">
            <h3 className="event-title" title={eventTitle}>
              {formatEventTitle(eventTitle)}
            </h3>
            
            <div className="event-details">
              <div className="event-detail">
                <Calendar size={18} />
                <div className="detail-content">
                  <strong>Дата:</strong>
                  <span>{new Date(eventDate).toLocaleDateString('bg-BG', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>

              <div className="event-detail">
                <Clock size={18} />
                <div className="detail-content">
                  <strong>Час:</strong>
                  <span>{eventTime} - {endTime}</span>
                </div>
              </div>

              <div className="event-detail">
                <MapPin size={18} />
                <div className="detail-content">
                  <strong>Място:</strong>
                  <span>{eventLocation}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="qr-section">
            <div className="qr-container">
              <QRCodeCanvas 
                id="ticket-qr"
                value={ticketData}
                size={200}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#1e40af"
              />
              <div className="qr-instructions">
                Покажете този QR код при входа на събитието
              </div>
            </div>

            <div className="attendee-info">
              <div className="attendee-detail">
                <User size={18} />
                <div className="detail-content">
                  <strong>Посетител:</strong>
                  <span className="user-name">
                    {loading ? 'Зареждане...' : userDisplayName}
                  </span>
                </div>
              </div>
              <div className="attendee-detail">
                <div className="detail-content">
                  <strong>Имейл:</strong>
                  <span className="user-email">{userEmail}</span>
                </div>
              </div>
              <div className="attendee-detail">
                <div className="detail-content">
                  <strong>Дата на регистрация:</strong>
                  <span>{new Date().toLocaleDateString('bg-BG')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ticket-instructions">
            <div className="instruction-item">
              <div className="instruction-number">1</div>
              <div className="instruction-text">
                Запазете този билет или го принтирайте
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-number">2</div>
              <div className="instruction-text">
                Покажете QR кода при входа на събитието
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-number">3</div>
              <div className="instruction-text">
                Елате поне 5 минути преди началото на събитието, за да запазите мястото си
              </div>
            </div>
          </div>
        </div>

        <div className="ticket-actions">
          <button onClick={downloadTicket} className="download-ticket-btn">
            <Download size={16} />
            Изтегли билет (PNG)
          </button>
          <button onClick={printFullTicket} className="print-ticket-btn">
            <Printer size={16} />
            Принтирай билет
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTicketModal;