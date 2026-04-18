import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Info } from 'lucide-react';
import type { Teacher } from '../../types';

interface TeacherCardBackProps {
  teacher: Teacher;
}

export function TeacherCardBack({ teacher }: TeacherCardBackProps) {
  const profileUrl = `${window.location.origin}/profile/${teacher.id}`;

  return (
    <div className="id-card-back-container">
      {/* Visual Overlay for Screen (not printed) */}
      <div className="hidden print:hidden lg:flex items-center justify-center p-8 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 mb-8">
        <div className="text-center">
          <Info className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">
            Pratinjau Cetak Sisi Belakang Kartu
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ukuran Standar PVC (85.6mm x 54mm)
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 85.6mm 54mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          /* We will hide #root when printing the card using JS */
        }
        
        .id-card-back {
          width: 85.6mm;
          height: 54mm;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: sans-serif;
          margin: 0 auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border-radius: 3.18mm; /* Standard PVC corner radius */
        }

        .qr-area {
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-bg-pattern {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .card-footer {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          padding: 0 20px;
          opacity: 0.8;
        }
      `}} />

      <div className="id-card-print-area">
        <div className="id-card-back">
          <div className="card-bg-pattern" />
          
          <div className="flex items-center space-x-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-black tracking-widest uppercase">
              GuruSync ID
            </span>
          </div>

          <div className="qr-area">
            <QRCodeSVG
              value={profileUrl}
              size={120}
              level="H"
              marginSize={1}
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">
              Verify Identity
            </p>
            <p className="text-[10px] font-medium text-slate-300 italic">
              Scan for Digital Profile
            </p>
          </div>

          <div className="card-footer">
            <div className="text-[7px] text-slate-400">
              <p className="font-bold">{teacher.name}</p>
              <p>{teacher.nik}</p>
            </div>
            <div className="text-[7px] text-slate-400 text-right">
              <p>{teacher.work_unit || 'Guru Sync Network'}</p>
              <p>v2026.04</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
