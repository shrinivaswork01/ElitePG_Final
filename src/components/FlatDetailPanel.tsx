import React from 'react';
import { X, DoorOpen, Users, MapPin, Hash, Trash2, Edit2, Zap } from 'lucide-react';
import { MeterGroup, Room, Tenant } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface FlatDetailPanelProps {
  flat: MeterGroup;
  rooms: Room[];
  tenants: Tenant[];
  onClose: () => void;
  onEdit: (flat: MeterGroup) => void;
  onDelete: (flat: MeterGroup) => void;
  onViewRoom: (room: Room) => void;
  onManageElectricity?: (flat: MeterGroup) => void;
}

import { useApp } from '../context/AppContext';

export const FlatDetailPanel = ({
  flat: initialFlat,
  rooms,
  tenants,
  onClose,
  onEdit,
  onDelete,
  onViewRoom,
  onManageElectricity
}: FlatDetailPanelProps) => {
  const { meterGroups } = useApp();
  
  // Sync with live context data
  const flat = meterGroups.find(m => m.id === initialFlat.id) || initialFlat;

  const linkedRooms = rooms.filter(r => (r.meterGroupId || (r as any).meter_group_id) === flat.id);
  const totalBeds = linkedRooms.reduce((sum, r) => sum + (r.totalBeds || (r as any).total_beds || 0), 0);
  const occupiedBeds = tenants.filter(t => 
    linkedRooms.some(r => r.id === (t.roomId || (t as any).room_id)) && t.status === 'active'
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 h-full shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{flat.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Floor {flat.floor} • {linkedRooms.length} Rooms</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(flat)}
              className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(flat)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Occupancy</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{occupiedBeds}</span>
                <span className="text-sm text-gray-400">/ {totalBeds} Beds</span>
              </div>
            </div>
            <div className="p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2 text-gray-500 dark:text-gray-400">
                <DoorOpen className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Rooms</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{linkedRooms.length}</span>
                <span className="text-sm text-gray-400">Total</span>
              </div>
            </div>
          </div>

          {/* Electricity Management Action */}
          {onManageElectricity && (
            <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Electricity Bill</h4>
                  <p className="text-xs text-gray-500 font-medium">Manage & split monthly bill for this flat</p>
                </div>
              </div>
              <button 
                onClick={() => onManageElectricity(flat)}
                className="px-4 py-2 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-md shadow-amber-500/20"
              >
                Manage Bill
              </button>
            </div>
          )}

          {/* Linked Rooms List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Linked Rooms
            </h3>
            <div className="space-y-3">
              {linkedRooms.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <DoorOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No rooms assigned to this flat yet.</p>
                </div>
              ) : (
                linkedRooms.map((room) => {
                  const roomOccupied = tenants.filter(t => (t.roomId || (t as any).room_id) === room.id && t.status === 'active').length;
                  return (
                    <button
                      key={room.id}
                      onClick={() => onViewRoom(room)}
                      className="w-full p-4 flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition-colors">
                          <DoorOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">Room {room.roomNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{room.type} • {room.totalBeds} Beds</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-semibold text-gray-400 uppercase">Occupancy</p>
                          <p className={cn(
                            "text-sm font-bold",
                            roomOccupied >= room.totalBeds ? "text-red-500" : "text-green-500 text-indigo-600 dark:text-indigo-400"
                          )}>
                            {roomOccupied} / {room.totalBeds}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                          <Plus className="w-4 h-4 rotate-45 group-hover:rotate-0 transition-transform" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const LayoutGrid = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

