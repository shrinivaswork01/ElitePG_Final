import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import {
  CheckCircle2, Receipt, Edit2,
  Trash2, X, Clock, Check, XCircle, MoreVertical
} from 'lucide-react';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownItem } from './DropdownMenu';

const formatDateSafe = (dateStr?: string | null, pattern = 'dd MMM yyyy') => {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isNaN(d.getTime()) ? '—' : format(d, pattern);
  } catch {
    return '—';
  }
};

interface ExpenseMobileListProps {
  expenses: any[];
  isLoading?: boolean;
  users?: any[];
  currentUser?: any;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onEdit?: (expense: any) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onSubmitForApproval?: (expense: any) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'approved':
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1"><Check className="w-3 h-3" /> Approved</span>;
    case 'rejected':
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
    case 'pending':
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
    default:
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400 border border-gray-200 dark:border-white/10 flex items-center gap-1">Saved</span>;
  }
};

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] animate-pulse">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-xl" />
          <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const ExpenseMobileCard = memo(({
  expense,
  users,
  currentUser,
  isSelected,
  isSelectionMode,
  onSelect,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onSubmitForApproval
}: {
  expense: any;
  users?: any[];
  currentUser?: any;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (id: string) => void;
  onEdit?: (expense: any) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onSubmitForApproval?: (expense: any) => void;
}) => {
  const handleLongPress = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    onSelect(expense.id);
  }, [onSelect, expense.id]);

  const handleClick = useCallback(() => {
    if (isSelectionMode) {
      onSelect(expense.id);
    }
  }, [isSelectionMode, onSelect, expense.id]);

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 400 });

  const creator = users?.find((u: any) => u.id === (expense.createdBy || expense.created_by));
  const canApprove = ['super', 'admin'].includes(currentUser?.role || '');
  const isPartner = currentUser?.role === 'partner';
  const isCreator = (expense.createdBy || expense.created_by) === currentUser?.id;

  const canEdit = (expense.status !== 'approved' || canApprove) && (!isPartner || isCreator);
  const canSubmit = !canApprove && expense.status === 'saved' && (!isPartner || isCreator);
  const hasOptions = canEdit || (canApprove && expense.status === 'pending') || canSubmit;

  return (
    <div
      {...longPressProps}
      className={cn(
        "relative select-none p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden",
        isSelected
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md transform scale-[0.98]"
          : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] shadow-sm active:scale-[0.98]"
      )}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 text-indigo-600 z-10">
          <CheckCircle2 className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-500/20">
          <Receipt className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
              {expense.title}
            </h3>
          </div>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider truncate">
            {expense.category} • {creator?.name || 'System'}
          </p>
        </div>
        {hasOptions && !isSelectionMode && (
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <DropdownMenu buttonContent={<MoreVertical className="w-4 h-4 text-gray-400" />}>
              {canEdit && onEdit && (
                <DropdownItem onClick={() => onEdit(expense)} icon={<Edit2 className="w-4 h-4" />} label="Edit Expense" />
              )}
              {canApprove && expense.status === 'pending' && onApprove && (
                <DropdownItem onClick={() => onApprove(expense.id)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Approve" />
              )}
              {canApprove && expense.status === 'pending' && onReject && (
                <DropdownItem onClick={() => onReject(expense.id)} icon={<XCircle className="w-4 h-4 text-rose-500" />} label="Reject" />
              )}
              {canSubmit && onSubmitForApproval && (
                <DropdownItem onClick={() => onSubmitForApproval(expense)} icon={<Clock className="w-4 h-4 text-amber-500" />} label="Submit for Approval" />
              )}
              {canEdit && onDelete && (
                <DropdownItem onClick={() => onDelete(expense.id)} icon={<Trash2 className="w-4 h-4 text-rose-500" />} label="Delete" danger />
              )}
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Amount</p>
          <p className="text-sm font-black text-gray-900 dark:text-white truncate">
            ₹{Number(expense.amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Date</p>
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {formatDateSafe(expense.date)}
          </p>
        </div>
      </div>

      {expense.description && (
        <div className="mb-3 px-3 py-2 bg-gray-50/70 dark:bg-white/[0.02] rounded-xl text-xs text-gray-500 dark:text-gray-400 truncate">
          {expense.description}
        </div>
      )}

      <div className="flex items-center justify-between">
        {getStatusBadge(expense.status)}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {formatDateSafe(expense.created_at || expense.createdAt, 'dd MMM yy')}
        </span>
      </div>
    </div>
  );
});

ExpenseMobileCard.displayName = 'ExpenseMobileCard';

export const ExpenseMobileList: React.FC<ExpenseMobileListProps> = ({
  expenses,
  isLoading,
  users,
  currentUser,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onSubmitForApproval,
  onBulkDelete
}) => {
  const isSelectionMode = selectedIds.length > 0;
  const allSelected = expenses.length > 0 && selectedIds.length === expenses.length;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-3">
      {/* Floating Selection Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-4 right-4 z-40 bg-gray-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectAll(!allSelected)}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white"
              >
                {allSelected ? <CheckCircle2 className="w-5 h-5 text-indigo-400" /> : <div className="w-4 h-4 rounded border-2 border-white/40" />}
              </button>
              <div>
                <p className="text-xs font-bold text-white">{selectedIds.length} Selected</p>
                <p className="text-[10px] text-gray-400">Tap item or check box to toggle</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onBulkDelete && (
                <button
                  onClick={() => onBulkDelete(selectedIds)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
              <button
                onClick={() => onSelectAll(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      {expenses.length === 0 ? (
        <div className="py-12 text-center text-sm font-bold text-gray-400 bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5">
          No expenses recorded.
        </div>
      ) : (
        expenses.map(expense => (
          <ExpenseMobileCard
            key={expense.id}
            expense={expense}
            users={users}
            currentUser={currentUser}
            isSelected={selectedIds.includes(expense.id)}
            isSelectionMode={isSelectionMode}
            onSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onApprove={onApprove}
            onReject={onReject}
            onSubmitForApproval={onSubmitForApproval}
          />
        ))
      )}
    </div>
  );
};
