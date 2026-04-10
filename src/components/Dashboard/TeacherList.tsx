import { useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabase';
import { Search, Download, Edit, Trash2, QrCode, FileSpreadsheet, Eye } from 'lucide-react';
import { differenceInDays, parseISO, format, parse, isValid } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import type { Teacher, Leave } from '../../types';

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
            const date = XLSX.SSF.parse_date_code(val);
            // date object from SSF has y, m, d
            const month = String(date.m).padStart(2, '0');
            const day = String(date.d).padStart(2, '0');
            return `${date.y}-${month}-${day}`;
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
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari nama, NIK, atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Semua Mata Pelajaran</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t flex-wrap gap-2">
          <p className="text-sm text-gray-600">
            Menampilkan {filteredTeachers.length} dari {teachers.length} guru
          </p>
          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportExcel}
              accept=".xlsx, .xls"
              className="hidden"
            />
            {onRefresh && (
              <>
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Template</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{importing ? 'Importing...' : 'Import Excel'}</span>
                </button>
              </>
            )}
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers.map((teacher) => {
          const activeLeaves = getActiveLeaves(teacher.id);
          const totalLeaves = getTeacherLeaves(teacher.id);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 mb-1">
                      {teacher.name}
                    </h3>
                    <p className="text-sm text-gray-600">NIK: {teacher.nik}</p>
                  </div>
                  {activeLeaves.length > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Cuti
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Mapel:</span>
                    <span>{teacher.subject}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Email:</span>
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Telepon:</span>
                    <span>{teacher.phone}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Masa Kerja:</span>
                    <span>{getWorkDuration(teacher.join_date)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-24">Total Cuti:</span>
                    <span>{totalLeaves.length} kali</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <a
                    href={`/profile/${teacher.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Profil</span>
                  </a>
                  <button
                    onClick={() => setShowQRModal(teacher)}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR</span>
                  </button>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(teacher)}
                      className="px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(teacher)}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">QR Code</h3>
              <button
                onClick={() => setShowQRModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-gray-600">{showQRModal.name}</p>
              <div ref={qrRef} className="flex justify-center bg-white p-4">
                <QRCodeSVG
                  value={getProfileUrl(showQRModal.id)}
                  size={256}
                  level="H"
                  includeMargin
                />
              </div>
              <button
                onClick={() => handleDownloadQR(showQRModal)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Download QR Code</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
