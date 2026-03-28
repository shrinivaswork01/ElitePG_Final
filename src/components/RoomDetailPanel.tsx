import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, DoorOpen, Users, LayoutGrid, Wind, Sun, Edit2, Trash2, Zap } from 'lucide-react';
import { Room } from '../types';
import { cn } from '../utils';

interface RoomDetailPanelProps {
  room: Room | null;
  onClose: () => void;
  onEdit?: (r: Room) => void;
  onDelete?: (r: Room) => void;
  onManageElectricity?: (r: Room) => void;
  canEdit?: boolean;
}

const Field = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{value || '—'}</span>
  </div>
);

export const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({
  room, onClose, onEdit, onDelete, onManageElectricity, canEdit
}) => {
  return (
    <AnimatePresence>
      {room && (
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
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 uppercase">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Room {room.roomNumber}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    {room.meterGroup ? `${room.meterGroup.name} (Floor ${room.floor})` : `Floor ${room.floor}`}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Status & Capacity */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <p className="col-span-2 text-xs font-black uppercase tracking-widest text-gray-400">Capacity</p>
                <Field label="Total Beds" value={<div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-500"/>{room.totalBeds}</div>} />
                <Field label="Occupied" value={<div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-amber-500"/>{room.occupiedBeds}</div>} />
                <Field label="Available" value={<span className={cn('font-bold', room.totalBeds - room.occupiedBeds > 0 ? "text-emerald-600" : "text-rose-600")}>
                  {room.totalBeds - room.occupiedBeds} beds
                </span>} />
                <Field label="Type" value={room.type} />
              </div>

              {/* Rent & Info */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Details</p>
                <div className="flex justify-between items-center bg-white dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Monthly Rent</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{Number(room.price).toLocaleString()}</span>
                </div>
                {room.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {room.description}
                  </div>
                )}
              </div>

              {/* Amenities */}
              {room.amenities && room.amenities.length > 0 && (
                <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map(a => (
                      <span key={a} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 shadow-sm">
                        {a === 'AC' && <Wind className="w-3 h-3 text-sky-500" />}
                        {a === 'Attached Washroom' && <LayoutGrid className="w-3 h-3 text-indigo-500" />}
                        {a === 'Balcony' && <Sun className="w-3 h-3 text-amber-500" />}
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Electricity */}
              {canEdit && onManageElectricity && (
                <button
                  onClick={() => onManageElectricity(room)}
                  className="w-full flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
                >
                  <Zap className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold">⚡ Manage Electricity</span>
                </button>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 shrink-0">
              {canEdit && onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(room); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Room
                </button>
              )}
              {canEdit && onDelete && (
                <button
                  onClick={() => { onClose(); onDelete(room); }}
                  className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
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
