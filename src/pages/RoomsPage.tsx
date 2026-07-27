import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Room, MeterGroup } from '../types';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  DoorOpen,
  Users,
  LayoutGrid,
  Trash2,
  Edit2,
  Wind,
  Sun,
  Search,
  Filter,
  Layers,
  MapPin,
  LayoutDashboard,
  Zap,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModernSelect } from '../components/ModernSelect';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import { RoomDetailPanel } from '../components/RoomDetailPanel';
import { FlatDetailPanel } from '../components/FlatDetailPanel';
import { RoomMobileList } from '../components/RoomMobileList';
import { FlatMobileList } from '../components/FlatMobileList';
import { FloorLayoutMap } from '../components/FloorLayoutMap';
import { QuickAllocateModal } from '../components/QuickAllocateModal';
import { SwitchRoomModal } from '../components/SwitchRoomModal';
import { ElectricityBillModal } from '../components/ElectricityBillModal';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { exportRoomsToExcel, exportFlatsToExcel } from '../utils/exportUtils';

export const RoomsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rooms, addRoom, updateRoom, deleteRoom, currentPlan, tenants, meterGroups, addMeterGroup, updateMeterGroup, deleteMeterGroup, pgConfig, branches, currentBranch, fetchData, isAppLoading } = useApp();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [electricityFlat, setElectricityFlat] = useState<MeterGroup | null>(null);
  const [allocateRoomModal, setAllocateRoomModal] = useState<{ room: Room; bedNumber?: number } | null>(null);
  const [switchRoomTenant, setSwitchRoomTenant] = useState<any | null>(null);

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
  const [filterFloor, setFilterFloor] = useState<number | string>('all');
  const location = useLocation();

  useEffect(() => {
    if (location.state?.selectedFloor) {
      setFilterFloor(location.state.selectedFloor);
    }
  }, [location.state]);
  const [formData, setFormData] = useState<Omit<Room, 'id' | 'branchId'> & { meterGroupId?: string }>({
    roomNumber: '',
    floor: 1,
    totalBeds: 2,
    occupiedBeds: 0,
    type: 'Non-AC',
    price: 6000,
    description: '',
    amenities: [],
    meterGroupId: ''
  });
  const [customAmenity, setCustomAmenity] = useState('');
  
  const [activeTab, setActiveTab] = useState<'visual-map' | 'rooms' | 'flats'>('visual-map');
  const [isAddFlatModalOpen, setIsAddFlatModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState<MeterGroup | null>(null);
  const [detailFlat, setDetailFlat] = useState<MeterGroup | null>(null);
  const [flatFormData, setFlatFormData] = useState({ name: '', floor: 1 });

  // Inline flat creation state (keeping for backward compat in add room modal if needed)
  const [isAddingFlat, setIsAddingFlat] = useState(false);
  const [newFlatName, setNewFlatName] = useState('');
  const [newFlatFloor, setNewFlatFloor] = useState(1);

  const filterType = searchTerm ? 'all' : 'all'; // placeholder so we can add type filter later

  // Client-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [flatPage, setFlatPage] = useState(1);
  const [flatLimit, setFlatLimit] = useState(10);

  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [bulkRoomDeleteIds, setBulkRoomDeleteIds] = useState<string[] | null>(null);

  const handleToggleSelectRoom = (id: string) => {
    setSelectedRoomIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRooms = (checked: boolean) => {
    if (checked) {
      setSelectedRoomIds((roomsData || []).map((r: any) => r.id));
    } else {
      setSelectedRoomIds([]);
    }
  };

  useEffect(() => {
    setSelectedRoomIds([]);
  }, [searchTerm, filterFloor, page, activeTab]);

  useEffect(() => {
    setPage(1);
    setFlatPage(1);
  }, [searchTerm, filterFloor]);

  const allFilteredRooms = React.useMemo(() => {
    return (rooms || []).filter(r => {
      // 1. Filter by Floor
      if (filterFloor !== 'all' && r.floor !== Number(filterFloor)) {
        return false;
      }

      // 2. Search Term Matching
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        
        // Match Room Number
        const matchesRoomNumber = String(r.roomNumber || '').toLowerCase().includes(query);
        
        // Match Room Type
        const matchesType = String(r.type || '').toLowerCase().includes(query);
        
        // Match Flat/Group Name
        const matchesFlatName = r.meterGroup?.name ? r.meterGroup.name.toLowerCase().includes(query) : false;
        
        // Match Tenant Names
        const matchesTenants = tenants.some(t => 
          t.roomId === r.id && 
          ['active', 'vacating'].includes(t.status) && 
          t.name.toLowerCase().includes(query)
        );

        return matchesRoomNumber || matchesType || matchesFlatName || matchesTenants;
      }

      return true;
    });
  }, [rooms, tenants, searchTerm, filterFloor]);

  const totalCount = allFilteredRooms.length;
  const paginatedRooms = React.useMemo(() => {
    const startIndex = (page - 1) * limit;
    return allFilteredRooms.slice(startIndex, startIndex + limit);
  }, [allFilteredRooms, page, limit]);

  const isLoading = isAppLoading || false;
  const refetch = fetchData;

  const roomsData: Room[] = (paginatedRooms || []).map((r: any) => {
    const liveOccupied = tenants.filter(t => t.roomId === r.id && t.status === 'active').length;
    return {
      id: r.id,
      roomNumber: r.roomNumber ?? r.room_number,
      floor: r.floor,
      totalBeds: r.totalBeds ?? r.total_beds,
      occupiedBeds: liveOccupied,
      type: r.type,
      price: r.price,
      description: r.description,
      amenities: r.amenities || [],
      branchId: r.branchId ?? r.branch_id,
      meterGroupId: r.meterGroupId ?? r.meter_group_id,
      meterGroup: r.meterGroup ?? r.meter_groups
    };
  });

  const [selectedFlatIds, setSelectedFlatIds] = useState<string[]>([]);
  const [bulkFlatDeleteIds, setBulkFlatDeleteIds] = useState<string[] | null>(null);

  const handleToggleSelectFlat = (id: string) => {
    setSelectedFlatIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFlats = (checked: boolean) => {
    if (checked) {
      setSelectedFlatIds((paginatedMeterGroups || []).map((f: any) => f.id));
    } else {
      setSelectedFlatIds([]);
    }
  };

  useEffect(() => {
    setSelectedFlatIds([]);
  }, [searchTerm, filterFloor, flatPage, activeTab]);

  const filteredMeterGroups = React.useMemo(() => {
    return (meterGroups || []).filter(mg => {
      if (filterFloor !== 'all' && mg.floor !== Number(filterFloor)) {
        return false;
      }

      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = mg.name.toLowerCase().includes(query);
        
        const linkedRooms = rooms.filter(r => r.meterGroupId === mg.id);
        const matchesRooms = linkedRooms.some(r => 
          String(r.roomNumber || '').toLowerCase().includes(query)
        );
        
        const matchesTenants = tenants.some(t => 
          linkedRooms.some(r => r.id === t.roomId) && 
          ['active', 'vacating'].includes(t.status) && 
          t.name.toLowerCase().includes(query)
        );

        return matchesName || matchesRooms || matchesTenants;
      }

      return true;
    });
  }, [meterGroups, rooms, tenants, searchTerm, filterFloor]);

  const paginatedMeterGroups = React.useMemo(() => {
    const startIndex = (flatPage - 1) * flatLimit;
    return filteredMeterGroups.slice(startIndex, startIndex + flatLimit);
  }, [filteredMeterGroups, flatPage, flatLimit]);


  // Sync detail panel when paginated data updates (e.g. after edit + refetch)
  useEffect(() => {
    if (detailRoom && paginatedRooms && paginatedRooms.length > 0) {
      const live = paginatedRooms.find((r: any) => r.id === detailRoom.id);
      if (live && JSON.stringify(live) !== JSON.stringify(detailRoom)) {
        setDetailRoom(live);
      } else if (!live) {
        const globalLive = rooms.find((r: any) => r.id === detailRoom.id);
        if (globalLive && JSON.stringify(globalLive) !== JSON.stringify(detailRoom)) {
          setDetailRoom(globalLive);
        }
      }
    }
  }, [paginatedRooms, rooms, detailRoom]);

  // Sync flat detail panel with global meterGroups state
  useEffect(() => {
    if (detailFlat && meterGroups && meterGroups.length > 0) {
      const live = meterGroups.find((m: any) => m.id === detailFlat.id);
      if (live && JSON.stringify(live) !== JSON.stringify(detailFlat)) {
        setDetailFlat(live);
      }
    }
  }, [meterGroups, detailFlat]);
  const roomColumns: ColumnDef<any>[] = React.useMemo(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={(roomsData || []).length > 0 && selectedRoomIds.length === (roomsData || []).length}
          onChange={(e) => handleSelectAllRooms(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
            selectedRoomIds.length === 0 && "opacity-0 group-hover:opacity-100"
          )}
        />
      ),
      accessorKey: 'id',
      cell: (r: any) => {
        const isSelected = selectedRoomIds.includes(r.id);
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleSelectRoom(r.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
              !isSelected && "opacity-0 group-hover:opacity-100"
            )}
          />
        );
      },
      className: "w-10"
    },
    {
      header: 'Room',
      accessorKey: 'roomNumber',
      sortable: true,
      className: 'w-[18%] min-w-[130px]',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Room {r.roomNumber}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{r.meterGroup ? `${r.meterGroup.name} (${r.floor === 0 ? 'Ground Floor' : `Floor ${r.floor}`})` : (r.floor === 0 ? 'Ground Floor' : `Floor ${r.floor}`)}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Tenants',
      accessorKey: 'id',
      className: 'w-[32%] min-w-[180px]',
      cell: (r) => {
        const roomTenants = tenants.filter(t => t.roomId === r.id && ['active', 'vacating'].includes(t.status));
        return (
          <div className="flex flex-col gap-3 py-1">
            {roomTenants.map(t => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-xs shadow-md uppercase shrink-0" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                  {t.name?.charAt(0) || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                    {t.name}
                    {t.status === 'vacating' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
                        Vacating
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Bed {t.bedNumber}</p>
                </div>
              </div>
            ))}
            {roomTenants.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">Empty Room</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Occupancy',
      accessorKey: 'occupiedBeds',
      sortable: true,
      sortFn: (a, b, direction) => {
        // Live occupied beds calculation
        const liveA = tenants.filter(t => t.roomId === a.id && t.status === 'active').length;
        const liveB = tenants.filter(t => t.roomId === b.id && t.status === 'active').length;
        return direction === 'asc' ? liveA - liveB : liveB - liveA;
      },
      className: 'w-[20%] min-w-[130px]',
      cell: (r) => {
        // Compute live from tenants (DB occupied_beds column is not auto-synced)
        const liveOccupied = tenants.filter(t => t.roomId === r.id && t.status === 'active').length;
        const totalBeds = r.totalBeds ?? 0;
        const isFull = liveOccupied >= totalBeds;
        const pct = totalBeds > 0 ? Math.round((liveOccupied / totalBeds) * 100) : 0;
        return (
          <div className="min-w-[110px]">
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
      sortable: true,
      className: 'w-[12%] min-w-[90px]',
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
      sortable: true,
      className: 'w-[13%] min-w-[90px]',
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
  ], [tenants, user?.role, selectedRoomIds, roomsData]);

  const flatColumns: ColumnDef<MeterGroup>[] = React.useMemo(() => [
    {
      header: (
        <input
          type="checkbox"
          checked={(paginatedMeterGroups || []).length > 0 && selectedFlatIds.length === (paginatedMeterGroups || []).length}
          onChange={(e) => handleSelectAllFlats(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
            selectedFlatIds.length === 0 && "opacity-0 group-hover:opacity-100"
          )}
        />
      ),
      accessorKey: 'id',
      cell: (f: any) => {
        const isSelected = selectedFlatIds.includes(f.id);
        return (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleToggleSelectFlat(f.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-opacity duration-200",
              !isSelected && "opacity-0 group-hover:opacity-100"
            )}
          />
        );
      },
      className: "w-10"
    },
    {
      header: 'Flat / Group',
      accessorKey: 'name',
      sortable: true,
      className: 'w-[25%] min-w-[150px]',
      cell: (f) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{f.name}</p>
             <p className="text-xs text-gray-500 dark:text-gray-400">{f.floor === 0 ? 'Ground Floor' : `Floor ${f.floor}`}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Linked Rooms',
      accessorKey: 'id',
      sortable: true,
      sortFn: (a, b, direction) => {
        const countA = rooms.filter(r => r.meterGroupId === a.id).length;
        const countB = rooms.filter(r => r.meterGroupId === b.id).length;
        return direction === 'asc' ? countA - countB : countB - countA;
      },
      className: 'w-[35%] min-w-[180px]',
      cell: (f) => {
        const linkedRooms = rooms.filter(r => r.meterGroupId === f.id);
        return (
          <div className="flex flex-col gap-2 py-1">
            {linkedRooms.map(r => (
              <div key={r.id} className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">Room {r.roomNumber}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{r.type} • {r.totalBeds} Beds</span>
              </div>
            ))}
            {linkedRooms.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">No Rooms Linked</span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Occupancy',
      accessorKey: 'id',
      sortable: true,
      sortFn: (a, b, direction) => {
        const linkedRoomsA = rooms.filter(r => r.meterGroupId === a.id);
        const occupiedA = tenants.filter(t => linkedRoomsA.some(r => r.id === t.roomId) && t.status === 'active').length;
        const linkedRoomsB = rooms.filter(r => r.meterGroupId === b.id);
        const occupiedB = tenants.filter(t => linkedRoomsB.some(r => r.id === t.roomId) && t.status === 'active').length;
        return direction === 'asc' ? occupiedA - occupiedB : occupiedB - occupiedA;
      },
      className: 'w-[20%] min-w-[120px]',
      cell: (f) => {
        const linkedRooms = rooms.filter(r => r.meterGroupId === f.id);
        const total = linkedRooms.reduce((sum, r) => sum + (r.totalBeds || 0), 0);
        const occupied = tenants.filter(t => linkedRooms.some(r => r.id === t.roomId) && t.status === 'active').length;
        return (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{occupied} / {total} Beds</span>
          </div>
        );
      }
    },
    {
      header: 'Type',
      accessorKey: 'id',
      className: 'w-[15%] min-w-[100px]',
      cell: (f) => {
        const linkedRooms = rooms.filter(r => r.meterGroupId === f.id);
        const types = Array.from(new Set(linkedRooms.map(r => r.type).filter(Boolean)));
        return (
          <div className="flex flex-wrap gap-1.5">
            {types.map(t => (
              <span key={t} className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold uppercase',
                t === 'AC' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
              )}>
                {t}
              </span>
            ))}
            {types.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">-</span>
            )}
          </div>
        );
      }
    },
    {
      header: '',
      accessorKey: 'id',
      className: 'w-[60px]',
      cell: (f) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownItem icon={<Zap className="w-4 h-4 text-amber-500" />} label="Manage Electricity" onClick={() => setElectricityFlat(f)} />
            <DropdownItem icon={<Edit2 className="w-4 h-4" />} label="Edit Group" onClick={() => handleEditFlat(f)} />
            <DropdownItem icon={<Trash2 className="w-4 h-4" />} label="Delete Group" onClick={() => deleteMeterGroup(f.id)} danger />
          </DropdownMenu>
        </div>
      )
    }
  ], [rooms, tenants, selectedFlatIds, paginatedMeterGroups]);


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
      meterGroupId: room.meterGroupId || room.meter_group_id || '',
    };
    const amenities = Array.isArray(room.amenities) ? room.amenities : 
                     (typeof room.amenities === 'string' ? JSON.parse(room.amenities) : []);

    setEditingRoom({ id: room.id, branchId: room.branchId || room.branch_id, ...normalized, amenities });
    setFormData({ ...normalized, amenities });
    setIsAddModalOpen(true);
  };

  const handleBulkDelete = async (ids: string[]) => {
    setBulkRoomDeleteIds(ids);
  };

  const handleBulkFlatDelete = async (ids: string[]) => {
    setBulkFlatDeleteIds(ids);
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
      amenities: [],
      meterGroupId: ''
    });
    setIsAddingFlat(false);
    setNewFlatName('');
    setNewFlatFloor(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalMeterGroupId = formData.meterGroupId;

    if (isAddingFlat) {
      if (!newFlatName.trim()) {
        toast.error("Please enter a flat name");
        return;
      }
      try {
        const id = `temp-flat-${Date.now()}`;
        await addMeterGroup({ name: newFlatName, floor: newFlatFloor });
        // The optimistic UI update doesn't return the real ID immediately, 
        // but AppContext pushes it to Supabase. For stability, we might want to wait, or assume it joins in refetch. 
        // Actually since addRoom takes meterGroupId as string, we can temporarily assume the UI catches up or require them to fetch.
        // Let's create it and find it via name & floor
        toast.success("Flat created. Please select it from dropdown.");
        setIsAddingFlat(false);
        setNewFlatName('');
        return; // Break here intentionally so they can select it via the dropdown once synced. 
      } catch (err: any) {
        toast.error("Failed to create flat.");
        return;
      }
    }

    if (!finalMeterGroupId) {
      toast.error('Please select a Flat / Meter Group for this room.');
      return;
    }

    const isDuplicate = rooms.some(r => r.roomNumber.toLowerCase() === formData.roomNumber.toLowerCase() && r.meterGroupId === finalMeterGroupId && r.id !== editingRoom?.id);
    if (isDuplicate) {
      toast.error(`Room number ${formData.roomNumber} already exists in the selected Flat/Group.`);
      return;
    }

    const payload = { ...formData, meterGroupId: finalMeterGroupId };

    if (editingRoom) {
      if (formData.totalBeds < editingRoom.occupiedBeds) {
        toast.error(`Cannot reduce beds to ${formData.totalBeds}. ${editingRoom.occupiedBeds} are currently occupied.`);
        return;
      }
      await updateRoom(editingRoom.id, payload);
    } else {
      await addRoom(payload);
    }
    handleCloseModal();
    refetch();
  };

  const handleEditFlat = (flat: MeterGroup) => {
    setEditingFlat(flat);
    setFlatFormData({ name: flat.name, floor: flat.floor });
    setIsAddFlatModalOpen(true);
  };

  const handleFlatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isDuplicate = meterGroups.some(m => m.name.toLowerCase() === flatFormData.name.toLowerCase() && m.floor === flatFormData.floor && m.id !== editingFlat?.id);
    if (isDuplicate) {
      toast.error(`Flat ${flatFormData.name} already exists on ${flatFormData.floor === 0 ? 'Ground Floor' : `floor ${flatFormData.floor}`}.`);
      return;
    }

    if (editingFlat) {
      await updateMeterGroup(editingFlat.id, flatFormData);
    } else {
      await addMeterGroup(flatFormData);
    }
    setIsAddFlatModalOpen(false);
    setEditingFlat(null);
    setFlatFormData({ name: '', floor: 1 });
  };

  const availableFloors = React.useMemo(() => {
    const roomFloors = (rooms || []).map(r => r.floor);
    const flatFloors = (meterGroups || []).map(m => m.floor);
    const allFloors = Array.from(new Set([...roomFloors, ...flatFloors]))
      .filter(f => f !== undefined && f !== null)
      .sort((a, b) => a - b);
    return allFloors.length > 0 ? allFloors : Array.from({ length: 6 }, (_, i) => i);
  }, [rooms, meterGroups]);



  const roomsToExport = React.useMemo(() => {
    return (rooms || []).filter(r => {
      const matchesSearch = searchTerm === '' || String(r.roomNumber || (r as any).room_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFloor = filterFloor === 'all' || r.floor === Number(filterFloor);
      return matchesSearch && matchesFloor;
    });
  }, [rooms, searchTerm, filterFloor]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Rooms</h2>
          <p className="text-gray-500 dark:text-gray-400">Configure and monitor all room and flat allocations.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-6 overflow-x-auto pb-1 hide-scrollbar">
          <button 
            onClick={() => setActiveTab('visual-map')}
            className={cn(
              "group relative py-2 transition-all cursor-pointer shrink-0",
              activeTab === 'visual-map' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <span className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className={cn("w-5 h-5", activeTab === 'visual-map' ? "text-indigo-600" : "text-gray-400")} />
              Interactive Bed Map
            </span>
            {activeTab === 'visual-map' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }} />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('flats')}
            className={cn(
              "group relative py-2 transition-all cursor-pointer shrink-0",
              activeTab === 'flats' ? "text-violet-600 dark:text-violet-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <span className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
              <Layers className={cn("w-5 h-5", activeTab === 'flats' ? "text-violet-600" : "text-gray-400")} />
              Flats / Groups
            </span>
            {activeTab === 'flats' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" style={{ background: pgConfig?.primaryColor || '#7c3aed' }} />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('rooms')}
            className={cn(
              "group relative py-2 transition-all cursor-pointer shrink-0",
              activeTab === 'rooms' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <span className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
              <DoorOpen className={cn("w-5 h-5", activeTab === 'rooms' ? "text-indigo-600" : "text-gray-400")} />
              Rooms List
            </span>
            {activeTab === 'rooms' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }} />
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          {['admin', 'manager', 'super'].includes(user?.role || '') && (
            <button
              onClick={() => {
                setEditingFlat(null);
                setFlatFormData({ name: '', floor: 1 });
                setIsAddFlatModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
            >
              <Layers className="w-5 h-5 text-violet-500" />
              Add Flat
            </button>
          )}
          {!isAtLimit && ['admin', 'manager', 'super'].includes(user?.role || '') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
            >
              <Plus className="w-5 h-5" />
              Add Room
            </button>
          )}
        </div>
      </div>
      {activeTab === 'visual-map' ? (
        <FloorLayoutMap
          rooms={rooms}
          tenants={tenants}
          meterGroups={meterGroups}
          primaryColor={pgConfig?.primaryColor}
          onSelectRoom={(room) => setDetailRoom(room)}
          onSelectTenant={(tenant) => {
            const activeBranchId = currentBranch?.id || user?.branchId;
            navigate(activeBranchId ? `/branch/${activeBranchId}/tenants` : '/tenants');
          }}
          onAssignTenant={(room, bedNumber) => setAllocateRoomModal({ room, bedNumber })}
          onSwitchRoom={(tenant) => setSwitchRoomTenant(tenant)}
        />
      ) : (
        <>
          <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by room number, occupant, flat, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center w-full sm:w-auto">
              <ModernSelect
                value={filterFloor === 'all' ? 'all' : String(filterFloor)}
                onChange={(val) => setFilterFloor(val === 'all' ? 'all' : Number(val))}
                options={[
                  { value: "all", label: "All Floors" },
                  ...availableFloors.map(f => ({ value: String(f), label: f === 0 ? "Ground Floor" : `Floor ${f}` }))
                ]}
                className="flex-1 sm:w-44 sm:flex-initial"
              />
              <button className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0">
                <Filter className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  try {
                    if (activeTab === 'rooms') {
                      exportRoomsToExcel(roomsToExport, tenants, branches, meterGroups, currentBranch);
                      toast.success('Rooms Export Generated Successfully');
                    } else {
                      exportFlatsToExcel(filteredMeterGroups, rooms, tenants, branches, currentBranch);
                      toast.success('Flats Export Generated Successfully');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('Failed to generate export');
                  }
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 hover:opacity-90 shrink-0"
                style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
                title="Export to Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="whitespace-nowrap">Export Excel</span>
              </button>
            </div>
          </div>

          {isNearLimit && !isAtLimit && (
            <div className="flex justify-end">
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-500/20">
                {currentPlan?.maxRooms! - currentRoomsCount} rooms left on your plan
              </div>
            </div>
          )}

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
                onClick={() => navigate('/subscription')}
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

          {/* Desktop/Tablet View (Unified Grid) */}
          <div className="hidden md:block">
            {activeTab === 'rooms' ? (
              <>
                <AnimatePresence>
                  {selectedRoomIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedRoomIds.length} rooms selected
                        </span>
                        <button
                          onClick={() => setSelectedRoomIds([])}
                          className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-bold"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleBulkDelete(selectedRoomIds);
                            setSelectedRoomIds([]);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Selected
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <DataGrid
                  columns={roomColumns}
                  data={roomsData}
                  isLoading={isLoading}
                  keyExtractor={(r: any) => r.id}
                  page={page}
                  limit={limit}
                  totalCount={totalCount}
                  onPageChange={setPage}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                  }}
                  onRowClick={(r: any) => setDetailRoom(rooms.find(room => room.id === r.id) || null)}
                />
              </>
            ) : (
              <>
                <AnimatePresence>
                  {selectedFlatIds.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm mb-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {selectedFlatIds.length} flats selected
                        </span>
                        <button
                          onClick={() => setSelectedFlatIds([])}
                          className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 font-bold"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleBulkFlatDelete(selectedFlatIds);
                            setSelectedFlatIds([]);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 active:scale-95 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Selected
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <DataGrid
                  columns={flatColumns}
                  data={paginatedMeterGroups}
                  isLoading={false}
                  keyExtractor={(f: any) => f.id}
                  onRowClick={(f: any) => setDetailFlat(f)}
                  page={flatPage}
                  limit={flatLimit}
                  totalCount={filteredMeterGroups.length}
                  onPageChange={setFlatPage}
                  onLimitChange={(newLimit) => {
                    setFlatLimit(newLimit);
                    setFlatPage(1);
                  }}
                />
              </>
            )}
          </div>

          {/* Mobile View (Below 768px) */}
          <div className="md:hidden -mx-4 -mt-2">
            {activeTab === 'rooms' ? (
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
                onView={setDetailRoom}
                onBulkDelete={handleBulkDelete}
              />
            ) : (
              <FlatMobileList
                meterGroups={filteredMeterGroups}
                rooms={rooms}
                tenants={tenants}
                onAdd={() => setIsAddFlatModalOpen(true)}
                onEdit={handleEditFlat}
                onDelete={(f) => { deleteMeterGroup(f.id); }}
                onView={setDetailFlat}
                onManageElectricity={(f) => { setElectricityFlat(f); }}
                onBulkDelete={handleBulkFlatDelete}
              />
            )}
          </div>
        </>
      )}

      {/* Room Detail Panel */}
      <RoomDetailPanel
        room={detailRoom}
        onClose={() => setDetailRoom(null)}
        onEdit={handleEditClick}
        onDelete={(r) => { setRoomToDelete(r); }}
        canEdit={['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '')}
      />

      {/* Quick Allocate Tenant Modal */}
      <QuickAllocateModal
        room={allocateRoomModal?.room || null}
        bedNumber={allocateRoomModal?.bedNumber}
        isOpen={!!allocateRoomModal}
        onClose={() => setAllocateRoomModal(null)}
        onSuccess={refetch}
      />

      {/* Switch Room Modal */}
      <SwitchRoomModal
        isOpen={!!switchRoomTenant}
        onClose={() => setSwitchRoomTenant(null)}
        tenant={switchRoomTenant}
        onUpdate={refetch}
      />

      {/* Flat Detail Panel */}
      <AnimatePresence>
        {detailFlat && (
          <FlatDetailPanel
            flat={detailFlat}
            rooms={rooms}
            tenants={tenants}
            onClose={() => setDetailFlat(null)}
            onEdit={handleEditFlat}
            onDelete={(f) => { deleteMeterGroup(f.id); setDetailFlat(null); }}
            onViewRoom={(r) => { setDetailFlat(null); setDetailRoom(r); }}
            onManageElectricity={(f) => { setDetailFlat(null); setElectricityFlat(f); }}
          />
        )}
      </AnimatePresence>

      {/* Electricity Bill Modal */}
      <ElectricityBillModal
        flat={electricityFlat}
        branchId={rooms[0]?.branchId || ''}
        rooms={rooms}
        tenants={tenants.filter(t => {
          const room = rooms.find(r => r.id === t.roomId || r.id === (t as any).room_id);
          return room?.meterGroupId === electricityFlat?.id && t.status === 'active';
        }).map(t => ({ 
          id: t.id, 
          name: t.name,
          roomId: t.roomId || (t as any).room_id || '',
          is_ac_user: rooms.find(r => r.id === t.roomId)?.type === 'AC' || false,
          isAcUser: rooms.find(r => r.id === t.roomId)?.type === 'AC' || false
        }))}
        isOpen={!!electricityFlat}
        onClose={() => setElectricityFlat(null)}
        onSaved={() => { /* AppContext handles data refresh automatically */ }}
      />

      <AnimatePresence>
        {isAddFlatModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 text-left">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddFlatModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingFlat ? 'Edit Flat' : 'Add New Flat'}</h3>
                <button onClick={() => setIsAddFlatModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><Plus className="w-5 h-5 rotate-45 text-gray-400" /></button>
              </div>
              <form onSubmit={handleFlatSubmit} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Flat / Group Name</label>
                  <input required autoFocus value={flatFormData.name} onChange={e => setFlatFormData({ ...flatFormData, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-white" placeholder="e.g. Flat 101" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Floor</label>
                  <input required type="number" value={flatFormData.floor} onChange={e => setFlatFormData({ ...flatFormData, floor: Number(e.target.value) })} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-violet-500/20 text-gray-900 dark:text-white" />
                </div>
                <button type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-600/20 hover:bg-violet-700 transition-all" style={{ background: pgConfig?.primaryColor || '#7c3aed' }}>
                  {editingFlat ? 'Update Group' : 'Create Flat Group'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

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
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10 text-left">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingRoom ? 'Edit Room' : 'Add New Room'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-left">
                 <div className="space-y-4">
                  <div className="space-y-3 p-4 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-indigo-900 dark:text-indigo-300">Flat / Meter Group <span className="text-rose-500">*</span></label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingFlat(null);
                          setFlatFormData({ name: '', floor: 1 });
                          setIsAddFlatModalOpen(true);
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                      >
                         + Add New Flat
                      </button>
                    </div>

                    {(() => {
                      const flatOptions = [
                        { value: "", label: "Select a flat..." },
                        ...meterGroups.map(mg => ({
                          value: mg.id,
                          label: `${mg.name} (${mg.floor === 0 ? 'Ground Floor' : `Floor ${mg.floor}`})`
                        }))
                      ];
                      return (
                        <ModernSelect
                          value={formData.meterGroupId}
                          onChange={(val) => setFormData({ ...formData, meterGroupId: val })}
                          options={flatOptions}
                        />
                      );
                    })()}
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">
                      Rooms in the same flat share electricity bills.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Room Number</label>
                    <input
                      required
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                      placeholder="e.g. 101"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Floor</label>
                      <input
                        required
                        type="number"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Beds</label>
                      <input
                        required
                        type="number"
                        value={formData.totalBeds}
                        onChange={(e) => setFormData({ ...formData, totalBeds: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Room Type</label>
                    <div className="flex gap-3">
                      {['AC', 'Non-AC'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type as any })}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-sm font-bold transition-all border border-transparent",
                            formData.type === type
                              ? "text-white shadow-lg shadow-indigo-600/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                          style={formData.type === type ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Price (₹)</label>
                    <input
                      required
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add briefly what's special about this room..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white text-sm transition-all"
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
                              ? 'text-white shadow-lg shadow-indigo-600/25 scale-105'
                              : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                              }`}
                            style={isSelected ? { background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' } : undefined}
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
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-600/25 min-h-[44px] transition-all"
                          style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
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
                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white text-sm transition-all"
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
                        className="px-6 py-3 text-white rounded-xl text-sm font-bold transition-all shrink-0 shadow-lg shadow-indigo-600/20"
                        style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
                      >
                        Add
                      </button>
                    </div>
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
                    style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedRoom.floor === 0 ? 'Ground Floor' : `Floor ${selectedRoom.floor}`} • {selectedRoom.type}</p>
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
                            <div className="w-10 h-10 text-white rounded-xl flex items-center justify-center font-bold" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
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

      {/* Bulk Delete Rooms Confirmation Modal */}
      <AnimatePresence>
        {bulkRoomDeleteIds && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkRoomDeleteIds(null)}
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
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Delete Selected Rooms?</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 px-4">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{bulkRoomDeleteIds.length}</span> selected rooms? This action cannot be undone and will permanently erase all associated data.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setBulkRoomDeleteIds(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      for (const id of bulkRoomDeleteIds) {
                        await deleteRoom(id);
                      }
                      setBulkRoomDeleteIds(null);
                      refetch();
                      toast.success(`${bulkRoomDeleteIds.length} rooms deleted`);
                    }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                  >
                    Delete Rooms
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Flats Confirmation Modal */}
      <AnimatePresence>
        {bulkFlatDeleteIds && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBulkFlatDeleteIds(null)}
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
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Delete Selected Flats?</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8 px-4">
                  Are you sure you want to delete <span className="font-bold text-gray-900 dark:text-white">{bulkFlatDeleteIds.length}</span> selected flats? This action cannot be undone and will permanently erase all associated data.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => setBulkFlatDeleteIds(null)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      for (const id of bulkFlatDeleteIds) {
                        await deleteMeterGroup(id);
                      }
                      setBulkFlatDeleteIds(null);
                      refetch();
                      toast.success(`${bulkFlatDeleteIds.length} flats deleted`);
                    }}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-rose-600/20 hover:bg-rose-700 transition-all"
                  >
                    Delete Flats
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

