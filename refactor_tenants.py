import re
import os

filepath = 'src/pages/TenantsPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Missing Imports
imports = """import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu } from '../components/DropdownMenu';"""
content = re.sub(r'(import \{ motion, AnimatePresence \} from \'motion/react\';)', r'\1\n' + imports, content)

# 2. Add usePaginatedData hook
hook_code = """
  // Pagination Hook
  const { data: paginatedTenants, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<Tenant>({
    table: 'tenants',
    ilikeFilters: { name: searchTerm, email: searchTerm },
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined
  });

  const columns: ColumnDef<Tenant>[] = [
    {
      header: 'Tenant',
      accessor: 'name',
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
            {t.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{t.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Room',
      accessor: 'roomId',
      render: (t) => {
        const room = rooms.find(r => r.id === t.roomId);
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">Room {room?.roomNumber || 'N/A'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Bed {t.bedNumber}</span>
          </div>
        )
      }
    },
    {
      header: 'KYC Status',
      accessor: 'kycStatus',
      render: (t) => checkFeatureAccess('kyc') ? (
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
          t.kycStatus === 'verified' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            t.kycStatus === 'pending' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
              t.kycStatus === 'unsubmitted' ? "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400" : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
          <Shield className="w-3 h-3" />
          {t.kycStatus?.charAt(0).toUpperCase() + t.kycStatus?.slice(1)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-white/5 text-gray-400">
          <Shield className="w-3 h-3" />
          Not Required
        </span>
      )
    },
    {
      header: 'Rent',
      accessor: 'rentAmount',
      render: (t) => (
        <div className="flex flex-col">
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{t.rentAmount.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Due: {t.paymentDueDate}th</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (t) => (
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
          t.status === 'active' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
            t.status === 'vacating' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
              t.status === 'vacated' ? "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {t.status}
        </span>
      )
    },
    {
      header: 'Manage',
      accessor: 'id',
      render: (t) => (
        <div className="flex justify-end pr-2">
          <DropdownMenu 
            trigger={
              <button className="h-[36px] w-[36px] flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-gray-100 hover:dark:bg-white/10 active:scale-95 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
            items={[
               {
                  label: 'Payment History',
                  icon: <History className="w-4 h-4" />,
                  onClick: () => setViewingPayments(t),
                  className: 'text-indigo-600 dark:text-indigo-400'
               },
               ...(canSendWhatsApp ? [{
                  label: 'WhatsApp Reminder',
                  icon: <MessageCircle className="w-4 h-4" />,
                  onClick: () => handleSendWhatsAppReminder(t),
                  className: 'text-emerald-600 dark:text-emerald-400'
               }] : []),
               ...(t.rentAgreementUrl ? [{
                  label: 'View Agreement',
                  icon: <FileCheck className="w-4 h-4" />,
                  onClick: () => setViewingAgreement(t),
                  className: 'text-emerald-600 dark:text-emerald-400'
               }] : []),
               ...(!t.userId && ['admin', 'manager', 'receptionist'].includes(user?.role || '') ? [{
                  label: 'Create User Login',
                  icon: <UserPlus className="w-4 h-4" />,
                  onClick: () => setTenantForLogin(t),
                  className: 'text-blue-600 dark:text-blue-400'
               }] : []),
               ...(['admin', 'manager', 'receptionist'].includes(user?.role || '') ? [{
                  label: 'Upload KYC',
                  icon: <Shield className="w-4 h-4" />,
                  onClick: () => {
                    setKycUploadTenant(t);
                    setAdminKycFile(null);
                    setAdminKycType('Aadhar Card');
                 },
                  className: 'text-violet-600 dark:text-violet-400'
               }] : []),
               ...(['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') ? [{
                  label: 'Edit Tenant',
                  icon: <Edit2 className="w-4 h-4" />,
                  onClick: () => handleEditClick(t)
               }] : []),
               ...(['admin', 'manager'].includes(user?.role || '') ? [{
                  label: 'Delete Tenant',
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: () => setTenantToDelete(t),
                  className: 'text-rose-600 dark:text-rose-400'
               }] : [])
            ]}
          />
        </div>
      )
    }
  ];
"""
content = re.sub(r'(const \{ payments \} = useApp\(\);)', r'\1\n' + hook_code, content)

# 3. Replace the entire rendering block with DataGrid
# Find the start of the table block
start_idx = content.find('<div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">')
# Find the end of the mobile block which ends with filteredTenants.length === 0 block
end_idx = content.find('{isAddModalOpen && (', start_idx)

if start_idx != -1 and end_idx != -1:
    grid_code = """<div className="rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden mb-[100px]">
        <DataGrid 
          columns={columns}
          data={paginatedTenants}
          isLoading={isLoading}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          limit={limit}
          emptyMessage="No tenants found matching your criteria"
        />
      </div>
      """
    content = content[:start_idx] + grid_code + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated TenantsPage.tsx")
