import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import type { Teacher, Leave } from '../../types';
import { differenceInDays, format, parseISO, startOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

interface StatisticsProps {
  teachers: Teacher[];
  leaves: Leave[];
}

export function Statistics({ teachers, leaves }: StatisticsProps) {
  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const activeLeaves = leaves.filter(
      (leave) =>
        leave.status === 'approved' &&
        new Date(leave.start_date) <= new Date() &&
        new Date(leave.end_date) >= new Date()
    ).length;

    const avgWorkDuration = teachers.length > 0
      ? teachers.reduce((sum, teacher) => {
          const days = differenceInDays(new Date(), parseISO(teacher.join_date));
          return sum + days / 365;
        }, 0) / teachers.length
      : 0;

    const pendingLeaves = leaves.filter((leave) => leave.status === 'pending').length;

    return {
      totalTeachers,
      activeLeaves,
      avgWorkDuration: avgWorkDuration.toFixed(1),
      pendingLeaves,
    };
  }, [teachers, leaves]);

  const leavesByMonth = useMemo(() => {
    const monthData: { [key: string]: number } = {};

    leaves.forEach((leave) => {
      const month = format(parseISO(leave.start_date), 'MMM yyyy', { locale: id });
      monthData[month] = (monthData[month] || 0) + 1;
    });

    return Object.entries(monthData)
      .map(([month, count]) => ({ month, count }))
      .slice(-12);
  }, [leaves]);

  const leavesByStatus = useMemo(() => {
    const statusData: { [key: string]: number } = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    leaves.forEach((leave) => {
      statusData[leave.status]++;
    });

    return Object.entries(statusData).map(([status, count]) => ({
      status: status === 'pending' ? 'Menunggu' : status === 'approved' ? 'Disetujui' : 'Ditolak',
      count,
    }));
  }, [leaves]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">
            {stats.totalTeachers}
          </h3>
          <p className="text-gray-600 text-sm">Total Guru</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">
            {stats.activeLeaves}
          </h3>
          <p className="text-gray-600 text-sm">Cuti Aktif</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">
            {stats.avgWorkDuration} th
          </h3>
          <p className="text-gray-600 text-sm">Rata-rata Masa Kerja</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-800 mb-1">
            {stats.pendingLeaves}
          </h3>
          <p className="text-gray-600 text-sm">Cuti Menunggu Persetujuan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Rekap Cuti per Bulan
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={leavesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Status Pengajuan Cuti
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={leavesByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
