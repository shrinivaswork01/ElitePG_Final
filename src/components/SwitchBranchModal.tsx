import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Building2, Home, Search, ArrowRight } from 'lucide-react';
import { cn } from '../utils';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

interface SwitchBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any | null;
  onUpdate?: () => void;
}

export const SwitchBranchModal: React.FC<SwitchBranchModalProps> = ({
  isOpen,
  onClose,
  tenant: rawTenant,
  onUpdate
}) => {
  const { branches, rawData, switchTenantBranch, pgConfig } = useApp();

  // Normalize camelCase / snake_case
  const tenant = rawTenant ? {
    ...rawTenant,
    branchId: rawTenant.branchId || rawTenant.branch_id,
    roomId: rawTenant.roomId || rawTenant.room_id,
    bedNumber: rawTenant.bedNumber ?? rawTenant.bed_number,
    rentAmount: rawTenant.rentAmount ?? rawTenant.rent_amount ?? 0,
  } : null;

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null);
  const [rentOption, setRentOption] = useState<'keep' | 'new' | 'custom'>('keep');
  const [customRent, setCustomRent] = useState<number>(0);
  const [switchDate, setSwitchDate] = useState<string>('');
  const [roomSearch, setRoomSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && tenant) {
      setSelectedBranchId('');
      setSelectedRoomId('');
      setSelectedBedNumber(null);
      setRentOption('keep');
      setCustomRent(0);
      setSwitchDate(new Date().toISOString().split('T')[0]);
      setRoomSearch('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, rawTenant]);

  if (!isOpen || !tenant) return null;

  // Only show branches the tenant is NOT currently in
  const otherBranches = branches.filter(b => b.id !== tenant.branchId);

  // Rooms in the selected target branch (from rawData for cross-branch access)
  const allRooms: any[] = rawData?.rooms || [];
  const allTenants: any[] = rawData?.tenants || [];
  const targetRooms = allRooms
    .filter(r => (r.branchId || r.branch_id) === selectedBranchId)
    .filter(r => {
      if (!roomSearch) return true;
      const num = r.roomNumber || r.room_number || '';
      return num.toLowerCase().includes(roomSearch.toLowerCase()) ||
        `floor ${r.floor}`.includes(roomSearch.toLowerCase());
    });

  const selectedTargetRoom = allRooms.find(r => r.id === selectedRoomId);

  const getFinalRent = () => {
    if (rentOption === 'keep') return tenant.rentAmount;
    if (rentOption === 'new') return selectedTargetRoom?.price ?? selectedTargetRoom?.rent_amount ?? tenant.rentAmount;
    return customRent;
  };

  const handleConfirm = async () => {
    if (!selectedBranchId) {
      toast.error('Please select a target branch.');
      return;
    }
    setIsSaving(true);
    try {
      await switchTenantBranch(
        tenant.id,
        selectedBranchId,
        selectedRoomId || undefined,
        selectedBedNumber || undefined,
        getFinalRent(),
        switchDate
      );
      onUpdate?.();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to switch branch');
    } finally {
      setIsSaving(false);
    }
  };

  const currentBranch = branches.find(b => b.id === tenant.branchId);
  const targetBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white dark:bg-[#0f0f0f] rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Switch Branch</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Transfer <span className="font-bold text-gray-700 dark:text-gray-300">{tenant.name}</span> to another branch
            </p>
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

          {/* Current → Target branch visual */}
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-white/3 rounded-2xl border border-gray-100 dark:border-white/5">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">From</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {currentBranch?.name || currentBranch?.branchName || 'Current Branch'}
              </p>
              <p className="text-[11px] text-gray-400 truncate">{currentBranch?.branchName}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">To</p>
              {targetBranch ? (
                <>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">
                    {targetBranch.name || targetBranch.branchName}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">{targetBranch.branchName}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400 font-medium">Select below</p>
              )}
            </div>
          </div>

          {/* Step 1: Target Branch */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-gray-400">1. Select Target Branch</label>
            {otherBranches.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-center border border-amber-100 dark:border-amber-500/20">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">No other branches found.</p>
                <p className="text-[11px] text-amber-600/70 dark:text-amber-400/70 mt-1">You need at least 2 branches to switch a tenant.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto p-0.5">
                {otherBranches.map(branch => {
                  const isSelected = selectedBranchId === branch.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(branch.id);
                        setSelectedRoomId('');
                        setSelectedBedNumber(null);
                        setRoomSearch('');
                      }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl border transition-all text-left hover:scale-[1.01]',
                        isSelected
                          ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0',
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                          : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                      )}>
                        {(branch.name || branch.branchName)?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate leading-tight">
                          {branch.name || branch.branchName}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {branch.address || branch.branchName}
                        </p>
                      </div>
                      <Building2 className={cn('w-4 h-4 shrink-0', isSelected ? 'text-indigo-500' : 'text-gray-300')} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Optional Room Selection */}
          {selectedBranchId && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">2. Select Room <span className="font-normal normal-case text-gray-400">(optional)</span></label>

              {targetRooms.length === 0 && !roomSearch ? (
                <p className="text-xs text-gray-400 text-center py-3">No rooms found in this branch.</p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search room number or floor..."
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto p-0.5">
                    {targetRooms.map(r => {
                      const roomNum = r.roomNumber || r.room_number || '?';
                      const totalBeds = r.totalBeds || r.total_beds || 0;
                      const liveOccupied = allTenants.filter(
                        (t: any) => (t.roomId === r.id || t.room_id === r.id) && t.status === 'active'
                      ).length;
                      const isSelected = selectedRoomId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setSelectedRoomId(r.id); setSelectedBedNumber(null); }}
                          className={cn(
                            'flex flex-col text-left p-3 rounded-2xl border transition-all hover:scale-[1.02]',
                            isSelected
                              ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 shadow-md shadow-indigo-500/5'
                              : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
                          )}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-sm font-black text-gray-900 dark:text-white">Room {roomNum}</span>
                            <span className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                              r.type === 'AC'
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                            )}>
                              {r.type || 'Non-AC'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center w-full mt-2 text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <span>{r.floor === 0 ? 'Ground' : `Floor ${r.floor}`}</span>
                            <span>{liveOccupied} / {totalBeds} Beds</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Bed Selection */}
          {selectedRoomId && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">3. Select Bed <span className="font-normal normal-case text-gray-400">(optional)</span></label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: selectedTargetRoom?.totalBeds || selectedTargetRoom?.total_beds || 0 }).map((_, idx) => {
                  const bedNum = idx + 1;
                  const occupant = allTenants.find(
                    (t: any) => (t.roomId === selectedRoomId || t.room_id === selectedRoomId) &&
                      Number(t.bedNumber ?? t.bed_number) === bedNum && t.status === 'active'
                  );
                  const isSelected = selectedBedNumber === bedNum;
                  return (
                    <button
                      key={bedNum}
                      type="button"
                      onClick={() => setSelectedBedNumber(prev => prev === bedNum ? null : bedNum)}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center gap-1 border-transparent',
                        isSelected
                          ? 'text-white shadow-lg shadow-indigo-600/20'
                          : occupant
                            ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20 hover:border-amber-500 text-amber-600'
                            : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-500 dark:text-gray-400'
                      )}
                      style={isSelected ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
                    >
                      <Home className="w-5 h-5" />
                      <span className="text-xs font-bold">Bed {bedNum}</span>
                      <span className="text-[8px] font-black uppercase leading-none truncate max-w-full">
                        {occupant ? (occupant.name || '').split(' ')[0] : 'Vacant'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rent Configuration */}
          {selectedBranchId && (
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">
                Rent Configuration
              </label>
              <div className={cn('grid gap-2', selectedRoomId ? 'grid-cols-3' : 'grid-cols-2')}>
                <button
                  type="button"
                  onClick={() => setRentOption('keep')}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center',
                    rentOption === 'keep'
                      ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600'
                      : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500'
                  )}
                >
                  Keep Current
                  <span className="block text-[10px] font-medium mt-0.5 opacity-80">₹{Number(tenant.rentAmount).toLocaleString()}/mo</span>
                </button>
                {selectedRoomId && (
                  <button
                    type="button"
                    onClick={() => setRentOption('new')}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center',
                      rentOption === 'new'
                        ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600'
                        : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500'
                    )}
                  >
                    Room Default
                    <span className="block text-[10px] font-medium mt-0.5 opacity-80">
                      ₹{Number(selectedTargetRoom?.price || selectedTargetRoom?.rent_amount || 0).toLocaleString()}/mo
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setRentOption('custom'); setCustomRent(tenant.rentAmount); }}
                  className={cn(
                    'py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center',
                    rentOption === 'custom'
                      ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-600'
                      : 'bg-gray-50 dark:bg-white/3 border-gray-100 dark:border-white/5 text-gray-500'
                  )}
                >
                  Custom
                  <span className="block text-[10px] font-medium mt-0.5 opacity-80">Specify manually</span>
                </button>
              </div>
              {rentOption === 'custom' && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/3 p-2.5 rounded-xl border border-gray-100 dark:border-white/5">
                  <span className="text-xs font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={customRent === 0 ? '' : customRent}
                    onKeyDown={e => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomRent(val === '' ? 0 : Math.max(0, parseFloat(val) || 0));
                    }}
                    className="bg-transparent border-none p-0 focus:ring-0 text-sm font-bold text-gray-900 dark:text-white flex-1"
                    placeholder="Enter rent amount..."
                  />
                  <span className="text-[10px] font-bold text-gray-400">/ month</span>
                </div>
              )}
            </div>
          )}

          {/* Switch Date */}
          {selectedBranchId && (
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">Transfer Date</label>
              <input
                type="date"
                value={switchDate}
                onChange={e => setSwitchDate(e.target.value)}
                onClick={e => { try { e.currentTarget.showPicker(); } catch (_) { /* ignore */ } }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold text-gray-900 dark:text-white transition-all cursor-pointer"
              />
            </div>
          )}

          {/* Info banner */}
          {selectedBranchId && (
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-500/20">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Heads up!</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/70 mt-1 leading-relaxed">
                Historical payments, complaints, and KYC documents remain in the original branch.
                Only the tenant profile is transferred.
              </p>
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
            disabled={!selectedBranchId || isSaving}
            onClick={handleConfirm}
            className="flex-1 py-3 text-white rounded-xl font-bold text-sm opacity-90 hover:opacity-100 transition-opacity shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
          >
            {isSaving ? 'Transferring...' : 'Confirm Transfer'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
