import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DoorOpen,
  Users,
  Wind,
  Sun,
  UserPlus,
  User,
  CheckCircle2,
  AlertCircle,
  Zap,
  Building2,
  Filter,
  Search,
  ChevronRight,
  Phone,
  Calendar,
  IndianRupee,
  ArrowRightLeft,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Room, Tenant, MeterGroup } from '../types';
import { cn, getRoomCategoryMeta, ROOM_CATEGORIES } from '../utils';
import { ModernSelect } from './ModernSelect';
import { FilterChips } from './FilterChips';
import { SearchFilterCard } from './SearchFilterCard';

import { useAuth } from '../context/AuthContext';

interface FloorLayoutMapProps {
  rooms: Room[];
  tenants: Tenant[];
  meterGroups?: MeterGroup[];
  primaryColor?: string;
  onSelectRoom?: (room: Room) => void;
  onSelectTenant?: (tenant: Tenant) => void;
  onAssignTenant?: (room: Room, bedNumber?: number) => void;
  onSwitchRoom?: (tenant: Tenant) => void;
  onSwitchBranch?: (tenant: Tenant) => void;
  onExportExcel?: () => void;
  selectedRoomIds?: string[];
  onToggleSelectRoom?: (roomId: string) => void;
  onSelectAllRooms?: (roomIds: string[]) => void;
  onClearSelection?: () => void;
  onBulkDeleteRooms?: (roomIds: string[]) => void;
  onExportSelectedRooms?: (roomIds: string[]) => void;
}

export const FloorLayoutMap: React.FC<FloorLayoutMapProps> = ({
  rooms,
  tenants,
  meterGroups = [],
  primaryColor = 'linear-gradient(to right, #4f46e5, #7c3aed)',
  onSelectRoom,
  onSelectTenant,
  onAssignTenant,
  onSwitchRoom,
  onSwitchBranch,
  onExportExcel,
  selectedRoomIds = [],
  onToggleSelectRoom,
  onSelectAllRooms,
  onClearSelection,
  onBulkDeleteRooms,
  onExportSelectedRooms
}) => {
  const { user } = useAuth();

  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'AC' | 'Non-AC'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique floors
  const availableFloors = useMemo(() => {
    const floors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);
    return floors;
  }, [rooms]);

  // Total bed metrics calculation
  const metrics = useMemo(() => {
    let totalBeds = 0;
    let occupiedBeds = 0;
    let acCount = 0;
    let nonAcCount = 0;

    rooms.forEach(r => {
      const beds = r.totalBeds || (r as any).total_beds || 0;
      totalBeds += beds;
      
      const activeTenants = tenants.filter(t => (t.roomId || (t as any).room_id) === r.id && t.status === 'active');
      occupiedBeds += activeTenants.length;

      if (r.type === 'AC') acCount++;
      else nonAcCount++;
    });

    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupancyRate,
      totalRooms: rooms.length,
      acCount,
      nonAcCount
    };
  }, [rooms, tenants]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const filtered = rooms.filter(r => {
      const q = searchQuery.trim().toLowerCase();
      const roomNum = (r.roomNumber || (r as any).room_number || '').toString().toLowerCase();
      const linkedFlat = meterGroups.find(m => m.id === (r.meterGroupId || (r as any).meter_group_id));
      const flatName = (linkedFlat?.name || '').toLowerCase();
      const activeTenants = tenants.filter(t => (t.roomId || (t as any).room_id) === r.id && t.status === 'active');
      const tenantMatch = activeTenants.some(t => (t.name || '').toLowerCase().includes(q) || (t.phone || '').includes(q));

      const matchesSearch = q ? (roomNum.includes(q) || flatName.includes(q) || tenantMatch) : true;
      const matchesFloor = selectedFloor === 'all' ? true : r.floor === selectedFloor;
      const matchesType = typeFilter === 'all' ? true : r.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' ? true : r.roomCategory === categoryFilter;
      
      const beds = r.totalBeds || (r as any).total_beds || 0;
      const vacant = Math.max(0, beds - activeTenants.length);

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'available' ? vacant > 0 :
        statusFilter === 'occupied' ? vacant === 0 : true;

      return matchesSearch && matchesFloor && matchesType && matchesCategory && matchesStatus;
    });

    const grouped: Record<number, Room[]> = {};
    filtered.forEach(r => {
      if (!grouped[r.floor]) grouped[r.floor] = [];
      grouped[r.floor].push(r);
    });

    // Sort rooms inside each floor by room number
    Object.keys(grouped).forEach(f => {
      grouped[Number(f)].sort((a, b) => {
        const numA = parseInt((a.roomNumber || (a as any).room_number || '0').replace(/\D/g, '')) || 0;
        const numB = parseInt((b.roomNumber || (b as any).room_number || '0').replace(/\D/g, '')) || 0;
        return numA - numB;
      });
    });

    return grouped;
  }, [rooms, tenants, selectedFloor, statusFilter, typeFilter, categoryFilter, searchQuery]);

  const allVisibleRoomIds = useMemo(() => {
    return Object.values(roomsByFloor).flat().map(r => r.id);
  }, [roomsByFloor]);

  const isAllSelected = useMemo(() => {
    return allVisibleRoomIds.length > 0 && allVisibleRoomIds.every(id => selectedRoomIds.includes(id));
  }, [allVisibleRoomIds, selectedRoomIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      onClearSelection?.();
    } else {
      onSelectAllRooms?.(allVisibleRoomIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Interactive Metric Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Beds */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0 card-hover">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">Total Capacity</p>
            <p className="text-xs sm:text-base font-black text-gray-900 dark:text-white truncate">{metrics.totalBeds} Beds ({metrics.totalRooms} Rms)</p>
          </div>
        </div>

        {/* Vacant / Available Beds */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0 card-hover">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">Vacant Beds</p>
            <p className="text-xs sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">{metrics.vacantBeds} Available</p>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0 card-hover">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">Occupied Beds</p>
            <p className="text-xs sm:text-base font-black text-amber-600 dark:text-amber-400 truncate">{metrics.occupiedBeds} Filled ({metrics.occupancyRate}%)</p>
          </div>
        </div>

        {/* AC vs Non-AC */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0 card-hover">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <Wind className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">AC / Non-AC</p>
            <p className="text-xs sm:text-base font-black text-purple-600 dark:text-purple-400 truncate">{metrics.acCount} AC • {metrics.nonAcCount} Non-AC</p>
          </div>
        </div>
      </div>

      {/* Unified SearchFilterCard Component */}
      <SearchFilterCard
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search room, flat, or occupant..."
        primaryColor={primaryColor}
        onExportExcel={onExportExcel}
        chips={[
          { id: 'all', label: `All Floors (${availableFloors.length})` },
          ...availableFloors.map(f => ({
            id: String(f),
            label: f === 0 ? 'Ground Floor' : `Floor ${f}`,
            icon: <Building2 className="w-3.5 h-3.5" />
          }))
        ]}
        activeChipId={String(selectedFloor)}
        onChipChange={(id) => setSelectedFloor(id === 'all' ? 'all' : Number(id))}
        chipSize="sm"
        rightElements={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-36 shrink-0">
              <ModernSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as any)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'AC', label: 'AC Rooms' },
                  { value: 'Non-AC', label: 'Non-AC Rooms' }
                ]}
              />
            </div>
            <div className="w-40 shrink-0">
              <ModernSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...ROOM_CATEGORIES.map(cat => ({ value: cat.id, label: cat.label }))
                ]}
              />
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
          {onSelectAllRooms && allVisibleRoomIds.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 w-full sm:w-auto",
                isAllSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10"
              )}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={() => {}}
                className="w-3.5 h-3.5 rounded border-gray-300 dark:border-white/20 text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-none"
              />
              <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
            </button>
          )}

          <div className="flex items-center justify-between sm:justify-start flex-1 sm:flex-none w-full sm:w-auto bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center", statusFilter === 'all' ? "bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white shadow-xs" : "text-gray-500")}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('available')}
              className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1", statusFilter === 'available' ? "bg-emerald-500 text-white shadow-xs" : "text-emerald-600 dark:text-emerald-400")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
              <span>Vacant</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('occupied')}
              className={cn("flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1", statusFilter === 'occupied' ? "bg-amber-500 text-white shadow-xs" : "text-amber-600 dark:text-amber-400")}
            >
              <span>Full</span>
            </button>
          </div>
        </div>
      </SearchFilterCard>

      {/* Multi-Selection Bar */}
      <AnimatePresence>
        {selectedRoomIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                {selectedRoomIds.length} rooms selected
              </span>
              <button
                onClick={onClearSelection}
                className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-bold cursor-pointer"
              >
                Clear selection
              </button>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
              {onExportSelectedRooms && (
                <button
                  onClick={() => onExportSelectedRooms(selectedRoomIds)}
                  className="flex items-center justify-center gap-1.5 px-4 h-11 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
                  style={{ background: primaryColor }}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Export Selected ({selectedRoomIds.length})</span>
                </button>
              )}
              {onBulkDeleteRooms && (
                <button
                  onClick={() => onBulkDeleteRooms(selectedRoomIds)}
                  className="flex items-center justify-center gap-1.5 px-4 h-11 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Delete Selected ({selectedRoomIds.length})</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floors & Rooms Visual Map View */}
      {Object.keys(roomsByFloor).length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 p-8">
          <DoorOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h4 className="font-bold text-gray-900 dark:text-white text-base">No rooms match your filter</h4>
          <p className="text-xs text-gray-400 mt-1">Try switching floor tabs or clearing your search filters.</p>
        </div>
      ) : (
        Object.entries(roomsByFloor).map(([floorStr, floorRooms]) => {
          const floorNum = Number(floorStr);
          const floorTitle = floorNum === 0 ? 'Ground Floor' : `Floor ${floorNum}`;

          return (
            <div key={floorNum} className="space-y-4">
              {/* Floor Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-gray-100 to-transparent dark:from-white/5 dark:to-transparent px-4 py-2 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg text-white flex items-center justify-center font-black text-xs shadow-sm" style={{ background: primaryColor }}>
                    {floorNum}
                  </div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">{floorTitle}</h3>
                  <span className="text-xs text-gray-400 font-bold">({floorRooms.length} {floorRooms.length === 1 ? 'room' : 'rooms'})</span>
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {floorRooms.map(room => {
                  const roomNumber = room.roomNumber || (room as any).room_number;
                  const roomTenants = tenants.filter(t => (t.roomId || (t as any).room_id) === room.id && t.status === 'active');
                  const totalBeds = room.totalBeds || (room as any).total_beds || 0;
                  const occupiedCount = roomTenants.length;
                  const vacantCount = Math.max(0, totalBeds - occupiedCount);
                  const isFull = vacantCount === 0;

                  const flat = meterGroups.find(m => m.id === (room.meterGroupId || (room as any).meter_group_id));
                  const isSelected = selectedRoomIds.includes(room.id);
                  const catMeta = getRoomCategoryMeta(room.roomCategory);

                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-white dark:bg-[#111111] rounded-2xl border transition-all duration-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between card-hover",
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-500/5"
                          : isFull 
                            ? "border-amber-200/60 dark:border-amber-500/20" 
                            : vacantCount > 0 
                              ? "border-emerald-200/60 dark:border-emerald-500/20" 
                              : "border-gray-100 dark:border-white/5"
                      )}
                    >
                      {/* Room Header Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {onToggleSelectRoom && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  onToggleSelectRoom(room.id);
                                }}
                                className="w-4 h-4 rounded border-gray-300 dark:border-white/10 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                              />
                            )}
                            <button
                              onClick={() => onSelectRoom?.(room)}
                              className="font-black text-base text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>{roomNumber.toLowerCase().includes('room') ? roomNumber : `Room ${roomNumber}`}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            {flat && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                                {flat.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {catMeta && (
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border", catMeta.color)}>
                                <span>{catMeta.icon}</span>
                                <span className="hidden sm:inline">{catMeta.label}</span>
                              </span>
                            )}
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                              room.type === 'AC' 
                                ? "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-500/20" 
                                : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20"
                            )}>
                              {room.type === 'AC' ? <Wind className="w-3 h-3 text-cyan-500" /> : <Sun className="w-3 h-3 text-amber-500" />}
                              <span>{room.type}</span>
                            </span>
                          </div>
                        </div>

                        {/* Capacity Progress Bar & Price */}
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-600 dark:text-gray-400">
                              {occupiedCount}/{totalBeds} Beds Filled
                            </span>
                            {vacantCount > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                {vacantCount} Vacant
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                Houseful
                              </span>
                            )}
                          </div>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                            ₹{Number(room.price).toLocaleString()}/mo
                          </span>
                        </div>

                        {/* Visual Progress Line */}
                        <div className="w-full bg-gray-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mb-4">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              isFull ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${Math.min(100, (occupiedCount / (totalBeds || 1)) * 100)}%` }}
                          />
                        </div>

                        {/* Interactive Beds Grid */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bed Allocation</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Array.from({ length: totalBeds }).map((_, index) => {
                              const bedNum = index + 1;
                              const tenant = roomTenants.find(t => {
                                const tBed = Number(t.bedNumber || (t as any).bed_number);
                                if (tBed) return tBed === bedNum;
                                return index === 0; // fallback if bedNumber is missing or 0
                              });

                              if (tenant) {
                                // Occupied Bed
                                return (
                                  <motion.div
                                    key={tenant.id}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => onSelectTenant?.(tenant)}
                                    className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/20 flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-indigo-400 shadow-2xs"
                                    title={`Click to view ${tenant.name}'s profile`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs" style={{ background: primaryColor }}>
                                        {tenant.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{tenant.name}</p>
                                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">Bed {bedNum} • Occupied</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                       {tenant.phone && (
                                         <a
                                           href={`tel:${tenant.phone}`}
                                           onClick={(e) => e.stopPropagation()}
                                           className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                                           title={`Call ${tenant.name}`}
                                         >
                                           <Phone className="w-3.5 h-3.5" />
                                         </a>
                                       )}
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           onSwitchRoom?.(tenant);
                                         }}
                                         className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors"
                                         title={`Switch room for ${tenant.name}`}
                                       >
                                         <ArrowRightLeft className="w-3.5 h-3.5" />
                                       </button>
                                       {onSwitchBranch && user?.role === 'admin' && (user?.branchIds || []).length > 1 && (
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             onSwitchBranch(tenant);
                                           }}
                                           className="p-1 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400 transition-colors"
                                           title={`Switch branch for ${tenant.name}`}
                                         >
                                           <Building2 className="w-3.5 h-3.5" />
                                         </button>
                                       )}
                                     </div>
                                  </motion.div>
                                );
                              } else {
                                // Vacant Bed
                                return (
                                  <motion.button
                                    key={`vacant-${index}`}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => onAssignTenant?.(room, bedNum)}
                                    className="p-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 flex items-center justify-between gap-1.5 cursor-pointer transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-left"
                                    title="Click to allocate a tenant to this vacant bed"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                                        +
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">Bed {bedNum}</p>
                                        <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-500/80 truncate">Available</p>
                                      </div>
                                    </div>
                                    <UserPlus className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                                  </motion.button>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
