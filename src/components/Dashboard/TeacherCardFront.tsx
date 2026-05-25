import type { Teacher } from '../../types';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface TeacherCardFrontProps {
  teacher: Teacher;
}

export function TeacherCardFront({ teacher }: TeacherCardFrontProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd-MM-yyyy', { locale: id });
    } catch {
      return dateStr;
    }
  };

  const getProfileImage = () => {
    if (teacher.avatar_url) return teacher.avatar_url;
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(teacher.name) + '&background=e9ecef&color=6c757d&size=200';
  };

  return (
    <div className="id-card-front-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .id-card-front {
          width: 85.6mm;
          height: 53.98mm;
          background-color: #ffffff;
          border-radius: 3.18mm;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
          position: relative;
          box-sizing: border-box;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0 auto;
          background-image: linear-gradient(135deg, #f5f7fa 0%, #e4ebf5 100%);
        }

        .id-card-front .header {
          background-color: #0056b3;
          background-image: linear-gradient(90deg, #0056b3 0%, #004494 100%);
          color: white;
          text-align: center;
          padding: 3mm 0;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .id-card-front .content {
          padding: 4mm;
          display: flex;
          gap: 4mm;
          flex-grow: 1;
        }

        .id-card-front .photo-area {
          width: 22mm;
          height: 28mm;
          border: 1px solid #ccc;
          background-color: #e9ecef;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 2mm;
          overflow: hidden;
          flex-shrink: 0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .id-card-front .photo-area img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .id-card-front .details {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5mm;
          justify-content: center;
        }

        .id-card-front .detail-row {
          display: flex;
          font-size: 8px;
          line-height: 1.2;
        }

        .id-card-front .detail-label {
          width: 17mm;
          font-weight: bold;
          color: #333;
          flex-shrink: 0;
        }

        .id-card-front .detail-value {
          color: #111;
          flex-grow: 1;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 38mm;
        }

        .id-card-front .footer {
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          text-align: center;
          padding: 1.5mm 0;
          font-size: 7px;
          color: #6c757d;
          font-weight: bold;
          text-transform: uppercase;
        }
      `}} />

      <div id="id-card-front-element" className="id-card-front">
        <div className="header">
          GURU & KARYAWAN
        </div>
        <div className="content">
          <div className="photo-area">
            <img src={getProfileImage()} alt={teacher.name} crossOrigin="anonymous" />
          </div>
          <div className="details">
            <div className="detail-row">
              <div className="detail-label">NIP/NIK</div>
              <div className="detail-value">: {teacher.nik || '-'}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Nama</div>
              <div className="detail-value">: {teacher.name}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">TTL</div>
              <div className="detail-value">: {teacher.birth_place || '-'}, {formatDate(teacher.birth_date)}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Jenis Kelamin</div>
              <div className="detail-value">: {teacher.gender || '-'}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Mapel / Dept</div>
              <div className="detail-value">: {teacher.subject || '-'}</div>
            </div>
          </div>
        </div>
        <div className="footer">
          GURUSYNC DIGITAL IDENTITY
        </div>
      </div>
    </div>
  );
}
