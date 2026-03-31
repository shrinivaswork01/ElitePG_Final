import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Calendar, Clock, CheckCircle2, AlertCircle, FileText, Printer, Trash2 } from 'lucide-react';
import { Payment } from '../types';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils';
import { uploadToSupabase } from '../utils/storage';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';
import { Loader2, Upload } from 'lucide-react';

interface PaymentDetailPanelProps {
  payment: Payment | null;
  tenantName?: string;
  onClose: () => void;
  onViewReceipt?: (p: Payment) => void;
  onMarkPaid?: (p: Payment) => void;
  onDelete?: (p: Payment) => void;
  onViewDoc?: (url: string, title: string) => void;
  canEdit?: boolean;
}

import { ArrowUpRight } from 'lucide-react';

const Field = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{value || '—'}</span>
  </div>
);

export const PaymentDetailPanel: React.FC<PaymentDetailPanelProps> = ({
  payment, tenantName, onClose, onViewReceipt, onMarkPaid, onDelete, onViewDoc, canEdit
}) => {
  const { updatePayment, addPayment } = useApp();
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const electricityAmount = Number((payment as any)?.electricityAmount || (payment as any)?.electricity_amount || 0);
  const baseShare = (payment as any)?.baseShare || (payment as any)?.base_share || 0;
  const acShare = (payment as any)?.acShare || (payment as any)?.ac_share || 0;
  const actualBillUrl = (payment as any)?.actualBillUrl || (payment as any)?.actual_bill_file_url;
  const acBillUrl = (payment as any)?.acBillUrl || (payment as any)?.ac_bill_file_url;
  const unitsConsumed = (payment as any)?.unitsConsumed || (payment as any)?.units_consumed || 0;
  const costPerUnit = (payment as any)?.costPerUnit || (payment as any)?.cost_per_unit || 0;

  return (
    <AnimatePresence>
      {payment && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#0f0f0f] shadow-2xl flex flex-col overflow-hidden border-l border-gray-100 dark:border-white/5"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg uppercase",
                  payment.status === 'paid' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-amber-500 text-white shadow-amber-500/20"
                )}>
                  {payment.status === 'paid' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Payment</h3>
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                    payment.status === 'paid' ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                  )}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              
              {/* Tenant & Month */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Tenant</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{tenantName || 'Unknown Tenant'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Rent Month</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {payment.month ? format(parseISO(`${payment.month}-01`), 'MMMM yyyy') : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 pb-2">Amount Summary</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Rent</span>
                  <span className="font-semibold text-gray-900 dark:text-white">₹{(Number(payment.amount) || 0).toLocaleString()}</span>
                </div>
                
                {electricityAmount > 0 && (
                  <div className="space-y-2 py-2 border-t border-gray-50 dark:border-white/5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-amber-500 font-bold flex items-center gap-1">⚡ Electricity Total</span>
                      <span className="font-bold text-amber-600">₹{electricityAmount.toLocaleString()}</span>
                    </div>
                    {(baseShare > 0 || acShare > 0) && (
                      <div className="pl-4 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-500">Base Consumption Share</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">₹{Number(baseShare).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-gray-500">AC Consumption Share</span>
                          <div className="text-right">
                            <span className="font-medium text-gray-700 dark:text-gray-300 block">₹{Number(acShare).toLocaleString()}</span>
                            {unitsConsumed > 0 && (
                              <span className="text-[9px] text-gray-400">({unitsConsumed}u × ₹{costPerUnit.toFixed(2)})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {onViewDoc && (actualBillUrl || acBillUrl) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {actualBillUrl && (
                          <button
                            onClick={() => onViewDoc(actualBillUrl, 'Electricity Bill')}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors border border-amber-200/50 dark:border-amber-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            Bill File
                          </button>
                        )}
                        {acBillUrl && (
                          <button
                            onClick={() => onViewDoc(acBillUrl, 'AC Proof')}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors border border-indigo-200/50 dark:border-indigo-500/20"
                          >
                            <FileText className="w-3 h-3" />
                            AC Bill
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {Number(payment.lateFee || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50 dark:border-white/5">
                    <span className="text-rose-500">Late Fee</span>
                    <span className="font-semibold text-rose-600">₹{Number(payment.lateFee).toLocaleString()}</span>
                  </div>
                )}
                
                <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Total Amount</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    ₹{(Number(payment.totalAmount) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              {payment.status === 'paid' && (
                <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <p className="col-span-2 text-xs font-black uppercase tracking-widest text-gray-400">Transaction Info</p>
                  <Field label="Paid On" value={payment.paymentDate ? format(parseISO(payment.paymentDate), 'dd MMM yyyy') : '—'} />
                  <Field label="Method" value={<div className="flex items-center gap-1.5"><CreditCard className="w-3 h-3"/>{payment.method}</div>} />
                  {payment.transactionId && (
                    <Field label="Txn ID" className="col-span-2" value={<span className="font-mono text-xs">{payment.transactionId}</span>} />
                  )}
                </div>
              )}

              {/* Proof of Payment Section */}
              <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 pb-2">Proof of Payment</p>
                {payment.proofUrl ? (
                  <button
                    onClick={() => onViewDoc?.(payment.proofUrl!, 'Payment Proof')}
                    className="w-full flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">View Proof Screenshot</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                ) : payment.status === 'pending' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          const path = `proofs/${payment.id || 'new'}_${Date.now()}_${file.name}`;
                          const url = await uploadToSupabase('payment-proofs', path, file);
                          
                          if (payment.id === 'upcoming') {
                            // Create a new pending payment record for this month
                            const { tenants, ...paymentData } = payment as any; // strip UI-only props
                            await addPayment({
                              ...paymentData,
                              id: undefined,
                              status: 'pending',
                              proofUrl: url,
                              method: 'Offline',
                              createdBy: paymentData.tenantId
                            } as any);
                            toast.success('Payment notification sent with proof!');
                          } else {
                            await updatePayment(payment.id, { proofUrl: url });
                            toast.success('Proof uploaded!');
                          }
                          onClose();
                        } catch (err: any) {
                          toast.error(err.message || 'Upload failed');
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-all"
                    >
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {isUploading ? 'Uploading...' : 'Upload Payment Screenshot'}
                    </button>
                    <p className="text-[10px] text-gray-400 text-center">Upload proof of transfer to notify the admin.</p>
                  </div>
                )}
              </div>

              {/* View Receipt Button */}
              {payment.status === 'paid' && onViewReceipt && (
                <button
                  onClick={() => onViewReceipt(payment)}
                  className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  <FileText className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold">View / Print Receipt</span>
                </button>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 shrink-0">
              {payment.status === 'pending' && canEdit && onMarkPaid && (
                <button
                  onClick={() => { onClose(); onMarkPaid(payment); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Record Payment
                </button>
              )}
              {canEdit && onDelete && (
                <button
                  onClick={() => { onClose(); onDelete(payment); }}
                  className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                  title="Delete Payment Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

