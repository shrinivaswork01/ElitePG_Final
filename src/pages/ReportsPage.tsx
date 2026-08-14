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
  ShieldCheck,
  Download,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { MultiSelect } from '../components/MultiSelect';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { exportToExcel, exportTransactionLogsToExcel } from '../utils/exportUtils';
import toast from 'react-hot-toast';
import { ModernSelect } from '../components/ModernSelect';
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
import { cn, ROOM_CATEGORIES } from '../utils';

export const ReportsPage = () => {
  const { user, users } = useAuth();
  const { tenants, rooms, payments, complaints, expenses, salaryPayments, getStats, pgConfig, currentBranch, rawData, branches, updatePartnerShareBatch, addProfitDistribution, meterGroups } = useApp();
  const [viewMode, setViewMode] = useState<'active' | 'combined'>('active');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'rent' | 'electricity' | 'token' | 'deposit' | 'adjustment' | 'payout'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 10;
  const [payoutMonth, setPayoutMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Month filter for the entire reports page
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
    });
  }, []);

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

  const currentPayments = getRelevantData(rawData.payments || payments);
  const currentExpenses = getRelevantData(rawData.expenses || expenses);
  const currentSalaries = getRelevantData(rawData.salaryPayments || salaryPayments);

  const themeColor = pgConfig?.primaryColor || '#4f46e5';
  const expenseColor = '#f43f5e'; // Rose for expenses
  
  const currentMonthStr = selectedMonth;

  // Revenue vs Expenses History (6 months ending at selectedMonth)
  const historyData = useMemo(() => {
    const [selYear, selMon] = selectedMonth.split('-').map(Number);
    const selectedDate = new Date(selYear, selMon - 1, 1);
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(selectedDate, i);
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
  }, [currentPayments, currentExpenses, currentSalaries, selectedMonth]);

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
  }, [currentExpenses, currentSalaries, currentMonthStr]);

  const currentMonthPayoutsTotal = useMemo(() => {
    const monthPayouts = (rawData.partnerPayouts || [])
      .filter((p: any) => (shouldRenderCombined || p.branchId === currentBranch?.id) && p.month === currentMonthStr && p.status === 'PAID');
    return monthPayouts.reduce((sum: number, p: any) => sum + p.amount, 0);
  }, [rawData.partnerPayouts, shouldRenderCombined, currentBranch, currentMonthStr]);

  const remainingBalance = currentMonthData.profit - currentMonthPayoutsTotal;

  // Vacancy Data Logic
  const currentRooms = getRelevantData(rawData.rooms || rooms);
  const currentTenants = getRelevantData(rawData.tenants || tenants);
  const currentMeterGroups = getRelevantData(rawData.meterGroups || meterGroups);

  const [vacancyPage, setVacancyPage] = useState(1);
  const [vacancyLimit, setVacancyLimit] = useState(10);
  const [vacancyFilterBranch, setVacancyFilterBranch] = useState('all');

  const vacantRoomsList = useMemo(() => {
    let filtered = currentRooms.map(room => {
      const activeTenantsInRoom = currentTenants.filter(t => (t.roomId === room.id || t.room_id === room.id) && t.status === 'active');
      const vacantBedsCount = Math.max(0, (room.totalBeds || (room as any).total_beds || 0) - activeTenantsInRoom.length);
      return {
        ...room,
        activeCount: activeTenantsInRoom.length,
        vacantBedsCount
      };
    }).filter(room => room.vacantBedsCount > 0);

    if (vacancyFilterBranch !== 'all') {
      filtered = filtered.filter(r => (r.branchId || r.branch_id) === vacancyFilterBranch);
    }
    
    return filtered;
  }, [currentRooms, currentTenants, vacancyFilterBranch]);

  const totalVacantBedsCount = useMemo(() => {
    return vacantRoomsList.reduce((sum, r) => sum + (r.vacantBedsCount || 0), 0);
  }, [vacantRoomsList]);

  const paginatedVacantRooms = useMemo(() => {
    return vacantRoomsList.slice((vacancyPage - 1) * vacancyLimit, vacancyPage * vacancyLimit);
  }, [vacantRoomsList, vacancyPage, vacancyLimit]);

  const vacancyColumns: ColumnDef<any>[] = useMemo(() => [
    {
      header: 'Room',
      accessorKey: 'roomNumber',
      sortable: true,
      cell: (r) => <span className="font-bold text-gray-900 dark:text-white">Room {r.roomNumber || r.room_number || '—'}</span>
    },
    {
      header: 'Flat',
      sortable: true,
      sortFn: (a, b, direction) => {
        const mgIdA = a.meterGroupId || a.meter_group_id;
        const mgIdB = b.meterGroupId || b.meter_group_id;
        const flatA = currentMeterGroups.find(m => m.id === mgIdA)?.name || '';
        const flatB = currentMeterGroups.find(m => m.id === mgIdB)?.name || '';
        return direction === 'asc' ? flatA.localeCompare(flatB) : flatB.localeCompare(flatA);
      },
      cell: (r) => {
        const mgId = r.meterGroupId || r.meter_group_id;
        const flat = currentMeterGroups.find(m => m.id === mgId);
        return <span className="text-gray-500 font-medium">{flat?.name || '—'}</span>;
      }
    },
    {
      header: 'Branch',
      sortable: true,
      sortFn: (a, b, direction) => {
        const bIdA = a.branchId || a.branch_id;
        const bIdB = b.branchId || b.branch_id;
        const nameA = branches.find(b => b.id === bIdA)?.name || '';
        const nameB = branches.find(b => b.id === bIdB)?.name || '';
        return direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      },
      cell: (r) => {
        const bId = r.branchId || r.branch_id;
        const b = branches.find(b => b.id === bId);
        return <span className="text-indigo-600 dark:text-indigo-400 font-medium">{b?.name || '—'}</span>;
      }
    },
    {
      header: 'Total Beds',
      accessorKey: 'totalBeds',
      sortable: true,
      cell: (r) => <span className="font-bold text-gray-700 dark:text-gray-300">{r.totalBeds || r.total_beds || 0} Beds</span>
    },
    {
      header: 'Vacant Beds',
      accessorKey: 'vacantBedsCount',
      sortable: true,
      cell: (r) => <span className="font-bold text-indigo-600 dark:text-indigo-400">{r.vacantBedsCount || 0} Beds Vacant</span>
    },
    {
      header: 'Status',
      sortable: true,
      sortFn: (a, b, direction) => {
        const activeCountA = a.activeCount || 0;
        const activeCountB = b.activeCount || 0;
        return direction === 'asc' ? activeCountA - activeCountB : activeCountB - activeCountA;
      },
      cell: (r) => {
        const isFullyVacant = r.activeCount === 0;
        return (
          <span className={cn(
            "px-2 py-1 font-black uppercase text-[10px] tracking-widest rounded",
            isFullyVacant 
              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600" 
              : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
          )}>
            {isFullyVacant ? 'Fully Vacant' : 'Partially Vacant'}
          </span>
        );
      }
    }
  ], [currentMeterGroups, branches]);

  // Branch Comparison Logic
  const branchComparisonData = useMemo(() => {
    if (!shouldRenderCombined) return [];
    return branches.filter(b => selectedBranchIds.includes(b.id)).map(b => {
      const bPayments = currentPayments.filter(p => p.branchId === b.id || (p as any).branch_id === b.id);
      const bExpenses = currentExpenses.filter(e => e.branchId === b.id || (e as any).branch_id === b.id);
      const bSalaries = currentSalaries.filter(s => s.branchId === b.id || (s as any).branch_id === b.id);

      const rev = bPayments
        .filter(p => p.month === currentMonthStr && p.status === 'paid' && (p.paymentType || (p as any).payment_type || 'rent').toLowerCase() === 'rent')
        .reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);

      const exp = bExpenses
        .filter(e => e.month === currentMonthStr && e.status !== 'rejected')
        .reduce((sum, e) => sum + (e.amount || 0), 0) + 
        bSalaries
        .filter(s => s.month === currentMonthStr && s.status === 'paid')
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      return { id: b.id, name: b.name, revenue: rev, expenses: exp, profit: rev - exp };
    }).sort((a, b) => b.profit - a.profit);
  }, [branches, selectedBranchIds, currentPayments, currentExpenses, currentSalaries, currentMonthStr, shouldRenderCombined]);

  const branchColumns: ColumnDef<any>[] = useMemo(() => [
    { header: 'Branch', accessorKey: 'name', sortable: true, cell: (b) => <span className="font-bold text-gray-900 dark:text-white">{b.name}</span> },
    { header: 'Revenue', accessorKey: 'revenue', sortable: true, cell: (b) => <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{b.revenue.toLocaleString()}</span> },
    { header: 'Expenses', accessorKey: 'expenses', sortable: true, cell: (b) => <span className="text-rose-600 dark:text-rose-400 font-bold">₹{b.expenses.toLocaleString()}</span> },
    { header: 'Profit', accessorKey: 'profit', sortable: true, cell: (b) => <span className={cn("font-bold font-display", b.profit >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400")}>₹{b.profit.toLocaleString()}</span> }
  ], []);

  // Stats for Vacancy Section
  const totalRooms = currentRooms.length;
  const totalBeds = currentRooms.reduce((sum, r) => sum + (r.totalBeds || (r as any).total_beds || 0), 0);
  const occupiedBeds = currentTenants.filter(t => t.status === 'active').length;
  const vacantBeds = totalBeds - occupiedBeds;
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
  const vacancyRate = totalBeds > 0 ? (vacantBeds / totalBeds) * 100 : 0;

  const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#64748b'];

  const handleExportExcel = async () => {
    try {
      await exportToExcel(
         currentTenants, 
         currentRooms, 
         currentPayments, 
         getRelevantData(rawData.complaints || complaints), 
         currentMeterGroups, 
         shouldRenderCombined ? undefined : currentBranch, 
         branches, 
         { 
           ...getStats(), 
           currentMonthPayouts: currentMonthPayoutsTotal,
           remainingBalance: remainingBalance,
           vacantRoomsList,
           branchComparisonData,
           partnerPayouts: (rawData.partnerPayouts || []).filter((p: any) => 
             (shouldRenderCombined || p.branchId === currentBranch?.id) && 
             p.month === currentMonthStr && 
             p.status === 'PAID'
           )
         },
         currentExpenses,
         selectedMonth,
         currentSalaries
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleExportDetailedLogs = async () => {
    try {
      await exportTransactionLogsToExcel(detailedLogs);
      toast.success('Detailed Transaction Logs Export Generated Successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate export');
    }
  };

  const detailedLogs = useMemo(() => {
     const allRooms = shouldRenderCombined ? (rawData.rooms || rooms) : rooms;
     const allTenants = shouldRenderCombined ? (rawData.tenants || tenants) : tenants;

     // Filter payments to selected month
     let monthFilteredPayments = currentPayments.filter(p => p.month === currentMonthStr);
     let filteredPayments = monthFilteredPayments;
     if (transactionFilter !== 'all') {
       filteredPayments = monthFilteredPayments.filter(p => {
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
        const pType = (p.paymentType || (p as any).payment_type || 'rent').toLowerCase();
        return {
          type: pType === 'rent' ? 'revenue' : 'other',
          branch_name: (branches.find(b => b.id === (p.branchId || p.branch_id))?.name || 'Unknown'),
          date: p.paymentDate || p.createdAt || p.month,
          category: p.paymentType || 'Rent',
          description: `Room ${roomLabel} — ${tenantLabel}`,
          amount: p.totalAmount
        };
     });

     const monthFilteredExpenses = currentExpenses.filter(e => e.month === currentMonthStr);
     const exps = (transactionFilter === 'all' || transactionFilter === 'adjustment') ? monthFilteredExpenses.map(e => ({
        type: 'expense',
        branch_name: (branches.find(b => b.id === (e.branchId || e.branch_id))?.name || 'Unknown'),
        date: e.date,
        category: e.category,
        description: e.description || e.title || 'Expense',
        amount: -e.amount
     })) : [];

     const currentPayouts = (rawData?.partnerPayouts || []).filter((p: any) => (shouldRenderCombined || p.branchId === currentBranch?.id) && p.month === currentMonthStr) || [];
     const payoutsArr = (transactionFilter === 'all' || transactionFilter === 'payout') ? currentPayouts.filter((p: any) => p.status === 'PAID').map((p: any) => {
        const partnerName = rawData.users?.find((u: any) => u.id === p.partnerId)?.name || 'Partner';
        return {
          type: 'expense',
          branch_name: (branches.find(b => b.id === (p.branchId || p.branch_id))?.name || 'Unknown'),
          date: p.createdAt || p.month,
          category: 'Partner Payout',
          description: `Profit Distribution — ${partnerName}`,
          amount: -p.amount
        };
     }) : [];

     return [...revenue, ...exps, ...payoutsArr].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPayments, currentExpenses, branches, transactionFilter, rooms, tenants, rawData, shouldRenderCombined, currentBranch, currentMonthStr]);

  const totalPages = Math.max(1, Math.ceil(detailedLogs.length / RECORDS_PER_PAGE));
  const paginatedLogs = detailedLogs.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE);

  React.useEffect(() => { setCurrentPage(1); }, [transactionFilter, currentMonthStr]);
  React.useEffect(() => { setVacancyPage(1); }, [vacancyFilterBranch]);

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {shouldRenderCombined ? 'Combined overview for all branches' : `Overview for ${currentBranch?.name || 'Active Branch'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {canViewCombined && (
             <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
               <button onClick={() => setViewMode('active')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'active' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow" : "text-gray-500")}>Active Branch</button>
               <button onClick={() => setViewMode('combined')} className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", viewMode === 'combined' ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow" : "text-gray-500")}>Combined View</button>
             </div>
          )}
          {shouldRenderCombined ? (
             <MultiSelect
               options={branches.filter(b => relevantBranchIds.includes(b.id)).map(b => ({
                 id: b.id,
                 label: b.name || b.branchName || 'Unnamed Branch',
                 subLabel: (b.name && b.branchName && b.name !== b.branchName) ? b.branchName : ''
               }))}
               selectedIds={selectedBranchIds}
               onChange={setSelectedBranchIds}
               placeholder="Filter Branches"
               className="sm:w-56"
             />
          ) : (
             <div className="sm:w-56 flex-shrink-0">
               <ModernSelect
                 disabled
                 value="active"
                 onChange={() => {}}
                 options={[{ value: "active", label: currentBranch?.name || 'Active Branch' }]}
                 className="text-center font-bold"
               />
             </div>
          )}
          {/* Month Filter Dropdown */}
          <div className="relative flex-shrink-0">
            <ModernSelect
              value={selectedMonth}
              onChange={(val) => setSelectedMonth(val)}
              options={monthOptions}
              className="min-w-[180px] font-bold"
            />
          </div>
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black btn-hover shadow-lg shadow-indigo-600/20" style={{ background: themeColor }}>
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* 1. FINANCIAL SUMMARY SECTION (Top level) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Total Revenue ({monthOptions.find(m => m.value === selectedMonth)?.label?.split(' ')[0] || 'This Month'})</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.revenue.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", revTrend >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {revTrend >= 0 ? `+${revTrend}% ↑` : `${revTrend}% ↓`}
            </span>
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Total Expenses ({monthOptions.find(m => m.value === selectedMonth)?.label?.split(' ')[0] || 'This Month'})</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.expenses.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", expTrend <= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {expTrend > 0 ? `+${expTrend}% ↑` : `${expTrend}% ↓`}
            </span>
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Net Profit ({monthOptions.find(m => m.value === selectedMonth)?.label?.split(' ')[0] || 'This Month'})</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthData.profit.toLocaleString()}</h3>
            <span className={cn("text-[10px] font-black tracking-tighter", profTrend >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
              {profTrend >= 0 ? `+${profTrend}% ↑` : `${profTrend}% ↓`}
            </span>
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase">Partner Payouts (Paid)</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">₹{currentMonthPayoutsTotal.toLocaleString()}</h3>
          </div>
        </motion.div>

        <motion.div
          className={cn("p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group card-hover", remainingBalance > 0 ? "text-white" : "bg-white dark:bg-[#0d0d0d] border-gray-100 dark:border-white/5")}
          style={remainingBalance > 0 ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all" />
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", remainingBalance > 0 ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600")}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className={cn("text-[10px] font-black tracking-[0.05em] mb-1 uppercase", remainingBalance > 0 ? "text-indigo-100" : "text-gray-400")}>Remaining Balance</p>
          <div className="flex items-baseline gap-2 font-display">
            <h3 className="text-2xl font-black tracking-tight">₹{remainingBalance.toLocaleString()}</h3>
          </div>
        </motion.div>
      </div>

      {/* 2. CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white dark:bg-[#0d0d0d] p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] flex flex-col card-hover">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-tight">Financial Overview</h3>
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1 uppercase italic">Revenue vs Expenses (6 Months)</p>
             </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                   <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={themeColor} stopOpacity={0.3}/><stop offset="95%" stopColor={themeColor} stopOpacity={0}/></linearGradient>
                   <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/><stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px' }} 
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke={themeColor} strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-6 mt-4 justify-center">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
               <div className="w-3 h-3 rounded-full bg-indigo-500" /> Revenue
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
               <div className="w-3 h-3 rounded-full bg-rose-500" /> Expenses
             </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#0d0d0d] p-8 rounded-[3rem] border border-gray-100 dark:border-white/5 shadow-sm min-h-[450px] flex flex-col card-hover">
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-tight">Expenses Breakdown</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-1 uppercase italic">{monthOptions.find(m => m.value === selectedMonth)?.label || 'Selected Month'} Categories</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
             <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                   <Pie data={expenseByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {expenseByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px', color: '#fff', fontSize: '12px' }} 
                     itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                     labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                   />
                </PieChart>
             </ResponsiveContainer>
             <div className="w-full space-y-3 mt-6 custom-scrollbar max-h-[120px] overflow-y-auto">
                {expenseByCategory.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="text-xs font-bold text-gray-500 capitalize">{item.name}</span></div>
                    <span className="text-xs font-black text-gray-900 dark:text-white">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
             </div>
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden card-hover">
        <div className="p-6 border-b border-gray-100 dark:border-white/5"><h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-tight">History Records</h3></div>
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[600px]">
              <thead><tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                 <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Month</th>
                 <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                 <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Expenses</th>
                 <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Net Profit</th>
                 <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Margin (%)</th>
              </tr></thead>
              <tbody>{[...historyData].reverse().map((row) => (
                 <tr key={row.monthStr} className="grid-row-hover border-b border-gray-50 dark:border-white/5">
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{row.name}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600 text-right font-display">₹{row.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium text-rose-600 text-right font-display">₹{row.expenses.toLocaleString()}</td>
                    <td className="px-6 py-4 font-black text-gray-900 dark:text-white text-right font-display">₹{row.profit.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                       <span className={cn("px-2 py-1 text-[10px] font-black rounded-lg", row.profit >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10")}>
                          {row.revenue > 0 ? Math.round((row.profit / row.revenue) * 100) : 0}%
                       </span>
                    </td>
                 </tr>
              ))}</tbody>
           </table>
        </div>
      </motion.div>

      {/* 3. VACANCY SECTION */}
      <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm p-6 overflow-hidden card-hover">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight font-display">Vacant Beds Overview</h3>
             <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest italic">Total {totalVacantBedsCount} Vacant Beds Across {vacantRoomsList.length} Rooms</p>
          </div>
            {shouldRenderCombined && (() => {
              const vacancyBranchOptions = [
                { value: "all", label: "All Branches" },
                ...branches.filter(b => selectedBranchIds.includes(b.id)).map(b => ({
                  value: b.id,
                  label: b.name
                }))
              ];
              return (
                <ModernSelect
                  value={vacancyFilterBranch}
                  onChange={(val) => setVacancyFilterBranch(val)}
                  options={vacancyBranchOptions}
                  className="w-48 font-bold"
                />
              );
            })()}
        </div>
        <DataGrid columns={vacancyColumns} data={paginatedVacantRooms} isLoading={false} keyExtractor={(r) => r.id} page={vacancyPage} limit={vacancyLimit} totalCount={vacantRoomsList.length} onPageChange={setVacancyPage} onLimitChange={(newLimit) => { setVacancyLimit(newLimit); setVacancyPage(1); }} emptyStateMessage="No vacant beds currently" compact />
      </div>

      {/* 4. VACANCY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase relative z-10">Total Rooms</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight relative z-10">{totalRooms}</h3>
        </motion.div>
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <p className="text-[10px] font-black text-gray-400 tracking-[0.05em] mb-1 uppercase relative z-10">Total Beds</p>
          <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight relative z-10">{totalBeds}</h3>
        </motion.div>
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <p className="text-[10px] font-black text-emerald-500 tracking-[0.05em] mb-1 uppercase relative z-10">Occupied Beds</p>
          <div className="flex items-baseline gap-2 relative z-10"><h3 className="text-2xl font-black text-emerald-600 tracking-tight">{occupiedBeds}</h3><span className="text-[10px] font-black text-emerald-500">({occupancyRate.toFixed(1)}%)</span></div>
        </motion.div>
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <p className="text-[10px] font-black text-amber-500 tracking-[0.05em] mb-1 uppercase relative z-10">Vacant Beds</p>
          <div className="flex items-baseline gap-2 relative z-10"><h3 className="text-2xl font-black text-amber-600 tracking-tight">{vacantBeds}</h3><span className="text-[10px] font-black text-amber-500">({vacancyRate.toFixed(1)}%)</span></div>
        </motion.div>
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <p className="text-[10px] font-black text-rose-500 tracking-[0.05em] mb-1 uppercase relative z-10">Vacant Rooms</p>
          <h3 className="text-2xl font-black text-rose-600 tracking-tight relative z-10">{vacantRoomsList.length}</h3>
        </motion.div>
      </div>

      {/* 5. ROOM CATEGORY BREAKDOWN */}
      {(() => {
        const categoryBreakdown = ROOM_CATEGORIES.map(cat => {
          const catRooms = currentRooms.filter(r =>
            (r.roomCategory || r.room_category) === cat.id
          );
          const totalBedsCat = catRooms.reduce((sum: number, r: any) => sum + (r.totalBeds || r.total_beds || 0), 0);
          const occupiedBedsCat = currentTenants.filter((t: any) =>
            catRooms.some((r: any) => r.id === (t.roomId || t.room_id)) && t.status === 'active'
          ).length;
          return {
            ...cat,
            roomCount: catRooms.length,
            totalBeds: totalBedsCat,
            occupiedBeds: occupiedBedsCat,
            vacantBeds: Math.max(0, totalBedsCat - occupiedBedsCat),
            occupancy: totalBedsCat > 0 ? Math.round((occupiedBedsCat / totalBedsCat) * 100) : 0
          };
        }).filter(c => c.roomCount > 0);

        if (categoryBreakdown.length === 0) return null;

        return (
          <div className="bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm p-6">
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight font-display mb-1">Room Category Breakdown</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase italic mb-6">Occupancy by room role across all linked flats</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {categoryBreakdown.map(cat => (
                <div key={cat.id} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/3">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">{cat.label}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{cat.roomCount} Room{cat.roomCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-gray-400">Occupied</span>
                      <span className="text-gray-900 dark:text-white">{cat.occupiedBeds} / {cat.totalBeds} beds</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${cat.occupancy}%`, backgroundColor: cat.occupancy >= 80 ? '#ef4444' : cat.occupancy >= 50 ? '#f59e0b' : '#22c55e' }}
                      />
                    </div>
                    <p className="text-[10px] font-black text-right" style={{ color: cat.occupancy >= 80 ? '#ef4444' : cat.occupancy >= 50 ? '#f59e0b' : '#22c55e' }}>{cat.occupancy}% occupied</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {shouldRenderCombined && branchComparisonData.length > 0 && (
        <div className="bg-white dark:bg-[#111111] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm p-8 overflow-hidden mt-8">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight font-display">Branch Comparison ({monthOptions.find(m => m.value === selectedMonth)?.label || 'Selected Month'})</h3>
          <DataGrid columns={branchColumns} data={branchComparisonData} isLoading={false} keyExtractor={(b) => b.id} page={1} limit={100} totalCount={branchComparisonData.length} onPageChange={() => {}} compact />
        </div>
      )}

      {/* Transaction Logs */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden mt-8 card-hover">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 font-display uppercase tracking-tight"><Receipt className="w-6 h-6 text-indigo-500" /> Detailed Transaction Logs</h3>
                <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase italic mt-1">Showing {paginatedLogs.length} of {detailedLogs.length} Records</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'rent', 'electricity', 'token', 'deposit', 'adjustment', 'payout'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTransactionFilter(filter)}
                  className={cn(
                    "chip-hover px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer",
                    transactionFilter === filter
                      ? "text-white shadow-lg shadow-indigo-600/20 chip-active"
                      : "bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                  )}
                  style={transactionFilter === filter ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
                >
                  {filter}
                </button>
              ))}
              <button
                onClick={handleExportDetailedLogs}
                className="flex items-center gap-2 px-6 py-2.5 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-600/20 btn-hover shrink-0"
                style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
                title="Export Detailed Transaction Logs to Excel"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead><tr className="bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Branch Name</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Description</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
              </tr></thead>
              <tbody>{paginatedLogs.length === 0 ? (<tr><td colSpan={5} className="px-6 py-20 text-center"><div className="flex flex-col items-center gap-3 text-gray-300 dark:text-gray-600"><Receipt className="w-12 h-12 opacity-20" /><p className="text-sm font-black uppercase tracking-widest">No matching logs found</p></div></td></tr>) : paginatedLogs.map((log, i) => (
                    <tr key={`${currentPage}-${i}`} className="grid-row-hover border-b border-gray-50 dark:border-white/5 group">
                        <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-sm font-black text-gray-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">{log.branch_name.charAt(0)}</div><span className="font-bold text-gray-900 dark:text-white">{log.branch_name}</span></div></td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : 'N/A'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                            (() => {
                              const cat = (log.category || '').toLowerCase();
                              if (cat === 'token' || cat === 'deposit') {
                                return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
                              }
                              if (cat === 'rent') {
                                return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                              }
                              return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400";
                            })()
                          )}>
                            {log.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 italic max-w-[200px] truncate">{log.description}</td>
                        <td className={cn(
                          "px-6 py-4 font-black text-right font-display text-base",
                          (() => {
                            const cat = (log.category || '').toLowerCase();
                            if (cat === 'token' || cat === 'deposit') {
                              return "text-indigo-600 dark:text-indigo-400";
                            }
                            return log.amount >= 0 ? "text-emerald-600" : "text-rose-600";
                          })()
                        )}>
                          {log.amount >= 0 ? '+' : ''}₹{Math.abs(log.amount).toLocaleString()}
                        </td>
                    </tr>
                ))}</tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-8 py-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.01]">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {currentPage} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={cn("p-2 rounded-xl border border-gray-100 dark:border-white/5 disabled:opacity-20 hover:bg-white dark:hover:bg-white/5 transition-all")}><ChevronLeft className="w-5 h-5" /></button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1).map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i-1] !== p - 1 && <span className="text-gray-400 px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-xs font-black transition-all",
                          currentPage === p
                            ? "text-white shadow-lg shadow-indigo-600/20 scale-110"
                            : "text-gray-500 hover:bg-white dark:hover:bg-white/5"
                        )}
                        style={currentPage === p ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={cn("p-2 rounded-xl border border-gray-100 dark:border-white/5 disabled:opacity-20 hover:bg-white dark:hover:bg-white/5 transition-all")}><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
      </motion.div>
    </div>
  );
};

export default ReportsPage;
