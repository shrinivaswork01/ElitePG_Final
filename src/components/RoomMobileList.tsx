import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { Room } from '../types';
import {
  DoorOpen,
  Users,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  LayoutGrid,
  X,
  Plus
} from 'lucide-react';
import { cn } from '../utils';

interface RoomMobileCardProps {
  room: Room;
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onClick: (room: Room) => void;
  onEdit: (room: Room) => void;
}

const RoomMobileCard = memo(({
  room,
  isSelected,
  isSelectionMode,
  onSelect,
  onLongPress,
  onClick,
  onEdit
}: RoomMobileCardProps) => {
  const handleLongPress = useCallback((e: any) => {
    onLongPress(room.id);
  }, [onLongPress, room.id]);

  const handleClick = useCallback((e: any) => {
    if (isSelectionMode) {
      onSelect(room.id);
    } else {
      onClick(room);
    }
  }, [isSelectionMode, onSelect, onClick, room]);

  const longPressProps = useLongPress(handleLongPress, handleClick, {
    delay: 500,
    shouldPreventDefault: true
  });

  const isFull = room.occupiedBeds >= room.totalBeds;
  const occupancyPct = room.totalBeds > 0 ? (room.occupiedBeds / room.totalBeds) * 100 : 0;

  return (
    <motion.div
      {...longPressProps}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-3xl border transition-all duration-300 mb-3 overflow-hidden",
        isSelected 
          ? "bg-indigo-50 border-indigo-200 dark:bg-indigo-500/10 dark:border-indigo-500/30 ring-2 ring-indigo-500/20" 
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
            className="absolute top-3 right-3 z-10 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-4">
        {/* Room Icon */}
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
          isSelected ? "bg-indigo-600 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
        )}>
          <DoorOpen className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-black text-gray-900 dark:text-white truncate pr-2">
              Room {room.roomNumber}
            </h4>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              room.type === 'AC' ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            )}>
              {room.type}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
             <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                <LayoutGrid className="w-3 h-3"/> Floor {room.floor}
             </div>
             <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-black">
                ₹{Number(room.price).toLocaleString()}/mo
             </div>
          </div>

          {/* Occupancy Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="text-gray-400">{room.occupiedBeds} / {room.totalBeds} BEDS</span>
              <span className={isFull ? "text-rose-500" : "text-emerald-500"}>
                {isFull ? "FULL" : "AVAILABLE"}
              </span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${occupancyPct}%` }}
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isFull ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

RoomMobileCard.displayName = 'RoomMobileCard';

interface RoomMobileListProps {
  rooms: Room[];
  onAdd: () => void;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onView: (room: Room) => void;
  onBulkDelete: (ids: string[]) => void;
}

export const RoomMobileList = ({
  rooms,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onBulkDelete
}: RoomMobileListProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isSelectionMode = selectedIds.length > 0;

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }, []);

  const handleLongPress = useCallback((id: string) => {
    if (selectedIds.length === 0) {
      // Haptic feedback if available
      if ('vibrate' in navigator) navigator.vibrate(50);
      setSelectedIds([id]);
    }
  }, [selectedIds.length]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const handleAction = (type: 'edit' | 'delete' | 'manage') => {
    if (selectedIds.length === 0) return;
    const room = rooms.find(r => r.id === selectedIds[0]);
    if (!room) return;

    if (type === 'edit') onEdit(room);
    else if (type === 'manage') onView(room);
    else if (type === 'delete') {
      if (window.confirm('Delete this room?')) onDelete(room);
    } 
    clearSelection();
  };

  const selectedRooms = rooms.filter(r => selectedIds.includes(r.id));

  return (
    <div className="relative pb-32">
       <div className="grid grid-cols-1 gap-1">
        {rooms.map(room => (
          <RoomMobileCard 
            key={room.id}
            room={room}
            isSelected={selectedIds.includes(room.id)}
            isSelectionMode={isSelectionMode}
            onSelect={toggleSelect}
            onLongPress={handleLongPress}
            onClick={onView} 
            onEdit={onEdit}
          />
        ))}
      </div>

      {rooms.length === 0 && (
        <div className="p-12 text-center">
           <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <DoorOpen className="w-8 h-8 text-gray-300" />
           </div>
           <p className="text-gray-500 font-semibold">No rooms found</p>
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
            <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-[32px] shadow-2xl border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={clearSelection}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
                <div className="text-sm">
                  <span className="font-black text-indigo-600 dark:text-indigo-400">{selectedIds.length}</span>
                  <span className="ml-1 font-bold text-gray-500">Selected</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.length === 1 ? (
                  <>
                    <button 
                      onClick={() => handleAction('manage')}
                      className="p-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleAction('edit')}
                      className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold"
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
                        if (window.confirm(`Delete ${selectedIds.length} rooms?`)) {
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
        className="fixed bottom-8 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center justify-center z-50 hover:bg-indigo-700 transition-colors"
      >
        <Plus className="w-7 h-7" />
      </motion.button>
    </div>
  );
};

