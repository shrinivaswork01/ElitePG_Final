import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { X, Zap, Upload, FileText, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Room, ElectricityBill } from '../types';
import { saveElectricityBill, fetchElectricityBill, calculateElectricityShares } from '../utils/electricityUtils';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface ElectricityBillModalProps {
  room: Room | null;
  branchId: string;
  tenants: { id: string; name: string; is_ac_user?: boolean; isAcUser?: boolean }[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ElectricityBillModal: React.FC<ElectricityBillModalProps> = ({
  room, branchId, tenants, isOpen, onClose, onSaved
}) => {
  const { pgConfig } = useApp();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [actualAmount, setActualAmount] = useState('');
  const [acAmount, setAcAmount] = useState('');
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [acFile, setAcFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingBill, setExistingBill] = useState<ElectricityBill | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Auto-calculated total amount
  const calculatedTotal = (Number(actualAmount) || 0) + (room?.type === 'AC' ? (Number(acAmount) || 0) : 0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActualAmount('');
      setAcAmount('');
      setActualFile(null);
      setAcFile(null);
      setExistingBill(null);
      setShowBreakdown(false);
      setIsSaving(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Fetch existing bill when month changes
  useEffect(() => {
    if (!room || !isOpen || !room.meterGroupId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchElectricityBill(room.meterGroupId, month).then(bill => {
      if (cancelled) return;
      setExistingBill(bill);
      if (bill) {
        setActualAmount(String(bill.actualAmount));
        setAcAmount(String(bill.acAmount));
      } else {
        setActualAmount('');
        setAcAmount('');
      }
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [room, month, isOpen]);

  const handleSave = async () => {
    if (!room) return;
    if (tenants.length === 0) {
      toast.error('Cannot save: Room has no tenants');
      return;
    }
    if (!actualAmount || Number(actualAmount) <= 0) {
      toast.error('Please enter a valid actual bill amount');
      return;
    }

    setIsSaving(true);
    try {
      await saveElectricityBill({
        meterGroupId: room.meterGroupId!,
        branchId,
        month,
        actualAmount: Number(actualAmount),
        acAmount: room.type === 'AC' ? (Number(acAmount) || 0) : (existingBill?.acAmount || 0),
        actualFile: actualFile || undefined,
        acFile: acFile || undefined,
        existingBillId: existingBill?.id
      });
      toast.success(existingBill ? 'Bill updated!' : 'Bill saved!');
      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bill');
    } finally {
      setIsSaving(false);
    }
  };

  // Live preview of breakdown
  const previewShares = (calculatedTotal > 0 && room?.meterGroupId) ? calculateElectricityShares(
    { 
      id: '', 
      meterGroupId: room.meterGroupId, 
      branchId, 
      month, 
      actualAmount: Number(actualAmount),
      acAmount: Number(acAmount) || 0,
      totalAmount: calculatedTotal,
      createdAt: '' 
    },
    tenants
  ) : [];

  return (
    <AnimatePresence>
      {isOpen && room && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Electricity Bill</h3>
              <p className="text-xs text-gray-500">
                {room.meterGroup?.name || 'Flat'} (Room {room.roomNumber}) • {tenants.length} tenants total
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {tenants.length === 0 && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-semibold">This room has no tenants. Assign tenants before uploading a bill.</p>
            </div>
          )}

          {/* Month */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
            </div>
            {isLoading && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking existing bill...</p>}
            {existingBill && !isLoading && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">⚡ Existing bill found — editing will overwrite.</p>
            )}
          </div>

          {/* Base Bill Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Base Electricity Bill (₹)</label>
              <input
                type="number"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="e.g. 3000"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Upload Base Bill */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proof of Base Bill</label>
              <label className={cn(
                "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                actualFile
                  ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                  : existingBill?.actualBillUrl
                    ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                    : "border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-gray-500"
              )}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => setActualFile(e.target.files?.[0] || null)}
                />
                {actualFile ? (
                  <>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-semibold truncate">{actualFile.name}</span>
                  </>
                ) : existingBill?.actualBillUrl ? (
                  <>
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-semibold">Replace File</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-semibold">Upload PDF/Image</span>
                  </>
                )}
              </label>
              {existingBill?.actualBillUrl && !actualFile && (
                <button
                  onClick={() => window.open(existingBill.actualBillUrl, '_blank')}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline block text-right mt-1"
                >
                  View Current Base Bill →
                </button>
              )}
            </div>
          </div>

          {/* AC Extra Amount */}
          {room?.type === 'AC' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">AC Sub-meter Bill (₹)</label>
                <input
                  type="number"
                  value={acAmount}
                  onChange={(e) => setAcAmount(e.target.value)}
                  placeholder="0 if no AC surcharge"
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                />
                <p className="text-[10px] text-gray-400">Charged to AC users only.</p>
              </div>
              
              {/* Upload AC Bill */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proof of AC Bill</label>
                <label className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  acFile
                    ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                    : existingBill?.acBillUrl
                      ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                      : "border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-gray-500"
                )}>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setAcFile(e.target.files?.[0] || null)}
                  />
                  {acFile ? (
                    <>
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-semibold truncate">{acFile.name}</span>
                    </>
                  ) : existingBill?.acBillUrl ? (
                    <>
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-semibold">Replace File</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-semibold">Upload PDF/Image</span>
                    </>
                  )}
                </label>
                {existingBill?.acBillUrl && !acFile && (
                  <button
                    onClick={() => window.open(existingBill.acBillUrl, '_blank')}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline block text-right mt-1"
                  >
                    View Current AC Bill →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Auto-Calculated Total */}
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
            <span className="font-bold text-gray-700 dark:text-gray-300">Total Bill Amount</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">₹{calculatedTotal.toLocaleString()}</span>
          </div>

          {/* Live Breakdown Preview */}
          {previewShares.length > 0 && calculatedTotal > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
              >
                {showBreakdown ? 'Hide' : 'Show'} Tenant Breakdown
              </button>
              {showBreakdown && (
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-2">
                  {previewShares.map(s => (
                    <div key={s.tenantId} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{s.tenantName}</span>
                        {s.isAcUser && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">AC</span>}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">₹{s.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving || tenants.length === 0 || !actualAmount || calculatedTotal <= 0}
            className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: pgConfig?.primaryColor || '#f59e0b' }}
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {isSaving ? 'Saving...' : existingBill ? 'Update Bill' : 'Save Bill'}
          </button>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
