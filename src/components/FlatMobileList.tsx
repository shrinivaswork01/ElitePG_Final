import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { MeterGroup, Room, Tenant } from '../types';
import {
  Layers,
  DoorOpen,
  Users,
  Edit2,
  Trash2,
  Zap,
  CheckCircle2,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../utils';

interface FlatMobileCardProps {
  flat: MeterGroup;
  rooms: Room[];
  tenants: Tenant[];
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onClick: (flat: MeterGroup) => void;
  onEdit: (flat: MeterGroup) => void;
  onManageElectricity: (flat: MeterGroup) => void;
}

const FlatMobileCard = memo(({
  flat,
  rooms,
  tenants,
  isSelected,
  isSelectionMode,
  onSelect,
  onLongPress,
  onClick,
  onEdit,
  onManageElectricity
}: FlatMobileCardProps) => {
  const handleLongPress = useCallback((e: any) => {
    onLongPress(flat.id);
  }, [onLongPress, flat.id]);

  const handleClick = useCallback((e: any) => {
    if (isSelectionMode) {
      onSelect(flat.id);
    } else {
      onClick(flat);
    }
  }, [isSelectionMode, onSelect, onClick, flat]);

  const longPressProps = useLongPress(handleLongPress, handleClick, {
    delay: 500,
    shouldPreventDefault: true
  });

  const linkedRooms = rooms.filter(r => r.meterGroupId === flat.id);
  const totalBeds = linkedRooms.reduce((sum, r) => sum + (r.totalBeds || 0), 0);
  const occupiedBeds = tenants.filter(t => 
    linkedRooms.some(r => r.id === t.roomId) && t.status === 'active'
  ).length;
  const occupancyPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  return (
    <motion.div
      {...longPressProps}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-3xl border transition-all duration-300 mb-3 overflow-hidden",
        isSelected 
          ? "bg-violet-50 border-violet-200 dark:bg-violet-500/10 dark:border-violet-500/30 ring-2 ring-violet-500/20" 
          : "bg-white border-gray-100 dark:bg-[#111111] dark:border-white/5 shadow-sm"
      )}
    >
      {/* Selection Overlay */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-3 right-3 z-10 w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-600/30"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-4">
        {/* Flat Icon */}
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors",
          isSelected ? "bg-violet-600 text-white" : "bg-violet-50 dark:bg-violet-500/10 text-violet-500"
        )}>
          <Layers className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-black text-gray-900 dark:text-white truncate pr-2">
              {flat.name}
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500">
               Floor {flat.floor}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
             <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                <DoorOpen className="w-3 h-3"/> {linkedRooms.length} Rooms
             </div>
             <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                <Users className="w-3 h-3"/> {occupiedBeds} / {totalBeds} Beds
             </div>
          </div>

          {/* Occupancy Progress */}
          <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden mb-4">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${occupancyPct}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                occupancyPct >= 100 ? "bg-rose-500" : "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.4)]"
              )}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

FlatMobileCard.displayName = 'FlatMobileCard';

interface FlatMobileListProps {
  meterGroups: MeterGroup[];
  rooms: Room[];
  tenants: Tenant[];
  onAdd: () => void;
  onEdit: (flat: MeterGroup) => void;
  onDelete: (flat: MeterGroup) => void;
  onView: (flat: MeterGroup) => void;
  onManageElectricity: (flat: MeterGroup) => void;
  onBulkDelete: (ids: string[]) => void;
}

export const FlatMobileList = ({
  meterGroups,
  rooms,
  tenants,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onManageElectricity,
  onBulkDelete
}: FlatMobileListProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectionMode = selectedIds.length > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }, []);

  const handleLongPress = useCallback((id: string) => {
    if (selectedIds.length === 0) {
      if ('vibrate' in navigator) navigator.vibrate(50);
      setSelectedIds([id]);
    }
  }, [selectedIds.length]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleAction = (type: 'edit' | 'delete' | 'manage') => {
    if (selectedIds.length === 0) return;
    const flat = meterGroups.find(m => m.id === selectedIds[0]);
    if (!flat) return;

    if (type === 'edit') onEdit(flat);
    else if (type === 'manage') onView(flat);
    else if (type === 'delete') {
      if (window.confirm('Delete this flat/group and unlink all rooms?')) onDelete(flat);
    } 
    clearSelection();
  };

  return (
    <div className="relative pb-32">
       <div className="grid grid-cols-1 gap-1">
        {meterGroups.map(flat => (
          <FlatMobileCard 
            key={flat.id}
            flat={flat}
            rooms={rooms}
            tenants={tenants}
            isSelected={selectedIds.includes(flat.id)}
            isSelectionMode={isSelectionMode}
            onSelect={toggleSelect}
            onLongPress={handleLongPress}
            onClick={onView}
            onEdit={onEdit}
            onManageElectricity={onManageElectricity}
          />
        ))}
      </div>

      {meterGroups.length === 0 && (
        <div className="p-12 text-center">
           <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-gray-300" />
           </div>
           <p className="text-gray-500 font-semibold">No flats or groups found</p>
        </div>
      )}

      {/* Floating Bottom Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-4 right-4 z-[60]"
          >
            <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-[32px] shadow-2xl border border-violet-100 dark:border-violet-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearSelection}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="text-sm">
                  <span className="font-black text-violet-600 dark:text-violet-400">{selectedIds.length}</span>
                  <span className="ml-1 font-bold text-gray-500">Selected</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.length === 1 ? (
                  <>
                    <button 
                      onClick={() => handleAction('manage')}
                      className="p-3 bg-violet-600 text-white rounded-2xl font-bold shadow-lg shadow-violet-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleAction('edit')}
                      className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-2xl font-bold"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                       onClick={() => handleAction('delete')}
                       className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl font-bold"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => {
                        if (window.confirm(`Delete ${selectedIds.length} flats?`)) {
                          onBulkDelete(selectedIds);
                          clearSelection();
                        }
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete All
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="fixed bottom-8 right-6 w-14 h-14 bg-violet-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-50 hover:bg-violet-700 transition-colors"
      >
        <Plus className="w-7 h-7" />
      </motion.button>
    </div>
  );
};
