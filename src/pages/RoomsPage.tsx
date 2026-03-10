import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Room } from '../types';
import { Navigate } from 'react-router-dom';
import {
  Plus,
  DoorOpen,
  Users,
  LayoutGrid,
  Trash2,
  Edit2,
  Wind,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export const RoomsPage = () => {
  const { user } = useAuth();
  const { rooms, addRoom, updateRoom, deleteRoom, currentPlan, tenants } = useApp();

  const currentRoomsCount = rooms.length;
  const isAtLimit = currentPlan && currentRoomsCount >= currentPlan.maxRooms;
  const isNearLimit = currentPlan && currentRoomsCount >= currentPlan.maxRooms * 0.8;

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<Omit<Room, 'id' | 'branchId'>>({
    roomNumber: '',
    floor: 1,
    totalBeds: 2,
    occupiedBeds: 0,
    type: 'Non-AC',
    price: 6000
  });

  const handleEditClick = (room: Room) => {
    setEditingRoom(room);
    setFormData(room);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingRoom(null);
    setFormData({ roomNumber: '', floor: 1, totalBeds: 2, occupiedBeds: 0, type: 'Non-AC', price: 6000 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isDuplicate = rooms.some(r => r.roomNumber.toLowerCase() === formData.roomNumber.toLowerCase() && r.id !== editingRoom?.id);
    if (isDuplicate) {
      toast.error(`Room number ${formData.roomNumber} already exists.`);
      return;
    }

    if (editingRoom) {
      if (formData.totalBeds < editingRoom.occupiedBeds) {
        toast.error(`Cannot reduce beds to ${formData.totalBeds}. ${editingRoom.occupiedBeds} are currently occupied.`);
        return;
      }
      updateRoom(editingRoom.id, formData);
    } else {
      addRoom(formData);
    }
    handleCloseModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rooms</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage property inventory and occupancy.</p>
        </div>
        <button
          onClick={() => {
            if (isAtLimit) {
              alert(`Limit reached! Your current plan (${currentPlan?.name}) allows only ${currentPlan?.maxRooms} rooms. Please upgrade your plan.`);
              return;
            }
            setIsAddModalOpen(true);
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all",
            isAtLimit && "opacity-50 cursor-not-allowed"
          )}
        >
          <Plus className="w-5 h-5" />
          Add Room
        </button>
      </div>

      {isNearLimit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl flex items-center justify-between gap-4 border",
            isAtLimit
              ? "bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              : "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400"
          )}
        >
          <div className="flex items-center gap-3">
            <DoorOpen className="w-5 h-5" />
            <p className="text-sm font-bold">
              {isAtLimit
                ? `Limit Reached: You have reached the maximum of ${currentPlan?.maxRooms} rooms for the ${currentPlan?.name} plan.`
                : `Approaching Limit: You have used ${currentRoomsCount}/${currentPlan?.maxRooms} room slots.`}
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/subscription'}
            className={cn(
              "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              isAtLimit
                ? "bg-rose-600 text-white hover:bg-rose-700"
                : "bg-amber-600 text-white hover:bg-amber-700"
            )}
          >
            Upgrade Plan
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rooms.map((room) => (
          <motion.div
            key={room.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden group hover:shadow-md transition-all"
          >
            {(() => {
              const activeOccupancy = tenants.filter(t => t.roomId === room.id && t.status === 'active').length;
              return (
                <>
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                        <DoorOpen className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          room.type === 'AC' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          {room.type === 'AC' ? <Wind className="w-3 h-3 inline mr-1" /> : <Sun className="w-3 h-3 inline mr-1" />}
                          {room.type}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Room {room.roomNumber}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Floor {room.floor}</p>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Occupancy
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">{activeOccupancy} / {room.totalBeds} Beds</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-500",
                            activeOccupancy >= room.totalBeds ? "bg-rose-500" : "bg-indigo-600"
                          )}
                          style={{ width: `${Math.min((activeOccupancy / room.totalBeds) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-white/5">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">₹{room.price.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">per month</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 flex items-center justify-between lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(room)}
                      className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                    >
                      Edit Details
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(room)}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const activeTenants = tenants.filter(t => t.roomId === room.id && t.status === 'active');
                          if (activeTenants.length > 0) {
                            toast.error(`Cannot delete room. ${activeTenants.length} active tenants are assigned to it.`);
                            return;
                          }
                          deleteRoom(room.id);
                        }}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Room Number</label>
                    <input
                      required
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      placeholder="e.g. 101"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Floor</label>
                      <input
                        required
                        type="number"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Beds</label>
                      <input
                        required
                        type="number"
                        value={formData.totalBeds}
                        onChange={(e) => setFormData({ ...formData, totalBeds: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Room Type</label>
                    <div className="flex gap-2">
                      {['AC', 'Non-AC'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type as any })}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                            formData.type === type
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Price (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    {editingRoom ? 'Update Room' : 'Add Room'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
