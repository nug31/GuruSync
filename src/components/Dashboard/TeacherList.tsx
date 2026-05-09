import { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { differenceInDays, parseISO, format, parse, isValid } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import type { Teacher, Leave } from '../../types';
import { TeacherCardBack } from './TeacherCardBack';

interface TeacherListProps {
  teachers: Teacher[];
  leaves: Leave[];
  onEdit?: (teacher: Teacher) => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export function TeacherList({ teachers, leaves, onEdit, onDelete, onRefresh }: TeacherListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showQRModal, setShowQRModal] = useState<Teacher | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<Teacher | null>(null);
  const [importing, setImporting] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subjects = useMemo(() => {
    return Array.from(new Set(teachers.map((t) => t.subject))).sort();
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.nik.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSubject = !subjectFilter || teacher.subject === subjectFilter;

      return matchesSearch && matchesSubject;
    });
  }, [teachers, searchTerm, subjectFilter]);

  const getWorkDuration = (joinDate: string) => {
    const days = differenceInDays(new Date(), parseISO(joinDate));
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);

    if (years > 0) {
      return `${years} tahun ${months} bulan`;
    }
    return `${months} bulan`;
  };

  const getTeacherLeaves = (teacherId: string) => {
    return leaves.filter((leave) => leave.teacher_id === teacherId);
  };

  const getActiveLeaves = (teacherId: string) => {
    return leaves.filter(
      (leave) =>
        leave.teacher_id === teacherId &&
        leave.status === 'approved' &&
        new Date(leave.start_date) <= new Date() &&
        new Date(leave.end_date) >= new Date()
    );
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data ${teacher.name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', teacher.id);

      if (error) throw error;

      alert('Data guru berhasil dihapus');
      onDelete?.();
    } catch (error) {
      alert('Gagal menghapus data guru');
      console.error(error);
    }
  };

  const handleDownloadQR = (teacher: Teacher) => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-${teacher.nik}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleExportExcel = () => {
    const exportData = filteredTeachers.map((t) => {
      return {
        'Nama': t.name,
        'NIK': t.nik,
        'Tempat Lahir': t.birth_place || '',
        'Tanggal Lahir': t.birth_date || '',
        'Jenis Kelamin': t.gender || '',
        'Mata Pelajaran': t.subject,
        'Tanggal Bergabung': t.join_date,
        'Pendidikan': t.education || '',
        'Sekolah Bertugas': t.work_unit || '',
         'Email': t.email,
        'Telepon': t.phone,
        'Alamat': t.address || '',
        'Status SP': t.sp_level || 'Tidak ada',
        'Riwayat Training': t.training_history || '',
        'Total Cuti': (t as any).leaves?.length || 0
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Guru');

    XLSX.writeFile(wb, `data-guru-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama': 'Joko Setyo Nugroho, S.T',
        'NIK': '940866',
        'Tempat Lahir': 'Jakarta',
        'Tanggal Lahir': '1994-08-31',
        'Jenis Kelamin': 'Laki-laki',
        'Mata Pelajaran': 'TKR',
        'Tanggal Bergabung': '2022-03-01',
        'Pendidikan': 'S1',
        'Sekolah Bertugas': 'SMKN 1 Jakarta',
        'Email': 'joko@example.com',
        'Telepon': '08123456789',
        'Alamat': 'Jl. Contoh No. 123, Kota Bandung'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
    XLSX.writeFile(wb, 'template-guru-sync.xlsx');
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parseExcelDate = (val: any): string | null => {
          if (!val) return null;
          
          if (val instanceof Date && !isNaN(val.getTime())) {
            // Use manual date components to avoid timezone shift
            const year = val.getFullYear();
            const month = String(val.getMonth() + 1).padStart(2, '0');
            const day = String(val.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }

          if (typeof val === 'number') {
            try {
              const date = XLSX.SSF.parse_date_code(val);
              if (date) {
                const month = String(date.m).padStart(2, '0');
                const day = String(date.d).padStart(2, '0');
                return `${date.y}-${month}-${day}`;
              }
            } catch (e) {
              console.error('Error parsing date code:', e);
            }
          }

          if (typeof val === 'string') {
            const dateStr = val.trim();
            if (!dateStr) return null;

            const formats = ['yyyy-MM-dd', 'dd-MM-yyyy', 'dd/MM/yyyy', 'd-MMM-yy', 'd-MMM-yyyy', 'MMM d, yyyy', 'MMMM d, yyyy'];
            const locales = [id, enUS];

            for (const f of formats) {
              for (const locale of locales) {
                try {
                  const parsed = parse(dateStr, f, new Date(), { locale });
                  if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
                } catch (e) { /* ignore */ }
              }
            }
            
            const isoParsed = parseISO(dateStr);
            if (isValid(isoParsed)) return format(isoParsed, 'yyyy-MM-dd');
          }
          return null;
        };

        const getRowVal = (row: any, possibleKeys: string[]) => {
          const key = Object.keys(row).find(k => 
            possibleKeys.some(pk => k.toLowerCase().replace(/[^a-z0-9]/g, '').trim() === pk.toLowerCase().replace(/[^a-z0-9]/g, '').trim())
          );
          return key ? row[key] : undefined;
        };

        const totalRows = data.length;
        const foundColumns = totalRows > 0 ? Object.keys(data[0]) : [];

        const teachersToUpsert = data.map((row: any) => {
          const name = getRowVal(row, ['Nama', 'Nama Guru', 'Name', 'Full Name', 'Nama Lengkap']);
          const nikRaw = getRowVal(row, ['NIK', 'N.I.K', 'No NIK', 'Nomor NIK', 'Identity Number', 'nik']);
          
          if (!name || (!nikRaw && nikRaw !== 0)) return null;

          const nik = String(nikRaw).trim();
          if (nik === 'undefined' || !nik || nik === '-') return null;

          const sanitizeField = (val: any) => {
            if (val === undefined || val === null) return '';
            const str = String(val).trim();
            return (str === '-' || str === 'strip') ? '' : str;
          };

          return {
            name: String(name).trim(),
            nik: nik,
            birth_place: sanitizeField(getRowVal(row, ['Tempat Lahir', 'birth_place', 'Place of Birth', 'Kota Lahir'])),
            birth_date: parseExcelDate(getRowVal(row, ['Tanggal Lahir', 'birth_date', 'Date of Birth', 'Tgl Lahir'])),
            gender: (() => {
              const val = sanitizeField(getRowVal(row, ['Jenis Kelamin', 'gender', 'Sex', 'Gender', 'Kelamin', 'L/P']));
              if (!val) return 'Laki-laki';
              const normalized = val.toLowerCase();
              if (normalized === 'l' || normalized === 'laki-laki') return 'Laki-laki';
              if (normalized === 'p' || normalized === 'perempuan') return 'Perempuan';
              return val;
            })(),
            subject: sanitizeField(getRowVal(row, ['Mata Pelajaran', 'subject', 'Subject', 'Mapel'])) || 'Lainnya',
            join_date: parseExcelDate(getRowVal(row, ['Tanggal Bergabung', 'join_date', 'Join Date', 'Tgl Bergabung', 'Tgl Masuk'])) || new Date().toISOString().split('T')[0],
            education: sanitizeField(getRowVal(row, ['Pendidikan', 'education', 'Education', 'Pendidikan Terakhir'])),
            work_unit: sanitizeField(getRowVal(row, ['Sekolah Bertugas', 'work_unit', 'Work Unit', 'Kampus', 'Unit Kerja', 'Sekolah'])),
            email: sanitizeField(getRowVal(row, ['Email', 'email'])),
            phone: sanitizeField(getRowVal(row, ['Telepon', 'phone', 'Phone', 'Mobile', 'No HP', 'No Telp'])),
            address: sanitizeField(getRowVal(row, ['Alamat', 'address', 'Address', 'Alamat Lengkap'])),
          };
        }).filter((t): t is any => t !== null);

        const processedCount = teachersToUpsert.length;
        const skippedCount = totalRows - processedCount;

        if (processedCount === 0) {
          throw new Error(`Tidak ada data valid. Pastikan kolom Nama dan NIK ada.\n\nKolom yang ditemukan di file Anda: \n${foundColumns.join(', ')}`);
        }

        const { error: upsertError } = await (supabase
          .from('teachers') as any)
          .upsert(teachersToUpsert, { onConflict: 'nik' });

        if (upsertError) throw upsertError;

        let summaryMsg = `Berhasil memproses ${processedCount} data guru.`;
        if (skippedCount > 0) {
          summaryMsg += `\n\n${skippedCount} baris dilewati (karena Nama atau NIK kosong).`;
        }
        summaryMsg += `\n\nSilakan jalankan sinkronisasi akun untuk mengaktifkan login.`;
        
        alert(summaryMsg);
        onRefresh?.();
      } catch (err: any) {
        console.error('Error importing excel:', err);
        const errMsg = err?.message || (typeof err === 'string' ? err : 'Format file salah atau kolom tidak sesuai');
        alert(`Gagal mengimport data: ${errMsg}`);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const getProfileUrl = (teacherId: string) => {
    return `${window.location.origin}/profile/${teacherId}`;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant p-2 flex items-center gap-3">
          <div className="px-2 text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            type="text"
            placeholder="Search by name, NIK, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder:text-on-surface-variant/40"
          />
        </div>
        
        <div className="bg-surface-container-lowest border border-outline-variant px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">filter_list</span>
            <span className="font-label text-[10px] text-on-surface-variant">Departemen</span>
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-primary cursor-pointer w-full text-right"
          >
            <option value="">Semua Dept</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant px-4 py-2 flex items-center justify-between gap-2">
           <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
           {onRefresh && (
             <>
               <button onClick={handleDownloadTemplate} className="flex-1 flex items-center justify-center gap-1 bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors text-xs font-bold py-1 px-1 rounded-sm" title="Template Excel">
                 <span className="material-symbols-outlined text-sm">description</span> Tmpl
               </button>
               <button onClick={() => fileInputRef.current?.click()} disabled={importing} className="flex-1 flex items-center justify-center gap-1 bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors text-xs font-bold py-1 px-1 rounded-sm" title="Import Data">
                 <span className="material-symbols-outlined text-sm">upload</span> Imp
               </button>
             </>
           )}
           <button onClick={handleExportExcel} className="flex-1 flex items-center justify-center gap-1 bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors text-xs font-bold py-1 px-1 rounded-sm" title="Export Data">
             <span className="material-symbols-outlined text-sm">download</span> Exp
           </button>
        </div>
      </section>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 font-label text-[10px] text-on-surface-variant">Profil Guru</th>
                <th className="px-6 py-4 font-label text-[10px] text-on-surface-variant">Jabatan / Dept</th>
                <th className="px-6 py-4 font-label text-[10px] text-on-surface-variant">Riwayat Pelatihan</th>
                <th className="px-6 py-4 font-label text-[10px] text-on-surface-variant">Status SP</th>
                <th className="px-6 py-4 font-label text-[10px] text-on-surface-variant text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredTeachers.map((teacher) => (
                <tr key={teacher.id} className="group hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {teacher.avatar_url ? (
                          <img alt={teacher.name} className="w-12 h-12 rounded-sm object-cover border border-outline-variant transition-all duration-500" src={teacher.avatar_url} />
                        ) : (
                          <div className="w-12 h-12 rounded-sm bg-surface-container flex items-center justify-center border border-outline-variant">
                            <span className="material-symbols-outlined text-on-surface-variant">person</span>
                          </div>
                        )}
                        {getActiveLeaves(teacher.id).length > 0 && (
                          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-500 border border-white rounded-full" title="Sedang Cuti"></span>
                        )}
                      </div>
                      <div>
                        <p className="font-serif text-base font-bold text-on-surface">{teacher.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">NIK: {teacher.nik}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-sm font-semibold text-primary">{teacher.subject}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{teacher.work_unit || '-'}</p>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-wrap gap-2">
                      {teacher.training_history ? (
                        teacher.training_history.split(',').slice(0, 2).map((training, i) => (
                          <span key={i} className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[9px] font-bold uppercase tracking-wider rounded-sm">
                            {training.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-on-surface-variant italic">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    {(!teacher.sp_level || teacher.sp_level === 'Tidak ada') ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Clean Record</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{teacher.sp_level}</span>
                    )}
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={`/profile/${teacher.id}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-primary/5 text-on-surface-variant hover:text-primary rounded-sm transition-colors flex items-center justify-center" title="View Detail">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </a>
                      <button onClick={() => setShowPrintModal(teacher)} className="p-2 hover:bg-primary/5 text-on-surface-variant hover:text-primary rounded-sm transition-colors flex items-center justify-center" title="Print ID Card">
                        <span className="material-symbols-outlined text-lg">badge</span>
                      </button>
                      <button onClick={() => setShowQRModal(teacher)} className="p-2 hover:bg-primary/5 text-on-surface-variant hover:text-primary rounded-sm transition-colors flex items-center justify-center" title="QR Code">
                        <span className="material-symbols-outlined text-lg">qr_code_2</span>
                      </button>
                      {onEdit && (
                        <button onClick={() => onEdit(teacher)} className="p-2 hover:bg-primary/5 text-on-surface-variant hover:text-primary rounded-sm transition-colors flex items-center justify-center" title="Edit Data">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => handleDelete(teacher)} className="p-2 hover:bg-error/5 text-on-surface-variant hover:text-error rounded-sm transition-colors flex items-center justify-center" title="Delete">
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                      Tidak ada data guru yang ditemukan.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination summary */}
        <div className="px-8 py-6 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm text-on-surface-variant italic font-serif">
            Menampilkan <span className="font-bold text-on-surface">{filteredTeachers.length}</span> dari <span className="font-bold text-on-surface">{teachers.length}</span> Guru dalam Registry
          </p>
        </div>
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
              <h3 className="font-display text-xl font-bold text-primary">QR Code Identity</h3>
              <button
                onClick={() => setShowQRModal(null)}
                className="text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-center space-y-6">
              <div>
                <p className="font-serif font-bold text-lg text-on-surface">{showQRModal.name}</p>
                <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">NIP: {showQRModal.nik}</p>
              </div>
              <div ref={qrRef} className="flex justify-center bg-white p-4 border border-outline-variant mx-auto w-fit">
                <QRCodeSVG
                  value={getProfileUrl(showQRModal.id)}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <button
                onClick={() => handleDownloadQR(showQRModal)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 transition-colors rounded-sm"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span>Download Code</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-sm shadow-xl max-w-2xl w-full p-8 my-auto relative">
            <button
              onClick={() => setShowPrintModal(null)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-error transition-colors print:hidden flex items-center justify-center"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="text-center mb-8 print:hidden border-b border-outline-variant pb-6">
              <h3 className="font-display text-2xl font-bold text-primary">Cetak Sisi Belakang Kartu</h3>
              <p className="text-sm font-serif italic text-on-surface-variant mt-2">Pastikan pengaturan printer menggunakan "No Margins" dan ukuran kertas "CR80" atau sesuai ukuran ID Card.</p>
            </div>

            <div className="flex justify-center mb-8">
              <TeacherCardBack teacher={showPrintModal} />
            </div>

            <div className="flex justify-center gap-4 print:hidden">
              <button
                onClick={() => setShowPrintModal(null)}
                className="px-8 py-2 border border-outline text-on-surface font-label text-xs uppercase tracking-widest hover:bg-surface-container transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  const printArea = document.querySelector('.id-card-print-area');
                  if (!printArea) return window.print();
                  
                  const root = document.getElementById('root');
                  const origDisplay = root ? root.style.display : '';
                  if (root) root.style.display = 'none';
                  
                  const printContainer = document.createElement('div');
                  printContainer.id = 'temp-print-container';
                  printContainer.style.position = 'fixed';
                  printContainer.style.left = '0';
                  printContainer.style.top = '0';
                  printContainer.style.width = '100%';
                  printContainer.style.height = '100%';
                  printContainer.style.background = 'white';
                  printContainer.style.zIndex = '99999';
                  
                  const clone = printArea.cloneNode(true) as HTMLElement;
                  printContainer.appendChild(clone);
                  document.body.appendChild(printContainer);
                  
                  window.print();
                  
                  document.body.removeChild(printContainer);
                  if (root) root.style.display = origDisplay;
                }}
                className="flex items-center gap-2 px-8 py-2 bg-primary text-on-primary font-label text-xs uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
