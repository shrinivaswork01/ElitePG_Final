import React, { useState } from 'react';
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
  Send
} from 'lucide-react';
import { format, parseISO, differenceInDays, getDate, isAfter } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { loadRazorpayScript } from '../utils/razorpay';
import toast from 'react-hot-toast';

export const PaymentsPage = () => {
  const { user } = useAuth();
  const { payments, tenants, rooms, addPayment, updatePayment, deletePayment } = useApp();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [receiptNotes, setReceiptNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const sendWhatsAppReceipt = (payment: Payment, tenant: any) => {
    if (!tenant.phone) {
      toast.error('Phone number is missing for this tenant.');
      return;
    }

    const message = `*Payment Receipt - ElitePG*\n\n` +
      `Hello ${tenant.name},\n` +
      `We have received your payment of *₹${payment.totalAmount.toLocaleString()}* for the month of ${format(parseISO(`${payment.month}-01`), 'MMMM yyyy')}.\n\n` +
      `*Details:*\n` +
      `- Date: ${payment.paymentDate}\n` +
      `- Mode: ${payment.method?.toUpperCase()}\n` +
      (payment.lateFee > 0 ? `- Late Fee: ₹${payment.lateFee}\n` : '') +
      (receiptNotes ? `- Note: ${receiptNotes}\n` : '') +
      `\nThank you for choosing ElitePG!`;

    let cleanPhone = tenant.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateLateFee = (tenantId: string, month: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return 0;

    const dueDate = new Date(`${month}-${tenant.paymentDueDate.toString().padStart(2, '0')}`);
    const today = new Date();

    if (isAfter(today, dueDate)) {
      const daysLate = Math.max(0, differenceInDays(today, dueDate));
      return daysLate * 50; // ₹50 per day late fee
    }
    return 0;
  };

  const isTenant = user?.role === 'tenant';
  const tenantData = isTenant ? tenants.find(t => t.userId === user.id) : null;

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Online' | 'Offline'>('Online');

  const currentMonth = format(new Date(), 'yyyy-MM');
  const hasPaidCurrentMonth = payments.some(p => p.tenantId === tenantData?.id && p.month === currentMonth);

  const upcomingDues = isTenant && tenantData && !hasPaidCurrentMonth ? [{
    month: currentMonth,
    amount: tenantData.rentAmount,
    dueDate: `${currentMonth}-${tenantData.paymentDueDate.toString().padStart(2, '0')}`,
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
          amount: due.amount,
          lateFee: due.lateFee,
          totalAmount,
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
              amount: due.amount,
              lateFee: due.lateFee,
              totalAmount,
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

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.tenantId) {
      // Duplicate validation
      const existingPayment = payments.find(p => p.tenantId === newPayment.tenantId && p.month === newPayment.month);
      if (existingPayment) {
        toast.error(`A payment record already exists for this tenant for ${newPayment.month}.`);
        return;
      }

      addPayment(newPayment as Omit<Payment, 'id'>);
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
    }
  };

  const handleEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentToEdit) {
      updatePayment(paymentToEdit.id, {
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
    }
  };

  const handleGenerateReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    setReceiptNotes('');
    setIsReceiptModalOpen(true);
  };

  const handleDownloadReceipt = (payment: Payment | null = selectedPayment) => {
    if (!payment) return;
    const tenant = tenants.find(t => t.id === payment.tenantId);
    
    const room = rooms.find(r => r.id === tenant?.roomId);
    
    const receiptContent = `
ELITE PG - Payment Receipt
--------------------------
Receipt #: REC-${(payment.id || 'NEW').slice(-6).toUpperCase()}
Date: ${payment.paymentDate}
Month: ${format(parseISO(`${payment.month}-01`), 'MMMM yyyy')}

Billed To:
Name: ${tenant?.name || 'N/A'}
Email: ${tenant?.email || 'N/A'}
Room: ${room?.roomNumber || 'N/A'}

Payment Details:
Monthly Rent: ₹${payment.amount.toLocaleString()}
Late Fee: ₹${payment.lateFee.toLocaleString()}
Total Paid: ₹${payment.totalAmount.toLocaleString()}
Method: ${payment.method}

Note: ${receiptNotes || 'N/A'}

Status: PAYMENT SUCCESSFUL
--------------------------
This is a computer generated receipt.
`;
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Receipt_${(payment.id || 'NEW').slice(-6).toUpperCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredPayments = payments.filter(p => {
    const tenant = tenants.find(t => t.id === p.tenantId);
    const matchesSearch = (tenant?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.month.includes(searchTerm);
    const isOwner = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'caretaker' || tenant?.userId === user?.id;
    return matchesSearch && isOwner;
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Payments</h2>
          <p className="text-gray-500 dark:text-gray-400">
            {isTenant ? 'Manage your rent payments and view history.' : 'Track revenue, invoices, and late fees.'}
          </p>
        </div>
        {!isTenant && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-5 h-5" />
            Record Payment
          </button>
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
                  <Clock className="w-3 h-3" />
                  Due: {upcomingDues[0].dueDate}
                </span>
                {upcomingDues[0].lateFee > 0 && (
                  <span className="px-3 py-1 bg-rose-500/20 text-rose-200 rounded-full text-xs font-bold flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    ₹{upcomingDues[0].lateFee} Late Fee
                  </span>
                )}
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

      <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Late Fee</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {filteredPayments.map((payment) => {
                const tenant = tenants.find(t => t.id === payment.tenantId);
                return (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center font-bold text-xs text-gray-900 dark:text-white">
                          {tenant?.name?.charAt(0) || '?'}
                        </div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{tenant?.name || 'Unknown Tenant'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{format(parseISO(`${payment.month}-01`), 'MMMM yyyy')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">₹{payment.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-rose-600 dark:text-rose-400">₹{payment.lateFee.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">₹{payment.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{payment.paymentDate}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit",
                          payment.status === 'paid' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          {payment.status}
                        </span>
                        <span className="px-2.5 py-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit">
                          {payment.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                        {payment.status === 'pending' && user?.role !== 'tenant' && (
                          <button
                            onClick={() => updatePayment(payment.id, { status: 'paid', transactionId: `OFF${Date.now()}` })}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"
                            title="Mark as Paid"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateReceipt(payment)}
                          className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"
                          title="Generate Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {user?.role !== 'tenant' && (
                          <button
                            onClick={() => {
                              setPaymentToEdit(payment);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400"
                            title="Edit Record"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role !== 'tenant' && (
                          <button
                            onClick={() => {
                              const tenant = tenants.find(t => t.id === payment.tenantId);
                              if (tenant) sendWhatsAppReceipt(payment, tenant);
                            }}
                            className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"
                            title="Send WhatsApp Receipt"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role !== 'tenant' && (
                          <button
                            onClick={() => deletePayment(payment.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-400 dark:text-red-50"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">No payment records found</div>
          )}
        </div>
      </div>

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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadReceipt()}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>
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
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  {user?.role !== 'tenant' && (
                    <button
                      onClick={() => {
                        const tenant = tenants.find(t => t.id === selectedPayment.tenantId);
                        if (tenant) sendWhatsAppReceipt(selectedPayment, tenant);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <Send className="w-5 h-5" />
                      WhatsApp
                    </button>
                  )}
                </div>

                <div className="pt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" />
                    Payment Successful
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-6 italic">This is a computer generated receipt and does not require a physical signature.</p>
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
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Total Amount</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">₹{newPayment.totalAmount?.toLocaleString()}</span>
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
    </div>
  );
};
