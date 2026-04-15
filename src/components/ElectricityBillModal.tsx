import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';
import { X, Zap, Upload, FileText, Calendar, Loader2, AlertCircle, ChevronDown, Gauge } from 'lucide-react';
import { MeterGroup, ElectricityBill, Room, RoomAcReading } from '../types';
import {
  saveElectricityBill,
  fetchElectricityBill,
  fetchRoomAcReadings,
  fetchPreviousReading,
  calculateElectricityShares,
  deleteElectricityBill
} from '../utils/electricityUtils';
import { supabase } from '../lib/supabase';
import { cn } from '../utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface ElectricityBillModalProps {
  flat: MeterGroup | null;
  branchId: string;
  rooms: Room[]; // All rooms in the flat
  tenants: { id: string; name: string; roomId: string; is_ac_user?: boolean; isAcUser?: boolean }[];
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

interface AcReadingInput {
  roomId: string;
  roomNumber: string;
  previousReading: string;
  currentReading: string;
}

export const ElectricityBillModal: React.FC<ElectricityBillModalProps> = ({
  flat, branchId, rooms, tenants, isOpen, onClose, onSaved
}) => {
  const { pgConfig } = useApp();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [totalAmount, setTotalAmount] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [acFile, setAcFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingBill, setExistingBill] = useState<ElectricityBill | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [acReadings, setAcReadings] = useState<AcReadingInput[]>([]);

  // Rooms in this flat
  const flatRooms = useMemo(() =>
    rooms.filter(r => r.meterGroupId === flat?.id),
  [rooms, flat?.id]);

  const acRooms = useMemo(() =>
    flatRooms.filter(r => r.type === 'AC'),
  [flatRooms]);

  const hasAcRooms = acRooms.length > 0;

  // Computed values
  const numTotalAmount = Number(totalAmount) || 0;
  const numTotalUnits = Number(totalUnits) || 0;
  const costPerUnit = numTotalUnits > 0 ? numTotalAmount / numTotalUnits : 0;
  const isUnitBased = numTotalUnits > 0;

  // Compute AC units and costs from readings
  const acComputations = useMemo(() => {
    let totalAcUnits = 0;
    const perRoom: { roomId: string; roomNumber: string; units: number; cost: number }[] = [];

    for (const reading of acReadings) {
      const prev = Number(reading.previousReading) || 0;
      const curr = Number(reading.currentReading) || 0;
      const units = Math.max(0, curr - prev);
      totalAcUnits += units;
      perRoom.push({
        roomId: reading.roomId,
        roomNumber: reading.roomNumber,
        units,
        cost: Math.round(units * costPerUnit * 100) / 100
      });
    }

    const totalAcCost = Math.round(totalAcUnits * costPerUnit * 100) / 100;
    const baseCost = Math.max(0, numTotalAmount - totalAcCost);
    const baseCostPerTenant = tenants.length > 0 ? Math.round((baseCost / tenants.length) * 100) / 100 : 0;

    return { totalAcUnits, totalAcCost, baseCost, baseCostPerTenant, perRoom };
  }, [acReadings, costPerUnit, numTotalAmount, tenants.length]);

  // Preview shares
  const previewShares = useMemo(() => {
    if (numTotalAmount <= 0 || !flat?.id) return [];

    const readingsForCalc: RoomAcReading[] = isUnitBased ? acReadings.map(r => ({
      roomId: r.roomId,
      branchId,
      month,
      previousReading: Number(r.previousReading) || 0,
      currentReading: Number(r.currentReading) || 0
    })) : [];

    const bill: ElectricityBill = {
      id: '', meterGroupId: flat.id, branchId, month,
      totalAmount: numTotalAmount,
      actualAmount: isUnitBased ? acComputations.baseCost : numTotalAmount,
      acAmount: isUnitBased ? acComputations.totalAcCost : 0,
      totalUnits: isUnitBased ? numTotalUnits : undefined,
      createdAt: ''
    };

    try {
      return calculateElectricityShares(bill, tenants, flatRooms, readingsForCalc);
    } catch {
      return [];
    }
  }, [numTotalAmount, numTotalUnits, flat?.id, branchId, month, tenants, flatRooms, acReadings, isUnitBased, acComputations]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTotalAmount('');
      setTotalUnits('');
      setActualFile(null);
      setAcFile(null);
      setExistingBill(null);
      setShowBreakdown(false);
      setIsSaving(false);
      setIsLoading(false);
      setAcReadings([]);
    }
  }, [isOpen]);

  // Initialize AC reading inputs for AC rooms
  useEffect(() => {
    if (!isOpen || !flat) return;

    const initReadings = async () => {
      const inputs: AcReadingInput[] = [];
      for (const room of acRooms) {
        const prevReading = await fetchPreviousReading(room.id, month);
        inputs.push({
          roomId: room.id,
          roomNumber: room.roomNumber,
          previousReading: prevReading !== null ? String(prevReading) : '0',
          currentReading: ''
        });
      }
      setAcReadings(inputs);
    };

    initReadings();
  }, [isOpen, flat, acRooms, month]);

  // Fetch existing bill when month changes
  useEffect(() => {
    if (!flat || !isOpen || !flat.id) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const bill = await fetchElectricityBill(flat.id, month);
        if (cancelled) return;
        setExistingBill(bill);

        if (bill) {
          setTotalAmount(String(bill.totalAmount));
          setTotalUnits(bill.totalUnits ? String(bill.totalUnits) : '');

          // Fetch existing AC readings
          const existingReadings = await fetchRoomAcReadings(flat.id, month, rooms);
          if (existingReadings.length > 0) {
            setAcReadings(acRooms.map(room => {
              const existing = existingReadings.find(r => r.roomId === room.id);
              return {
                roomId: room.id,
                roomNumber: room.roomNumber,
                previousReading: existing ? String(existing.previousReading) : '0',
                currentReading: existing ? String(existing.currentReading) : ''
              };
            }));
          }
        } else {
          setTotalAmount('');
          setTotalUnits('');
        }
      } catch { /* ignore */ }
      if (!cancelled) setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [flat, month, isOpen, rooms, acRooms]);

  const updateAcReading = (index: number, field: 'previousReading' | 'currentReading', value: string) => {
    setAcReadings(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    if (!flat) return;
    if (tenants.length === 0) {
      toast.error('Cannot save: Flat has no tenants');
      return;
    }
    if (numTotalAmount <= 0) {
      toast.error('Please enter a valid total bill amount');
      return;
    }
    if (isUnitBased && acComputations.totalAcCost > numTotalAmount) {
      toast.error('AC consumption exceeds total bill — please check readings');
      return;
    }

    setIsSaving(true);
    try {
      const readingsPayload: RoomAcReading[] = isUnitBased ? acReadings
        .filter(r => Number(r.currentReading) > 0)
        .map(r => ({
          roomId: r.roomId,
          branchId,
          month,
          previousReading: Number(r.previousReading) || 0,
          currentReading: Number(r.currentReading) || 0
        })) : [];

      const savedBill = await saveElectricityBill({
        meterGroupId: flat.id,
        branchId,
        month,
        totalAmount: numTotalAmount,
        totalUnits: isUnitBased ? numTotalUnits : undefined,
        acReadings: readingsPayload.length > 0 ? readingsPayload : undefined,
        actualFile: actualFile || undefined,
        acFile: acFile || undefined,
        existingBillId: existingBill?.id,
        // Legacy fields for non-unit-based
        actualAmount: isUnitBased ? acComputations.baseCost : numTotalAmount,
        acAmount: isUnitBased ? acComputations.totalAcCost : 0
      });

      toast.success(existingBill ? 'Bill updated!' : 'Bill saved!');

      // Auto-create/update separate electricity payment records per tenant
      if (previewShares.length > 0) {
        // Fetch ALL existing electricity payments for this month and bill to know which ones to update vs insert
        const { data: existingPmts } = await supabase
          .from('payments')
          .select('id, tenant_id')
          .eq('month', month)
          .eq('payment_type', 'electricity')
          .eq('electricity_bill_id', savedBill.id);

        const upsertData = previewShares.map(share => {
          const existing = (existingPmts || []).find(p => p.tenant_id === share.tenantId);
          
          return {
            id: existing?.id, // If ID exists, Supabase performs an UPDATE
            tenant_id: share.tenantId,
            month,
            payment_type: 'electricity',
            status: existing ? undefined : 'pending', // Don't overwrite status on update, default to pending on insert
            method: existing ? undefined : 'Offline',
            electricity_bill_id: savedBill.id,
            branch_id: branchId,
            payment_date: existing ? undefined : new Date().toISOString().split('T')[0],
            electricity_amount: share.total,
            total_amount: share.total,
            amount: 0,
            late_fee: 0,
            base_share: share.baseShare || 0,
            ac_share: share.acShare || 0,
            units_consumed: share.unitsConsumed || 0,
            cost_per_unit: share.costPerUnit || 0,
            actual_bill_file_url: savedBill.actualBillUrl || null,
            ac_bill_file_url: savedBill.acBillUrl || null,
          };
        });

        // Batch Upsert
        const { error: upsertError } = await supabase
          .from('payments')
          .upsert(upsertData, { onConflict: 'id' });

        if (upsertError) throw upsertError;
        
        toast.success(`${previewShares.length} electricity records synchronized`);
      }

      onSaved?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bill');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && flat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left">
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
            className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
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
                    {flat.name} (Floor {flat.floor}) • {tenants.length} residents • {flatRooms.length} rooms
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delete Bill Action */}
            {existingBill && !isLoading && (
              <div className="px-6 pb-0">
                <button
                  onClick={async () => {
                    if (!existingBill) return;
                    if (!window.confirm('Delete this electricity bill? This will also remove all associated electricity payment records for tenants. This cannot be undone.')) return;
                    setIsDeleting(true);
                    try {
                      await deleteElectricityBill(existingBill.id);
                      toast.success('Bill and associated electricity payments deleted');
                      onSaved?.();
                      onClose();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to delete bill');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all border border-rose-100 dark:border-rose-500/20"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {isDeleting ? 'Deleting...' : 'Delete This Bill'}
                </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6 space-y-5">
              {tenants.length === 0 && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-500/10 rounded-2xl text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 text-left">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-semibold">No tenants assigned to this flat. Add tenants first.</p>
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

              {/* Total Bill & Units */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Units (Meter)</label>
                  <input
                    type="number"
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(e.target.value)}
                    placeholder="e.g. 200"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Cost per unit pill */}
              {isUnitBased && numTotalAmount > 0 && (
                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                  <Gauge className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    Cost per Unit: ₹{costPerUnit.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Upload Base Bill */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Proof of Bill (Optional)</label>
                <label className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                  actualFile
                    ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                    : existingBill?.actualBillUrl
                      ? "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-600"
                      : "border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/30 text-gray-500"
                )}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setActualFile(e.target.files?.[0] || null)} />
                  {actualFile ? (
                    <><FileText className="w-4 h-4" /><span className="text-sm font-semibold truncate">{actualFile.name}</span></>
                  ) : existingBill?.actualBillUrl ? (
                    <><FileText className="w-4 h-4" /><span className="text-sm font-semibold">Replace File</span></>
                  ) : (
                    <><Upload className="w-4 h-4" /><span className="text-sm font-semibold">Upload PDF/Image</span></>
                  )}
                </label>
              </div>

              {/* AC Room Readings */}
              {hasAcRooms && isUnitBased && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">AC Room Meter Readings</h4>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Enter sub-meter readings for each AC room. The system will compute per-tenant AC costs automatically.
                  </p>

                  <div className="space-y-3">
                    {acReadings.map((reading, idx) => {
                      const units = Math.max(0, (Number(reading.currentReading) || 0) - (Number(reading.previousReading) || 0));
                      const roomCost = Math.round(units * costPerUnit * 100) / 100;
                      const tenantsInRoom = tenants.filter(t => t.roomId === reading.roomId).length;

                      return (
                        <div key={reading.roomId} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase text-gray-500 tracking-widest">
                              Room {reading.roomNumber}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20">
                              AC • {tenantsInRoom} tenant{tenantsInRoom !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Previous</label>
                              <input
                                type="number"
                                value={reading.previousReading}
                                onChange={(e) => updateAcReading(idx, 'previousReading', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-white/5 rounded-lg text-sm font-semibold text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Current</label>
                              <input
                                type="number"
                                value={reading.currentReading}
                                onChange={(e) => updateAcReading(idx, 'currentReading', e.target.value)}
                                placeholder="Enter"
                                className="w-full px-3 py-2 bg-white dark:bg-white/5 rounded-lg text-sm font-semibold text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 focus:ring-2 focus:ring-indigo-500/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-amber-500 uppercase">Units</label>
                              <div className="px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-sm font-black text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20 text-center">
                                {units}
                              </div>
                            </div>
                          </div>

                          {units > 0 && (
                            <div className="flex justify-between items-center text-xs pt-1">
                              <span className="text-gray-500">{units} units × ₹{costPerUnit.toFixed(2)}</span>
                              <span className="font-bold text-amber-600">₹{roomCost.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Upload AC Readings Proof */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center block">AC Consumption Proof (Optional)</label>
                    <label className={cn(
                      "flex items-center justify-center gap-2 py-2 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                      acFile
                        ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600"
                        : existingBill?.acBillUrl
                          ? "border-indigo-300 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600"
                          : "border-gray-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-400/30 text-gray-500"
                    )}>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setAcFile(e.target.files?.[0] || null)} />
                      {acFile ? (
                        <><FileText className="w-3.5 h-3.5" /><span className="text-xs font-semibold truncate">{acFile.name}</span></>
                      ) : existingBill?.acBillUrl ? (
                        <><FileText className="w-3.5 h-3.5" /><span className="text-xs font-semibold">Replace AC Reading Proof</span></>
                      ) : (
                        <><Upload className="w-3.5 h-3.5" /><span className="text-xs font-semibold">Upload AC Reading Proof</span></>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Computed Summary */}
              {isUnitBased && numTotalAmount > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-white/5 dark:to-white/[0.02] rounded-2xl p-4 border border-gray-100 dark:border-white/5 space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Bill Summary</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Bill</span>
                      <span className="font-bold text-gray-900 dark:text-white">₹{numTotalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Units</span>
                      <span className="font-bold text-gray-900 dark:text-white">{numTotalUnits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-500">Base Cost</span>
                      <span className="font-bold text-blue-600">₹{acComputations.baseCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-amber-500">AC Cost</span>
                      <span className="font-bold text-amber-600">₹{acComputations.totalAcCost.toLocaleString()}</span>
                    </div>
                  </div>
                  {acComputations.totalAcCost > numTotalAmount && (
                    <div className="flex items-center gap-2 p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-[11px] text-rose-600 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      AC readings exceed total bill!
                    </div>
                  )}
                </div>
              )}

              {/* Non-unit-based total */}
              {!isUnitBased && numTotalAmount > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Total Bill Amount</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">₹{numTotalAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Live Breakdown Preview */}
              {previewShares.length > 0 && numTotalAmount > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBreakdown(!showBreakdown)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline"
                  >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showBreakdown && "rotate-180")} />
                    {showBreakdown ? 'Hide' : 'Show'} Tenant Breakdown
                  </button>
                  <AnimatePresence>
                    {showBreakdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-2">
                          {previewShares.map(s => (
                            <div key={s.tenantId} className="flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-semibold text-gray-900 dark:text-white truncate">{s.tenantName}</span>
                                {s.isAcUser && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">AC</span>}
                                {s.roomNumber && <span className="text-[9px] text-gray-400 shrink-0">R{s.roomNumber}</span>}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {isUnitBased && s.acShare > 0 && (
                                  <span className="text-[10px] text-gray-400">
                                    ₹{s.baseShare} + ₹{s.acShare}
                                  </span>
                                )}
                                <span className="font-bold text-gray-900 dark:text-white">₹{s.total.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                          {/* Total validation */}
                          <div className="border-t border-gray-200 dark:border-white/5 pt-2 mt-2 flex justify-between text-sm">
                            <span className="font-bold text-gray-500">Sum Total</span>
                            <span className={cn(
                              "font-black",
                              Math.abs(previewShares.reduce((s, p) => s + p.total, 0) - numTotalAmount) < 1
                                ? "text-emerald-600" : "text-rose-600"
                            )}>
                              ₹{previewShares.reduce((s, p) => s + p.total, 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving || tenants.length === 0 || numTotalAmount <= 0 || (isUnitBased && acComputations.totalAcCost > numTotalAmount)}
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
