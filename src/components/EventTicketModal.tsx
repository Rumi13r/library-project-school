// src/components/EventTicketModal.tsx
import React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { X, Calendar, MapPin, Clock, User, Image as _ImageIcon } from "lucide-react";
import "./EventTicketModal.css";

interface EventTicketModalProps {
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  endTime: string;
  eventLocation: string;
  userName: string;
  userEmail: string;
  eventImageUrl?: string;
  onClose: () => void;
}

const EventTicketModal: React.FC<EventTicketModalProps> = ({
  ticketId,
  eventTitle,
  eventDate,
  eventTime,
  endTime,
  eventLocation,
  userName,
  userEmail,
  eventImageUrl,
  onClose
}) => {
  const ticketData = JSON.stringify({
    ticketId,
    eventTitle,
    eventDate,
    eventTime,
    eventLocation,
    userName,
    userEmail,
    timestamp: new Date().toISOString()
  });

  const downloadTicket = () => {
    const canvas = document.getElementById("ticket-qr") as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `билет-${eventTitle}-${ticketId.substring(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <div className="ticket-modal-overlay">
      <div className="ticket-modal">
        <div className="ticket-modal-header">
          <h2>Вашият билет за събитие</h2>
          <button onClick={onClose} className="ticket-close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="ticket-content">
          {/* Заден фон с картинка ако има */}
          {eventImageUrl && (
            <div className="ticket-background">
              <img 
                src={eventImageUrl} 
                alt={eventTitle} 
                className="background-image"
              />
            </div>
          )}

          {/* Хедър на билета */}
          <div className="ticket-header">
            <div className="ticket-logo">
              <Calendar size={28} />
              <span>Библиотека Билет</span>
            </div>
            <div className="ticket-id">
              БИЛЕТ №: {ticketId.substring(0, 8).toUpperCase()}
            </div>
          </div>

          {/* Информация за събитието */}
          <div className="event-info-section">
            <h3 className="event-title">{eventTitle}</h3>
            
            <div className="event-details">
              <div className="event-detail">
                <Calendar size={18} />
                <div>
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
                <div>
                  <strong>Час:</strong>
                  <span>{eventTime} - {endTime}</span>
                </div>
              </div>

              <div className="event-detail">
                <MapPin size={18} />
                <div>
                  <strong>Място:</strong>
                  <span>{eventLocation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* QR код секция */}
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

            {/* Информация за посетителя */}
            <div className="attendee-info">
              <div className="attendee-detail">
                <User size={18} />
                <div>
                  <strong>Посетител:</strong>
                  <span>{userName}</span>
                </div>
              </div>
              <div className="attendee-detail">
                <strong>Имейл:</strong>
                <span>{userEmail}</span>
              </div>
              <div className="attendee-detail">
                <strong>Дата на регистрация:</strong>
                <span>{new Date().toLocaleDateString('bg-BG')}</span>
              </div>
            </div>
          </div>

          {/* Инструкции */}
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
                Пристигнете 15 минути преди началото
              </div>
            </div>
          </div>
        </div>

        <div className="ticket-actions">
          <button onClick={downloadTicket} className="download-ticket-btn">
            Изтегли билет (PNG)
          </button>
          <button onClick={() => window.print()} className="print-ticket-btn">
            Принтирай билет
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTicketModal;