import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DoorOpen,
  CreditCard,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const ReportsPage = () => {
  const { tenants, rooms, payments, complaints, getStats } = useApp();
  const stats = getStats();

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const occupancyData = [
    { name: 'Occupied', value: tenants.length },
    { name: 'Vacant', value: stats.vacantBeds },
  ];

  const complaintData = [
    { name: 'Plumbing', value: complaints.filter(c => c.category === 'Plumbing').length },
    { name: 'Electrical', value: complaints.filter(c => c.category === 'Electrical').length },
    { name: 'Internet', value: complaints.filter(c => c.category === 'Internet').length },
    { name: 'Cleaning', value: complaints.filter(c => c.category === 'Cleaning').length },
    { name: 'Other', value: complaints.filter(c => c.category === 'Other').length },
  ].filter(d => d.value > 0);

  const handleExportCSV = () => {
    // Generate CSV Data Grid
    const activeTenants = tenants.length;
    const totalRevenue = stats.monthlyRevenue;
    const pendingComplaints = stats.openComplaints;
    const availableBeds = stats.vacantBeds;

    // Create Header and Row
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Active Tenants', activeTenants.toString()],
      ['Monthly Revenue (INR)', totalRevenue.toString()],
      ['Total Open Complaints', pendingComplaints.toString()],
      ['Total Vacant Beds', availableBeds.toString()]
    ];

    // Convert to CSV String
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create Download Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ElitePG_Analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Reports & Analytics</h2>
          <p className="text-gray-500 dark:text-gray-400">Deep dive into your PG's performance and data.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `₹${stats.monthlyRevenue.toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Occupancy Rate', value: `${Math.round((tenants.length / (tenants.length + stats.vacantBeds)) * 100)}%`, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Open Complaints', value: stats.openComplaints, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Vacant Beds', value: stats.vacantBeds, icon: DoorOpen, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Revenue Trend
            </h3>
            <select className="bg-gray-50 dark:bg-white/5 border-none rounded-lg text-xs font-bold text-gray-500 outline-none px-2 py-1">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366f1"
                  strokeWidth={4}
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Occupancy Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
            <Users className="w-5 h-5 text-indigo-600" />
            Occupancy Distribution
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-gray-900 dark:text-white">
                {Math.round((tenants.length / (tenants.length + stats.vacantBeds)) * 100)}%
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Occupied</span>
            </div>
          </div>
          <div className="flex justify-center gap-8 mt-4">
            {occupancyData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{entry.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Complaint Categories */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Complaints by Category
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complaintData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 600 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {complaintData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Occupancy by Floor */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm"
        >
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-8">
            <DoorOpen className="w-5 h-5 text-indigo-600" />
            Occupancy by Floor
          </h3>
          <div className="space-y-6">
            {stats.occupancyByFloor.map((floor) => (
              <div key={floor.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-700 dark:text-gray-300">{floor.name}</span>
                  <span className="text-gray-500">{floor.occupied} / {floor.total} Beds</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(floor.occupied / floor.total) * 100}%` }}
                    className="h-full bg-indigo-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

