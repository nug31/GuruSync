import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, CheckCircle2, Clock, FileText, Play, GraduationCap, Trophy } from 'lucide-react';
import { ExamInterface } from './ExamInterface';
import type { Student, Task, StudentTask, Exam } from '../../types';

export function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examScore, setExamScore] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadStudentData();
    }
  }, [user]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // 1. Load Student Profile
      const { data: studentData, error: sError } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (sError) throw sError;
      setStudent(studentData);

      // 2. Load Tasks for this student's class
      const { data: taskData, error: tError } = await supabase
        .from('tasks')
        .select('*')
        .eq('class', studentData.class);

      if (tError) throw tError;
      setTasks(taskData || []);

      // 3. Load Student's Task Progress
      const { data: stData, error: stError } = await supabase
        .from('student_tasks')
        .select('*')
        .eq('student_id', studentData.id);

      if (stError) throw stError;
      setStudentTasks(stData || []);

      // 4. Load Active Exams
      const { data: examData, error: eError } = await supabase
        .from('exams')
        .select('*')
        .eq('is_active', true);

      if (eError) throw eError;
      setExams(examData || []);

    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    if (!student) return;
    setSubmitting(taskId);
    try {
      const existing = studentTasks.find(st => st.task_id === taskId);
      if (existing) {
        const newStatus = existing.status === 'completed' ? 'pending' : 'completed';
        const { error } = await supabase
          .from('student_tasks')
          .update({ status: newStatus, submitted_at: newStatus === 'completed' ? new Date().toISOString() : null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('student_tasks')
          .insert([{
            student_id: student.id,
            task_id: taskId,
            status: 'completed',
            submitted_at: new Date().toISOString()
          }]);
        if (error) throw error;
      }
      await loadStudentData();
    } catch (error) {
      console.error('Error toggling task:', error);
    } finally {
      setSubmitting(null);
    }
  };

  const isAllTasksCompleted = () => {
    if (tasks.length === 0) return true; // Or false if you want to require at least one task
    return tasks.every(task => 
      studentTasks.find(st => st.task_id === task.id)?.status === 'completed'
    );
  };

  const handleExamComplete = (score: number) => {
    setExamScore(score);
    setActiveExam(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-medium animate-pulse">Menyiapkan ruang belajar Anda...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-12 text-center bg-error-container/20 rounded-[3rem] border border-error/20">
         <GraduationCap className="w-16 h-16 text-error mx-auto mb-4 opacity-50" />
         <h2 className="text-2xl font-black text-on-surface mb-2">Profil Siswa Tidak Ditemukan</h2>
         <p className="text-on-surface-variant">Pastikan akun Anda sudah terdaftar sebagai siswa oleh admin.</p>
      </div>
    );
  }

  if (examScore !== null) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6 animate-in zoom-in duration-500">
        <div className="max-w-md w-full bg-surface-container-low p-12 rounded-[4rem] border border-outline-variant text-center space-y-8 shadow-2xl">
          <div className="w-32 h-32 bg-primary/10 text-primary rounded-[2.5rem] flex items-center justify-center mx-auto animate-bounce">
            <Trophy className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black text-on-surface tracking-tighter uppercase">Ujian Selesai!</h2>
            <p className="text-on-surface-variant font-medium">Selamat, Anda telah menyelesaikan ujian akhir.</p>
          </div>
          <div className="py-8 bg-surface-container-high rounded-[2.5rem] border border-outline-variant">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2">Skor Perolehan</p>
            <p className="text-6xl font-display font-black text-primary">{examScore}</p>
          </div>
          <button 
            onClick={() => setExamScore(null)}
            className="w-full py-5 bg-on-surface text-surface rounded-[2rem] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (activeExam) {
    return (
      <ExamInterface 
        exam={activeExam} 
        onClose={() => setActiveExam(null)} 
        onComplete={handleExamComplete} 
      />
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Welcome Header */}
      <div className="bg-surface-container-low p-10 rounded-[3rem] border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="space-y-4 relative z-10">
           <div className="flex items-center gap-3 text-primary">
              <GraduationCap className="w-6 h-6" />
              <span className="font-label text-xs font-black uppercase tracking-[0.3em]">Student Portal</span>
           </div>
           <h1 className="text-5xl font-display font-black text-on-surface tracking-tighter">
             Halo, {student.name}!
           </h1>
           <p className="text-on-surface-variant/80 font-serif italic text-xl">
             Selamat datang di platform ujian. Selesaikan tugasmu untuk membuka ujian akhir.
           </p>
           <div className="flex gap-4 pt-2">
              <span className="px-4 py-2 bg-primary/10 text-primary rounded-2xl text-xs font-black uppercase tracking-widest border border-primary/20">
                Kelas {student.class}
              </span>
              <span className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-2xl text-xs font-black uppercase tracking-widest">
                NIS: {student.nis}
              </span>
           </div>
        </div>
        <div className="bg-surface-container-high/50 p-8 rounded-[2rem] border border-outline-variant text-center min-w-[200px]">
           <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Progres Tugas</p>
           <p className="text-4xl font-display font-black text-primary">
             {studentTasks.filter(st => st.status === 'completed').length}<span className="text-on-surface-variant/30">/</span>{tasks.length}
           </p>
           <div className="w-full h-2 bg-surface-container-lowest rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000" 
                style={{ width: `${tasks.length > 0 ? (studentTasks.filter(st => st.status === 'completed').length / tasks.length) * 100 : 0}%` }}
              />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Tasks Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
             <h2 className="text-3xl font-display font-black text-on-surface tracking-tight">Daftar Tugas</h2>
             <span className="text-xs font-black text-on-surface-variant uppercase tracking-widest bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant">
               {tasks.length} Total
             </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tasks.length === 0 ? (
              <div className="p-12 text-center bg-surface-container-low/30 rounded-[2rem] border border-dashed border-outline-variant">
                <BookOpen className="w-12 h-12 text-outline mx-auto mb-4 opacity-50" />
                <p className="text-on-surface-variant font-bold">Belum ada tugas untuk kelas Anda.</p>
              </div>
            ) : (
              tasks.map(task => {
                const isCompleted = studentTasks.find(st => st.task_id === task.id)?.status === 'completed';
                return (
                  <div key={task.id} className={`p-8 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${isCompleted ? 'bg-success/5 border-success/20' : 'bg-surface-container-lowest border-outline-variant shadow-sm hover:shadow-lg'}`}>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
                          {task.subject}
                        </span>
                        {isCompleted && (
                          <span className="flex items-center gap-1 text-success text-[10px] font-black uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3" /> Terkerjakan
                          </span>
                        )}
                      </div>
                      <h3 className={`text-xl font-display font-bold ${isCompleted ? 'text-on-surface/50 line-through' : 'text-on-surface'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-4 text-on-surface-variant text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString('id-ID') : '-'}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      disabled={submitting === task.id}
                      className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${isCompleted ? 'bg-success text-on-success' : 'bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary'}`}
                    >
                      {submitting === task.id ? '...' : isCompleted ? 'Batalkan Selesai' : 'Tandai Selesai'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Final Exam Section */}
        <div className="space-y-8">
           <h2 className="text-3xl font-display font-black text-on-surface tracking-tight">Ujian Akhir</h2>
           
           {!isAllTasksCompleted() ? (
             <div className="bg-surface-container-low p-10 rounded-[3rem] border border-outline-variant border-dashed text-center space-y-6">
                <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto text-on-surface-variant/30">
                   <FileText className="w-10 h-10" />
                </div>
                <div>
                   <h3 className="text-xl font-display font-bold text-on-surface">Ujian Masih Terkunci</h3>
                   <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">
                     Selesaikan seluruh tugas yang diberikan untuk dapat mengakses soal ujian akhir.
                   </p>
                </div>
                <div className="pt-4">
                   <div className="inline-flex items-center gap-2 px-4 py-2 bg-error-container/50 text-on-error-container rounded-full text-[10px] font-black uppercase tracking-widest border border-error/20">
                      Progress: {studentTasks.filter(st => st.status === 'completed').length}/{tasks.length}
                   </div>
                </div>
             </div>
           ) : exams.length === 0 ? (
             <div className="bg-surface-container-low p-10 rounded-[3rem] border border-outline-variant text-center">
                <p className="text-on-surface-variant font-bold italic">Belum ada ujian aktif saat ini.</p>
             </div>
           ) : (
             <div className="space-y-6">
               {exams.map(exam => (
                 <div 
                   key={exam.id} 
                   onClick={() => setActiveExam(exam)}
                   className="bg-primary p-10 rounded-[3rem] text-on-primary shadow-2xl shadow-primary/30 space-y-8 group hover:scale-[1.02] transition-all cursor-pointer"
                 >
                    <div className="space-y-2">
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Ready to Start</p>
                       <h3 className="text-3xl font-display font-black leading-tight">{exam.title}</h3>
                       <p className="text-sm font-medium opacity-80">{exam.subject} • {exam.duration_minutes} Menit</p>
                    </div>
                    
                    <button className="w-full bg-on-primary text-primary py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 group-hover:gap-5 transition-all shadow-xl">
                       Mulai Ujian <Play className="w-5 h-5 fill-current" />
                    </button>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
