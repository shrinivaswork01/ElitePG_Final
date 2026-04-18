import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Expense, ExpenseCategory, ExpenseStatus } from '../types';
import { Navigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { exportExpensesExcel } from '../utils/exportUtils';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Edit2, 
  Trash2, 
  PieChart,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import toast from 'react-hot-toast';

const CATEGORIES: ExpenseCategory[] = ['apex', 'capital', 'operational', 'maintenance', 'salary', 'utility', 'other'];

export const ExpensesPage = () => {
  const { user, users } = useAuth();
  const { expenses, addExpense, updateExpense, deleteExpense, currentBranch, pgConfig } = useApp();
  
  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Pagination hook
  const { data: paginatedExpenses, totalCount, isLoading, setPage, refetch } = usePaginatedData<any>({
    table: 'expenses',
    select: '*',
    ilikeFilters: searchTerm ? { title: searchTerm } : undefined,
    filters: {
      ...(filterCategory !== 'all' ? { category: filterCategory } : {}),
      month: filterMonth
    }
  });

  const [formData, setFormData] = useState({
    title: '',
    category: 'operational' as ExpenseCategory,
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    receiptUrl: ''
  });

  const totalMonthlyExpenses = useMemo(() => {
    return expenses
      ?.filter(e => e.month === filterMonth && e.status !== 'rejected')
      .reduce((sum, e) => sum + e.amount, 0) || 0;
  }, [expenses, filterMonth]);

  const handleOpenAdd = () => {
    setFormData({
      title: '',
      category: 'operational',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      receiptUrl: ''
    });
    setEditingExpense(null);
    setIsAddModalOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      title: expense.title,
      category: expense.category,
      amount: expense.amount.toString(),
      date: expense.date,
      description: expense.description || '',
      receiptUrl: expense.receiptUrl || ''
    });
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const payload = {
      ...formData,
      amount,
      month: formData.date.substring(0, 7),
      createdBy: user?.id || ''
    };

    if (editingExpense) {
      await updateExpense(editingExpense.id, payload);
    } else {
      await addExpense({ ...payload, status: 'saved' });
    }

    setIsAddModalOpen(false);
    refetch();
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    const map: Record<ExpenseStatus, { label: string, color: string, icon: any }> = {
      approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', icon: CheckCircle2 },
      pending: { label: 'Pending', color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', icon: Clock },
      rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', icon: XCircle },
      saved: { label: 'Saved', color: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400', icon: FileText }
    };
    const { label, color, icon: Icon } = map[status] || map.saved;
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", color)}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const handleApprove = async (id: string) => {
    await updateExpense(id, { status: 'approved', approvedBy: [user?.id || ''] });
    refetch();
    toast.success('Expense Approved');
  };

  const handleReject = async (id: string) => {
    await updateExpense(id, { status: 'rejected', rejectedBy: [user?.id || ''] });
    refetch();
    toast.success('Expense Rejected');
  };

  const handleExport = () => {
    if (!expenses || !currentBranch) return;
    const filteredForExport = expenses.filter(e => {
      const matchesSearch = searchTerm ? e.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      const matchesCategory = filterCategory !== 'all' ? e.category === filterCategory : true;
      const matchesMonth = e.month === filterMonth;
      return matchesSearch && matchesCategory && matchesMonth;
    });
    
    exportExpensesExcel(
      filteredForExport, 
      [currentBranch], 
      `${filterMonth}_${filterCategory}`
    );
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'Expense Details',
      accessorKey: 'title',
      cell: (e) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{e.title}</p>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{e.category}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Amount',
      // accessorKey: 'amount', // Removing accessorKey to avoid conflict with manual cell rendering
      cell: (e) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white">₹{e.amount.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 font-medium uppercase">{format(parseISO(e.date), 'dd MMM yyyy')}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (e) => getStatusBadge(e.status)
    },
    {
      header: 'Created By',
      cell: (e) => {
        const creator = users?.find((u: any) => u.id === (e.createdBy || e.created_by));
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{creator?.name || 'System'}</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{creator?.role || 'Admin'}</span>
          </div>
        );
      }
    },
    {
      header: 'Notes',
      accessorKey: 'description',
      cell: (e) => (
        <div className="max-w-[150px] text-xs text-gray-500 truncate" title={e.description || ''}>
          {e.description || '—'}
        </div>
      )
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      cell: (e) => (
        <div className="text-xs text-gray-500 font-medium">
          {e.created_at ? format(parseISO(e.created_at), 'dd MMM yy') : '—'}
        </div>
      )
    },
    {
      header: '',
      cell: (e) => {
        const isPartnerOrSuper = ['partner', 'super'].includes(user?.role || '');
        const canEdit = e.status !== 'approved' || isPartnerOrSuper;
        
        return (
          <div className="flex justify-end pr-2">
             <DropdownMenu buttonContent={<MoreVertical className="w-4 h-4 text-gray-400" />}>
              {canEdit && (
                <DropdownItem onClick={() => handleEdit(e)} icon={<Edit2 className="w-4 h-4" />} label="Edit Expense" />
              )}
              {isPartnerOrSuper && e.status === 'pending' && (
                <>
                  <DropdownItem onClick={() => handleApprove(e.id)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Approve" />
                  <DropdownItem onClick={() => handleReject(e.id)} icon={<XCircle className="w-4 h-4 text-rose-500" />} label="Reject" />
                </>
              )}
              {!isPartnerOrSuper && e.status === 'saved' && (
                <DropdownItem 
                  onClick={() => updateExpense(e.id, { status: 'pending' }).then(refetch)} 
                  icon={<Clock className="w-4 h-4 text-amber-500" />} 
                  label="Submit for Approval" 
                />
              )}
              {canEdit && (
                <DropdownItem onClick={() => deleteExpense(e.id)} icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete" danger />
              )}
            </DropdownMenu>
          </div>
        );
      }
    }
  ];

  const isAdmin = ['super', 'admin', 'partner'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-[#111111] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Receipt className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Expense Tracker</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md">
            Managing expenditures for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{currentBranch?.branchName || 'your business'}</span>
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
            className="w-full lg:w-auto px-8 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" />
            Add New Expense
          </button>
        )}
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111111] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Monthly Spend</p>
            <div className="flex items-end justify-between">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">₹{totalMonthlyExpenses.toLocaleString()}</h3>
              <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3" />
                <span className="text-[10px] font-bold">Standard</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-[10px] font-bold text-gray-400">
              <span>{format(parseISO(`${filterMonth}-01`), 'MMMM yyyy')}</span>
              <PieChart className="w-3 h-3 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white/50 dark:bg-white/5 p-4 rounded-[2rem] border border-gray-100 dark:border-white/5 backdrop-blur-md sticky top-0 z-20">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm group-hover:border-indigo-500/30"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative group">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
             <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as any)}
                className="pl-9 pr-8 py-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
             >
                <option value="all">Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:light] dark:[color-scheme:dark]"
          />

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Main Data View */}
      <div className="bg-white dark:bg-[#111111] rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <DataGrid
          data={paginatedExpenses}
          columns={columns}
          isLoading={isLoading}
          onPageChange={setPage}
          totalCount={totalCount}
          keyExtractor={(item) => item.id}
          page={1} // usePaginatedData handles internal page, but DataGrid wants it as prop
          limit={10} 
        />
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setIsAddModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                    {editingExpense ? 'Modify Expense' : 'Record New Expense'}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">Keep track of every rupee spent</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expense Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Office Rent, Maintenance..."
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none capitalize"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Briefly describe what this spend was for..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
                    className="flex-1 px-6 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/20"
                  >
                    {editingExpense ? 'Update Now' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
