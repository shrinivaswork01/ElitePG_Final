import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DoorOpen,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { cn } from '../utils';

export const ReportsPage = () => {
  const { tenants, payments, complaints, getStats, pgConfig } = useApp();
  const stats = getStats();
  
  const extractBaseColor = (colorStr?: string) => {
    if (!colorStr) return '#4f46e5';
    if (!colorStr.includes('gradient')) return colorStr;
    const match = colorStr.match(/(?:#[a-fA-F0-9]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\))/);
    return match ? match[0] : '#4f46e5';
  };

  const themeColor = extractBaseColor(pgConfig?.primaryColor);
  const COLORS = [themeColor, '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Trend Calculations
  const revHistory = stats.revenueHistory || [];
  const currRev = revHistory[revHistory.length - 1]?.revenue || 0;
  const prevRev = revHistory[revHistory.length - 2]?.revenue || 0;
  const revTrend = prevRev === 0 ? 0 : Math.round(((currRev - prevRev) / prevRev) * 100);

  const occupancyRate = (tenants.length + stats.vacantBeds) === 0 ? 0 : Math.round((tenants.length / (tenants.length + stats.vacantBeds)) * 100);
  
  const occupancyData = [
    { name: 'Occupied', value: tenants.length },
    { name: 'Vacant', value: stats.vacantBeds },
  ];

  const categories = ['Plumbing', 'Electrical', 'Internet', 'Cleaning', 'Other'];
  const complaintData = categories.map(cat => ({
    name: cat,
    value: complaints.filter(c => c.category === cat).length
  }));

  const handleExportExcel = async () => {
    try {
      await exportToExcel(tenants, [], payments, undefined, stats);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const topStats = [
    { 
      label: 'Total Revenue', 
      value: `₹${stats.monthlyRevenue.toLocaleString()}`, 
      icon: CreditCard, 
      trend: revTrend >= 0 ? `+${revTrend}% ↑` : `${revTrend}% ↓`,
      trendColor: revTrend >= 0 ? 'text-emerald-500' : 'text-rose-500',
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50 dark:bg-emerald-500/10' 
    },
    { 
      label: 'Occupancy Rate', 
      value: `${occupancyRate}%`, 
      icon: Users, 
      trend: 'Stable',
      trendColor: 'text-gray-400',
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50 dark:bg-indigo-500/10' 
    },
    { 
      label: 'Open Complaints', 
      value: stats.openComplaints, 
      icon: BarChart3, 
      trend: stats.openComplaints > 5 ? 'Alert Needs Attention' : 'Manageable',
      trendColor: stats.openComplaints > 5 ? 'text-rose-500 font-black' : 'text-emerald-500',
      color: 'text-amber-600', 
      bg: 'bg-amber-50 dark:bg-amber-500/10' 
    },
    { 
      label: 'Vacant Beds', 
      value: stats.vacantBeds, 
      icon: DoorOpen, 
      trend: stats.vacantBeds < 3 ? 'Almost Full' : 'Available',
      trendColor: stats.vacantBeds < 3 ? 'text-amber-500' : 'text-emerald-500',
      color: 'text-rose-600', 
      bg: 'bg-rose-50 dark:bg-rose-500/10' 
    },
  ];

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Professional performance breakdown of your property</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            style={{ background: themeColor }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {topStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center ${stat.color} mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1">{stat.label}</p>
            <div className="flex items-baseline gap-2 font-display">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h3>
              <span className={cn("text-[10px] font-black tracking-tighter", stat.trendColor)}>{stat.trend}</span>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 blur-[60px] rounded-full opacity-10" style={{ background: themeColor }} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Revenue Trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight font-display">
                <TrendingUp className="w-5 h-5" style={{ color: themeColor }} />
                Revenue Trend
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-black text-emerald-500 tracking-widest flex items-center gap-1">
                   <TrendingUp className="w-3 h-3" />
                   {revTrend >= 0 ? `+${revTrend}% Growth` : `${revTrend}% Down`}
                </p>
                <span className="text-[10px] font-bold text-gray-400 tracking-widest">Compared to last period</span>
              </div>
             </div>
            <select className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-black text-gray-500 outline-none px-4 py-2 tracking-widest cursor-pointer">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            {revHistory.length === 0 || revHistory.every(d => d.revenue === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
                <CreditCard className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-black text-gray-400 tracking-widest">No revenue data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueRep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={themeColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800, fontFamily: 'Inter' }}
                      dy={10}
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        const date = new Date(parseInt(year), parseInt(month) - 1);
                        return date.toLocaleString('default', { month: 'short' });
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800, fontFamily: 'Inter' }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`}
                    />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: `${themeColor}EE`, 
                      backdropFilter: 'blur(10px)',
                      border: 'none',
                      borderRadius: '20px', 
                      color: '#fff',
                      boxShadow: `0 10px 30px -10px ${themeColor}66`
                    }}
                    itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={themeColor}
                    strokeWidth={5}
                    fillOpacity={1}
                    fill="url(#colorRevenueRep)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Occupancy Distribution */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] relative"
        >
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-8 tracking-tight font-display">
            <Users className="w-5 h-5" style={{ color: themeColor }} />
            Occupancy Distribution
          </h3>
          <div className="h-[280px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1500}
                >
                  <Cell fill={themeColor} />
                  <Cell fill={`${themeColor}22`} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-gray-900 dark:text-white leading-none font-display">
                {occupancyRate}%
              </span>
              <span className="text-[10px] font-black text-gray-400 tracking-[0.1em] mt-1">Occupied</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center mt-6 space-y-4">
             <div className="grid grid-cols-2 gap-8 w-full max-w-xs font-display">
                <div className="text-center p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                   <p className="text-[10px] font-black text-emerald-500 tracking-widest mb-1">Occupied</p>
                   <p className="text-2xl font-black text-gray-900 dark:text-white">{tenants.length}</p>
                </div>
                <div className="text-center p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                   <p className="text-[10px] font-black text-rose-500 tracking-widest mb-1">Vacant</p>
                   <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.vacantBeds}</p>
                </div>
             </div>
             <p className="text-[10px] font-black text-gray-400 tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" />
                Total Property Capacity: {tenants.length + stats.vacantBeds} Beds
             </p>
          </div>
        </motion.div>

        {/* Complaints by Category Fix */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px]"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight font-display">
              <BarChart3 className="w-5 h-5" style={{ color: themeColor }} />
              Complaints by Category
            </h3>
            {stats.openComplaints > 0 && (
               <span className="px-3 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] font-black rounded-lg tracking-widest font-sans">
                  Action Required
               </span>
            )}
          </div>
          <div className="h-[300px] w-full">
            {complaintData.every(d => d.value === 0) ? (
               <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
                  <AlertCircle className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                  <p className="text-xs font-black text-gray-400 tracking-widest">No complaints data</p>
                  <p className="text-[10px] text-gray-400 mt-1 font-black tracking-widest">Everything looks perfect!</p>
               </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintData} barGap={4} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800, fontFamily: 'Inter' }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: `${themeColor}05` }}
                    contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 10, 10]}>
                    {complaintData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value > 0 ? themeColor : `${themeColor}22`} 
                      />
                    ))}
                    <LabelList 
                      dataKey="value" 
                      position="top" 
                      style={{ fill: '#94A3B8', fontSize: '10px', fontWeight: '900', fontFamily: 'Inter' }} 
                      formatter={(val: number) => val === 0 ? '' : val}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Flat-wise Occupancy */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px]"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight font-display">
              <DoorOpen className="w-5 h-5" style={{ color: themeColor }} />
              Flat-wise Occupancy
            </h3>
             <span className="text-[10px] font-black text-gray-400 tracking-[0.05em]">
               {stats.occupancyByFlat.length} Total Flats
             </span>
          </div>
          <div className="space-y-7 pr-2">
            {stats.occupancyByFlat.map((flat, i) => {
               const percentage = flat.total === 0 ? 0 : Math.round((flat.occupied / flat.total) * 100);
               return (
                <div key={flat.name} className="space-y-2 group">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-gray-50/50 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 transition-all group-hover:scale-110" 
                            style={{ color: percentage > 70 ? themeColor : undefined }}>
                          {flat.name.charAt(0)}
                       </div>
                       <div>
                         <span className="text-[10px] font-black text-gray-400 tracking-[0.05em] block mb-0.5">Location</span>
                         <span className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight font-display">{flat.name}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-black text-gray-900 dark:text-white block font-display">{percentage}%</span>
                       <span className="text-[10px] font-black text-gray-400 tracking-widest">{flat.occupied} / {flat.total} Beds</span>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5 border border-gray-100/50 dark:border-white/5 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1.5, delay: 0.5 + i * 0.1 }}
                      className="h-full rounded-full relative"
                      style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}CC)` }}
                    >
                       <div className="absolute inset-x-0 top-0 h-[40%] bg-white/20" />
                    </motion.div>
                  </div>
                </div>
               );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

