import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Timer, Send, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Exam, Question } from '../../types';

interface ExamInterfaceProps {
  exam: Exam;
  onClose: () => void;
  onComplete: (score: number) => void;
}

export function ExamInterface({ exam, onClose, onComplete }: ExamInterfaceProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration_minutes * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [exam.id]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', exam.id);
      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    let score = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        score += q.points;
      }
    });

    // Here we could save results to a new 'exam_results' table
    // For now, we'll just pass it back
    setTimeout(() => {
      onComplete(score);
    }, 1500);
  }, [questions, answers, onComplete]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background z-[200] flex flex-col items-center justify-center gap-6">
         <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <p className="text-xl font-display font-black text-on-surface animate-pulse uppercase tracking-[0.2em]">Memuat Lembar Soal...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col animate-in fade-in duration-500">
      {/* Exam Header */}
      <header className="h-24 bg-surface-container-low border-b border-outline-variant px-10 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
           <div className="w-12 h-12 bg-primary text-on-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
              <FileText className="w-6 h-6" />
           </div>
           <div>
              <h1 className="text-xl font-display font-black text-on-surface tracking-tight">{exam.title}</h1>
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{exam.subject}</p>
           </div>
        </div>

        <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl border ${timeLeft < 300 ? 'bg-error-container text-on-error-container border-error animate-pulse' : 'bg-surface-container-high text-on-surface border-outline-variant'}`}>
           <Timer className="w-5 h-5" />
           <span className="text-2xl font-display font-black tracking-tighter">{formatTime(timeLeft)}</span>
        </div>

        <button 
          onClick={() => setShowConfirmSubmit(true)}
          className="bg-primary text-on-primary px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3"
        >
          Selesaikan <Send className="w-4 h-4" />
        </button>
      </header>

      <main className="flex-1 flex overflow-hidden">
         {/* Navigation Sidebar */}
         <aside className="w-80 bg-surface-container-lowest border-r border-outline-variant p-8 overflow-y-auto hidden lg:block">
            <h3 className="text-xs font-black text-on-surface-variant uppercase tracking-widest mb-6">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-3">
               {questions.map((_, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentIndex(idx)}
                   className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentIndex === idx ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 scale-110' : answers[questions[idx].id] ? 'bg-success/20 text-success border border-success/30' : 'bg-surface-container-high text-on-surface-variant hover:bg-outline-variant'}`}
                 >
                   {idx + 1}
                 </button>
               ))}
            </div>
            
            <div className="mt-12 p-6 bg-surface-container-low rounded-2xl border border-outline-variant space-y-4">
               <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                  <span>Terjawab</span>
                  <span className="text-success">{Object.keys(answers).length}</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant">
                  <span>Belum</span>
                  <span className="text-error">{questions.length - Object.keys(answers).length}</span>
               </div>
               <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-500" 
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                  />
               </div>
            </div>
         </aside>

         {/* Question Area */}
         <section className="flex-1 bg-surface-container-lowest/50 p-10 lg:p-20 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-12">
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <span className="text-5xl font-display font-black text-primary/20">{String(currentIndex + 1).padStart(2, '0')}</span>
                     <div className="h-px flex-1 bg-outline-variant" />
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-display font-bold text-on-surface leading-snug">
                    {currentQuestion?.question_text}
                  </h2>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {currentQuestion?.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(currentQuestion.id, option)}
                      className={`flex items-center gap-6 p-6 rounded-[2rem] border-2 transition-all text-left group ${answers[currentQuestion.id] === option ? 'bg-primary/5 border-primary shadow-xl shadow-primary/10' : 'bg-surface-container-lowest border-outline-variant hover:border-primary/30 hover:bg-surface-container-low'}`}
                    >
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all ${answers[currentQuestion.id] === option ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary'}`}>
                          {String.fromCharCode(65 + idx)}
                       </div>
                       <span className={`text-lg font-bold flex-1 ${answers[currentQuestion.id] === option ? 'text-on-surface' : 'text-on-surface-variant'}`}>{option}</span>
                       {answers[currentQuestion.id] === option && <CheckCircle2 className="w-6 h-6 text-primary" />}
                    </button>
                  ))}
               </div>

               {/* Mobile Navigation */}
               <div className="flex items-center justify-between pt-12 border-t border-outline-variant">
                  <button
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentIndex === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" /> Sebelumnya
                  </button>
                  <span className="font-display font-black text-on-surface-variant/40">
                    {currentIndex + 1} / {questions.length}
                  </span>
                  <button
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIndex === questions.length - 1}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-primary hover:bg-primary/10 transition-all disabled:opacity-30"
                  >
                    Selanjutnya <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
            </div>
         </section>
      </main>

      {/* Confirmation Modals */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
           <div className="bg-surface-container-lowest rounded-[3rem] p-10 max-w-md w-full border border-outline-variant shadow-2xl text-center space-y-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                 <AlertCircle className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                 <h2 className="text-3xl font-display font-black text-on-surface tracking-tight">Selesaikan Ujian?</h2>
                 <p className="text-on-surface-variant font-medium">Anda telah menjawab {Object.keys(answers).length} dari {questions.length} soal. Yakin ingin mengakhiri sesi?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   onClick={() => setShowConfirmSubmit(false)}
                   className="py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-all"
                 >
                   Kembali
                 </button>
                 <button 
                   onClick={handleSubmit}
                   className="py-4 bg-primary text-on-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                 >
                   Ya, Kirim
                 </button>
              </div>
           </div>
        </div>
      )}

      {submitting && (
        <div className="fixed inset-0 bg-primary z-[400] flex flex-col items-center justify-center text-on-primary p-10 text-center gap-8">
           <div className="w-24 h-24 border-8 border-on-primary/20 border-t-on-primary rounded-full animate-spin"></div>
           <div className="space-y-4">
              <h2 className="text-4xl font-display font-black tracking-tighter uppercase">Mengirim Jawaban</h2>
              <p className="text-xl font-serif italic opacity-70">Mohon tunggu sebentar, sistem sedang mengkalkulasi skor Anda...</p>
           </div>
        </div>
      )}
    </div>
  );
}
