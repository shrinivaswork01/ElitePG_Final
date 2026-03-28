import re
import os

filepath = 'src/pages/PaymentsPage.tsx'
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
  const { data: paginatedPayments, totalCount, isLoading, page, setPage, limit, refetch } = usePaginatedData<Payment>({
    table: 'payments',
    ilikeFilters: { transaction_id: searchTerm },
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined,
    orderBy: { column: 'payment_date', ascending: false }
  });

  const columns: ColumnDef<Payment>[] = [
    {
      header: 'Tenant / Room',
      accessor: 'tenantId',
      render: (p) => {
        const tenant = tenants.find(t => t.id === p.tenantId);
        const room = rooms.find(r => r.id === tenant?.roomId);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              {tenant?.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{tenant?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-500">Room {room?.roomNumber || 'N/A'}</p>
            </div>
          </div>
        )
      }
    },
    {
      header: 'Month',
      accessor: 'month',
      render: (p) => (
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {format(new Date(p.month + '-01'), 'MMM yyyy')}
        </span>
      )
    },
    {
      header: 'Amount',
      accessor: 'totalAmount',
      render: (p) => (
         <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">₹{p.totalAmount.toLocaleString()}</span>
            {p.lateFee > 0 && <span className="text-[10px] text-rose-500">Includes ₹{p.lateFee} late fee</span>}
         </div>
      )
    },
    {
      header: 'Date & Method',
      accessor: 'paymentDate',
      render: (p) => (
         <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(p.paymentDate), 'dd MMM yyyy')}</span>
            <span className="text-xs text-gray-500">{p.method}</span>
         </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (p) => (
        <span className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
          p.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
        )}>
          {p.status}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (p) => {
         const tenant = tenants.find(t => t.id === p.tenantId);
         return (
        <div className="flex justify-end pr-4">
          <DropdownMenu 
            trigger={
              <button className="h-[36px] w-[36px] flex items-center justify-center bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white rounded-xl border border-gray-200/50 dark:border-white/5 hover:bg-gray-100 hover:dark:bg-white/10 active:scale-95 transition-all">
                <MoreVertical className="w-5 h-5" />
              </button>
            }
            items={[
               ...(p.status === 'pending' && canSendWhatsApp ? [{
                  label: 'WhatsApp Reminder',
                  icon: <MessageCircle className="w-4 h-4" />,
                  onClick: () => handleSendWhatsAppReminder(p),
                  className: 'text-emerald-600 dark:text-emerald-400'
               }] : []),
               ...(p.status === 'paid' ? [{
                  label: 'Generate Receipt',
                  icon: <Download className="w-4 h-4" />,
                  onClick: () => {
                     if (tenant) handleGenerateReceipt(p, tenant);
                  },
                  className: 'text-indigo-600 dark:text-indigo-400'
               }] : []),
               ...(['admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '') ? [{
                  label: 'Edit Payment',
                  icon: <Edit2 className="w-4 h-4" />,
                  onClick: () => {
                    setEditingPayment(p);
                    setFormData(p);
                    setIsPaymentModalOpen(true);
                  }
               }] : []),
               ...(['admin', 'manager'].includes(user?.role || '') ? [{
                  label: 'Delete Payment',
                  icon: <Trash2 className="w-4 h-4" />,
                  onClick: () => {
                    if (window.confirm('Are you sure you want to delete this payment?')) {
                      deletePayment(p.id);
                      refetch();
                    }
                  },
                  className: 'text-rose-600 dark:text-rose-400'
               }] : [])
            ]}
          />
        </div>
      )}
    }
  ];
"""
# find the line to inject hook code
content = re.sub(r'(const \{ tenants, rooms, payments, addPayment, updatePayment, deletePayment, checkFeatureAccess \} = useApp\(\);)', r'\1\n' + hook_code, content)

# 3. Replace the rendering block
start_idx = content.find('<div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden min-h-[400px]">')
end_idx = content.find('{isPaymentModalOpen && (', start_idx)

if start_idx != -1 and end_idx != -1:
    grid_code = """<div className="rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden mb-[100px] bg-white dark:bg-[#111111]">
        <DataGrid 
          columns={columns}
          data={paginatedPayments}
          isLoading={isLoading}
          totalCount={totalCount}
          page={page}
          onPageChange={setPage}
          limit={limit}
          emptyMessage="No payments found matching your criteria"
        />
      </div>
      """
    content = content[:start_idx] + grid_code + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated PaymentsPage.tsx")
