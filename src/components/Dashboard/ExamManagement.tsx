import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, HelpCircle, FileText, Timer, ChevronRight } from 'lucide-react';
import { ExamForm } from './ExamForm';
import type { Exam, Teacher, Question } from '../../types';

export function ExamManagement() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsRes, teachersRes, questionsRes] = await Promise.all([
        supabase.from('exams').select('*').order('created_at', { ascending: false }),
        supabase.from('teachers').select('*').order('name'),
        supabase.from('exam_questions').select('*')
      ]);

      if (examsRes.data) setExams(examsRes.data);
      if (teachersRes.data) setTeachers(teachersRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data);
    } catch (error) {
      console.error('Error loading exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus ujian ini beserta seluruh pertanyaannya?')) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Gagal menghapus ujian');
    }
  };

  const getQuestionCount = (examId: string) => {
    return questions.filter(q => q.exam_id === examId).length;
  };

  return (
    <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 bg-surface-container-low p-6 sm:p-10 rounded-3xl sm:rounded-[3rem] border border-outline-variant shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <HelpCircle className="w-64 h-64" />
        </div>
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 text-primary">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <span className="font-label text-xs font-black uppercase tracking-[0.3em]">Evaluation Center</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-black text-on-surface tracking-tighter">Bank Ujian Akhir</h2>
          <p className="text-on-surface-variant/80 font-serif italic text-base sm:text-xl max-w-2xl">Rancang instrumen penilaian komprehensif untuk mengukur capaian kompetensi siswa.</p>
        </div>
        <button
          onClick={() => {
            setEditingExam(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-4 bg-primary text-on-primary px-6 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30 relative z-10 w-full sm:w-auto"
        >
          <Plus className="w-6 h-6" />
          Rancang Ujian
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          [1, 2].map(i => (
            <div key={i} className="bg-surface-container-low h-80 rounded-3xl sm:rounded-[3rem] animate-pulse border border-outline-variant" />
          ))
        ) : exams.length === 0 ? (
          <div className="col-span-full py-20 sm:py-32 text-center bg-surface-container-low/30 rounded-3xl sm:rounded-[3rem] border-2 border-dashed border-outline-variant p-6">
             <div className="w-20 sm:w-24 h-20 sm:h-24 bg-surface-container-high rounded-2xl sm:rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-outline">
                <FileText className="w-10 sm:w-12 h-10 sm:h-12" />
             </div>
             <p className="text-on-surface-variant font-black text-xl sm:text-2xl tracking-tight">Belum Ada Ujian Terpublikasi</p>
             <p className="text-on-surface-variant/60 font-medium mt-2 text-sm sm:text-base">Mulai dengan menekan tombol 'Rancang Ujian' di atas.</p>
          </div>
        ) : (
          exams.map((exam) => {
            const qCount = getQuestionCount(exam.id);
            const teacher = teachers.find(t => t.id === exam.teacher_id);

            return (
              <div key={exam.id} className="group bg-surface-container-lowest rounded-3xl sm:rounded-[3rem] border border-outline-variant shadow-sm hover:shadow-2xl hover:border-primary/40 transition-all p-6 sm:p-10 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6 sm:mb-8">
                    <div className="flex flex-col gap-2">
                       <span className="px-4 py-1.5 bg-secondary-container text-on-secondary-container text-[10px] font-black uppercase tracking-widest rounded-full self-start">
                        {exam.subject}
                      </span>
                      <div className={`flex items-center gap-2 mt-1 ${exam.is_active ? 'text-success' : 'text-on-surface-variant/40'}`}>
                         <div className={`w-2 h-2 rounded-full ${exam.is_active ? 'bg-success animate-pulse' : 'bg-on-surface-variant/40'}`} />
                         <span className="text-[10px] font-black uppercase tracking-widest">{exam.is_active ? 'Sesi Aktif' : 'Draft/Nonaktif'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExam(exam);
                          setShowForm(true);
                        }}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-high hover:bg-primary-container text-on-surface-variant hover:text-primary rounded-xl sm:rounded-2xl flex items-center justify-center transition-all"
                      >
                        <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-high hover:bg-error-container text-on-surface-variant hover:text-error rounded-xl sm:rounded-2xl flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-display font-black text-on-surface mb-4 leading-tight">
                    {exam.title}
                  </h3>
                  
                  <div className="flex flex-wrap gap-8 mb-10">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                          <Timer className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Durasi</p>
                          <p className="text-sm font-bold text-on-surface">{exam.duration_minutes} Menit</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                          <FileText className="w-5 h-5" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Soal</p>
                          <p className="text-sm font-bold text-on-surface">{qCount} Butir</p>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-outline-variant flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center font-black text-sm text-primary">
                      {teacher?.name.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Koordinator</p>
                       <p className="text-sm font-bold text-on-surface">{teacher?.name || 'Admin'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-8 h-8 text-outline/30 group-hover:text-primary group-hover:translate-x-2 transition-all" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ExamForm
          exam={editingExam}
          teachers={teachers}
          onClose={() => {
            setShowForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
