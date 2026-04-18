import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  CreditCard,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Trash2,
  FileText,
  Printer,
  X,
  MessageSquare,
  Send,
  Share2,
  Loader2,
  Edit2,
  MoreVertical,
  MessageCircle,
  History as HistoryIcon,
  Settings,
  Zap,
  Home,
  Shield,
  Ticket,
  Activity
} from 'lucide-react';
import { format, parseISO, differenceInDays, getDate, isAfter } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { DataGrid, ColumnDef } from '../components/DataGrid';
import { DropdownMenu, DropdownItem } from '../components/DropdownMenu';
import { PaymentDetailPanel } from '../components/PaymentDetailPanel';
import { PaymentMobileList } from '../components/PaymentMobileList';
import { cn } from '../utils';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { loadRazorpayScript } from '../utils/razorpay';
import { generateTenantReceiptPDF } from '../utils/generateReceipt';
import { uploadToSupabase } from '../utils/storage';
import { fetchElectricityBill, calculateElectricityShares, fetchElectricityBillById, fetchRoomAcReadings } from '../utils/electricityUtils';
import { ElectricityBill, ElectricityShare } from '../types';
import toast from 'react-hot-toast';

export const PaymentsPage = () => {
  const { user, users } = useAuth();
  const { payments, tenants, rooms, addPayment, updatePayment, deletePayment, updateTenant, currentBranch, pgConfig, updatePGConfig } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [filterType, setFilterType] = useState<'all' | 'rent' | 'electricity' | 'token' | 'deposit'>('all');
  const [filterMonth, setFilterMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{ url: string, title: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, paymentId?: string, bulkIds?: string[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Deposit adjustment state for Record Payment modal
  const [adjustFromDeposit, setAdjustFromDeposit] = useState(false);
  const [depositAdjustAmount, setDepositAdjustAmount] = useState(0);

  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);
  const [policiesForm, setPoliciesForm] = useState({
    defaultPaymentDueDate: pgConfig?.defaultPaymentDueDate || 1,
    defaultLateFeeDay: pgConfig?.defaultLateFeeDay || 5,
    lateFeeAmount: pgConfig?.lateFeeAmount || 50
  });

  useEffect(() => {
    if (pgConfig) {
      setPoliciesForm({
        defaultPaymentDueDate: pgConfig.defaultPaymentDueDate || 1,
        defaultLateFeeDay: pgConfig.defaultLateFeeDay || 5,
        lateFeeAmount: pgConfig.lateFeeAmount || 50
      });
    }
  }, [pgConfig]);

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePGConfig(policiesForm);
    toast.success('Payment Policies updated successfully');
    setIsPoliciesModalOpen(false);
  };

  const isTenant = user?.role === 'tenant';
  const tenantData = isTenant ? tenants.find(t => t.userId === user.id) : null;

  // Find tenant IDs matching the search term to allow searching payments by tenant name, phone, or room number
  const searchTenantIds = React.useMemo(() => {
    if (!searchTerm) return undefined;
    const lowerTerm = searchTerm.toLowerCase();
    const matchingRoomIds = rooms.filter(r => r.roomNumber.toLowerCase().includes(lowerTerm)).map(r => r.id);
    const matching = tenants.filter(t => 
      t.name?.toLowerCase().includes(lowerTerm) || 
      t.phone?.includes(lowerTerm) ||
      matchingRoomIds.includes(t.roomId || (t as any).room_id || '')
    );
    return matching.map(t => t.id);
  }, [searchTerm, tenants, rooms]);

  // Server-side paginated hook — fetches ONLY 10 records at a time
  const { data: paginatedPayments, totalCount, isLoading: isPaymentsLoading, page, setPage, limit, refetch: refetchPayments } = usePaginatedData<any>({
    table: 'payments',
    select: '*, tenants!payments_tenant_id_fkey(name, phone, rooms!tenants_room_id_fkey(room_number))',
    ilikeFilters: (searchTerm && !(searchTenantIds && searchTenantIds.length > 0)) ? { transaction_id: searchTerm, payment_type: searchTerm } : undefined,
    inFilters: (searchTenantIds && searchTenantIds.length > 0) ? { tenant_id: searchTenantIds } : undefined,
    filters: {
      ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
      ...(filterType !== 'all' ? { payment_type: filterType } : {}),
      ...(filterMonth !== 'all' ? { month: filterMonth } : {}),
      ...(isTenant && tenantData ? { tenant_id: tenantData.id } : {})
    },
    orderBy: { column: 'payment_date', ascending: false }
  });

  const isAdmin = ['super', 'admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '');

  const paymentColumns: ColumnDef<any>[] = React.useMemo(() => [
    {
      header: 'Tenant',
      accessorKey: 'tenant_id',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 font-bold flex items-center justify-center shrink-0">
            {p.tenants?.name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{p.tenants?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">Room {p.tenants?.rooms?.room_number || 'N/A'}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Month',
      accessorKey: 'month',
      cell: (p) => (
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(parseISO(p.month + '-01'), 'MMM yyyy')}
        </span>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'total_amount',
      cell: (p) => (
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(p.total_amount).toLocaleString()}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {(() => {
              const type = p.payment_type || 'rent';
              switch (type) {
                case 'electricity':
                  return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> Electricity</span>;
                case 'token':
                  return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-0.5"><Ticket className="w-2.5 h-2.5" /> Token</span>;
                case 'deposit':
                  return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" /> Deposit</span>;
                case 'adjust':
                  return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 flex items-center gap-0.5"><Activity className="w-2.5 h-2.5" /> Adjustment</span>;
                default:
                  return <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><Home className="w-2.5 h-2.5" /> Rent</span>;
              }
            })()}
          </div>
          {p.late_fee > 0 && <p className="text-[10px] text-rose-500">+₹{p.late_fee} late fee</p>}
        </div>
      )
    },
    {
      header: 'Date',
      accessorKey: 'payment_date',
      cell: (p) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">{p.payment_date ? format(parseISO(p.payment_date), 'dd MMM yy') : '—'}</p>
          <p className="text-xs text-gray-500">{p.method}</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (p) => (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
          p.status === 'paid' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
        )}>
          {p.status}
        </span>
      )
    },
    {
      header: '',
      accessorKey: 'id',
      className: 'w-[60px]',
      cell: (p) => (
        <div className="flex justify-end">
          <DropdownMenu>
            {isAdmin && (
              <DropdownItem icon={<Edit2 className="w-4 h-4" />} label="Edit Payment" onClick={() => {
                const normalized: Payment = {
                  id: p.id,
                  tenantId: p.tenant_id || p.tenantId || '',
                  amount: p.amount ?? 0,
                  lateFee: p.late_fee ?? p.lateFee ?? 0,
                  totalAmount: p.total_amount ?? p.totalAmount ?? p.amount ?? 0,
                  paymentType: p.payment_type || p.paymentType || 'rent',
                  paymentDate: p.payment_date || p.paymentDate || '',
                  month: p.month || '',
                  status: p.status || 'paid',
                  method: p.method || 'Offline',
                  transactionId: p.transaction_id || p.transactionId,
                  receiptUrl: p.receipt_url || p.receiptUrl,
                  electricityAmount: p.electricity_amount || p.electricityAmount || 0,
                  electricityBillId: p.electricity_bill_id || p.electricityBillId,
                  branchId: p.branch_id || p.branchId || ''
                };
                setPaymentToEdit(normalized);
                setIsEditModalOpen(true);
              }} />
            )}
            {p.status === 'paid' && (
              <>
                <DropdownItem icon={<Download className="w-4 h-4" />} label="Download Receipt" onClick={() => {
                  const normalized: Payment = {
                    id: p.id,
                    tenantId: p.tenant_id || p.tenantId,
                    amount: p.amount,
                    lateFee: p.late_fee ?? p.lateFee ?? 0,
                    totalAmount: p.total_amount ?? p.totalAmount ?? p.amount,
                    paymentType: p.payment_type || p.paymentType || 'rent',
                    paymentDate: p.payment_date || p.paymentDate,
                    month: p.month,
                    status: p.status,
                    method: p.method,
                    transactionId: p.transaction_id || p.transactionId,
                    receiptUrl: p.receipt_url || p.receiptUrl,
                    electricityAmount: p.electricity_amount || p.electricityAmount || 0,
                    electricityBillId: p.electricity_bill_id || p.electricityBillId,
                    branchId: p.branch_id || p.branchId
                  };
                  handleDownloadReceipt(normalized);
                }} />
                <DropdownItem icon={<Share2 className="w-4 h-4" />} label="Share Receipt" onClick={() => {
                  const normalized: Payment = {
                    id: p.id,
                    tenantId: p.tenant_id || p.tenantId,
                    amount: p.amount,
                    lateFee: p.late_fee ?? p.lateFee ?? 0,
                    totalAmount: p.total_amount ?? p.totalAmount ?? p.amount,
                    paymentType: p.payment_type || p.paymentType || 'rent',
                    paymentDate: p.payment_date || p.paymentDate,
                    month: p.month,
                    status: p.status,
                    method: p.method,
                    transactionId: p.transaction_id || p.transactionId,
                    receiptUrl: p.receipt_url || p.receiptUrl,
                    electricityAmount: p.electricity_amount || p.electricityAmount || 0,
                    electricityBillId: p.electricity_bill_id || p.electricityBillId,
                    branchId: p.branch_id || p.branchId
                  };
                  setSelectedPayment(normalized);
                  setIsReceiptModalOpen(true);
                }} />
              </>
            )}
            {['admin', 'manager'].includes(user?.role || '') && (
              <DropdownItem icon={<Trash2 className="w-4 h-4" />} label="Delete Payment" onClick={() => {
                setDeleteConfirmation({ isOpen: true, paymentId: p.id });
              }} danger />
            )}
          </DropdownMenu>
        </div>
      )
    }
  ], [user, deletePayment, refetchPayments, setPaymentToEdit, setSelectedPayment, setIsReceiptModalOpen]);

  const calculateLateFee = (tenantId: string, month: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return 0;

    const dueDateDay = tenant.paymentDueDate || pgConfig?.defaultPaymentDueDate || 1;
    const gracePeriod = pgConfig?.defaultLateFeeDay || 5;
    const lateFeePerDay = pgConfig?.lateFeeAmount || 50;
    
    const dueDate = new Date(`${month}-${dueDateDay.toString().padStart(2, '0')}`);
    const graceDate = new Date(dueDate);
    graceDate.setDate(graceDate.getDate() + gracePeriod);
    
    const today = new Date();

    if (isAfter(today, graceDate)) {
      const daysLate = Math.max(0, differenceInDays(today, graceDate));
      return (daysLate + 1) * lateFeePerDay; 
    }
    return 0;
  };



  const [payingDue, setPayingDue] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Offline'>('Online');

  const currentMonth = React.useMemo(() => format(new Date(), 'yyyy-MM'), []);

  const hasPaidRentThisMonth = React.useMemo(() => {
    return payments.some(p => p.tenantId === tenantData?.id && p.month === currentMonth && p.status === 'paid' && (p.paymentType === 'rent' || !p.paymentType));
  }, [payments, tenantData?.id, currentMonth]);

  const electricityPaymentThisMonth = React.useMemo(() => {
    return payments.find(p => p.tenantId === tenantData?.id && p.month === currentMonth && p.paymentType === 'electricity');
  }, [payments, tenantData?.id, currentMonth]);

  const hasPaidElectricityThisMonth = electricityPaymentThisMonth?.status === 'paid';

  // Keep backward compat: hasPaidCurrentMonth means fully paid (rent + electricity if exists)
  const hasPaidCurrentMonth = hasPaidRentThisMonth && (!electricityPaymentThisMonth || hasPaidElectricityThisMonth);

  const upcomingDues = React.useMemo(() => {
    if (!isTenant || !tenantData) return [];

    const dues: any[] = [];
    
    // Find all months that have either a pending electricity payment or are the current month (for rent)
    // Actually, we should check for ANY month where rent or electricity is pending.
    const pendingMonths = Array.from(new Set([
      ...payments.filter(p => p.tenantId === tenantData.id && p.status === 'pending').map(p => p.month),
      currentMonth
    ])).sort().reverse();

    for (const month of pendingMonths) {
      const isCurrent = month === currentMonth;
      const rentPayment = payments.find(p => p.tenantId === tenantData.id && p.month === month && (p.paymentType === 'rent' || !p.paymentType));
      const electricityPayment = payments.find(p => p.tenantId === tenantData.id && p.month === month && p.paymentType === 'electricity');

      const isRentPaid = rentPayment?.status === 'paid';
      const isElecPaid = !electricityPayment || electricityPayment.status === 'paid';

      // Always show rent for current month, or if it's pending in past months
      if (isCurrent || (rentPayment && !isRentPaid)) {
        dues.push({
          type: 'rent' as const,
          month,
          rentAmount: tenantData.rentAmount,
          electricityAmount: 0,
          baseAmount: 0,
          acAmount: 0,
          unitsConsumed: 0,
          costPerUnit: 0,
          amount: tenantData.rentAmount,
          dueDate: `${month}-${(tenantData.paymentDueDate || pgConfig?.defaultPaymentDueDate || 1).toString().padStart(2, '0')}`,
          lateFee: isRentPaid ? 0 : calculateLateFee(tenantData.id, month),
          isPaid: isRentPaid,
          id: rentPayment?.id
        });
      }

      // Show electricity if it exists for this month
      if (electricityPayment) {
        const elecAmount = (electricityPayment as any).electricity_amount || electricityPayment.electricityAmount || electricityPayment.totalAmount || 0;
        dues.push({
          type: 'electricity' as const,
          month,
          rentAmount: 0,
          electricityAmount: elecAmount,
          baseAmount: electricityPayment.baseShare || (electricityPayment as any).base_share || 0,
          acAmount: electricityPayment.acShare || (electricityPayment as any).ac_share || 0,
          actualBillUrl: electricityPayment.actualBillUrl || (electricityPayment as any).actual_bill_file_url,
          acBillUrl: electricityPayment.acBillUrl || (electricityPayment as any).ac_bill_file_url,
          unitsConsumed: electricityPayment.unitsConsumed || (electricityPayment as any).units_consumed || 0,
          costPerUnit: electricityPayment.costPerUnit || (electricityPayment as any).cost_per_unit || 0,
          amount: elecAmount,
          dueDate: `${month}-${(tenantData.paymentDueDate || pgConfig?.defaultPaymentDueDate || 1).toString().padStart(2, '0')}`,
          lateFee: 0, // Electricity usually doesn't have late fee in this system yet
          isPaid: electricityPayment.status === 'paid',
          paymentId: electricityPayment.id,
          id: electricityPayment.id
        });
      }
    }

    return dues;
  }, [isTenant, tenantData, currentMonth, payments, pgConfig?.defaultPaymentDueDate]);

  const handleOnlinePayment = async () => {
    if (isSubmitting) return;
    if (tenantData && payingDue) {
      const due = payingDue;

      // For rent, check for duplicate insert
      if (due.type === 'rent') {
        const existingPayment = payments.find(p => p.tenantId === tenantData.id && p.month === due.month && p.paymentType === 'rent' && (p.status === 'paid' || p.status === 'pending'));
        if (existingPayment) {
          toast.error('A rent payment for this month is already recorded or in progress.');
          return;
        }
      }

      const isOffline = paymentMethod === 'Offline';
      const totalAmount = due.amount + due.lateFee;

      const recordPaymentSuccess = async (method: 'Offline' | 'Online', transactionId?: string) => {
        if (due.type === 'electricity' && due.paymentId) {
          // Update the existing pending electricity record
          await updatePayment(due.paymentId, {
            status: method === 'Offline' ? 'pending' : 'paid',
            method,
            transactionId: transactionId || null,
            paymentDate: format(new Date(), 'yyyy-MM-dd')
          });
          
          if (method === 'Online' && transactionId) {
            handleDownloadReceipt({ ...payments.find(p => p.id === due.paymentId)!, status: 'paid', method: 'Online', transactionId } as Payment);
          }
        } else {
          // Insert new rent record
          const paymentRecord: Omit<Payment, 'id' | 'branchId'> = {
            tenantId: tenantData.id,
            amount: due.rentAmount,
            lateFee: due.lateFee,
            totalAmount,
            paymentType: due.type,
            electricityAmount: 0, // No longer merged
            paymentDate: format(new Date(), 'yyyy-MM-dd'),
            month: due.month,
            status: method === 'Offline' ? 'pending' : 'paid',
            method,
            transactionId: transactionId || undefined
          };
          
          await addPayment(paymentRecord);
          // If online, mock downloading receipt for the temp inserted record (ideally we wait for it to sync, but we proceed like Razorpay)
          if (method === 'Online' && transactionId) {
            handleDownloadReceipt({ ...paymentRecord, id: transactionId } as Payment);
          }
        }

        refetchPayments();
        setPayingDue(null);
        if (method === 'Offline') {
          toast.success(`Offline payment request submitted for ₹${totalAmount.toLocaleString()}. Please pay at the desk.`);
        } else {
          toast.success(`Payment successful! Transaction ID: ${transactionId}`);
        }
      };

      if (isOffline) {
        await recordPaymentSuccess('Offline');
      } else {
        const branchRazorpayKey = pgConfig?.razorpayKeyId;

        if (!branchRazorpayKey) {
          toast.error('Online payments are not configured by your Branch Admin yet. Please pay offline or contact administration.');
          return;
        }

        const res = await loadRazorpayScript();

        if (!res) {
          toast.error('Razorpay SDK failed to load. Are you online?');
          return;
        }

        const options = {
          key: branchRazorpayKey,
          amount: totalAmount * 100, // Amount in paise
          currency: 'INR',
          name: 'ElitePG',
          description: `${due.type === 'electricity' ? 'Electricity' : 'Rent'} Payment for ${format(parseISO(`${due.month}-01`), 'MMMM yyyy')}`,
          image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=150&h=150',
          handler: function (response: any) {
            recordPaymentSuccess('Online', response.razorpay_payment_id);
          },
          prefill: {
            name: tenantData.name,
            email: tenantData.email,
            contact: tenantData.phone || '9999999999',
          },
          theme: {
            color: '#4F46E5', // indigo-600
          },
        };

        const paymentObject = new (window as any).Razorpay(options);
        paymentObject.open();
      }
    }
  };

  const [newPayment, setNewPayment] = useState<Omit<Payment, 'id' | 'branchId'> & { paymentType: 'rent' | 'electricity' }>({
    tenantId: '',
    amount: 0,
    lateFee: 0,
    totalAmount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    month: format(new Date(), 'yyyy-MM'),
    status: 'paid',
    method: 'Cash',
    paymentType: 'rent'
  });

  // Detect if this is a move-in first rent (existing partial rent record that matches token)
  const isFirstRent = React.useMemo(() => {
    if (!newPayment.tenantId || newPayment.paymentType !== 'rent') return false;
    const tenant = tenants.find(t => t.id === newPayment.tenantId);
    if (!tenant) return false;
    
    // Check if there is an existing rent payment for this month that matches the token amount
    const existingRent = payments.find(p => p.tenantId === tenant.id && p.month === newPayment.month && p.status === 'paid' && p.paymentType === 'rent');
    return !!existingRent && existingRent.amount === tenant.tokenAmount && existingRent.amount < tenant.rentAmount;
  }, [newPayment.tenantId, newPayment.paymentType, newPayment.month, tenants, payments]);

  // Move-in first rent amount (rent - token)
  const firstRentAmount = React.useMemo(() => {
    if (!isFirstRent || !newPayment.tenantId) return 0;
    const tenant = tenants.find(t => t.id === newPayment.tenantId);
    if (!tenant) return 0;
    return Math.max(0, (tenant.rentAmount || 0) - (tenant.tokenAmount || 0));
  }, [isFirstRent, newPayment.tenantId, tenants]);

  // Selected tenant's deposit balance for adjustment validation
  const selectedTenantDepositBalance = React.useMemo(() => {
    if (!newPayment.tenantId) return 0;
    const tenant = tenants.find(t => t.id === newPayment.tenantId);
    return (tenant as any)?.depositBalance || 0;
  }, [newPayment.tenantId, tenants]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.tenantId) {
      setIsSubmitting(true);
      try {
        const tenant = tenants.find(t => t.id === newPayment.tenantId);
        
        // --- GUARD: ELECTRICITY BILL CHECK ---
        let linkedBillId = undefined;
        if (newPayment.paymentType === 'electricity') {
          const room = rooms.find(r => r.id === (tenant?.roomId || (tenant as any)?.room_id));
          if (!room?.meterGroupId) {
            toast.error("This tenant's room is not assigned to a flat/meter group.");
            return;
          }
          
          const bill = await fetchElectricityBill(room.meterGroupId, newPayment.month);
          if (!bill) {
            toast.error(`No electricity bill generated for ${room.roomNumber} in ${format(parseISO(newPayment.month + '-01'), 'MMMM yyyy')}. Please generate the bill first.`);
            return;
          }
          linkedBillId = bill.id;
        }

        const existingPaymentForMonth = payments.find(p => p.tenantId === newPayment.tenantId && p.month === newPayment.month && p.paymentType === newPayment.paymentType);
        
        if (newPayment.paymentType === 'rent') {
          if (existingPaymentForMonth && !isFirstRent) {
            toast.error('Payment already recorded for this tenant for selected month');
            return;
          }
        } else {
          if (existingPaymentForMonth) {
            toast.error(`A ${newPayment.paymentType} payment record already exists for this tenant for ${newPayment.month}.`);
            return;
          }
        }

        // Amount > 0 validation
        if (newPayment.amount <= 0 && (!adjustFromDeposit || depositAdjustAmount <= 0)) {
          toast.error('Amount must be greater than zero.');
          return;
        }

        // Validate deposit adjustment
        if (adjustFromDeposit && depositAdjustAmount > 0) {
          if (depositAdjustAmount > selectedTenantDepositBalance) {
            toast.error(`Adjustment ₹${depositAdjustAmount} exceeds deposit balance ₹${selectedTenantDepositBalance}.`);
            return;
          }
        }

        // Calculate effective amount
        let effectiveAmount = newPayment.amount;
        if (newPayment.paymentType === 'rent' && isFirstRent) {
          effectiveAmount = firstRentAmount;
        }
        if (adjustFromDeposit && depositAdjustAmount > 0) {
          effectiveAmount = Math.max(0, effectiveAmount - depositAdjustAmount);
        }

        const effectiveTotal = effectiveAmount + (newPayment.lateFee || 0);

        // Validate: amount after adjustment cannot be negative
        if (effectiveAmount < 0) {
          toast.error('Amount after adjustment cannot be negative.');
          return;
        }

        if (newPayment.paymentType === 'rent' && isFirstRent) {
          const existingRent = payments.find(p => p.tenantId === newPayment.tenantId && p.month === newPayment.month && p.paymentType === 'rent');
          if (existingRent) {
            await updatePayment(existingRent.id, {
              ...existingRent,
              amount: tenant.rentAmount,
              totalAmount: tenant.rentAmount + (newPayment.lateFee || 0),
              paymentDate: newPayment.paymentDate,
              method: newPayment.method,
              status: 'paid'
            });
          }
        } else {
          await addPayment({
            ...newPayment,
            amount: effectiveAmount,
            totalAmount: effectiveTotal,
            branchId: tenant?.branchId || user?.branchId || '',
            electricityBillId: linkedBillId,
            electricityAmount: newPayment.paymentType === 'electricity' ? newPayment.amount : 0,
            electricity_amount: newPayment.paymentType === 'electricity' ? newPayment.amount : 0,
            base_share: 0,
            ac_share: 0,
            units_consumed: 0,
            cost_per_unit: 0,
          } as any);
        }

        // If deposit adjustment was used, record an ADJUST payment and update tenant deposit_balance
        if (adjustFromDeposit && depositAdjustAmount > 0) {
          // Record the adjustment payment
          await addPayment({
            tenantId: newPayment.tenantId,
            amount: depositAdjustAmount,
            lateFee: 0,
            totalAmount: depositAdjustAmount,
            paymentType: 'adjust' as any,
            paymentDate: newPayment.paymentDate,
            month: newPayment.month,
            status: 'paid',
            method: 'Offline',
            branchId: tenant?.branchId || user?.branchId || '',
          } as any);
          // Update deposit balance on tenant
          const newBalance = selectedTenantDepositBalance - depositAdjustAmount;
          await updateTenant(newPayment.tenantId, { depositBalance: newBalance });
        }
        
        setIsAddModalOpen(false);
        setAdjustFromDeposit(false);
        setDepositAdjustAmount(0);
        setNewPayment({
          tenantId: '',
          amount: 0,
          lateFee: 0,
          totalAmount: 0,
          paymentDate: new Date().toISOString().split('T')[0],
          month: format(new Date(), 'yyyy-MM'),
          status: 'paid',
          method: 'Cash',
          paymentType: 'rent'
        });
        refetchPayments();
      } catch (err) {
        console.error(err);
        toast.error("Failed to record payment.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAutoPopulate = async (type: string, tenantId: string, month: string) => {
    if (!tenantId || !month) return 0;
    
    if (type === 'rent') {
      const tenant = tenants.find(t => t.id === tenantId);
      return tenant?.rentAmount || 0;
    }
    
    if (type === 'electricity') {
      const tenant = tenants.find(t => t.id === tenantId);
      const room = rooms.find(r => r.id === (tenant?.roomId || (tenant as any)?.room_id));
      if (room?.meterGroupId) {
        const bill = await fetchElectricityBill(room.meterGroupId, month);
        if (bill) {
          const flatRooms = rooms.filter(r => r.meterGroupId === room.meterGroupId);
          // Find tenants in this flat
          const flatTenants = tenants.filter(t => {
            const r = rooms.find(rm => rm.id === (t.roomId || (t as any).room_id));
            return r?.meterGroupId === room.meterGroupId;
          });
          
          // Get AC readings if needed
          const acReadings = await fetchRoomAcReadings(room.meterGroupId, month, rooms);
          const shares = calculateElectricityShares(bill, flatTenants, flatRooms, acReadings);
          const myShare = shares.find(s => s.tenantId === tenantId);
          return myShare?.total || 0;
        }
      }
    }
    return 0;
  };

  const handleAdjustElectricity = async () => {
    if (!paymentToEdit || paymentToEdit.paymentType !== 'electricity') return;
    
    const tenant = tenants.find(t => t.id === paymentToEdit.tenantId);
    if (!tenant) return;

    const totalToPay = paymentToEdit.totalAmount;
    if (tenant.depositBalance < totalToPay) {
      toast.error(`Insufficient deposit. Tenant has ₹${tenant.depositBalance}, needs ₹${totalToPay}`);
      return;
    }

    try {
      // 1. Mark as paid
      await updatePayment(paymentToEdit.id, {
        ...paymentToEdit,
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'paid',
        method: 'Offline',
      });

      // 2. Adjust deposit
      const newBalance = tenant.depositBalance - totalToPay;
      await updateTenant(tenant.id, { depositBalance: newBalance });

      // 3. Create ADJUST payment record
      await addPayment({
        tenantId: tenant.id,
        month: paymentToEdit.month,
        amount: -totalToPay,
        lateFee: 0,
        totalAmount: -totalToPay,
        paymentDate: new Date().toISOString().split('T')[0],
        status: 'paid',
        method: 'Offline',
        paymentType: 'adjustment' as any
      });

      toast.success('Electricity bill adjusted from deposit successfully');
      setIsEditModalOpen(false);
      setPaymentToEdit(null);
      refetchPayments();
    } catch (e) {
      toast.error('Failed to adjust. Please try again.');
    }
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentToEdit) {
      await updatePayment(paymentToEdit.id, {
        amount: paymentToEdit.amount,
        lateFee: paymentToEdit.lateFee,
        totalAmount: paymentToEdit.amount + paymentToEdit.lateFee,
        paymentDate: paymentToEdit.paymentDate,
        month: paymentToEdit.month,
        status: paymentToEdit.status,
        method: paymentToEdit.method,
        transactionId: paymentToEdit.transactionId,
        electricityAmount: paymentToEdit.electricityAmount,
        electricityBillId: paymentToEdit.electricityBillId,
        baseShare: (paymentToEdit as any).baseShare,
        acShare: (paymentToEdit as any).acShare,
        unitsConsumed: (paymentToEdit as any).unitsConsumed,
        costPerUnit: (paymentToEdit as any).costPerUnit,
        actualBillUrl: paymentToEdit.actualBillUrl,
        acBillUrl: paymentToEdit.acBillUrl
      });
      setIsEditModalOpen(false);
      setPaymentToEdit(null);
      refetchPayments();
    }
  };

  const handleGenerateReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setReceiptNotes('');
    setIsReceiptModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmation?.paymentId) {
      await deletePayment(deleteConfirmation.paymentId);
    } else if (deleteConfirmation?.bulkIds) {
      for (const id of deleteConfirmation.bulkIds) {
        await deletePayment(id);
      }
    }
    setDeleteConfirmation(null);
    refetchPayments();
    toast.success('Successfully deleted!');
  };

  const handleDownloadReceipt = async (payment: Payment | null = selectedPayment) => {
    if (!payment) return;
    
    // 1. If we already have a receipt URL, just open it
    if (payment.receiptUrl) {
      window.open(payment.receiptUrl, '_blank');
      return;
    }

    // 2. Otherwise, generate, upload, and update
    setIsGeneratingPDF(true);
    const toastId = toast.loading('Generating & Storing Receipt...');
    try {
      const tenant = tenants.find(t => t.id === payment.tenantId);
      const authorizedSignature = currentBranch?.officialSignatureUrl || user?.signatureUrl;

      // Generate PDF as Blob
      const blob = await generateTenantReceiptPDF({
        paymentId: payment.id,
        paymentDate: payment.paymentDate,
        month: payment.month,
        amount: payment.amount,
        paymentType: payment.paymentType,
        electricityAmount: (payment as any).electricityAmount || (payment as any).electricity_amount || 0,
        lateFee: payment.lateFee,
        totalAmount: payment.totalAmount,
        method: payment.method,
        transactionId: payment.transactionId,
        status: payment.status,
        tenantName: tenant?.name || 'Tenant',
        tenantPhone: tenant?.phone,
        tenantEmail: tenant?.email,
        roomNumber: rooms.find(r => r.id === tenant?.roomId || r.id === (tenant as any)?.room_id)?.roomNumber,
        branchName: currentBranch?.branchName,
        branchPhone: currentBranch?.phone,
        branchAddress: currentBranch?.address,
        pgName: currentBranch?.name,
        logoUrl: pgConfig?.logoUrl,
        signatureUrl: authorizedSignature,
        // Electricity breakdown
        baseShare: (payment as any).baseShare || (payment as any).base_share || 0,
        acShare: (payment as any).acShare || (payment as any).ac_share || 0,
        unitsConsumed: (payment as any).unitsConsumed || (payment as any).units_consumed || 0,
        costPerUnit: (payment as any).costPerUnit || (payment as any).cost_per_unit || 0
      }, true) as Blob;

      // Upload to Supabase Storage
      const fileName = `receipt_${payment.id}_${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const publicUrl = await uploadToSupabase('receipts', `${payment.branchId}/${fileName}`, file);

      // Update backend
      await updatePayment(payment.id, { receiptUrl: publicUrl });
      
      // Open the new URL
      const win = window.open(publicUrl, '_blank');
      if (!win) {
         toast.error('Pop-up blocked! Please allow pop-ups for this site.', { id: toastId });
      } else {
         toast.success('Receipt generated and stored!', { id: toastId });
      }
      
      // Refetch to sync local state
      refetchPayments();
    } catch (err: any) {
      console.error('Receipt persistence failed:', err);
      toast.error(`Receipt generation failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredPayments = React.useMemo(() => {
    return payments.filter(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const matchesSearch = (tenant?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.month.includes(searchTerm);
      
      // Super roles see everything in their branch
      if (['super', 'admin', 'manager'].includes(user?.role || '')) {
        return matchesSearch;
      }

      // Receptionist: Can view only payments they created
      if (user?.role === 'receptionist') {
        return matchesSearch && p.createdBy === user?.id;
      }

      // Caretaker: View limited (assigned tenants) - For now same as branch
      if (user?.role === 'caretaker') {
         return matchesSearch;
      }

      // Tenant: Only see their own
      if (user?.role === 'tenant') {
        return matchesSearch && tenant?.userId === user?.id;
      }

      return false;
    });
  }, [payments, tenants, searchTerm, user?.role, user?.id]);

  const handleDownload = () => {
    const data = filteredPayments.map(p => {
      const tenant = tenants.find(t => t.id === p.tenantId);
      return {
        Tenant: tenant?.name,
        Month: p.month,
        Amount: p.amount,
        LateFee: p.lateFee,
        Total: p.totalAmount,
        Date: p.paymentDate,
        Method: p.method
      };
    });
    const csvContent = "data:text/csv;charset=utf-8,"
      + ["Tenant,Month,Amount,LateFee,Total,Date,Method", ...data.map(r => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ElitePG_Payments.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dashboard stats should be independent of the current search term to match Dashboard expectations
  const totalRevenue = React.useMemo(() => {
    return (isTenant ? payments.filter(p => p.tenantId === tenantData?.id) : payments)
      .filter(p => p.status === 'paid' && (p.paymentType || 'rent').toLowerCase() === 'rent')
      .reduce((sum, p) => sum + p.totalAmount, 0);
  }, [isTenant, payments, tenantData?.id]);

  const myPaymentsThisMonth = React.useMemo(() => {
    return isTenant ? payments.filter(p => p.tenantId === tenantData?.id && p.month === currentMonth) : [];
  }, [isTenant, payments, tenantData?.id, currentMonth]);
  
  const myPendingDuesCount = isTenant ? (hasPaidCurrentMonth ? 0 : 1) : 0;
  
  const paidThisMonthCount = React.useMemo(() => {
    return payments.filter(p => p.month === currentMonth).length;
  }, [payments, currentMonth]);

  const pendingTenantsCount = React.useMemo(() => {
    const activeTenants = tenants.filter(t => t.status === 'active' || t.status === 'vacating');
    let count = 0;
    activeTenants.forEach(t => {
      // Condition 1: Have they paid their rent this month?
      const hasPaidRent = payments.some(p => 
        p.tenantId === t.id && 
        p.month === currentMonth && 
        p.status === 'paid' && 
        (p.paymentType === 'rent' || !p.paymentType)
      );
      
      // Condition 2: Do they have any explicit 'pending' record (like an electricity bill)?
      const hasPendingRecords = payments.some(p => 
        p.tenantId === t.id && 
        p.status === 'pending'
      );

      // If they haven't paid rent OR they have an unpaid bill, they count as having Pending Dues
      if (!hasPaidRent || hasPendingRecords) {
        count++;
      }
    });

    // Also include any non-active tenants who might still have pending records
    const inactiveTenantsWithDues = tenants.filter(t => t.status !== 'active' && t.status !== 'vacating').filter(t => 
      payments.some(p => p.tenantId === t.id && p.status === 'pending')
    ).length;

    return count + inactiveTenantsWithDues;
  }, [tenants, payments, currentMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{isTenant || user?.role === 'receptionist' || user?.role === 'caretaker' ? 'My Payments' : 'Payments'}</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isTenant ? 'Manage your rent payments and view history.' : 'Track revenue, invoices, and late fees.'}
          </p>
        </div>
        {!isTenant && (
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => setIsPoliciesModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm"
              >
                <Settings className="w-5 h-5 text-gray-500" />
                Payment Policies
              </button>
            )}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
              style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}
            >
              <Plus className="w-5 h-5" />
              Record Payment
            </button>
          </div>
        )}
      </div>

      {isTenant && upcomingDues.length > 0 && (
        <div className="space-y-8">
          {Array.from(new Set(upcomingDues.map(d => d.month))).map(month => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">
                  {format(parseISO(`${month}-01`), 'MMMM yyyy')}
                </h3>
                <div className="h-px flex-1 bg-gray-100 dark:bg-white/5" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingDues.filter(d => d.month === month).map((due, idx) => (
                  <motion.div
                    key={`${due.type}-${due.month}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "group relative rounded-[28px] p-6 border transition-all hover:scale-[1.01]",
                      due.isPaid 
                        ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10" 
                        : "bg-white dark:bg-[#111111] border-gray-100 dark:border-white/5 shadow-xl shadow-black/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                          due.isPaid 
                            ? "bg-emerald-500 text-white" 
                            : (due.type === 'electricity' ? "bg-amber-500 text-white" : "bg-indigo-600 text-white")
                        )}>
                          {due.isPaid ? <CheckCircle2 className="w-6 h-6" /> : (due.type === 'electricity' ? <Zap className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />)}
                        </div>
                        <div>
                          <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                            {due.type === 'electricity' ? 'Electricity' : 'Monthly Rent'}
                          </h4>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            due.isPaid ? "bg-emerald-500/20 text-emerald-600" : "bg-rose-500/20 text-rose-600"
                          )}>
                            {due.isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">
                          ₹{(due.amount + due.lateFee).toLocaleString()}
                        </p>
                        {due.lateFee > 0 && !due.isPaid && (
                          <p className="text-[10px] font-bold text-rose-500">Includes ₹{due.lateFee} late fee</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {due.type === 'rent' && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">Base Rent</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300">₹{due.rentAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {due.type === 'electricity' && (
                        <>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-500">Base Charge (Fixed)</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">₹{due.baseAmount.toLocaleString()}</span>
                          </div>
                          {due.acAmount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-500">AC Charge ({due.unitsConsumed} units)</span>
                              <span className="font-bold text-gray-700 dark:text-gray-300">₹{due.acAmount.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-gray-100 dark:border-white/5">
                        <span className="text-gray-400 font-bold uppercase tracking-widest">Expected By</span>
                        <span className="text-gray-500 font-black">{format(parseISO(`${due.month}-${due.dueDate.split('-')[2]}`), 'dd MMM yyyy')}</span>
                      </div>
                    </div>

                    {!due.isPaid ? (
                      <button
                        onClick={() => setPayingDue(due)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        Make Payment
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const p = payments.find(pmt => pmt.id === due.id || pmt.id === due.paymentId);
                          if (p) handleDownloadReceipt(p);
                        }}
                        className="w-full py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black uppercase tracking-widest text-xs border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        Download Receipt
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isTenant ? 'Total Paid to Date' : 'Total Rent Revenue'}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">₹{totalRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isTenant ? 'Payments (This Month)' : 'Paid This Month'}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {isTenant ? myPaymentsThisMonth.length : paidThisMonthCount} Payments
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isTenant ? 'Pending Dues' : 'Pending Dues'}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                {isTenant ? myPendingDuesCount : pendingTenantsCount} {isTenant ? 'Dues' : 'Tenants'}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {!isTenant && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {[
            { id: 'all', label: 'All Payments', icon: <HistoryIcon className="w-4 h-4" /> },
            { id: 'rent', label: 'Rent Only', icon: <CreditCard className="w-4 h-4" /> },
            { id: 'electricity', label: 'Electricity Only', icon: <Zap className="w-4 h-4" /> },
            { id: 'token', label: 'Tokens', icon: <Ticket className="w-4 h-4" /> },
            { id: 'deposit', label: 'Deposits', icon: <Shield className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                filterType === tab.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
                  : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          
          <div className="h-6 w-px bg-gray-100 dark:bg-white/10 mx-2 hidden sm:block" />
          
          {[
            { id: 'all', label: 'All Status' },
            { id: 'paid', label: 'Paid' },
            { id: 'pending', label: 'Pending' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-wider",
                filterStatus === tab.id
                  ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}

          <div className="h-6 w-px bg-gray-100 dark:bg-white/10 mx-2 hidden sm:block" />
          <input
            type="month"
            value={filterMonth === 'all' ? '' : filterMonth}
            onChange={(e) => setFilterMonth(e.target.value || 'all')}
            className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-amber-500/20 uppercase tracking-widest outline-none shadow-sm"
            title="Filter by Month/Year"
          />
        </div>
      )}

      <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>


      <div className="hidden lg:block">
        <DataGrid
          columns={paymentColumns}
          data={paginatedPayments}
          isLoading={isPaymentsLoading}
          keyExtractor={(p) => p.id}
          totalCount={totalCount}
          page={page}
          limit={limit}
          onPageChange={setPage}
          emptyStateMessage="No payment records found"
          onRowClick={(p: any) => {
            const normalized = {
              id: p.id,
              tenantId: p.tenant_id || p.tenantId,
              amount: p.amount ?? 0,
              lateFee: p.late_fee ?? p.lateFee ?? 0,
              totalAmount: p.total_amount ?? p.totalAmount ?? p.amount ?? 0,
              paymentDate: p.payment_date || p.paymentDate,
              month: p.month,
              status: p.status,
              method: p.method,
              transactionId: p.transaction_id || p.transactionId,
              receiptUrl: p.receipt_url || p.receiptUrl,
              tenants: p.tenants,
              branchId: p.branch_id || p.branchId || currentBranch?.id,
              electricityBillId: p.electricity_bill_id || p.electricityBillId,
              electricityAmount: p.electricity_amount || p.electricityAmount || 0
            };
            setDetailPayment(normalized);
            
            if (normalized.electricityBillId) {
              fetchElectricityBillById(normalized.electricityBillId).then(bill => {
                if (bill && normalized.tenantId) {
                  const share = calculateElectricityShares(bill, [tenants.find(t => t.id === normalized.tenantId)!]).find(s => s.tenantId === normalized.tenantId);
                  if (share) {
                    setDetailPayment((prev: any) => ({
                      ...prev,
                      baseShare: share.baseShare,
                      acShare: share.acShare,
                      actualBillUrl: bill.actualBillUrl,
                      acBillUrl: bill.acBillUrl
                    }));
                  }
                }
              });
            }
          }}
        />
      </div>

      <div className="lg:hidden">
        <PaymentMobileList
          payments={paginatedPayments}
          isLoading={isPaymentsLoading}
          onManage={(p: any) => {
            const normalized = {
              ...p,
              tenantId: p.tenant_id || p.tenantId,
              amount: p.amount ?? 0,
              lateFee: p.late_fee ?? p.lateFee ?? 0,
              totalAmount: p.total_amount ?? p.totalAmount ?? p.amount ?? 0,
              paymentDate: p.payment_date || p.paymentDate,
              month: p.month,
              status: p.status,
              method: p.method,
              transactionId: p.transaction_id || p.transactionId,
              receiptUrl: p.receipt_url || p.receiptUrl,
              branchId: p.branch_id || p.branchId || currentBranch?.id,
              electricityBillId: p.electricity_bill_id || p.electricityBillId,
              electricityAmount: p.electricity_amount || p.electricityAmount || 0
            };
            setDetailPayment(normalized);
            
            if (normalized.electricityBillId) {
              fetchElectricityBillById(normalized.electricityBillId).then(bill => {
                if (bill && normalized.tenantId) {
                  const share = calculateElectricityShares(bill, [tenants.find(t => t.id === normalized.tenantId)!]).find(s => s.tenantId === normalized.tenantId);
                  if (share) {
                    setDetailPayment((prev: any) => ({
                      ...prev,
                      baseShare: share.baseShare,
                      acShare: share.acShare,
                      actualBillUrl: bill.actualBillUrl,
                      acBillUrl: bill.acBillUrl
                    }));
                  }
                }
              });
            }
          }}
          onEdit={(p) => {
            setPaymentToEdit(p);
            setIsEditModalOpen(true);
          }}
          onDownloadReceipt={(p) => handleDownloadReceipt(p)}
          onShareReceipt={(p) => {
            setSelectedPayment(p);
            setIsReceiptModalOpen(true);
          }}
          onDelete={(p: any) => {
            setDeleteConfirmation({ isOpen: true, paymentId: p.id });
          }}
          onBulkDelete={(ids) => {
            setDeleteConfirmation({ isOpen: true, bulkIds: ids });
          }}
          onBulkShare={(ids) => {
            const selected = paginatedPayments.filter(p => ids.includes(p.id));
            const shareText = selected.map(p => {
                const name = p.tenants?.name || 'Unknown';
                const total = p.total_amount || p.totalAmount || p.amount;
                return `${name}: ₹${total?.toLocaleString()} (${p.month})`;
            }).join('\n');
            navigator.clipboard.writeText(shareText).then(() => toast.success('Payment summaries copied!'));
          }}
        />
        {paginatedPayments.length > 0 && (
          <div className="mt-4 flex justify-center pb-8">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm font-bold text-indigo-600">
              Page {page} of {Math.ceil(totalCount / limit)}
            </span>
            <button
              disabled={page >= Math.ceil(totalCount / limit)}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Payment Detail Panel */}
      <PaymentDetailPanel
        payment={detailPayment}
        tenantName={detailPayment?.tenants?.name}
        onClose={() => setDetailPayment(null)}
        onViewReceipt={(p) => {
          setDetailPayment(null);
          setSelectedPayment(p);
          setIsReceiptModalOpen(true);
        }}
        onDelete={(p) => {
            setDeleteConfirmation({ isOpen: true, paymentId: p.id });
          }}
        onViewDoc={(url, title) => setViewerDoc({ url, title })}
        canEdit={isAdmin}
      />

      <DocumentViewerModal
        isOpen={!!viewerDoc}
        url={viewerDoc?.url || ''}
        title={viewerDoc?.title || ''}
        onClose={() => setViewerDoc(null)}
      />


      <AnimatePresence>
        {payingDue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPayingDue(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Make Payment</h3>
                <button onClick={() => setPayingDue(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 space-y-4 border border-gray-100 dark:border-white/5">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Month</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{format(parseISO(`${payingDue.month}-01`), 'MMMM yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Due Date</p>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{payingDue.dueDate}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {payingDue.type === 'rent' ? (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium tracking-tight">Monthly Rent</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{payingDue.rentAmount.toLocaleString()}</span>
                      </div>
                    ) : null}

                    {payingDue.type === 'electricity' && payingDue.baseAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium tracking-tight">Electricity (Base Share)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{payingDue.baseAmount.toLocaleString()}</span>
                      </div>
                    )}

                    {payingDue.type === 'electricity' && payingDue.acAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex flex-col">
                          <span className="text-gray-500 font-medium tracking-tight">Electricity (AC Share)</span>
                          {payingDue.unitsConsumed > 0 && (
                            <span className="text-[10px] text-gray-400">{payingDue.unitsConsumed} units × ₹{payingDue.costPerUnit.toFixed(2)}</span>
                          )}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{payingDue.acAmount.toLocaleString()}</span>
                      </div>
                    )}

                    {payingDue.lateFee > 0 && (
                      <div className="flex justify-between items-center text-sm p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400">
                        <span className="font-bold flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Late Fee Charged
                        </span>
                        <span className="font-black text-base">₹{payingDue.lateFee.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Documents Verification */}
                  {payingDue.type === 'electricity' && (payingDue.actualBillUrl || payingDue.acBillUrl) && (
                    <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-2">Verify Bill Proofs</p>
                      <div className="grid grid-cols-2 gap-2">
                        {payingDue.actualBillUrl && (
                          <button
                            onClick={() => setViewerDoc({ url: payingDue.actualBillUrl, title: 'Electricity Bill' })}
                            className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors border border-amber-200"
                          >
                            <FileText className="w-4 h-4" />
                            View Bill
                          </button>
                        )}
                        {payingDue.acBillUrl && (
                          <button
                            onClick={() => setViewerDoc({ url: payingDue.acBillUrl, title: 'AC Reading Proof' })}
                            className="flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200"
                          >
                            <FileText className="w-4 h-4" />
                            View AC Reading
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 mt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Total Amount</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{(payingDue.amount + payingDue.lateFee).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-xl flex items-center justify-center shadow-sm">
                    <CreditCard className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Secure Online Payment</h4>
                    <p className="text-[10px] text-gray-500 tracking-tight">Pay instantly via UPI, Card, or Netbanking</p>
                  </div>
                </div>

                <button
                  onClick={handleOnlinePayment}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Pay ₹{(payingDue.amount + payingDue.lateFee).toLocaleString()}
                </button>

                <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 italic">
                  Secure payment powered by Razorpay
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {isReceiptModalOpen && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none max-h-[95vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between print:hidden sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Receipt</h3>
                <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 sm:p-12 space-y-6 sm:space-y-8 print:p-0">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">ELITE PG</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Premium Living Experience</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-widest">Receipt</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">#REC-{selectedPayment.id?.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 pt-6 sm:pt-8 border-t border-gray-100 dark:border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Billed To</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{tenants.find(t => t.id === selectedPayment.tenantId)?.name}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{tenants.find(t => t.id === selectedPayment.tenantId)?.email}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Room {tenants.find(t => t.id === selectedPayment.tenantId)?.roomId}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Payment Details</p>
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-white font-bold">Date: {selectedPayment.paymentDate}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Month: {format(parseISO(`${selectedPayment.month}-01`), 'MMMM yyyy')}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Method: {selectedPayment.method}</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-6 sm:p-8">
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Monthly Rent</span>
                      <span className="font-bold text-gray-900 dark:text-white">₹{selectedPayment.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Late Fee</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">₹{selectedPayment.lateFee.toLocaleString()}</span>
                    </div>
                    {Number((selectedPayment as any).electricityAmount || (selectedPayment as any).electricity_amount || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-500 font-bold flex items-center gap-1">⚡ Electricity</span>
                        <span className="font-bold text-amber-600">₹{Number((selectedPayment as any).electricityAmount || (selectedPayment as any).electricity_amount || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Total Paid</span>
                      <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{selectedPayment.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 no-print">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Custom Note</label>
                  <textarea
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="Add a custom note to this receipt..."
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 no-print">
                  <button
                    onClick={() => handleDownloadReceipt()}
                    disabled={isGeneratingPDF}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-tight sm:tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60 whitespace-nowrap"
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : selectedPayment.receiptUrl ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    {isGeneratingPDF ? 'Working...' : selectedPayment.receiptUrl ? 'View Receipt' : 'Generate & Store PDF'}
                  </button>
                  {selectedPayment.receiptUrl && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          const tenant = tenants.find(t => t.id === selectedPayment.tenantId);
                          const text = `Hello ${tenant?.name || ''}, your payment receipt for ${format(parseISO(`${selectedPayment.month}-01`), 'MMMM yyyy')} is ready. View it here: ${selectedPayment.receiptUrl}`;
                          window.open(`https://wa.me/${tenant?.phone ? '91'+tenant.phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="flex-1 sm:flex-none p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm flex items-center justify-center"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'ElitePG Payment Receipt',
                              text: `Payment receipt for ${selectedPayment.month}`,
                              url: selectedPayment.receiptUrl
                            }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(selectedPayment.receiptUrl);
                            toast.success('Link copied to clipboard!');
                          }
                        }}
                        className="flex-1 sm:flex-none p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm flex items-center justify-center"
                        title="Share / Copy Link"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                        className="flex-1 sm:flex-none p-4 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm flex items-center justify-center"
                        title="Download/Open"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Successful
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-6 italic">This receipt includes an authorized digital signature valid for official use.</p>
                </div>
              </div>
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
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
               <form onSubmit={handleAddPayment} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Type</label>
                       <div className="w-full px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 border-none rounded-xl text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
                         <Home className="w-4 h-4" /> Rent Payment
                       </div>
                       <p className="text-[10px] text-gray-500 mt-1 italic">This modal strictly handles rent payments.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Tenant</label>
                      <select
                        required
                        value={newPayment.tenantId}
                        onChange={async (e) => {
                          const tenantId = e.target.value;
                          const amount = await handleAutoPopulate(newPayment.paymentType || 'rent', tenantId, newPayment.month || '');
                          const lateFee = newPayment.paymentType === 'rent' ? calculateLateFee(tenantId, newPayment.month || '') : 0;
                          setNewPayment({
                            ...newPayment,
                            tenantId,
                            amount,
                            lateFee,
                            totalAmount: amount + lateFee
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="">Choose a tenant</option>
                        {tenants
                          .filter(t => t.status === 'active' || t.status === 'vacating')
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(t => (
                          <option key={t.id} value={t.id}>{t.name} (Room {rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.roomNumber || 'N/A'})</option>
                        ))}
                      </select>
                      {tenants.length === 0 && (
                        <p className="text-[10px] text-rose-500 mt-1 italic font-semibold animate-pulse">
                          No active tenants found for this branch. Please ensure tenants are added first.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
                      <input
                        required
                        type="month"
                        value={newPayment.month}
                        onChange={async (e) => {
                          const month = e.target.value;
                          const amount = await handleAutoPopulate(newPayment.paymentType || 'rent', newPayment.tenantId || '', month);
                          const lateFee = newPayment.paymentType === 'rent' ? calculateLateFee(newPayment.tenantId || '', month) : 0;
                          setNewPayment({
                            ...newPayment,
                            month,
                            amount,
                            lateFee,
                            totalAmount: amount + lateFee
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Date</label>
                      <input
                        required
                        type="date"
                        value={newPayment.paymentDate}
                        onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {newPayment.paymentType === 'rent' ? 'Rent Amount' : 'Bill Amount'}
                      </label>
                      <input
                        required
                        type="number"
                        value={newPayment.amount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setNewPayment({ ...newPayment, amount: val, totalAmount: val + (newPayment.lateFee || 0) });
                        }}
                        readOnly={newPayment.paymentType === 'rent'}
                        className={cn(
                          "w-full px-4 py-2.5 border-none rounded-xl text-sm transition-all",
                          newPayment.paymentType === 'rent' 
                            ? "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                            : "bg-gray-50 dark:bg-white/10 text-gray-900 dark:text-white font-bold ring-2 ring-indigo-500/10 focus:ring-indigo-500/40"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Late Fee</label>
                      <input
                        readOnly
                        type="number"
                        value={newPayment.lateFee}
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-rose-500 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Method</label>
                    <div className="flex gap-2">
                      {['Online', 'Cash'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setNewPayment({ ...newPayment, method: method as any })}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all",
                            newPayment.method === method
                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                              : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                          )}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Readonly Deposit Balance */}
                  {selectedTenantDepositBalance > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-white/10">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Available Deposit Balance</span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-500">₹{selectedTenantDepositBalance.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Move-in First Rent Summary Card */}
                  {isFirstRent && newPayment.paymentType === 'rent' && (() => {
                    const tenant = tenants.find(t => t.id === newPayment.tenantId);
                    const fullRent = tenant?.rentAmount || 0;
                    const tokenPaid = tenant?.tokenAmount || 0;
                    const payNow = firstRentAmount;
                    return (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-500/10 dark:to-indigo-500/10 rounded-2xl space-y-3 border border-purple-200 dark:border-purple-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-purple-500 text-white rounded-xl flex items-center justify-center">
                            <Home className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-black text-purple-700 dark:text-purple-300 uppercase tracking-tight">Move-in First Rent</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Full Monthly Rent</span>
                            <span className="font-bold text-gray-700 dark:text-gray-300">₹{fullRent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-purple-500 font-medium">Token Already Paid</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">− ₹{tokenPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-purple-200 dark:border-purple-500/20">
                            <span className="font-black text-purple-800 dark:text-purple-200">Remaining to Pay Now</span>
                            <span className="font-black text-purple-600 dark:text-purple-300 text-lg">₹{payNow.toLocaleString()}</span>
                          </div>
                        </div>
                        {/* Reporting note */}
                        <div className="flex items-start gap-2 mt-2 pt-2 border-t border-purple-200/50 dark:border-purple-500/10">
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest shrink-0 mt-0.5">📊 Revenue</span>
                          <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium leading-relaxed">
                            Full rent of <strong>₹{fullRent.toLocaleString()}</strong> counts as revenue (Token ₹{tokenPaid.toLocaleString()} + Remaining ₹{payNow.toLocaleString()}). Token is NOT double-counted.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Deposit Adjustment Controls */}
                  {selectedTenantDepositBalance > 0 && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-2xl cursor-pointer border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                        <input
                          type="checkbox"
                          checked={adjustFromDeposit}
                          onChange={(e) => {
                            setAdjustFromDeposit(e.target.checked);
                            if (!e.target.checked) setDepositAdjustAmount(0);
                          }}
                          className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500/20 bg-white dark:bg-black border-amber-200 dark:border-amber-500/30"
                        />
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Adjust from Deposit</span>
                          <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Deposit Balance: ₹{selectedTenantDepositBalance.toLocaleString()}</span>
                        </div>
                      </label>
                      {adjustFromDeposit && (
                        <div className="space-y-2 pl-4">
                          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adjustment Amount (₹)</label>
                          <input
                            type="number"
                            min={0}
                            max={Math.min(selectedTenantDepositBalance, isFirstRent ? firstRentAmount : newPayment.amount || 0)}
                            value={depositAdjustAmount}
                            onChange={(e) => {
                              const val = Math.min(Number(e.target.value), selectedTenantDepositBalance, isFirstRent ? firstRentAmount : newPayment.amount || 0);
                              setDepositAdjustAmount(val);
                            }}
                            className="w-full px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl focus:ring-2 focus:ring-amber-500/20 text-gray-900 dark:text-white font-bold"
                            placeholder={`Max ₹${Math.min(selectedTenantDepositBalance, isFirstRent ? firstRentAmount : newPayment.amount || 0).toLocaleString()}`}
                          />
                          {depositAdjustAmount > selectedTenantDepositBalance && (
                            <p className="text-[10px] text-rose-500 font-bold">Exceeds deposit balance!</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total Amount Summary */}
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{newPayment.paymentType === 'rent' ? (isFirstRent ? 'First Rent (Move-in)' : 'Rent') : 'Electricity'}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{(isFirstRent && newPayment.paymentType === 'rent' ? firstRentAmount : newPayment.amount || 0).toLocaleString()}</span>
                    </div>
                    {adjustFromDeposit && depositAdjustAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600 font-medium">Deposit Adjustment</span>
                        <span className="text-xs font-semibold text-amber-600">− ₹{depositAdjustAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {(newPayment.lateFee || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-rose-500">Late Fee</span>
                        <span className="text-xs font-semibold text-rose-600">₹{(newPayment.lateFee || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-500/20">
                      <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Total Payable</span>
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{(Math.max(0, (isFirstRent && newPayment.paymentType === 'rent' ? firstRentAmount : newPayment.amount || 0) - (adjustFromDeposit ? depositAdjustAmount : 0)) + (newPayment.lateFee || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSubmitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && paymentToEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111111] z-10">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Payment Record</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleEditPayment} className="p-6 sm:p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tenant</label>
                    <div className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-gray-500 dark:text-gray-400 font-bold">
                      {tenants.find(t => t.id === paymentToEdit.tenantId)?.name}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
                      <input
                        required
                        type="month"
                        value={paymentToEdit.month}
                        onChange={async (e) => {
                          const month = e.target.value;
                          const amount = await handleAutoPopulate(paymentToEdit.paymentType, paymentToEdit.tenantId, month);
                          const lateFee = paymentToEdit.paymentType === 'rent' ? calculateLateFee(paymentToEdit.tenantId, month) : 0;
                          setPaymentToEdit({ 
                            ...paymentToEdit, 
                            month,
                            amount,
                            lateFee
                          });
                        }}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Payment Date</label>
                      <input
                        required
                        type="date"
                        value={paymentToEdit.paymentDate}
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, paymentDate: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</label>
                      <input
                        required
                        type="number"
                        value={paymentToEdit.amount}
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, amount: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Late Fee</label>
                      <input
                        required
                        type="number"
                        value={paymentToEdit.lateFee}
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, lateFee: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Status</label>
                      <select
                        value={paymentToEdit.status}
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, status: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Method</label>
                      <select
                        value={paymentToEdit.method}
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, method: e.target.value as any })}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="Online">Online</option>
                        <option value="Cash">Cash</option>
                        <option value="Offline">Offline</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Total Amount</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{(paymentToEdit.amount + paymentToEdit.lateFee).toLocaleString()}</span>
                  </div>
                </div>
                
                {paymentToEdit.paymentType === 'electricity' && paymentToEdit.status === 'pending' && (
                  <div className="flex justify-end w-full mb-2">
                     <button
                       type="button"
                       onClick={handleAdjustElectricity}
                       className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 rounded-xl transition-all font-bold tracking-tight shadow-sm"
                     >
                       <Zap className="w-4 h-4" />
                       Adjust from Deposit
                     </button>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all"
                  >
                    Update Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPoliciesModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPoliciesModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Policies</h3>
                  <p className="text-xs text-gray-500">Configure global due dates and late fee calculations</p>
                </div>
                <button onClick={() => setIsPoliciesModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSavePolicies} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Default Due Date</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={policiesForm.defaultPaymentDueDate}
                      onChange={(e) => setPoliciesForm({ ...policiesForm, defaultPaymentDueDate: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-400">Day of month rent is due.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Grace Period (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={policiesForm.defaultLateFeeDay}
                      onChange={(e) => setPoliciesForm({ ...policiesForm, defaultLateFeeDay: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-400">Days after due date before late fee.</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Late Fee Amount (₹ per day)</label>
                    <input
                      type="number"
                      min="0"
                      value={policiesForm.lateFeeAmount}
                      onChange={(e) => setPoliciesForm({ ...policiesForm, lateFeeAmount: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-400">Amount charged per day past grace period.</p>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                  Save Policies
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={deleteConfirmation?.isOpen || false}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Payment Record?"
        message={deleteConfirmation?.bulkIds 
          ? `Are you sure you want to delete ${deleteConfirmation.bulkIds.length} selected records? This action cannot be undone.`
          : "Are you sure you want to delete this payment record? This action cannot be undone."
        }
        confirmLabel={deleteConfirmation?.bulkIds ? `Delete all` : "Delete"}
        variant="danger"
      />
    </div>
  );
};

