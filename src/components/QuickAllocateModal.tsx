import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  UserPlus,
  Search,
  CheckCircle2,
  DoorOpen,
  User,
  Phone,
  Plus,
  Loader2,
  Calendar,
  IndianRupee,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Room, Tenant } from '../types';
import { useApp } from '../context/AppContext';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface QuickAllocateModalProps {
  room: Room | null;
  bedNumber?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickAllocateModal: React.FC<QuickAllocateModalProps> = ({
  room,
  bedNumber,
  isOpen,
  onClose,
  onSuccess
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenants, rooms, updateTenant, addTenant, pgConfig, fetchData, currentBranch } = useApp();

  const handleRedirectToRegister = () => {
    if (!room) return;
    onClose();
    const activeBranchId = currentBranch?.id || user?.branchId;
    const targetPath = activeBranchId ? `/branch/${activeBranchId}/tenants` : '/tenants';
    navigate(targetPath, {
      state: {
        openAddModal: true,
        preselectRoomId: room.id
      }
    });
  };
  
  const [allocationMode, setAllocationMode] = useState<'existing' | 'new'>('existing');
  const [searchTenant, setSearchTenant] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New tenant form state
  const [newTenantForm, setNewTenantForm] = useState({
    name: '',
    phone: '',
    rentAmount: room ? String(room.price) : '6000',
    joiningDate: format(new Date(), 'yyyy-MM-dd')
  });

  if (!isOpen || !room) return null;

  const roomNumber = room.roomNumber || (room as any).room_number;
  const roomTenants = tenants.filter(t => (t.roomId || (t as any).room_id) === room.id && t.status === 'active');
  const totalBeds = room.totalBeds || (room as any).total_beds || 0;
  const vacantBeds = Math.max(0, totalBeds - roomTenants.length);

  // Unassigned or all active tenants available for room assignment
  const unassignedTenants = tenants.filter(t => {
    if (t.status !== 'active') return false;
    const matchesSearch = searchTenant
      ? t.name.toLowerCase().includes(searchTenant.toLowerCase()) || t.phone?.includes(searchTenant)
      : true;
    return matchesSearch;
  });

  const handleConfirmExistingAllocation = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant to allocate');
      return;
    }

    const tenantToAssign = tenants.find(t => t.id === selectedTenantId);
    if (!tenantToAssign) return;

    try {
      setIsSubmitting(true);
      const todayDate = format(new Date(), 'yyyy-MM-dd');

      // Determine target bed number (passed bedNumber or next available vacant bed)
      let targetBed = bedNumber;
      if (!targetBed) {
        const occupiedBedNumbers = new Set(
          roomTenants.map(t => t.bedNumber || (t as any).bed_number)
        );
        for (let i = 1; i <= totalBeds; i++) {
          if (!occupiedBedNumbers.has(i)) {
            targetBed = i;
            break;
          }
        }
        targetBed = targetBed || 1;
      }

      const oldRoomId = tenantToAssign.roomId || (tenantToAssign as any).room_id;
      const isRoomSwitch = oldRoomId && oldRoomId !== room.id;

      // Apply complete room switch payload with switching date
      await updateTenant(selectedTenantId, {
        roomId: room.id,
        bedNumber: targetBed,
        rentAmount: room.price || tenantToAssign.rentAmount,
        roomSwitchDate: todayDate
      });

      await fetchData();

      if (isRoomSwitch) {
        const oldRoom = rooms.find(r => r.id === oldRoomId);
        toast.success(`Switched ${tenantToAssign.name} from Room ${oldRoom?.roomNumber || ''} to Room ${roomNumber} (Bed ${targetBed}) on ${todayDate}! 🎉`);
      } else {
        toast.success(`Allocated ${tenantToAssign.name} to Room ${roomNumber} (Bed ${targetBed})! 🎉`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to allocate tenant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndAllocateNewTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantForm.name || !newTenantForm.phone) {
      toast.error('Please fill in tenant name and phone number');
      return;
    }

    try {
      setIsSubmitting(true);
      const rentAmount = Number(newTenantForm.rentAmount) || Number(room.price) || 6000;
      
      await addTenant({
        name: newTenantForm.name,
        phone: newTenantForm.phone,
        roomId: room.id,
        rentAmount,
        joiningDate: newTenantForm.joiningDate,
        status: 'active',
        depositBalance: 0,
        depositStatus: 'pending',
        kycStatus: 'unsubmitted'
      } as any);

      await fetchData();
      toast.success(`Registered & allocated ${newTenantForm.name} to Room ${roomNumber}! 🎉`);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to register tenant. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/10 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  Allocate Bed in Room {roomNumber}
                </h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {room.type} • {vacantBeds} of {totalBeds} beds vacant
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="my-5 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl flex gap-1">
            <button
              type="button"
              onClick={() => setAllocationMode('existing')}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                allocationMode === 'existing'
                  ? "bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <User className="w-4 h-4 text-indigo-500" />
              <span>Select Tenant</span>
            </button>

            <button
              type="button"
              onClick={handleRedirectToRegister}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200/50 dark:border-emerald-500/20"
            >
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>+ Register New Tenant</span>
            </button>
          </div>

          {/* Content Area */}
          {allocationMode === 'existing' ? (
            <div className="space-y-4">
              {/* Search tenant */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tenant by name or phone..."
                  value={searchTenant}
                  onChange={(e) => setSearchTenant(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white outline-none"
                />
              </div>

              {/* Tenants Selection List */}
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 hide-scrollbar">
                {unassignedTenants.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No active tenants found matching search.
                  </div>
                ) : (
                  unassignedTenants.map(t => {
                    const currentRoom = rooms.find(r => r.id === (t.roomId || (t as any).room_id));
                    const isSelected = selectedTenantId === t.id;

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTenantId(t.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                          isSelected
                            ? "bg-indigo-50/80 dark:bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-white shadow-xs"
                            : "bg-gray-50/60 dark:bg-white/3 border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{t.name}</p>
                            <p className="text-[10px] text-gray-400 font-semibold truncate">
                              {t.phone} • {currentRoom ? `Currently in Room ${currentRoom.roomNumber}` : 'Unassigned'}
                            </p>
                          </div>
                        </div>

                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 dark:border-gray-600"
                        )}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!selectedTenantId || isSubmitting}
                  onClick={handleConfirmExistingAllocation}
                  style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
                  className="w-full py-3.5 text-white rounded-2xl font-bold text-xs shadow-lg shadow-indigo-600/20 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Allocating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Bed Allocation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Register New Tenant Form */
            <form onSubmit={handleCreateAndAllocateNewTenant} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tenant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newTenantForm.name}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={newTenantForm.phone}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    required
                    value={newTenantForm.rentAmount}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, rentAmount: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Joining Date</label>
                <input
                  type="date"
                  required
                  value={newTenantForm.joiningDate}
                  onChange={(e) => setNewTenantForm({ ...newTenantForm, joiningDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering & Allocating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Register & Allocate to Room {roomNumber}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
