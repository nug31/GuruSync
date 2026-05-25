import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, HelpCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { Exam, Teacher, Question } from '../../types';

interface ExamFormProps {
  exam: Exam | null;
  teachers: Teacher[];
  onClose: () => void;
}

export function ExamForm({ exam, teachers, onClose }: ExamFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    duration_minutes: 60,
    teacher_id: '',
    is_active: true,
  });
  const [questions, setQuestions] = useState<Partial<Question>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title,
        subject: exam.subject,
        duration_minutes: exam.duration_minutes,
        teacher_id: exam.teacher_id,
        is_active: exam.is_active,
      });
      loadQuestions(exam.id);
    } else if (teachers.length > 0) {
      setFormData(prev => ({ ...prev, teacher_id: teachers[0].id }));
      setQuestions([{
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 1
      }]);
    }
  }, [exam, teachers]);

  const loadQuestions = async (examId: string) => {
    const { data } = await supabase.from('exam_questions').select('*').eq('exam_id', examId).order('created_at');
    if (data) setQuestions(data);
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, {
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options) {
      newQuestions[qIndex].options![oIndex] = value;
      setQuestions(newQuestions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let examId = exam?.id;

      if (exam) {
        const { error: updateError } = await supabase
          .from('exams')
          .update(formData)
          .eq('id', exam.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase
          .from('exams')
          .insert([formData])
          .select()
          .single();
        if (insertError) throw insertError;
        examId = data.id;
      }

      // Sync Questions
      if (examId) {
        // Delete old questions if updating
        if (exam) {
          await supabase.from('exam_questions').delete().eq('exam_id', examId);
        }

        const questionsToInsert = questions.map(q => ({
          exam_id: examId,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          points: q.points
        }));

        const { error: qError } = await supabase.from('exam_questions').insert(questionsToInsert);
        if (qError) throw qError;
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-outline-variant flex flex-col animate-in fade-in zoom-in duration-300">
        <div className="px-10 py-8 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-primary text-on-primary rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-primary/20">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-black text-on-surface tracking-tight">
                {exam ? 'Edit Ujian Akhir' : 'Konfigurasi Ujian Baru'}
              </h2>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-[0.2em] mt-1">Final Assessment Designer</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-surface-container-high transition-all text-on-surface-variant hover:rotate-90">
            <X className="w-8 h-8" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-12">
          {error && (
            <div className="bg-error-container text-on-error-container px-6 py-4 rounded-2xl text-sm font-bold border border-error/20 flex items-center gap-3">
              <X className="w-5 h-5" />
              {error}
            </div>
          )}

          <section className="space-y-8">
            <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
              <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black text-xs">01</span>
              <h3 className="font-display font-black text-on-surface uppercase tracking-widest text-sm">Informasi Dasar</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-2 space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-1">Judul Ujian</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-6 py-4 bg-surface-container-low border border-outline rounded-[1.25rem] focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-bold"
                  placeholder="Contoh: UAS Pemrograman Web 2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-6 py-4 bg-surface-container-low border border-outline rounded-[1.25rem] focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-bold"
                  placeholder="Matkul/Mapel"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-1">Durasi (Menit)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-6 py-4 bg-surface-container-low border border-outline rounded-[1.25rem] focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-bold"
                  required
                />
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-black text-xs">02</span>
                <h3 className="font-display font-black text-on-surface uppercase tracking-widest text-sm">Daftar Pertanyaan</h3>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="flex items-center gap-2 text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" /> Tambah Soal
              </button>
            </div>

            <div className="space-y-8">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="p-8 bg-surface-container-low/50 rounded-[2rem] border border-outline-variant relative group hover:border-primary/30 transition-all">
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="absolute top-6 right-6 p-2 text-on-surface-variant hover:text-error hover:bg-error-container/50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <div className="flex gap-6">
                    <span className="text-4xl font-display font-black text-outline/30 mt-1">{String(qIndex + 1).padStart(2, '0')}</span>
                    <div className="flex-1 space-y-8">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] ml-1">Pertanyaan</label>
                        <textarea
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(qIndex, 'question_text', e.target.value)}
                          className="w-full px-6 py-4 bg-surface-container-lowest border border-outline rounded-[1.25rem] focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium min-h-[100px]"
                          placeholder="Ketikkan isi pertanyaan..."
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {q.options?.map((opt, oIndex) => (
                          <div key={oIndex} className="relative">
                            <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 ml-1">Pilihan {String.fromCharCode(65 + oIndex)}</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                className={`w-full px-6 py-3.5 bg-surface-container-lowest border rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium ${q.correct_answer === opt && opt !== '' ? 'border-primary ring-2 ring-primary/20' : 'border-outline'}`}
                                placeholder={`Opsi ${String.fromCharCode(65 + oIndex)}`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => handleQuestionChange(qIndex, 'correct_answer', opt)}
                                className={`p-3 rounded-xl transition-all ${q.correct_answer === opt && opt !== '' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-primary'}`}
                                title="Set sebagai jawaban benar"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </form>

        <div className="px-10 py-8 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
          <div className="text-sm font-bold text-on-surface-variant">
            Total: <span className="text-primary font-black text-lg ml-1">{questions.length}</span> Pertanyaan
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-4 text-sm font-black text-on-surface-variant uppercase tracking-widest hover:bg-surface-container-high rounded-2xl transition-all"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-12 py-4 bg-primary text-on-primary text-sm font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 disabled:bg-primary/50 flex items-center gap-4"
            >
              {loading ? 'Menyimpan...' : (exam ? 'Simpan Perubahan' : 'Finalisasi Ujian')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
