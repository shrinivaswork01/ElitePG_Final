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
  Sun,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import { RoomDetailPanel } from '../components/RoomDetailPanel';
import { RoomMobileList } from '../components/RoomMobileList';
import { cn } from '../utils';
import toast from 'react-hot-toast';

export const RoomsPage = () => {
  const { user } = useAuth();
  const { rooms, addRoom, updateRoom, deleteRoom, currentPlan, tenants } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);

  const currentRoomsCount = rooms.length;
  const isAtLimit = currentPlan && currentRoomsCount >= currentPlan.maxRooms;
  const isNearLimit = currentPlan && currentRoomsCount >= currentPlan.maxRooms * 0.8;

  if (user?.role === 'tenant') {
    return <Navigate to="/" replace />;
  }
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Omit<Room, 'id' | 'branchId'>>({
    roomNumber: '',
    floor: 1,
    totalBeds: 2,
    occupiedBeds: 0,
    type: 'Non-AC',
    price: 6000,
    description: '',
    amenities: []
  });
  const [customAmenity, setCustomAmenity] = useState('');

  const filterType = searchTerm ? 'all' : 'all'; // placeholder so we can add type filter later

  // Server-side paginated hook — fetches ONLY 10 records at a time
  const { data: paginatedRooms, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<any>({
    table: 'rooms',
    ilikeFilters: searchTerm ? { room_number: searchTerm } : undefined,
    orderBy: { column: 'room_number', ascending: true }
  });

  const roomColumns: ColumnDef<any>[] = [
    {
      header: 'Room',
      accessorKey: 'room_number',
      className: 'w-[35%] min-w-[160px]',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Room {r.room_number}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Floor {r.floor} • {r.type}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Occupancy',
      accessorKey: 'occupied_beds',
      className: 'w-[28%] min-w-[150px]',
      cell: (r) => {
        // Compute live from tenants (DB occupied_beds column is not auto-synced)
        const liveOccupied = tenants.filter(t => t.roomId === r.id && t.status === 'active').length;
        const totalBeds = r.total_beds ?? 0;
        const isFull = liveOccupied >= totalBeds;
        const pct = totalBeds > 0 ? Math.round((liveOccupied / totalBeds) * 100) : 0;
        return (
          <div className="min-w-[130px]">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-gray-900 dark:text-gray-200">{liveOccupied} / {totalBeds} beds</span>
              <span className={cn('font-bold', isFull ? 'text-rose-500' : 'text-emerald-500')}>{isFull ? 'Full' : 'Available'}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all', isFull ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessorKey: 'type',
      className: 'w-[15%]',
      cell: (r) => (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-bold uppercase',
          r.type === 'AC' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}>
          {r.type}
        </span>
      )
    },
    {
      header: 'Price',
      accessorKey: 'price',
      className: 'w-[17%]',
      cell: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(r.price).toLocaleString()}<span className="text-xs text-gray-500 font-normal">/mo</span></span>
      )
    },
    {
      header: '',
      accessorKey: 'id',
      className: 'w-[60px]',
      cell: (r) => (
        <div className="flex justify-end">
          <DropdownMenu>
            {['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') && (
              <DropdownItem icon={<Edit2 className="w-4 h-4" />} label="Edit Room" onClick={() => handleEditClick(r)} />
            )}
            {['admin', 'manager'].includes(user?.role || '') && (
              <DropdownItem icon={<Trash2 className="w-4 h-4" />} label="Delete Room" onClick={() => setRoomToDelete(r)} danger />
            )}
          </DropdownMenu>
        </div>
      )
    }
  ];


  const handleEditClick = (room: any) => {
    setDetailRoom(null);
    // Normalize from DB snake_case or already-mapped camelCase
    const normalized: Omit<Room, 'id' | 'branchId'> = {
      roomNumber: room.roomNumber || room.room_number || '',
      floor: room.floor ?? 1,
      totalBeds: room.totalBeds ?? room.total_beds ?? 2,
      occupiedBeds: room.occupiedBeds ?? room.occupied_beds ?? 0,
      type: room.type || 'Non-AC',
      price: room.price ?? 6000,
      description: room.description || '',
      amenities: room.amenities || []
    };
    setEditingRoom({ id: room.id, branchId: room.branchId || room.branch_id, ...normalized });
    setFormData(normalized);
    setIsAddModalOpen(true);
  };

  const handleBulkDelete = async (ids: string[]) => {
    for (const id of ids) {
      await deleteRoom(id);
    }
    toast.success(`${ids.length} rooms deleted`);
    refetch();
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingRoom(null);
    setFormData({
      roomNumber: '',
      floor: 1,
      totalBeds: 2,
      occupiedBeds: 0,
      type: 'Non-AC',
      price: 6000,
      description: '',
      amenities: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      await updateRoom(editingRoom.id, formData);
    } else {
      await addRoom(formData);
    }
    handleCloseModal();
    refetch();
  };

  const roomsData: Room[] = (paginatedRooms || []).map((r: any) => ({
    id: r.id,
    roomNumber: r.room_number,
    floor: r.floor,
    totalBeds: r.total_beds,
    occupiedBeds: r.occupied_beds,
    type: r.type,
    price: r.price,
    description: r.description,
    amenities: r.amenities || [],
    branchId: r.branch_id
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Rooms</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage rooms and occupancy.</p>
        </div>
        {!isAtLimit && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hidden sm:flex"
          >
            <Plus className="w-5 h-5" />
            Add Room
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {isNearLimit && !isAtLimit && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-500/20">
            {currentPlan?.maxRooms! - currentRoomsCount} rooms left on your plan
          </div>
        )}
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

      {/* Desktop View */}
      <div className="hidden sm:block">
        <DataGrid
          columns={roomColumns}
          data={paginatedRooms || []}
          isLoading={isLoading}
          keyExtractor={(r: any) => r.id}
          page={page}
          limit={limit}
          totalCount={totalCount}
          onPageChange={setPage}
          onRowClick={(r: any) => setDetailRoom(rooms.find(room => room.id === r.id) || null)}
        />
      </div>

      {/* Mobile View */}
      <div className="sm:hidden -mx-4 -mt-2">
        <RoomMobileList
          rooms={roomsData}
          onAdd={() => {
            if (isAtLimit) {
              toast.error(`Limit reached! Your current plan allows only ${currentPlan?.maxRooms} rooms.`);
              return;
            }
            setIsAddModalOpen(true);
          }}
          onEdit={handleEditClick}
          onDelete={(r) => { deleteRoom(r.id); refetch(); }}
          onBulkDelete={handleBulkDelete}
        />
      </div>

      {/* Room Detail Panel */}
      <RoomDetailPanel
        room={detailRoom}
        onClose={() => setDetailRoom(null)}
        onEdit={handleEditClick}
        onDelete={(r) => { setRoomToDelete(r); }}
        canEdit={['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '')}
      />

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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add briefly what's special about this room..."
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amenities</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Wi-Fi', emoji: '📶' },
                        { label: 'Attached Bath', emoji: '🚿' },
                        { label: 'TV', emoji: '📺' },
                        { label: 'Study Table', emoji: '📚' },
                        { label: 'Parking', emoji: '🅿️' },
                        { label: 'Geyser', emoji: '🔥' },
                        { label: 'Laundry', emoji: '🧺' },
                        { label: 'Bed', emoji: '🛏️' },
                      ].map(({ label, emoji }) => {
                        const isSelected = formData.amenities?.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              const current = formData.amenities || [];
                              setFormData({
                                ...formData,
                                amenities: isSelected
                                  ? current.filter(a => a !== label)
                                  : [...current, label]
                              });
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${isSelected
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 scale-105'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                              }`}
                          >
                            <span>{emoji}</span>
                            {label}
                          </button>
                        );
                      })}
                      {/* Custom chips added by user */}
                      {(formData.amenities || []).filter(a => ![
                        'Wi-Fi', 'AC', 'Non-AC', 'Attached Bath', 'TV', 'Study Table', 'Parking', 'Geyser', 'Laundry', 'Bed'
                      ].includes(a)).map(custom => (
                        <button
                          key={custom}
                          type="button"
                          onClick={() => setFormData({ ...formData, amenities: formData.amenities?.filter(a => a !== custom) })}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white shadow-lg shadow-violet-600/25 min-h-[44px] transition-all hover:bg-violet-700"
                        >
                          ✨ {custom} <span className="ml-1 opacity-75 text-xs">✕</span>
                        </button>
                      ))}
                    </div>
                    {/* Custom amenity input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = customAmenity.trim();
                            if (val && !(formData.amenities || []).includes(val)) {
                              setFormData({ ...formData, amenities: [...(formData.amenities || []), val] });
                            }
                            setCustomAmenity('');
                          }
                        }}
                        placeholder="+ Add custom amenity & press Enter"
                        className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = customAmenity.trim();
                          if (val && !(formData.amenities || []).includes(val)) {
                            setFormData({ ...formData, amenities: [...(formData.amenities || []), val] });
                          }
                          setCustomAmenity('');
                        }}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    {formData.amenities && formData.amenities.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formData.amenities.length} amenit{formData.amenities.length === 1 ? 'y' : 'ies'} selected · tap to deselect
                      </p>
                    )}
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

        {selectedRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRoom(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Room {selectedRoom.roomNumber}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Floor {selectedRoom.floor} • {selectedRoom.type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {['admin', 'manager'].includes(user?.role || '') && (
                    <button
                      onClick={() => {
                        handleEditClick(selectedRoom);
                        setSelectedRoom(null);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-indigo-600"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setSelectedRoom(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Occupancy</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {tenants.filter(t => t.roomId === selectedRoom.id && t.status === 'active').length} / {selectedRoom.totalBeds}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Monthly Rent</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{selectedRoom.price.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Room Type</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRoom.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Current Tenants
                    </h4>
                    <div className="space-y-3">
                      {tenants.filter(t => t.roomId === selectedRoom.id && t.status === 'active').map(tenant => (
                        <div key={tenant.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold">
                              {tenant.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{tenant.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-bold">Joined: {tenant.joiningDate}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {tenants.filter(t => t.roomId === selectedRoom.id && t.status === 'active').length === 0 && (
                        <p className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm italic">No active tenants in this room.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Description</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {selectedRoom.description || 'No description provided for this room.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">Amenities</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRoom.amenities && selectedRoom.amenities.length > 0 ? (
                          selectedRoom.amenities.map((amenity, idx) => (
                            <span key={idx} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                              {amenity}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">No amenities listed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {roomToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRoomToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0A0A0A] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10 text-rose-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Delete Room {roomToDelete.roomNumber}?</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 px-4">
                  {tenants.filter(t => t.roomId === roomToDelete.id && t.status === 'active').length > 0
                    ? `This room has active tenants. They will be automatically unassigned upon deletion. This action cannot be undone.`
                    : "Are you sure you want to delete this room? This action cannot be undone."}
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setRoomToDelete(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      deleteRoom(roomToDelete.id);
                      setRoomToDelete(null);
                    }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                  >
                    Delete Room
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
