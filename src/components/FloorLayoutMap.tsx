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
  ArrowRightLeft
} from 'lucide-react';
import { Room, Tenant, MeterGroup } from '../types';
import { cn } from '../utils';
import { ModernSelect } from './ModernSelect';
import { FilterChips } from './FilterChips';
import { SearchFilterCard } from './SearchFilterCard';

interface FloorLayoutMapProps {
  rooms: Room[];
  tenants: Tenant[];
  meterGroups?: MeterGroup[];
  primaryColor?: string;
  onSelectRoom?: (room: Room) => void;
  onSelectTenant?: (tenant: Tenant) => void;
  onAssignTenant?: (room: Room, bedNumber?: number) => void;
  onSwitchRoom?: (tenant: Tenant) => void;
}

export const FloorLayoutMap: React.FC<FloorLayoutMapProps> = ({
  rooms,
  tenants,
  meterGroups = [],
  primaryColor = 'linear-gradient(to right, #4f46e5, #7c3aed)',
  onSelectRoom,
  onSelectTenant,
  onAssignTenant,
  onSwitchRoom
}) => {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'AC' | 'Non-AC'>('all');
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
      const flatName = (r.flatName || (r as any).flat_name || '').toString().toLowerCase();
      const activeTenants = tenants.filter(t => (t.roomId || (t as any).room_id) === r.id && t.status === 'active');
      const tenantMatch = activeTenants.some(t => (t.name || '').toLowerCase().includes(q) || (t.phone || '').includes(q));

      const matchesSearch = q ? (roomNum.includes(q) || flatName.includes(q) || tenantMatch) : true;
      const matchesFloor = selectedFloor === 'all' ? true : r.floor === selectedFloor;
      const matchesType = typeFilter === 'all' ? true : r.type === typeFilter;
      
      const beds = r.totalBeds || (r as any).total_beds || 0;
      const vacant = Math.max(0, beds - activeTenants.length);

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'available' ? vacant > 0 :
        statusFilter === 'occupied' ? vacant === 0 : true;

      return matchesSearch && matchesFloor && matchesType && matchesStatus;
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
  }, [rooms, tenants, selectedFloor, statusFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Interactive Metric Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Beds */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Capacity</p>
            <p className="text-lg font-black text-gray-900 dark:text-white">{metrics.totalBeds} Beds ({metrics.totalRooms} Rooms)</p>
          </div>
        </div>

        {/* Vacant / Available Beds */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vacant Beds</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{metrics.vacantBeds} Available</p>
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupied Beds</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400">{metrics.occupiedBeds} Filled ({metrics.occupancyRate}%)</p>
          </div>
        </div>

        {/* AC vs Non-AC */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/5 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AC / Non-AC</p>
            <p className="text-lg font-black text-purple-600 dark:text-purple-400">{metrics.acCount} AC • {metrics.nonAcCount} Non-AC</p>
          </div>
        </div>
      </div>

      {/* Unified Filter Card Component */}
      <SearchFilterCard
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search room, flat, or occupant..."
        primaryColor={primaryColor}
        rightElements={
          <div className="w-full sm:w-44 shrink-0">
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
        }
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <FilterChips
              items={[
                { id: 'all', label: `All Floors (${availableFloors.length})` },
                ...availableFloors.map(f => ({
                  id: String(f),
                  label: f === 0 ? 'Ground Floor' : `Floor ${f}`,
                  icon: <Building2 className="w-3.5 h-3.5" />
                }))
              ]}
              activeId={String(selectedFloor)}
              onChange={(id) => setSelectedFloor(id === 'all' ? 'all' : Number(id))}
              primaryColor={primaryColor}
              size="sm"
            />
          </div>

          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer", statusFilter === 'all' ? "bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white shadow-xs" : "text-gray-500")}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('available')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1", statusFilter === 'available' ? "bg-emerald-500 text-white shadow-xs" : "text-emerald-600 dark:text-emerald-400")}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Vacant
            </button>
            <button
              onClick={() => setStatusFilter('occupied')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1", statusFilter === 'occupied' ? "bg-amber-500 text-white shadow-xs" : "text-amber-600 dark:text-amber-400")}
            >
              Full
            </button>
          </div>
        </div>
      </SearchFilterCard>

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

                  return (
                    <motion.div
                      key={room.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "bg-white dark:bg-[#111111] rounded-2xl border transition-all duration-200 p-4 shadow-sm hover:shadow-md relative overflow-hidden flex flex-col justify-between",
                        isFull 
                          ? "border-amber-200/60 dark:border-amber-500/20" 
                          : vacantCount > 0 
                            ? "border-emerald-200/60 dark:border-emerald-500/20" 
                            : "border-gray-100 dark:border-white/5"
                      )}
                    >
                      {/* Room Header Info */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onSelectRoom?.(room)}
                              className="font-black text-base text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>Room {roomNumber}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            {flat && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                                {flat.name}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
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
