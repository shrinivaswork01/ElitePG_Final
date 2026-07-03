import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Home, Shield } from 'lucide-react';
import { cn } from '../utils';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

interface SwitchRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any | null;
  onUpdate?: () => void;
}

export const SwitchRoomModal: React.FC<SwitchRoomModalProps> = ({
  isOpen,
  onClose,
  tenant: rawTenant,
  onUpdate
}) => {
  const { rooms, tenants, updateTenant } = useApp();
  const [switchSearchTerm, setSwitchSearchTerm] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null);
  const [rentOption, setRentOption] = useState<'keep' | 'new' | 'custom'>('new');
  const [customRent, setCustomRent] = useState<number>(0);
  const [switchDate, setSwitchDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Normalize tenant fields to support both camelCase and snake_case from DB rows
  const tenant = rawTenant ? {
    ...rawTenant,
    branchId: rawTenant.branchId || rawTenant.branch_id,
    roomId: rawTenant.roomId || rawTenant.room_id,
    bedNumber: rawTenant.bedNumber || rawTenant.bed_number,
    rentAmount: rawTenant.rentAmount || rawTenant.rent_amount,
  } : null;

  useEffect(() => {
    if (isOpen && tenant) {
      setSwitchSearchTerm('');
      setSelectedRoomId('');
      setSelectedBedNumber(null);
      setRentOption('new');
      setCustomRent(0);
      setSwitchDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, rawTenant]);

  return (
    <AnimatePresence>
      {isOpen && tenant && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">Switch Room</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Move {tenant.name} to another room/bed</p>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Step 1: Select Room */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-gray-400">1. Select Target Room</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search room number or floor..."
                    value={switchSearchTerm}
                    onChange={(e) => setSwitchSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-0.5">
                  {rooms
                    .filter(r => r.branchId === tenant.branchId)
                    .filter(r => 
                      r.roomNumber.toLowerCase().includes(switchSearchTerm.toLowerCase()) || 
                      `floor ${r.floor}`.includes(switchSearchTerm.toLowerCase())
                    )
                    .map(r => {
                      const liveOccupied = tenants.filter(t => t.roomId === r.id && t.status === 'active').length;
                      const isSelected = selectedRoomId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(r.id);
                            setSelectedBedNumber(null); // Reset bed selection on room change
                          }}
                          className={cn(
                            "flex flex-col text-left p-3 rounded-2xl border transition-all hover:scale-[1.02]",
                            isSelected 
                              ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/5" 
                              : "bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                          )}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-sm font-black text-gray-900 dark:text-white">Room {r.roomNumber}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                              r.type === 'AC' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700" : "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                            )}>
                              {r.type}
                            </span>
                          </div>
                          <div className="flex justify-between items-center w-full mt-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <span>Floor {r.floor}</span>
                            <span>{liveOccupied} / {r.totalBeds} Beds</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Step 2: Select Bed */}
              {selectedRoomId && (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">2. Select Bed Slot</label>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: rooms.find(r => r.id === selectedRoomId)?.totalBeds || 0 }).map((_, idx) => {
                      const bedNum = idx + 1;
                      const occupant = tenants.find(t => t.roomId === selectedRoomId && t.bedNumber === bedNum && t.status === 'active');
                      const isOccupiedByCurrent = tenant.id === occupant?.id;
                      const isSelected = selectedBedNumber === bedNum;
                      
                      return (
                        <button
                          key={bedNum}
                          type="button"
                          onClick={() => setSelectedBedNumber(bedNum)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                              : isOccupiedByCurrent
                                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-600 font-bold"
                                : occupant
                                  ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20 hover:border-amber-500 text-amber-600"
                                  : "bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-500 dark:text-gray-400"
                          )}
                        >
                          <Home className="w-5 h-5" />
                          <span className="text-xs font-bold">Bed {bedNum}</span>
                          <span className="text-[8px] font-black uppercase leading-none truncate max-w-full">
                            {isOccupiedByCurrent 
                              ? 'Current' 
                              : occupant 
                                ? occupant.name.split(' ')[0] 
                                : 'Vacant'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Swap Tenant Notice */}
                  {selectedBedNumber && 
                   tenants.find(t => t.roomId === selectedRoomId && t.bedNumber === selectedBedNumber && t.status === 'active' && t.id !== tenant.id) && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex gap-3 items-start animate-fade-in">
                      <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Bed Swap Detected</p>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70">
                          Bed {selectedBedNumber} is occupied by <strong>{tenants.find(t => t.roomId === selectedRoomId && t.bedNumber === selectedBedNumber && t.status === 'active')?.name}</strong>. 
                          Confirming this action will swap the two tenants' room assignments.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Rent Setting */}
              {selectedRoomId && selectedBedNumber && (
                <div className="space-y-3 animate-fade-in">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">3. Rent Configuration</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRentOption('new')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                        rentOption === 'new'
                          ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600"
                          : "bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500"
                      )}
                    >
                      New Room Default
                      <span className="block text-[10px] font-medium mt-0.5 opacity-80">₹{Number(rooms.find(r => r.id === selectedRoomId)?.price || 0).toLocaleString()}/mo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRentOption('keep')}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                        rentOption === 'keep'
                          ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600"
                          : "bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500"
                      )}
                    >
                      Keep Current
                      <span className="block text-[10px] font-medium mt-0.5 opacity-80">₹{Number(tenant.rentAmount || tenant.rent_amount || 0).toLocaleString()}/mo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRentOption('custom');
                        setCustomRent(rooms.find(r => r.id === selectedRoomId)?.price || tenant.rentAmount || tenant.rent_amount || 0);
                      }}
                      className={cn(
                        "py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center",
                        rentOption === 'custom'
                          ? "bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600"
                          : "bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500"
                      )}
                    >
                      Custom Rent
                      <span className="block text-[10px] font-medium mt-0.5 opacity-80">Specify manual</span>
                    </button>
                  </div>

                  {rentOption === 'custom' && (
                    <div className="flex items-center gap-2 mt-2 bg-gray-50 dark:bg-white/3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                      <span className="text-xs font-bold text-gray-500">₹</span>
                      <input
                        type="number"
                        value={customRent}
                        onChange={(e) => setCustomRent(Number(e.target.value))}
                        className="bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900 dark:text-white flex-1"
                        placeholder="Enter rent amount..."
                      />
                      <span className="text-[10px] font-bold text-gray-400">/ month</span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Switching Date */}
              {selectedRoomId && selectedBedNumber && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-400">4. Switching Date</label>
                  <input
                    type="date"
                    value={switchDate}
                    onChange={(e) => setSwitchDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        e.currentTarget.showPicker();
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-gray-900 dark:text-white transition-all cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedRoomId || !selectedBedNumber || isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    const targetOccupant = tenants.find(t => t.roomId === selectedRoomId && t.bedNumber === selectedBedNumber && t.status === 'active');
                    
                    let finalRent = tenant.rentAmount || tenant.rent_amount || 0;
                    if (rentOption === 'new') {
                      const targetRoom = rooms.find(r => r.id === selectedRoomId);
                      finalRent = targetRoom?.price ?? (tenant.rentAmount || tenant.rent_amount || 0);
                    } else if (rentOption === 'custom') {
                      finalRent = customRent;
                    }

                    if (targetOccupant && targetOccupant.id !== tenant.id) {
                      // SWAP SCENARIO:
                      const oldRoomId = tenant.roomId || tenant.room_id;
                      const oldBedNumber = tenant.bedNumber || tenant.bed_number;
                      
                      // Update target occupant to current tenant's old room/bed
                      await updateTenant(targetOccupant.id, {
                        roomId: oldRoomId,
                        bedNumber: oldBedNumber,
                        roomSwitchDate: switchDate
                      });
                      
                      // Update current tenant
                      await updateTenant(tenant.id, {
                        roomId: selectedRoomId,
                        bedNumber: selectedBedNumber,
                        rentAmount: finalRent,
                        roomSwitchDate: switchDate
                      });
                      
                      toast.success(`Swapped rooms between ${tenant.name} and ${targetOccupant.name}`);
                    } else {
                      // BASIC MOVE:
                      await updateTenant(tenant.id, {
                        roomId: selectedRoomId,
                        bedNumber: selectedBedNumber,
                        rentAmount: finalRent,
                        roomSwitchDate: switchDate
                      });
                      
                      toast.success(`Moved ${tenant.name} to Room ${rooms.find(r => r.id === selectedRoomId)?.roomNumber}, Bed ${selectedBedNumber}`);
                    }
                    
                    onUpdate?.();
                    onClose();
                  } catch (err: any) {
                    console.error(err);
                    toast.error(err.message || 'Failed to switch room');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="flex-1 py-3 bg-indigo-600 disabled:bg-indigo-600/40 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Processing...' : 'Confirm Switch'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
