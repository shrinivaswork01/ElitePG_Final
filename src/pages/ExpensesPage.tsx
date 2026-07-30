import React, { useState, useMemo, useEffect } from 'react';
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
  FileSpreadsheet,
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
import { ModernSelect } from '../components/ModernSelect';
import { SearchFilterCard } from '../components/SearchFilterCard';
import { ExpenseMobileList } from '../components/ExpenseMobileList';

const CATEGORIES: ExpenseCategory[] = ['apex', 'capital', 'operational', 'maintenance', 'salary', 'utility', 'other'];

const formatDateSafe = (dateStr?: string | null, pattern = 'dd MMM yyyy') => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? '—' : format(d, pattern);
  } catch {
    return '—';
  }
};

export const ExpensesPage = () => {
  const { user, users } = useAuth();
  const { expenses, salaryPayments, addExpense, updateExpense, deleteExpense, currentBranch, pgConfig } = useApp();
  


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [limit, setLimit] = useState(10);

  // Pagination hook
  const { data: paginatedExpenses, totalCount, isLoading, page, setPage, refetch } = usePaginatedData<any>({
    table: 'expenses',
    select: '*',
    ilikeFilters: searchTerm ? { title: searchTerm } : undefined,
    filters: {
      ...(filterCategory !== 'all' ? { category: filterCategory } : {}),
      month: filterMonth
    },
    limit: limit
  });

  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [bulkExpenseDeleteIds, setBulkExpenseDeleteIds] = useState<string[] | null>(null);

  const handleToggleSelectExpense = (id: string) => {
    setSelectedExpenseIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllExpenses = (checked: boolean) => {
    if (checked) {
      setSelectedExpenseIds((paginatedExpenses || []).map((e: any) => e.id));
    } else {
      setSelectedExpenseIds([]);
    }
  };

  useEffect(() => {
    setSelectedExpenseIds([]);
  }, [searchTerm, filterCategory, filterMonth, page]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setPage(1);
  }, [filterMonth, filterCategory, searchTerm]);

  const [formData, setFormData] = useState({
    title: '',
    category: 'operational' as ExpenseCategory,
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    receiptUrl: ''
  });

  const { totalMonthlyExpenses, opsTotal, salaryTotal } = useMemo(() => {
    const opsExpenses = expenses
      ?.filter(e => e.month === filterMonth && e.status !== 'rejected')
      .reduce((sum, e) => sum + e.amount, 0) || 0;
      
    const salaryExpenses = (salaryPayments || [])
      ?.filter(s => s.month === filterMonth && s.status === 'paid')
      .reduce((sum, s) => sum + s.amount, 0) || 0;
      
    return {
      totalMonthlyExpenses: opsExpenses + salaryExpenses,
      opsTotal: opsExpenses,
      salaryTotal: salaryExpenses
    };
  }, [expenses, salaryPayments, filterMonth]);

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
      const isPartner = user?.role === 'partner';
      const isCreator = (editingExpense.createdBy || (editingExpense as any).created_by) === user?.id;
      if (isPartner && !isCreator) {
        toast.error('You are not authorized to edit this expense.');
        return;
      }
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
    const filteredForExport = selectedExpenseIds.length > 0
      ? expenses.filter(e => selectedExpenseIds.includes(e.id))
      : expenses.filter(e => {
          const matchesSearch = searchTerm ? e.title.toLowerCase().includes(searchTerm.toLowerCase()) : true;
          const matchesCategory = filterCategory !== 'all' ? e.category?.toLowerCase() === filterCategory.toLowerCase() : true;
          const matchesMonth = e.month ? e.month === filterMonth : (e.date ? e.date.startsWith(filterMonth) : true);
          return matchesSearch && matchesCategory && matchesMonth;
        });
    
    exportExpensesExcel(
      filteredForExport, 
      [currentBranch], 
      `${filterMonth}_${filterCategory}`
    );
    if (selectedExpenseIds.length > 0) {
      toast.success(`Exported ${filteredForExport.length} selected expense(s) to Excel`);
    }
  };

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={(paginatedExpenses || []).length > 0 && selectedExpenseIds.length === (paginatedExpenses || []).length}
          onChange={(e) => handleSelectAllExpenses(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
            selectedExpenseIds.length === 0 && "opacity-0 group-hover:opacity-100"
          )}
        />
      ),
      accessorKey: 'id',
      cell: (e: any) => {
        const isSelected = selectedExpenseIds.includes(e.id);
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(ev) => {
              ev.stopPropagation();
              handleToggleSelectExpense(e.id);
            }}
            onClick={(ev) => ev.stopPropagation()}
            className={cn(
              "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
              !isSelected && "opacity-0 group-hover:opacity-100"
            )}
          />
        );
      },
      className: "w-10"
    },
    {
      header: 'Expense Details',
      accessorKey: 'title',
      sortable: true,
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
      accessorKey: 'amount',
      sortable: true,
      cell: (e) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-gray-900 dark:text-white">₹{Number(e?.amount || 0).toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 font-medium uppercase">{formatDateSafe(e?.date)}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (e) => getStatusBadge(e.status)
    },
    {
      header: 'Created By',
      sortable: true,
      sortFn: (a, b, direction) => {
        const creatorA = users?.find((u: any) => u.id === (a.createdBy || a.created_by))?.name || '';
        const creatorB = users?.find((u: any) => u.id === (b.createdBy || b.created_by))?.name || '';
        return direction === 'asc' ? creatorA.localeCompare(creatorB) : creatorB.localeCompare(creatorA);
      },
      cell: (e) => {
        const creator = users?.find((u: any) => u.id === (e.createdBy || e.created_by));
        const roleLabel = creator?.role === 'partner' ? 'Partner' : (creator?.role || 'Admin');
        return (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{creator?.name || 'System'}</span>
            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{roleLabel}</span>
          </div>
        );
      }
    },
    {
      header: 'Notes',
      accessorKey: 'description',
      sortable: true,
      cell: (e) => (
        <div className="max-w-[150px] text-xs text-gray-500 truncate" title={e.description || ''}>
          {e.description || '—'}
        </div>
      )
    },
    {
      header: 'Created At',
      accessorKey: 'created_at',
      sortable: true,
      cell: (e) => (
        <div className="text-xs text-gray-500 font-medium">
          {e.created_at ? format(parseISO(e.created_at), 'dd MMM yy') : '—'}
        </div>
      )
    },
    {
      header: '',
      cell: (e) => {
        const canApprove = ['super', 'admin'].includes(user?.role || '');
        const isPartner = user?.role === 'partner';
        const isCreator = (e.createdBy || e.created_by) === user?.id;
        
        const canEdit = (e.status !== 'approved' || canApprove) && (!isPartner || isCreator);
        const canSubmit = !canApprove && e.status === 'saved' && (!isPartner || isCreator);
        
        const hasOptions = canEdit || (canApprove && e.status === 'pending') || canSubmit;
        if (!hasOptions) return null;
        
        return (
          <div className="flex justify-end pr-2">
             <DropdownMenu buttonContent={<MoreVertical className="w-4 h-4 text-gray-400" />}>
              {canEdit && (
                <DropdownItem onClick={() => handleEdit(e)} icon={<Edit2 className="w-4 h-4" />} label="Edit Expense" />
              )}
              {canApprove && e.status === 'pending' && (
                <>
                  <DropdownItem onClick={() => handleApprove(e.id)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Approve" />
                  <DropdownItem onClick={() => handleReject(e.id)} icon={<XCircle className="w-4 h-4 text-rose-500" />} label="Reject" />
                </>
              )}
              {canSubmit && (
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
  ], [user, selectedExpenseIds, paginatedExpenses, users, pgConfig]);

  const isAdmin = ['super', 'admin', 'partner'].includes(user?.role || '');

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-12 sm:pl-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Manage expenditures for {currentBranch?.branchName || 'your branch'}.</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 h-11 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 btn-hover w-full sm:w-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Expense</span>
          </button>
        )}
      </div>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Expenditure */}
        <motion.div
          className="p-6 rounded-[2rem] shadow-lg relative overflow-hidden group text-white card-hover"
          style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-indigo-100 tracking-[0.05em] mb-1 uppercase">Total Expenditure</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white tracking-tight font-display">₹{totalMonthlyExpenses.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Operational Expense */}
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 mb-4">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 tracking-[0.05em] mb-1 uppercase">Operational Costs</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight font-display">₹{opsTotal.toLocaleString()}</h3>
          </div>
        </motion.div>

        {/* Salary Expense */}
        <motion.div className="bg-white dark:bg-[#0d0d0d] p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-500" />
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4">
            <PieChart className="w-6 h-6" />
          </div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-400 tracking-[0.05em] mb-1 uppercase">Salary Expenditure</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight font-display">₹{salaryTotal.toLocaleString()}</h3>
          </div>
        </motion.div>
      </div>

      <SearchFilterCard
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by title..."
        onExportExcel={handleExport}
        primaryColor={pgConfig?.primaryColor}
        rightElements={
          <>
            <ModernSelect
              value={filterCategory}
              onChange={(val) => setFilterCategory(val as any)}
              options={[
                { value: "all", label: "All Categories" },
                ...CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
              ]}
              className="w-full sm:w-40 font-bold text-xs sm:text-sm"
            />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 h-11 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-bold select-trigger-hover input-focus-glow outline-none [color-scheme:light] dark:[color-scheme:dark] text-gray-900 dark:text-white"
            />
          </>
        }
      />

      {/* Main Data View */}
      <div className="bg-white dark:bg-[#111111] rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <AnimatePresence>
          {selectedExpenseIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-50/50 dark:bg-indigo-500/5 border-b border-indigo-100 dark:border-indigo-500/20 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedExpenseIds.length} expense{selectedExpenseIds.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedExpenseIds([])}
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-bold"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md btn-hover"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export Selected Excel
                </button>
                <button
                  onClick={() => {
                    setBulkExpenseDeleteIds(selectedExpenseIds);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md btn-hover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Desktop DataGrid View */}
        <div className="hidden lg:block">
          <DataGrid
            data={paginatedExpenses || []}
            columns={columns}
            isLoading={isLoading}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            totalCount={totalCount || 0}
            keyExtractor={(item) => item.id}
            page={page}
            limit={limit}
          />
        </div>

        {/* Mobile List Card View */}
        <div className="lg:hidden">
          <ExpenseMobileList
            expenses={paginatedExpenses || []}
            isLoading={isLoading}
            users={users}
            currentUser={user}
            selectedIds={selectedExpenseIds}
            onToggleSelect={handleToggleSelectExpense}
            onSelectAll={handleSelectAllExpenses}
            onEdit={handleEdit}
            onDelete={deleteExpense}
            onApprove={handleApprove}
            onReject={handleReject}
            onSubmitForApproval={(expense) => updateExpense(expense.id, { status: 'pending' }).then(refetch)}
            onBulkDelete={(ids) => setBulkExpenseDeleteIds(ids)}
          />
          {paginatedExpenses.length > 0 && (
            <div className="mt-4 flex justify-center pb-8">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                Page {page} of {Math.ceil(totalCount / limit) || 1}
              </span>
              <button
                disabled={page * limit >= totalCount}
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Expenses Confirmation Modal */}
      <AnimatePresence>
        {bulkExpenseDeleteIds && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkExpenseDeleteIds(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0A0A0A] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Delete Selected Expenses?</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 px-4">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{bulkExpenseDeleteIds.length}</span> selected expense{bulkExpenseDeleteIds.length > 1 ? 's' : ''}? This action cannot be undone.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setBulkExpenseDeleteIds(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      for (const id of bulkExpenseDeleteIds) {
                        await deleteExpense(id);
                      }
                      toast.success(`${bulkExpenseDeleteIds.length} expense${bulkExpenseDeleteIds.length > 1 ? 's' : ''} deleted`);
                      setBulkExpenseDeleteIds(null);
                      setSelectedExpenseIds([]);
                      refetch();
                    }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                  >
                    Delete Expenses
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <ModernSelect
                      value={formData.category}
                      onChange={val => setFormData({ ...formData, category: val as ExpenseCategory })}
                      options={CATEGORIES.map(c => ({ value: c, label: c.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={formData.amount === 0 ? '' : formData.amount}
                      onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                      onChange={e => {
                        const val = e.target.value;
                        const num = val === '' ? 0 : Math.max(0, parseFloat(val) || 0);
                        setFormData({ ...formData, amount: num as any });
                      }}
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
