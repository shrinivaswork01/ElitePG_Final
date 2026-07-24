import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { Payment } from '../types';
import {
  CheckCircle2, FileText, Edit2,
  Trash2, Share2, X, Clock, CreditCard, FileSpreadsheet
} from 'lucide-react';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import { useApp } from '../context/AppContext';

interface PaymentMobileListProps {
  payments: any[];
  isLoading?: boolean;
  onManage: (p: Payment) => void;
  onEdit: (p: Payment) => void;
  onDownloadReceipt: (p: Payment) => void;
  onShareReceipt: (p: Payment) => void;
  onDelete: (p: Payment) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkShare: (ids: string[]) => void;
  onBulkExport?: (ids: string[]) => void;
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] animate-pulse">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-white/5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-white/5 rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-white/5 rounded w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
          <div className="h-10 bg-gray-200 dark:bg-white/5 rounded-xl" />
          <div className="h-10 bg-gray-200 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const ActionButton = ({ icon: Icon, label, primary, danger, onClick }: {
  icon: any;
  label: string;
  primary?: boolean;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all font-bold text-xs shrink-0 min-w-[64px]",
      primary ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" :
      danger ? "bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20" :
      "bg-white/10 text-gray-200 dark:text-gray-800 hover:bg-white/20"
    )}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const PaymentMobileCard = memo(({
  payment,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onManage
}: {
  payment: any;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onManage: (p: any) => void;
}) => {
  const handleLongPress = useCallback(() => {
    onToggleSelect(payment.id);
  }, [onToggleSelect, payment.id]);

  const handleClick = useCallback(() => {
    if (isSelectionMode) {
      onToggleSelect(payment.id);
    } else {
      onManage(payment);
    }
  }, [isSelectionMode, onToggleSelect, payment, onManage]);

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 400 });

  const tenantName = payment.tenants?.name || 'Unknown Tenant';
  const roomNumber = payment.tenants?.rooms?.room_number ? `Room ${payment.tenants.rooms.room_number}` : 'No Room';

  const { pgConfig } = useApp();

  return (
    <motion.div
      {...longPressProps}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-3xl border transition-all duration-300 mb-3 overflow-hidden",
        isSelected 
          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 ring-2 ring-indigo-500/20" 
          : "bg-white border-gray-100 dark:bg-[#111111] dark:border-white/5 shadow-sm"
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 text-indigo-600">
          <CheckCircle2 className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900" />
        </div>
      )}

      {/* Main info header */}
      <div className="flex items-start gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs"
          style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
        >
          {tenantName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{tenantName}</h4>
          <p className="text-xs font-semibold text-gray-400 truncate">{roomNumber} • {payment.month}</p>
        </div>
      </div>

      {/* Grid details */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Amount</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            ₹{(payment.total_amount || payment.totalAmount || payment.amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Method</p>
          <div className="flex items-center gap-1.5 min-w-0">
            <CreditCard className="w-3 h-3 text-indigo-500 shrink-0" />
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
              {((payment.method || '').toUpperCase() === 'OFFLINE' ? 'CASH' : (payment.method || '').toUpperCase()) || '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
          payment.status === 'paid' 
            ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
            : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
        )}>
          {payment.status}
        </span>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {payment.payment_date || payment.paymentDate ? format(parseISO(payment.payment_date || payment.paymentDate), 'dd MMM yyyy') : '—'}
        </span>
      </div>
    </motion.div>
  );
});

PaymentMobileCard.displayName = 'PaymentMobileCard';

export const PaymentMobileList: React.FC<PaymentMobileListProps> = ({
  payments, isLoading, onManage, onEdit, onDownloadReceipt, onShareReceipt, onDelete, onBulkDelete, onBulkShare, onBulkExport
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const getSelectedPayments = () => payments.filter(p => selectedIds.has(p.id));
  const firstSelectedNormalized = (() => {
    const p = getSelectedPayments()[0];
    if (!p) return null;
    return {
      id: p.id,
      tenantId: p.tenant_id || p.tenantId,
      amount: p.amount ?? 0,
      lateFee: p.late_fee ?? p.lateFee ?? 0,
      totalAmount: p.total_amount ?? p.totalAmount ?? p.amount ?? 0,
      paymentType: p.payment_type || p.paymentType || 'rent',
      paymentDate: p.payment_date || p.paymentDate,
      month: p.month,
      status: p.status,
      method: p.method,
      transactionId: p.transaction_id || p.transactionId,
      receiptUrl: p.receipt_url || p.receiptUrl,
      electricityAmount: p.electricity_amount || p.electricityAmount || 0,
      electricityBillId: p.electricity_bill_id || p.electricityBillId,
      branchId: p.branch_id || p.branchId
    } as Payment;
  })();

  return (
    <div className="space-y-3">
      {isLoading ? (
        <LoadingSkeleton />
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white dark:bg-[#111111] rounded-2xl border border-gray-100 dark:border-white/5">
          No payments found
        </div>
      ) : (
        payments.map(p => (
          <PaymentMobileCard
            key={p.id}
            payment={p}
            isSelected={selectedIds.has(p.id)}
            isSelectionMode={isSelectionMode}
            onToggleSelect={toggleSelection}
            onManage={onManage}
          />
        ))
      )}

      {/* Floating Selection Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-40 bg-gray-900/95 dark:bg-white/95 text-white dark:text-gray-900 backdrop-blur-xl rounded-2xl p-2 shadow-2xl border border-white/10 dark:border-gray-800"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 dark:border-gray-800">
              <span className="text-xs font-bold">
                {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
              </span>
              <button
                onClick={clearSelection}
                className="p-1.5 bg-gray-200 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Scroll Area */}
            <div className="flex overflow-x-auto gap-2 p-3 snap-x hide-scrollbar mask-edges">
              {selectedIds.size === 1 ? (
                // Single Selection Actions
                <>
                  <ActionButton icon={FileText} label="Manage" primary onClick={() => { clearSelection(); onManage(firstSelectedNormalized!); }} />
                  {firstSelectedNormalized?.status === 'paid' && (
                    <>
                      <ActionButton icon={FileText} label="Receipt" onClick={() => { clearSelection(); onDownloadReceipt(firstSelectedNormalized!); }} />
                      <ActionButton icon={Share2} label="Share" onClick={() => { clearSelection(); onShareReceipt(firstSelectedNormalized!); }} />
                    </>
                  )}
                  <ActionButton icon={Edit2} label="Edit Info" onClick={() => { clearSelection(); onEdit(firstSelectedNormalized!); }} />
                  <ActionButton icon={Trash2} label="Delete" danger onClick={() => { clearSelection(); onDelete(firstSelectedNormalized!); }} />
                </>
              ) : (
                // Multi Selection Actions
                <>
                  <ActionButton icon={FileSpreadsheet} label="Export" onClick={() => { onBulkExport?.(Array.from(selectedIds)); clearSelection(); }} />
                  <ActionButton icon={Share2} label="Share Basic" primary onClick={() => { onBulkShare(Array.from(selectedIds)); clearSelection(); }} />
                  <ActionButton icon={Trash2} label="Delete All" danger onClick={() => { onBulkDelete(Array.from(selectedIds)); clearSelection(); }} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
