import re
import os

filepath = 'src/pages/RoomsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Missing Imports
imports = """import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu } from '../components/DropdownMenu';"""
content = re.sub(r'(import \{ motion, AnimatePresence \} from \'motion/react\';)', r'\1\n' + imports, content)

# 2. Add usePaginatedData hook and Columns
hook_code = """
  // Pagination Hook
  const { data: paginatedRooms, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<Room>({
    table: 'rooms',
    ilikeFilters: { room_number: searchTerm },
    filters: filterType !== 'all' ? { type: filterType } : undefined,
    orderBy: { column: 'room_number', ascending: true }
  });

  const columns: ColumnDef<Room>[] = [
    {
      header: 'Room',
      accessor: 'roomNumber',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Room {r.roomNumber}</h3>
            <p className="text-xs text-gray-500">Floor {r.floor} • {r.type}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Occupancy',
      accessor: 'occupiedBeds',
      render: (r) => {
        // We still use global tenants array for aggregate real-time tracking if available
        // But optimally, we would fetch occupied beds from the server. The schema has 'occupied_beds'.
        // For accurate UI, we use r.occupiedBeds and r.totalBeds
        const isFull = r.occupiedBeds >= r.totalBeds;
        const percent = Math.round((r.occupiedBeds / r.totalBeds) * 100) || 0;
        return (
          <div className="flex flex-col gap-1.5 min-w-[120px]">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-300">
                {r.occupiedBeds} / {r.totalBeds} Beds
              </span>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider",
                isFull ? "text-rose-500" : "text-emerald-500"
              )}>
                {isFull ? 'Full' : 'Available'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", isFull ? "bg-rose-500" : "bg-emerald-500")}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      header: 'Price',
      accessor: 'price',
      render: (r) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          ₹{r.price.toLocaleString()}<span className="text-[10px] text-gray-500 font-normal">/mo</span>
        </span>
      )
    },
    {
      header: 'Manage',
      accessor: 'id',
      render: (r) => (
        <div className="flex justify-end pr-4">
          <DropdownMenu 
            trigger={
              <button className="h-[36px] w-[36px] flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-gray-100 hover:dark:bg-white/10 active:scale-95 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
            items={[
               ...(['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') ? [{
                  label: 'Edit Room',
                  icon: <Edit2 className="w-4 h-4" />,
                  onClick: () => {
                    setEditingRoom(r);
                    setFormData(r);
                    setIsAddModalOpen(true);
                  }
               }] : []),
               ...(['admin', 'manager'].includes(user?.role || '') ? [{
                  label: 'Delete Room',
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: () => {
                    const tenantsInRoom = tenants.filter(t => t.roomId === r.id);
                    if (tenantsInRoom.length > 0) {
                      toast.error(`Cannot delete room. There are ${tenantsInRoom.length} tenants assigned to this room.`);
                      return;
                    }
                    if (window.confirm('Are you sure you want to delete this room?')) {
                      deleteRoom(r.id);
                      refetch();
                    }
                  },
                  className: 'text-rose-600 dark:text-rose-400'
               }] : [])
            ]}
          />
        </div>
      )
    }
  ];
"""
content = re.sub(r'(const \{ payments \} = useApp\(\);)', r'\1\n' + hook_code, content) # wait, rooms page might not have payments 
# let's be safer:
hook_code_safe = hook_code.replace("const \{ payments \} = useApp\(\);", "")
content = re.sub(r'(const \{ tenants, rooms, addRoom, updateRoom, deleteRoom, currentPlan, checkFeatureAccess \} = useApp\(\);)', r'\1\n' + hook_code_safe, content)

# 3. Replace the rendering block
start_idx = content.find('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">')
end_idx = content.find('{isAddModalOpen && (', start_idx)

if start_idx != -1 and end_idx != -1:
    grid_code = """<div className="rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden mb-[100px] bg-white dark:bg-[#111111]">
        <DataGrid 
          columns={columns}
          data={paginatedRooms}
          isLoading={isLoading}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          limit={limit}
          emptyMessage="No rooms found matching your criteria"
        />
      </div>
      """
    content = content[:start_idx] + grid_code + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated RoomsPage.tsx")
