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
  Settings
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
  const { payments, tenants, rooms, addPayment, updatePayment, deletePayment, currentBranch, pgConfig, updatePGConfig } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [detailPayment, setDetailPayment] = useState<any | null>(null);
  const [electricityShare, setElectricityShare] = useState<number>(0);
  const [electricityBillId, setElectricityBillId] = useState<string | null>(null);
  const [electricityBillData, setElectricityBillData] = useState<ElectricityBill | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{ url: string, title: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean, paymentId?: string, bulkIds?: string[] } | null>(null);

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

  // Server-side paginated hook — fetches ONLY 10 records at a time
  const { data: paginatedPayments, totalCount, isLoading: isPaymentsLoading, page, setPage, limit, refetch: refetchPayments } = usePaginatedData<any>({
    table: 'payments',
    select: '*, tenants!payments_tenant_id_fkey(name, phone, rooms!tenants_room_id_fkey(room_number))',
    ilikeFilters: searchTerm ? { transaction_id: searchTerm } : undefined,
    filters: filterStatus !== 'all' ? { status: filterStatus } : undefined,
    orderBy: { column: 'payment_date', ascending: false }
  });

  const isAdmin = ['super', 'admin', 'manager', 'receptionist', 'caretaker'].includes(user?.role || '');

  const paymentColumns: ColumnDef<any>[] = [
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
          {Number(p.electricity_amount || 0) > 0 && <p className="text-[10px] text-amber-500 flex items-center gap-0.5">⚡ includes electricity</p>}
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
                if (window.confirm('Delete this payment?')) { deletePayment(p.id); refetchPayments(); }
              }} danger />
            )}
          </DropdownMenu>
        </div>
      )
    }
  ];

  // Auto-fetch electricity when tenant + month are both set
  const fetchAndSetElectricity = useCallback(async (tenantId: string, month: string) => {
    if (!tenantId || !month) {
      setElectricityShare(0);
      setElectricityBillId(null);
      setElectricityBillData(null);
      return 0;
    }
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return 0;
    
    // Find room to get meterGroupId
    const room = rooms.find(r => r.id === tenant.roomId || r.id === (tenant as any).room_id);
    if (!room?.meterGroupId) {
      setElectricityShare(0);
      setElectricityBillId(null);
      setElectricityBillData(null);
      return 0;
    }

    const bill = await fetchElectricityBill(room.meterGroupId, month);
    if (!bill) {
      setElectricityShare(0);
      setElectricityBillId(null);
      setElectricityBillData(null);
      return 0;
    }
    setElectricityBillData(bill);
    setElectricityBillId(bill.id);

    // Get ALL active tenants in ALL rooms belonging to this Flat
    const flatRooms = rooms.filter(r => r.meterGroupId === room.meterGroupId);
    const flatTenants = tenants.filter(t => {
      const r = rooms.find(rm => rm.id === t.roomId || rm.id === (t as any).room_id);
      return r?.meterGroupId === room.meterGroupId && t.status === 'active';
    }).map(t => ({
      id: t.id, 
      name: t.name,
      roomId: t.roomId || (t as any).room_id || '',
      is_ac_user: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false,
      isAcUser: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false
    }));

    // Fetch AC readings if unit-based
    let acReadings: any[] = [];
    if (bill.totalUnits && bill.totalUnits > 0) {
      acReadings = await fetchRoomAcReadings(room.meterGroupId, month, rooms);
    }

    const shares = calculateElectricityShares(bill, flatTenants, flatRooms, acReadings);
    const myShare = shares.find(s => s.tenantId === tenantId);
    const amount = myShare?.total || 0;
    setElectricityShare(amount);
    return amount;
  }, [tenants, rooms]);

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

  const isTenant = user?.role === 'tenant';
  const tenantData = isTenant ? tenants.find(t => t.userId === user.id) : null;

  useEffect(() => {
    if (isTenant && tenantData) {
      fetchAndSetElectricity(tenantData.id, format(new Date(), 'yyyy-MM'));
    }
  }, [isTenant, tenantData?.id, fetchAndSetElectricity]);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Offline'>('Online');

  const currentMonth = format(new Date(), 'yyyy-MM');
  const hasPaidCurrentMonth = payments.some(p => p.tenantId === tenantData?.id && p.month === currentMonth && p.status === 'paid');

  const upcomingDues = isTenant && tenantData && !hasPaidCurrentMonth ? [{
    month: currentMonth,
    rentAmount: tenantData.rentAmount,
    electricityAmount: electricityShare || 0,
    amount: tenantData.rentAmount + (electricityShare || 0),
    dueDate: `${currentMonth}-${(tenantData.paymentDueDate || pgConfig?.defaultPaymentDueDate || 1).toString().padStart(2, '0')}`,
    lateFee: calculateLateFee(tenantData.id, currentMonth)
  }] : [];

  const handleOnlinePayment = async () => {
    if (tenantData && upcomingDues.length > 0) {
      const due = upcomingDues[0];

      // Check for exact duplicate payment
      const existingPayment = payments.find(p => p.tenantId === tenantData.id && p.month === due.month && (p.status === 'paid' || p.status === 'pending'));
      if (existingPayment) {
        toast.error('A payment for this month is already recorded or in progress.');
        return;
      }

      const isOffline = paymentMethod === 'Offline';
      const totalAmount = due.amount + due.lateFee;

      if (isOffline) {
        addPayment({
          tenantId: tenantData.id,
          amount: due.rentAmount,
          lateFee: due.lateFee,
          totalAmount,
          electricityAmount: due.electricityAmount,
          electricityBillId: electricityBillId || undefined,
          paymentDate: format(new Date(), 'yyyy-MM-dd'),
          month: due.month,
          status: 'pending',
          method: 'Offline',
        });
        setIsPayModalOpen(false);
        toast.success(`Offline payment request submitted for ₹${totalAmount.toLocaleString()}. Please pay at the desk.`);
      } else {
        const res = await loadRazorpayScript();

        if (!res) {
          toast.error('Razorpay SDK failed to load. Are you online?');
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY || 'rzp_test_SPuhgTcTc6kl88',
          amount: totalAmount * 100, // Amount in paise
          currency: 'INR',
          name: 'ElitePG',
          description: `Rent Payment for ${format(parseISO(`${due.month}-01`), 'MMMM yyyy')}`,
          image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=150&h=150',
          handler: function (response: any) {
            const paymentRecord: Omit<Payment, 'id' | 'branchId'> = {
              tenantId: tenantData.id,
              amount: due.rentAmount,
              lateFee: due.lateFee,
              totalAmount,
              electricityAmount: due.electricityAmount,
              electricityBillId: electricityBillId || undefined,
              paymentDate: format(new Date(), 'yyyy-MM-dd'),
              month: due.month,
              status: 'paid',
              method: 'Online',
              transactionId: response.razorpay_payment_id
            };
            
            addPayment(paymentRecord);
            setIsPayModalOpen(false);
            toast.success(`Payment successful! Transaction ID: ${response.razorpay_payment_id}`);

            // Immediate receipt download
            const receiptPayment: Payment = { ...paymentRecord, id: response.razorpay_payment_id } as Payment;
            handleDownloadReceipt(receiptPayment);
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

  const [newPayment, setNewPayment] = useState<Omit<Payment, 'id' | 'branchId'>>({
    tenantId: '',
    amount: 0,
    lateFee: 0,
    totalAmount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    month: format(new Date(), 'yyyy-MM'),
    status: 'paid',
    method: 'Offline'
  });

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.tenantId) {
      const existingPayment = payments.find(p => p.tenantId === newPayment.tenantId && p.month === newPayment.month);
      if (existingPayment) {
        toast.error(`A payment record already exists for this tenant for ${newPayment.month}.`);
        return;
      }

      const tenant = tenants.find(t => t.id === newPayment.tenantId);
      const room = rooms.find(r => r.id === tenant?.roomId || r.id === (tenant as any)?.room_id);
      
      let baseShare = 0;
      let acShare = 0;
      let unitsConsumed = 0;
      let costPerUnit = 0;
      let actualBillUrl = '';
      let acBillUrl = '';

      if (electricityBillData) {
        const flatRooms = rooms.filter(r => r.meterGroupId === room?.meterGroupId);
        const flatTenants = tenants.filter(t => {
          const r = rooms.find(rm => rm.id === t.roomId || rm.id === (t as any).room_id);
          return r?.meterGroupId === room?.meterGroupId && t.status === 'active';
        }).map(t => ({
          id: t.id, name: t.name, roomId: t.roomId || (t as any).room_id || '',
          is_ac_user: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false,
          isAcUser: rooms.find(r => r.id === (t.roomId || (t as any).room_id))?.type === 'AC' || false
        }));

        let acReadings: any[] = [];
        if (electricityBillData.totalUnits && electricityBillData.totalUnits > 0) {
          try {
            const { fetchRoomAcReadings } = await import('../utils/electricityUtils');
            acReadings = await fetchRoomAcReadings(room?.meterGroupId!, newPayment.month, rooms);
          } catch (err) { /* ignore */ }
        }

        const { calculateElectricityShares } = await import('../utils/electricityUtils');
        const shares = calculateElectricityShares(electricityBillData, flatTenants, flatRooms, acReadings);
        const myShare = shares.find(s => s.tenantId === newPayment.tenantId);
        if (myShare) {
          baseShare = myShare.baseShare;
          acShare = myShare.acShare;
          unitsConsumed = myShare.unitsConsumed || 0;
          costPerUnit = myShare.costPerUnit || 0;
          actualBillUrl = electricityBillData.actualBillUrl || '';
          acBillUrl = electricityBillData.acBillUrl || '';
        }
      }

      await addPayment({
        ...newPayment,
        electricityAmount: electricityShare,
        electricityBillId: electricityBillId || undefined,
        totalAmount: (newPayment.amount || 0) + electricityShare + (newPayment.lateFee || 0),
        baseShare,
        acShare,
        unitsConsumed,
        costPerUnit,
        actualBillUrl,
        acBillUrl
      } as Omit<Payment, 'id'>);
      setIsAddModalOpen(false);
      setNewPayment({
        tenantId: '',
        amount: 0,
        lateFee: 0,
        totalAmount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        month: format(new Date(), 'yyyy-MM'),
        status: 'paid',
        method: 'Offline'
      });
      setElectricityShare(0);
      setElectricityBillId(null);
      setElectricityBillData(null);
      refetchPayments();
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
        transactionId: paymentToEdit.transactionId
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
        signatureUrl: authorizedSignature
      }, true) as Blob;

      // Upload to Supabase Storage
      const fileName = `receipt_${payment.id}_${Date.now()}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const publicUrl = await uploadToSupabase('receipts', `${payment.branchId}/${fileName}`, file);

      // Update backend
      await updatePayment(payment.id, { receiptUrl: publicUrl });
      
      // Open the new URL
      window.open(publicUrl, '_blank');
      toast.success('Receipt generated and stored!', { id: toastId });
      
      // Refetch to sync local state
      refetchPayments();
    } catch (err) {
      console.error('Receipt persistence failed:', err);
      toast.error('Failed to generate/store receipt. Please try again.', { id: toastId });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filteredPayments = payments.filter(p => {
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

  const totalRevenue = filteredPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const myPaymentsThisMonth = isTenant ? payments.filter(p => p.tenantId === tenantData?.id && p.month === format(new Date(), 'yyyy-MM')) : [];
  const myPendingDuesCount = isTenant ? (hasPaidCurrentMonth ? 0 : 1) : 0;

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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 rounded-[32px] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-600/30 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <CreditCard className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-inner">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest">Rent Due for {format(parseISO(`${upcomingDues[0].month}-01`), 'MMMM yyyy')}</p>
              <h3 className="text-5xl font-black mt-2 tracking-tighter">₹{(upcomingDues[0].amount + upcomingDues[0].lateFee).toLocaleString()}</h3>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold flex items-center gap-2">
                  <CreditCard className="w-3 h-3" />
                  Rent: ₹{upcomingDues[0].rentAmount.toLocaleString()}
                </span>
                {upcomingDues[0].electricityAmount > 0 && (
                  <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold flex items-center gap-2 text-amber-300">
                    <TrendingUp className="w-3 h-3" />
                    Electricity: ₹{upcomingDues[0].electricityAmount.toLocaleString()}
                  </span>
                )}
                {upcomingDues[0].lateFee > 0 && (
                  <span className="px-3 py-1 bg-rose-500/20 text-rose-200 rounded-full text-xs font-bold flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Late Fee: ₹{upcomingDues[0].lateFee}
                  </span>
                )}
              </div>
              <div className="mt-4 border-t border-white/20 pt-4">
                <span className="text-indigo-100 text-xs font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pay by {upcomingDues[0].dueDate} to avoid additional late fees.
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="relative z-10 w-full lg:w-auto px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl hover:scale-105 active:scale-95"
          >
            Pay Now
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{isTenant ? 'Total Paid to Date' : 'Total Revenue'}</p>
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
                {isTenant ? myPaymentsThisMonth.length : payments.filter(p => p.month === format(new Date(), 'yyyy-MM')).length} Payments
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
                {isTenant ? myPendingDuesCount : tenants.length - payments.filter(p => p.month === format(new Date(), 'yyyy-MM')).length} {isTenant ? 'Dues' : 'Tenants'}
              </h3>
            </div>
          </div>
        </div>
      </div>

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
          <button className="p-2.5 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
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
        {isPayModalOpen && upcomingDues.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPayModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Make Payment</h3>
                <button onClick={() => setIsPayModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="p-6 sm:p-8 space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Total Payable</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{(upcomingDues[0].amount + upcomingDues[0].lateFee).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Month</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{format(parseISO(`${upcomingDues[0].month}-01`), 'MMM yyyy')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Select Payment Method</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['Online', 'Offline'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                          paymentMethod === method
                            ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10"
                            : "border-gray-100 dark:border-white/5 hover:border-indigo-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            paymentMethod === method ? "border-indigo-600" : "border-gray-300"
                          )}>
                            {paymentMethod === method && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                          </div>
                          <span className={cn("font-bold", paymentMethod === method ? "text-indigo-600 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400")}>
                            {method}
                          </span>
                        </div>
                        {method === 'Offline' ? <Clock className={cn("w-5 h-5", paymentMethod === method ? "text-indigo-600" : "text-gray-400")} /> : <CreditCard className={cn("w-5 h-5", paymentMethod === method ? "text-indigo-600" : "text-gray-400")} />}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleOnlinePayment}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                >
                  Pay ₹{(upcomingDues[0].amount + upcomingDues[0].lateFee).toLocaleString()}
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

                <div className="flex gap-3 pt-4 no-print">
                  <button
                    onClick={() => handleDownloadReceipt()}
                    disabled={isGeneratingPDF}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-60"
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const tenant = tenants.find(t => t.id === selectedPayment.tenantId);
                          const text = `Hello ${tenant?.name || ''}, your payment receipt for ${format(parseISO(`${selectedPayment.month}-01`), 'MMMM yyyy')} is ready. View it here: ${selectedPayment.receiptUrl}`;
                          window.open(`https://wa.me/${tenant?.phone ? '91'+tenant.phone : ''}?text=${encodeURIComponent(text)}`, '_blank');
                        }}
                        className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
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
                        className="p-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm"
                        title="Share / Copy Link"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => window.open(selectedPayment.receiptUrl, '_blank')}
                        className="p-4 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm"
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
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Tenant</label>
                    <select
                      required
                      value={newPayment.tenantId}
                      onChange={(e) => {
                        const tenant = tenants.find(t => t.id === e.target.value);
                        const lateFee = calculateLateFee(e.target.value, newPayment.month || '');
                        setNewPayment({
                          ...newPayment,
                          tenantId: e.target.value,
                          amount: tenant?.rentAmount || 0,
                          lateFee,
                          totalAmount: (tenant?.rentAmount || 0) + lateFee
                        });
                        fetchAndSetElectricity(e.target.value, newPayment.month || '');
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                    >
                      <option value="">Choose a tenant</option>
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Month</label>
                      <input
                        required
                        type="month"
                        value={newPayment.month}
                        onChange={(e) => {
                          const lateFee = calculateLateFee(newPayment.tenantId || '', e.target.value);
                          setNewPayment({
                            ...newPayment,
                            month: e.target.value,
                            lateFee,
                            totalAmount: (newPayment.amount || 0) + lateFee
                          });
                          fetchAndSetElectricity(newPayment.tenantId || '', e.target.value);
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rent Amount</label>
                      <input
                        readOnly
                        type="number"
                        value={newPayment.amount}
                        className="w-full px-4 py-2.5 bg-gray-100 dark:bg-white/5 border-none rounded-xl text-gray-500 dark:text-gray-400"
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
                      {['Online', 'Cash', 'Offline'].map((method) => (
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

                  {/* Electricity Auto-Fill */}
                  {electricityShare > 0 && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-100 dark:border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500 text-sm">⚡</span>
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Electricity</span>
                      </div>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">₹{electricityShare.toLocaleString()}</span>
                    </div>
                  )}
                  {newPayment.tenantId && electricityShare === 0 && electricityBillData === null && (
                    <p className="text-[10px] text-gray-400 italic">No electricity bill found for this month.</p>
                  )}

                  <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Rent</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">₹{(newPayment.amount || 0).toLocaleString()}</span>
                    </div>
                    {electricityShare > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-500">⚡ Electricity</span>
                        <span className="text-xs font-semibold text-amber-600">₹{electricityShare.toLocaleString()}</span>
                      </div>
                    )}
                    {(newPayment.lateFee || 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-rose-500">Late Fee</span>
                        <span className="text-xs font-semibold text-rose-600">₹{(newPayment.lateFee || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-indigo-200 dark:border-indigo-500/20">
                      <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Total Amount</span>
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{((newPayment.amount || 0) + electricityShare + (newPayment.lateFee || 0)).toLocaleString()}</span>
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
                    className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    Record Payment
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
                        onChange={(e) => setPaymentToEdit({ ...paymentToEdit, month: e.target.value })}
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
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rent Amount</label>
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

