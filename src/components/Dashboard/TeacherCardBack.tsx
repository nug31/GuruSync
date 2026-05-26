import { QRCodeSVG } from 'qrcode.react';
import type { Teacher } from '../../types';
import { Info } from 'lucide-react';

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
            Ukuran Standar PVC (54mm x 85.6mm) Portrait
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: 54mm 85.6mm;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
        
        .id-card-back {
          width: 54mm;
          height: 85.6mm;
          background: linear-gradient(180deg, #0f183b 0%, #060b1c 100%);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: Arial, sans-serif;
          margin: 0 auto;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
          border-radius: 3.18mm;
        }

        .qr-area {
          background: white;
          padding: 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .cyber-lines {
          position: absolute;
          inset: 0;
          width: 54mm;
          height: 85.6mm;
          z-index: 1;
        }
      `}} />

      <div className="id-card-print-area">
        <div className="id-card-back">
          <div className="cyber-lines">
            <svg width="100%" height="100%" viewBox="0 0 204 323" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <g stroke="#3b82f6" fill="none" strokeWidth="0.8" opacity="0.6">
                {/* Left Top */}
                <path d="M -10 50 L 30 50 L 40 60 L 65 60" />
                <circle cx="65" cy="60" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M -10 70 L 40 70 L 50 80 L 85 80" />
                <circle cx="85" cy="80" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M -10 90 L 20 90 L 30 80 L 55 80" />
                <circle cx="55" cy="80" r="1.5" fill="#60a5fa" stroke="none" />
                
                {/* Right Top */}
                <path d="M 214 50 L 174 50 L 164 60 L 139 60" />
                <circle cx="139" cy="60" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M 214 70 L 164 70 L 154 80 L 119 80" />
                <circle cx="119" cy="80" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M 214 90 L 184 90 L 174 80 L 149 80" />
                <circle cx="149" cy="80" r="1.5" fill="#60a5fa" stroke="none" />

                {/* Left Bottom */}
                <path d="M -10 273 L 30 273 L 40 263 L 65 263" />
                <circle cx="65" cy="263" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M -10 253 L 40 253 L 50 243 L 85 243" />
                <circle cx="85" cy="243" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M -10 233 L 20 233 L 30 243 L 55 243" />
                <circle cx="55" cy="243" r="1.5" fill="#60a5fa" stroke="none" />
                
                {/* Right Bottom */}
                <path d="M 214 273 L 174 273 L 164 263 L 139 263" />
                <circle cx="139" cy="263" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M 214 253 L 164 253 L 154 243 L 119 243" />
                <circle cx="119" cy="243" r="1.5" fill="#60a5fa" stroke="none" />
                <path d="M 214 233 L 184 233 L 174 243 L 149 243" />
                <circle cx="149" cy="243" r="1.5" fill="#60a5fa" stroke="none" />
              </g>

              {/* Starry Dust */}
              <g fill="#fff" opacity="0.3">
                <circle cx="30" cy="140" r="0.8" />
                <circle cx="180" cy="110" r="1" />
                <circle cx="150" cy="180" r="0.6" />
                <circle cx="50" cy="190" r="1" />
                <circle cx="90" cy="290" r="0.5" />
                <circle cx="80" cy="30" r="0.5" />
                <circle cx="120" cy="300" r="0.8" />
                <circle cx="160" cy="20" r="0.5" />
                <circle cx="20" cy="290" r="1" />
                <circle cx="190" cy="180" r="0.5" />
                <circle cx="70" cy="120" r="0.4" />
                <circle cx="130" cy="150" r="0.7" />
                <circle cx="160" cy="220" r="0.5" />
                <circle cx="40" cy="210" r="0.6" />
                <circle cx="100" cy="310" r="0.4" />
                <circle cx="190" cy="260" r="0.8" />
                <circle cx="15" cy="40" r="0.7" />
              </g>
            </svg>
          </div>
          
          <div className="z-10 flex flex-col items-center h-full w-full">
            <div className="text-center flex flex-col items-center mt-10">
              <span className="text-[12px] font-bold tracking-[0.15em] text-blue-100">
                SCAN FOR
              </span>
              <span className="text-[13px] font-bold tracking-[0.1em] text-white mt-[2px]">
                DIGITAL PROFILE
              </span>
            </div>

            <div className="flex-grow flex items-center justify-center">
              <div className="qr-area shadow-lg">
                <QRCodeSVG
                  value={profileUrl}
                  size={120}
                  level="H"
                  marginSize={0}
                />
              </div>
            </div>

            <div className="text-center mb-8">
              <p className="text-[8px] font-semibold tracking-[0.25em] text-blue-200">
                SECURE &bull; DIGITAL &bull; VERIFIED
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
