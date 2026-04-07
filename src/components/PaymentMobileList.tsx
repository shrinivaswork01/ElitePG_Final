import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { Payment } from '../types';
import {
  CheckCircle2, FileText, Edit2,
  Trash2, Share2, X, Clock, CreditCard
} from 'lucide-react';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';

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
}

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] animate-pulse">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-white/5 shrink-0" />
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

const PaymentMobileCard = memo(({ 
  payment, 
  isSelected, 
  isSelectionMode, 
  onSelect, 
  onTap 
}: { 
  payment: any; 
  isSelected: boolean; 
  isSelectionMode: boolean;
  onSelect: (id: string) => void; 
  onTap: (p: Payment) => void; 
}) => {
  const handleLongPress = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    onSelect(payment.id);
  }, [onSelect, payment.id]);

  const handleClick = useCallback(() => {
    if (isSelectionMode) {
      onSelect(payment.id);
    } else {
      // Normalize before passing to onTap (detail panel)
      onTap({
        id: payment.id,
        tenantId: payment.tenant_id || payment.tenantId,
        amount: payment.amount ?? 0,
        lateFee: payment.late_fee ?? payment.lateFee ?? 0,
        totalAmount: payment.total_amount ?? payment.totalAmount ?? payment.amount ?? 0,
        paymentType: payment.payment_type || payment.paymentType || 'rent',
        paymentDate: payment.payment_date || payment.paymentDate,
        month: payment.month,
        status: payment.status,
        method: payment.method,
        transactionId: payment.transaction_id || payment.transactionId,
        receiptUrl: payment.receipt_url || payment.receiptUrl,
        tenants: payment.tenants,
        electricityAmount: payment.electricity_amount || payment.electricityAmount || 0,
        electricityBillId: payment.electricity_bill_id || payment.electricityBillId,
        branchId: payment.branch_id || payment.branchId
      } as Payment);
    }
  }, [isSelectionMode, onSelect, onTap, payment]);

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 400 });

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
        <div className="absolute top-3 right-3 text-indigo-600">
          <CheckCircle2 className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900" />
        </div>
      )}

      <div className="flex items-start gap-4 mb-3">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg uppercase shrink-0 transition-colors shadow-lg",
          payment.status === 'paid' 
            ? "bg-emerald-500 text-white shadow-emerald-500/20" 
            : "bg-amber-500 text-white shadow-amber-500/20"
        )}>
          {payment.status === 'paid' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
            {payment.tenants?.name || 'Unknown Tenant'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {payment.month ? format(parseISO(`${payment.month}-01`), 'MMMM yyyy') : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Amount</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
            ₹{(payment.total_amount || payment.totalAmount || payment.amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Method</p>
          <div className="flex items-center gap-1.5 min-w-0">
            <CreditCard className="w-3 h-3 text-indigo-500 shrink-0" />
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
              {payment.method || '—'}
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
    </div>
  );
});

PaymentMobileCard.displayName = 'PaymentMobileCard';

export const PaymentMobileList: React.FC<PaymentMobileListProps> = ({
  payments, isLoading, onManage, onEdit, onDownloadReceipt, onShareReceipt, onDelete, onBulkDelete, onBulkShare
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

  const clearSelection = () => setSelectedIds(new Set());

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
      tenants: p.tenants,
      electricityAmount: p.electricity_amount || p.electricityAmount || 0,
      electricityBillId: p.electricity_bill_id || p.electricityBillId,
      branchId: p.branch_id || p.branchId
    } as Payment;
  })();

  if (isLoading) return <LoadingSkeleton />;
  if (payments.length === 0) return (
    <div className="py-12 text-center text-gray-400">
      <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CreditCard className="w-8 h-8" />
      </div>
      <p className="text-gray-500 dark:text-gray-400 font-medium">No payment records found</p>
    </div>
  );

  const ActionButton = ({ icon: Icon, label, onClick, primary = false, danger = false }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[72px] p-3 rounded-2xl gap-1.5 transition-all shrink-0",
        primary
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          : danger
            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            : "bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-300 active:bg-gray-100 dark:active:bg-white/10"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="pb-24 space-y-3">
      {payments.map(payment => (
        <PaymentMobileCard
          key={payment.id}
          payment={payment}
          isSelected={selectedIds.has(payment.id)}
          isSelectionMode={isSelectionMode}
          onSelect={toggleSelection}
          onTap={onManage}
        />
      ))}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-[100] bg-white dark:bg-[#1A1A1A] rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {selectedIds.size} Selected
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

