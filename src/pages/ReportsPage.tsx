import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  Receipt,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar,
  ChevronDown,
  Users,
  Wallet,
  DollarSign,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MultiSelect } from '../components/MultiSelect';
import { exportToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import {
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
  Legend
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { cn } from '../utils';

export const ReportsPage = () => {
  const { user, users } = useAuth();
  const { tenants, rooms, payments, complaints, expenses, salaryPayments, getStats, pgConfig, currentBranch, rawData, branches, updatePartnerShareBatch, addProfitDistribution, processPartnerPayoutBatch } = useApp();
  const [viewMode, setViewMode] = useState<'active' | 'combined'>('active');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'rent' | 'electricity' | 'token' | 'deposit' | 'adjustment'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 10;
  const [payoutMonth, setPayoutMonth] = useState(format(new Date(), 'yyyy-MM'));

  const canViewCombined = user?.role === 'super' || user?.role === 'admin' || user?.role === 'partner';
  const shouldRenderCombined = viewMode === 'combined' && canViewCombined;

  // Branch access filtering for combined view
  const userBranchIds = user?.branchIds || (user?.branchId ? [user.branchId] : []);
  const relevantBranchIds = useMemo(() => 
    user?.role === 'super' ? branches.map(b => b.id) : userBranchIds,
    [user, branches, userBranchIds]
  );
  
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(relevantBranchIds);

  // Sync selectedBranchIds if branches load after initial mount
  React.useEffect(() => {
    if (selectedBranchIds.length === 0 && relevantBranchIds.length > 0) {
      setSelectedBranchIds(relevantBranchIds);
    }
  }, [relevantBranchIds, selectedBranchIds.length]);

  // Helper to extract data
  const getRelevantData = (dataArray: any[]) => {
    if (!dataArray) return [];
    if (!shouldRenderCombined) {
       return dataArray.filter(item => item.branchId === currentBranch?.id || item.branch_id === currentBranch?.id);
    }
    // Combined mode - Filter by SPECIFICALLY selected branches
    return dataArray.filter(item => selectedBranchIds.includes(item.branchId || item.branch_id));
  };

  const currentPayments = shouldRenderCombined ? getRelevantData(rawData.payments || payments) : payments;
  const currentExpenses = shouldRenderCombined ? getRelevantData(rawData.expenses || expenses) : (expenses || []);
  const currentSalaries = shouldRenderCombined ? getRelevantData(rawData.salaryPayments || salaryPayments) : (salaryPayments || []);

  const themeColor = pgConfig?.primaryColor || '#4f46e5';
  const expenseColor = '#f43f5e'; // Rose for expenses
  
  const currentMonthStr = format(new Date(), 'yyyy-MM');

  // Revenue vs Expenses History (Last 6 Months)
  const historyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthStr = format(d, 'yyyy-MM');
      
      const rev = currentPayments
        .filter(p => p.month === monthStr && p.status === 'paid' && (p.paymentType || (p as any).payment_type || 'rent').toLowerCase() === 'rent')
        .reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);

      const expOps = currentExpenses
        .filter(e => e.month === monthStr && e.status !== 'rejected')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
        
      const expSalaries = currentSalaries
        .filter(s => s.month === monthStr && s.status === 'paid')
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      const exp = expOps + expSalaries;

      data.push({
        name: format(d, 'MMM yyyy'),
        revenue: rev,
        expenses: exp,
        profit: rev - exp,
        monthStr
      });
    }
    return data;
  }, [currentPayments, currentExpenses]);

  // Current Month Totals
  const currentMonthData = historyData[historyData.length - 1];
  const prevMonthData = historyData[historyData.length - 2];

  const calcTrend = (curr: number, prev: number) => prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);
  const revTrend = calcTrend(currentMonthData.revenue, prevMonthData.revenue);
  const expTrend = calcTrend(currentMonthData.expenses, prevMonthData.expenses);
  const profTrend = calcTrend(currentMonthData.profit, prevMonthData.profit);

  // Expense Categories for current month
  const expenseByCategory = useMemo(() => {
    const currentMonthExpenses = currentExpenses.filter(e => e.month === currentMonthStr && e.status !== 'rejected');
    const grouped = currentMonthExpenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Add Salary data
    const currentMonthSalaries = currentSalaries.filter(s => s.month === currentMonthStr && s.status === 'paid');
    const totalSalary = currentMonthSalaries.reduce((sum, s) => sum + s.amount, 0);
    if (totalSalary > 0) grouped['Salaries'] = (grouped['Salaries'] || 0) + totalSalary;

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: value as number }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  }, [currentExpenses, currentMonthStr]);

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#64748b'];

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
         shouldRenderCombined ? getRelevantData(rawData.tenants) : tenants, 
         shouldRenderCombined ? getRelevantData(rawData.rooms) : rooms, 
         currentPayments, 
         shouldRenderCombined ? getRelevantData(rawData.complaints) : complaints, 
         shouldRenderCombined ? [] : getRelevantData(rawData.meterGroups), 
         shouldRenderCombined ? undefined : currentBranch, 
         branches, 
         getStats(),
         currentExpenses
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Detailed Transaction Logs (Revenue + Expenses)
  const detailedLogs = useMemo(() => {
     const allRooms = shouldRenderCombined ? (rawData.rooms || rooms) : rooms;
     const allTenants = shouldRenderCombined ? (rawData.tenants || tenants) : tenants;

     let filteredPayments = currentPayments;
     if (transactionFilter !== 'all') {
       filteredPayments = currentPayments.filter(p => {
         const pType = (p.paymentType || (p as any).payment_type || 'rent').toLowerCase();
         if (transactionFilter === 'adjustment') return pType === 'adjust' || pType === 'adjustment';
         return pType === transactionFilter;
       });
     }

     const revenue = filteredPayments.map(p => {
        const room = allRooms.find((r: any) => r.id === p.roomId || r.id === (p as any).room_id);
        const tenant = allTenants.find((t: any) => t.id === p.tenantId || t.id === (p as any).tenant_id);
        const roomLabel = room?.roomNumber || room?.room_number || '—';
        const tenantLabel = tenant?.name || 'Tenant';
        return {
          type: ['rent', 'electricity'].includes((p.paymentType || (p as any).payment_type || 'rent').toLowerCase()) ? 'revenue' : 'other',
          branch_name: (branches.find(b => b.id === (p.branchId || p.branch_id))?.name || 'Unknown'),
          date: p.paymentDate || p.createdAt || p.month,
          category: p.paymentType || 'Rent',
          description: `Room ${roomLabel} — ${tenantLabel}`,
          amount: p.totalAmount
        };
     });

     // Only include expenses when filter is 'all' (specific payment type filters should exclude expenses)
     const exps = transactionFilter === 'all' ? currentExpenses.map(e => ({
        type: 'expense',
        branch_name: (branches.find(b => b.id === (e.branchId || e.branch_id))?.name || 'Unknown'),
        date: e.date,
        category: e.category,
        description: e.description || e.title || 'Expense',
        amount: -e.amount
     })) : [];

     return [...revenue, ...exps].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPayments, currentExpenses, branches, transactionFilter, rooms, tenants, rawData, shouldRenderCombined]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(detailedLogs.length / RECORDS_PER_PAGE));
  const paginatedLogs = detailedLogs.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [transactionFilter]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            Reports & Analytics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {shouldRenderCombined ? 'Combined overview for all branches' : `Overview for ${currentBranch?.name || 'Active Branch'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canViewCombined && (
             <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
               <button
                 onClick={() => setViewMode('active')}
                 className={cn(
                   "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                   viewMode === 'active' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow" : "text-gray-500"
                 )}
               >
                 Active Branch
               </button>
               <button
                 onClick={() => setViewMode('combined')}
                 className={cn(
                   "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                   viewMode === 'combined' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow" : "text-gray-500"
                 )}
               >
                 Combined View
               </button>
             </div>
          )}
          {shouldRenderCombined && (
             <MultiSelect
               options={branches
                 .filter(b => relevantBranchIds.includes(b.id))
                 .map(b => ({ id: b.id, label: b.name, subLabel: b.branchName }))
               }
               selectedIds={selectedBranchIds}
               onChange={setSelectedBranchIds}
               placeholder="Filter Branches"
               className="sm:w-56"
             />
          )}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Total Revenue (This Month)</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.revenue.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", revTrend >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {revTrend >= 0 ? `+${revTrend}% ↑` : `${revTrend}% ↓`}
            </span>
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Total Expenses (This Month)</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.expenses.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", expTrend <= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {expTrend > 0 ? `+${expTrend}% ↑` : `${expTrend}% ↓`}
            </span>
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Net Profit (This Month)</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.profit.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", profTrend >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {profTrend >= 0 ? `+${profTrend}% ↑` : `${profTrend}% ↓`}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 tracking-tight font-display">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                Financial Overview
              </h3>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">Revenue vs Expenses (6 Months)</p>
             </div>
          </div>
          <div className="flex-1 w-full">
            {historyData.every(d => d.revenue === 0 && d.expenses === 0) ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
                <AlertCircle className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm font-black text-gray-400 tracking-widest">No financial data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={themeColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={themeColor} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={expenseColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={expenseColor} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800, fontFamily: 'Inter' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800, fontFamily: 'Inter' }} tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={themeColor} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke={expenseColor} strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] relative"
        >
          <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2 tracking-tight font-display">
            <PieChartIcon className="w-5 h-5 text-rose-500" />
            Expenses Breakdown
          </h3>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-6">Current Month Categories</p>
          
          <div className="h-[250px] w-full flex items-center justify-center relative">
            {expenseByCategory.length === 0 ? (
               <div className="text-center text-gray-500 text-sm">No expenses recorded</div>
            ) : (
               <>
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie
                       data={expenseByCategory}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={90}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {expenseByCategory.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', color: '#fff' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}
                     />
                   </PieChart>
                 </ResponsiveContainer>
                 <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                   <span className="text-lg font-black text-gray-900 dark:text-white leading-none font-display">
                     ₹{currentMonthData.expenses >= 1000 ? (currentMonthData.expenses / 1000).toFixed(1) + 'k' : currentMonthData.expenses}
                   </span>
                 </div>
               </>
            )}
          </div>
          
          <div className="flex flex-col gap-2 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {expenseByCategory.map((cat, idx) => (
               <div key={cat.name} className="flex justify-between items-center text-xs">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                   <span className="text-gray-600 dark:text-gray-300 capitalize">{cat.name}</span>
                 </div>
                 <span className="font-bold text-gray-900 dark:text-white">₹{cat.value.toLocaleString()}</span>
               </div>
            ))}
          </div>
        </motion.div>

        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-1 lg:col-span-3 bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
         >
           <div className="p-6 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 font-display">
                 <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                 Monthly Financial Summary
              </h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead>
                    <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                       <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Month</th>
                       <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                       <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Expenses</th>
                       <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Net Profit</th>
                       <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Margin</th>
                    </tr>
                 </thead>
                 <tbody>
                    {[...historyData].reverse().map((row, i) => (
                       <tr key={row.monthStr} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{row.name}</td>
                          <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400 text-right">₹{row.revenue.toLocaleString()}</td>
                          <td className="px-6 py-4 font-medium text-rose-600 dark:text-rose-400 text-right">₹{row.expenses.toLocaleString()}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-right">₹{row.profit.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={cn(
                               "px-2 py-1 text-[10px] font-black rounded-lg",
                               row.profit > 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : (row.profit < 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" : "bg-gray-100 text-gray-500")
                            )}>
                               {row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0}%
                            </span>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="col-span-1 lg:col-span-3 bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
          >
             <div className="p-6 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                   <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 font-display">
                      <Receipt className="w-5 h-5 text-indigo-500" />
                      Detailed Transaction Logs
                   </h3>
                   <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase italic mt-1">Showing {paginatedLogs.length} of {detailedLogs.length} Records (Page {currentPage}/{totalPages})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                   {(['all', 'rent', 'electricity', 'token', 'deposit', 'adjustment'] as const).map(filter => (
                      <button
                         key={filter}
                         onClick={() => setTransactionFilter(filter)}
                         className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all",
                            transactionFilter === filter 
                               ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-sm" 
                               : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                         )}
                      >
                         {filter}
                      </button>
                   ))}
                </div>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                     <tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Branch Name</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Category</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     {paginatedLogs.length === 0 ? (
                        <tr>
                           <td colSpan={5} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-2 text-gray-400">
                                 <Receipt className="w-8 h-8 opacity-40" />
                                 <p className="text-xs font-black uppercase tracking-widest">No transactions found for this filter</p>
                              </div>
                           </td>
                        </tr>
                     ) : paginatedLogs.map((log, i) => (
                        <tr key={`${currentPage}-${i}`} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-black group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 transition-colors">
                                    {log.branch_name.charAt(0)}
                                 </div>
                                 <span className="font-bold text-gray-900 dark:text-white text-sm">{log.branch_name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}</td>
                           <td className="px-6 py-4">
                              <span className={cn(
                                 "px-2 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider",
                                 log.type === 'revenue' || log.type === 'other' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                              )}>
                                 {log.category}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 italic">{log.description}</td>
                           <td className={cn(
                              "px-6 py-4 font-black text-right transition-all group-hover:scale-105",
                              log.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                           )}>
                              {log.amount >= 0 ? '+' : ''}₹{Math.abs(log.amount).toLocaleString()}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
            {/* Pagination Controls */}
            {detailedLogs.length > RECORDS_PER_PAGE && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400">
                  {(currentPage - 1) * RECORDS_PER_PAGE + 1}–{Math.min(currentPage * RECORDS_PER_PAGE, detailedLogs.length)} of {detailedLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      currentPage === 1
                        ? "bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, idx) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-black transition-all",
                            currentPage === pageNum
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      currentPage === totalPages
                        ? "bg-gray-50 dark:bg-white/5 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-95"
                    )}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Profit Sharing System — Complete Rework */}
          {!shouldRenderCombined && (user?.role === 'super' || user?.role === 'admin' || user?.role === 'partner') && (() => {
            // === Month options (last 12 months) ===
            const monthOptions = Array.from({ length: 12 }, (_, i) => {
              const d = subMonths(new Date(), i);
              return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
            });

            // === Rent-only revenue for the selected payoutMonth ===
            const monthRentPayments = currentPayments.filter(p =>
              p.month === payoutMonth &&
              p.status === 'paid' &&
              (p.paymentType || (p as any).payment_type || 'rent').toLowerCase() === 'rent'
            );
            const monthRentRevenue = monthRentPayments.reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);

            // === Expenses for the selected payoutMonth ===
            const monthExpenseItems = currentExpenses.filter(e => e.month === payoutMonth && e.status !== 'rejected');
            const monthExpenseTotal = monthExpenseItems.reduce((sum, e) => sum + (e.amount || 0), 0);

            const monthSalaryItems = (shouldRenderCombined ? currentSalaries : salaryPayments).filter(s => s.month === payoutMonth && s.status === 'paid');
            const monthSalaryTotal = monthSalaryItems.reduce((sum, s) => sum + (s.amount || 0), 0);

            const totalExpenses = monthExpenseTotal + monthSalaryTotal;
            const netProfit = monthRentRevenue - totalExpenses;

            // === Partner shares ===
            const branchShares = (rawData.partnerShares || [])
              .filter((s: any) => s.branchId === currentBranch?.id && s.effectiveFrom <= payoutMonth)
              .sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom));
            const latestShareMonth = branchShares[0]?.effectiveFrom;
            const activeShares = latestShareMonth ? branchShares.filter((s: any) => s.effectiveFrom === latestShareMonth) : [];
            const totalRatio = activeShares.reduce((sum: number, s: any) => sum + s.ratio, 0);

            // === Payout status ===
            const rawPayouts = rawData.partnerPayouts || [];
            const monthPayouts = rawPayouts.filter((p: any) => p.month === payoutMonth && p.branchId === (currentBranch?.id || null));
            const isMonthLocked = monthPayouts.length > 0;

            const isAdmin = user?.role === 'super' || user?.role === 'admin';
            const isPartner = user?.role === 'partner';

            // Resolve partner names from users array
            const resolvePartnerName = (userId: string) => {
              const u = users.find((u: any) => u.id === userId);
              return u?.name || 'Partner';
            };
            const resolvePartnerEmail = (userId: string) => {
              const u = users.find((u: any) => u.id === userId);
              return u?.email || '';
            };

            // All rooms for description lookup
            const allRooms = shouldRenderCombined ? (rawData.rooms || rooms) : rooms;
            const allTenants = shouldRenderCombined ? (rawData.tenants || tenants) : tenants;
            const allEmployees = rawData.employees || [];

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-1 lg:col-span-3 bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm p-8 space-y-8"
              >
                {/* Header + Month Selector */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight font-display">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                      Profit Sharing & Payouts
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {currentBranch?.name || 'Active Branch'} • {isMonthLocked && <span className="text-amber-500">🔒 LOCKED</span>}
                    </p>
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={payoutMonth}
                      onChange={(e) => setPayoutMonth(e.target.value)}
                      className="pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 min-w-[200px]"
                    >
                      {monthOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Total Rent (Revenue)</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">₹{monthRentRevenue.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-600/60 font-bold mt-1">{monthRentPayments.length} payment{monthRentPayments.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="p-5 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt className="w-4 h-4 text-rose-500" />
                      <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Total Expenses</span>
                    </div>
                    <p className="text-2xl font-black text-rose-700 dark:text-rose-300">₹{totalExpenses.toLocaleString()}</p>
                    <p className="text-[10px] text-rose-600/60 font-bold mt-1">Ops: ₹{monthExpenseTotal.toLocaleString()} + Salaries: ₹{monthSalaryTotal.toLocaleString()}</p>
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl border",
                    netProfit >= 0
                      ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/10"
                      : "bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/10"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className={cn("w-4 h-4", netProfit >= 0 ? "text-indigo-500" : "text-amber-500")} />
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", netProfit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-amber-600 dark:text-amber-400")}>Net Profit</span>
                    </div>
                    <p className={cn("text-2xl font-black", netProfit >= 0 ? "text-indigo-700 dark:text-indigo-300" : "text-amber-700 dark:text-amber-300")}>₹{netProfit.toLocaleString()}</p>
                    <p className={cn("text-[10px] font-bold mt-1", netProfit >= 0 ? "text-indigo-600/60" : "text-amber-600/60")}>{netProfit >= 0 ? 'Distributable' : 'Loss — No payout'}</p>
                  </div>
                </div>

                {/* Admin Detailed Breakdown */}
                {isAdmin && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Rent Collected */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        Rent Collected ({monthRentPayments.length})
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {monthRentPayments.length === 0 ? (
                          <p className="text-xs text-gray-400 italic p-4 text-center">No rent payments for this month</p>
                        ) : monthRentPayments.map(p => {
                          const room = allRooms.find((r: any) => r.id === p.roomId || r.id === (p as any).room_id);
                          const tenant = allTenants.find((t: any) => t.id === p.tenantId || t.id === (p as any).tenant_id);
                          return (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">
                                  {(room?.roomNumber || room?.room_number || '?').toString().charAt(0)}
                                </div>
                                <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                                  Room {room?.roomNumber || room?.room_number || '—'} — {tenant?.name || 'Tenant'}
                                </span>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">+₹{(p.totalAmount || 0).toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-rose-500" />
                        Expenses ({monthExpenseItems.length + monthSalaryItems.length})
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {monthExpenseItems.length === 0 && monthSalaryItems.length === 0 ? (
                          <p className="text-xs text-gray-400 italic p-4 text-center">No expenses for this month</p>
                        ) : (
                          <>
                            {monthExpenseItems.map(e => (
                              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-500/10 text-rose-600 rounded text-[9px] font-black uppercase shrink-0">{e.category}</span>
                                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{e.title || e.description || 'Expense'}</span>
                                </div>
                                <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 ml-2">-₹{e.amount.toLocaleString()}</span>
                              </div>
                            ))}
                            {monthSalaryItems.map(s => {
                              const emp = allEmployees.find((e: any) => e.id === s.employeeId);
                              return (
                                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl text-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/10 text-amber-600 rounded text-[9px] font-black uppercase shrink-0">Salary</span>
                                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate">{emp?.name || 'Staff'}</span>
                                  </div>
                                  <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 ml-2">-₹{s.amount.toLocaleString()}</span>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Partner Share Table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      Partner Shares
                    </h4>
                    {isMonthLocked && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase">
                        <Lock className="w-3 h-3" /> Locked
                      </span>
                    )}
                  </div>

                  {activeShares.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                      <p className="text-xs text-gray-400 font-bold">No partner ratios defined for this month.</p>
                      <p className="text-[10px] text-gray-400 mt-1">Configure ratios in the Employees → Partners tab.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {totalRatio !== 100 && isAdmin && (
                        <p className="text-xs text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-xl">⚠ Total ratio is {totalRatio}% — must equal 100% before processing payouts.</p>
                      )}
                      {activeShares
                        // Only show partner-role users — admins/super cannot receive payouts
                        .filter((s: any) => {
                          const u = users.find((usr: any) => usr.id === s.userId);
                          return u?.role === 'partner';
                        })
                        .map((s: any) => {
                          const shareAmount = netProfit > 0 ? Math.round((netProfit * s.ratio) / 100) : 0;
                          const payout = monthPayouts.find((p: any) => p.partnerId === s.userId);
                          const isPaid = !!payout;
                          const paidAmount = payout?.amount || shareAmount;

                          // Partner can only see their own share
                          if (isPartner && s.userId !== user?.id) return null;

                          return (
                            <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-all gap-4">
                              {/* Partner Info */}
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black shrink-0">
                                  {resolvePartnerName(s.userId).charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{resolvePartnerName(s.userId)}</p>
                                  <p className="text-[10px] text-gray-400 font-medium truncate">{resolvePartnerEmail(s.userId)} • {s.ratio}% share</p>
                                </div>
                              </div>

                              {/* Amount + Action */}
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <p className="text-lg font-black text-gray-900 dark:text-white">₹{paidAmount.toLocaleString()}</p>
                                  <span className={cn(
                                    "px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider",
                                    isPaid ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" :
                                    netProfit > 0 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" :
                                    "bg-gray-100 dark:bg-white/5 text-gray-400"
                                  )}>
                                    {isPaid ? 'PAID' : netProfit > 0 ? 'PENDING' : '—'}
                                  </span>
                                </div>

                                {/* Per-Partner Pay Button — Admin/Super only */}
                                {isAdmin && (
                                  isPaid ? (
                                    <div className="flex items-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] font-black">
                                      <Lock className="w-3 h-3" /> Paid
                                    </div>
                                  ) : (
                                    <button
                                      disabled={netProfit <= 0 || totalRatio !== 100}
                                      onClick={async () => {
                                        const ok = await processPartnerPayoutBatch([{
                                          partnerId: s.userId,
                                          month: payoutMonth,
                                          branchId: currentBranch?.id || null,
                                          amount: shareAmount,
                                          status: 'PAID' as 'PAID' | 'PENDING'
                                        }]);
                                        if (ok) toast.success(`Paid ₹${shareAmount.toLocaleString()} to ${resolvePartnerName(s.userId)}`);
                                      }}
                                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                      Pay ₹{shareAmount.toLocaleString()}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Partial lock notice if some paid, some pending */}
                {isAdmin && activeShares.length > 0 && monthPayouts.length > 0 && monthPayouts.length < activeShares.filter((s: any) => {
                  const u = users.find((usr: any) => usr.id === s.userId);
                  return u?.role === 'partner';
                }).length && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                    <span className="text-xs text-amber-600 font-bold">⏳ Partial payout — {monthPayouts.length} of {activeShares.filter((s: any) => users.find((u: any) => u.id === s.userId)?.role === 'partner').length} partners paid for {format(parseISO(payoutMonth + '-01'), 'MMMM yyyy')}</span>
                  </div>
                )}

                {/* Payout History */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest border-b border-gray-100 dark:border-white/5 pb-2">Payout History</h4>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                      const branchContextId = currentBranch?.id || null;
                      const allPayouts = rawData.partnerPayouts || [];
                      const relevantPayouts = allPayouts.filter((p: any) => p.branchId === branchContextId);

                      // For partner role, filter to only their payouts
                      const filteredPayouts = isPartner
                        ? relevantPayouts.filter((p: any) => p.partnerId === user?.id)
                        : relevantPayouts;

                      const grouped = filteredPayouts.reduce((acc: any, p: any) => {
                        if (!acc[p.month]) acc[p.month] = { month: p.month, total: 0, payouts: [] };
                        acc[p.month].total += p.amount;
                        acc[p.month].payouts.push(p);
                        return acc;
                      }, {});

                      const groupedArr = Object.values(grouped).sort((a: any, b: any) => b.month.localeCompare(a.month));

                      if (groupedArr.length === 0) {
                        return (
                          <div className="h-32 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl opacity-50">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No payout history yet</p>
                          </div>
                        );
                      }

                      return groupedArr.map((g: any) => (
                        <div key={g.month} className="p-4 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                              <Lock className="w-3 h-3 text-amber-500" />
                              {format(parseISO(g.month + '-01'), 'MMMM yyyy')}
                            </span>
                            <span className="text-xs font-black text-emerald-600">₹{g.total.toLocaleString()} {isPartner ? 'Your Share' : 'Total Paid'}</span>
                          </div>
                          {!isPartner && (
                            <div className="grid grid-cols-2 gap-2">
                              {g.payouts.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-[10px] bg-white dark:bg-black/20 p-2 rounded-lg">
                                  <span className="text-gray-500 font-bold truncate">{resolvePartnerName(item.partnerId)}</span>
                                  <span className="font-bold text-gray-900 dark:text-white">₹{item.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </div>
  );
};
