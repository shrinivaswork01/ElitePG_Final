import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { 
  TrendingUp, Calendar, ChevronDown, Wallet, Receipt, DollarSign, 
  Users, Lock, CreditCard, ShieldCheck, UserPlus, FileText, 
  CheckCircle, History, Filter, Search, Edit2
} from 'lucide-react';
import { format, subMonths, parseISO, isAfter } from 'date-fns';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { UserRole } from '../types';

export const PartnerPayoutsPage = () => {
  const { user, users, register } = useAuth();
  const { 
    currentBranch, 
    payments, 
    expenses, 
    salaryPayments, 
    rawData, 
    processPartnerPayoutBatch,
    updatePartnerPayoutStatus,
    updatePartnerShareBatch,
    rooms,
    tenants
  } = useApp();

  const [activeTab, setActiveTab] = useState<'payouts' | 'partners' | 'transactions'>('payouts');
  
  // Modal states
  const [isRatioModalOpen, setIsRatioModalOpen] = useState(false);
  const [ratioFormData, setRatioFormData] = useState<{ userId: string; ratio: number }[]>([]);
  const [effectiveFromMonth, setEffectiveFromMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'partner' as UserRole,
  });

  const [payoutMonth, setPayoutMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });

  const branchContextId = currentBranch?.id || null;

  // -- Data Extraction for Active Month --
  const monthRentPayments = payments.filter(p =>
    p.branchId === branchContextId &&
    p.month === payoutMonth &&
    p.status === 'paid' &&
    (['rent', 'token'].includes((p.paymentType || (p as any).payment_type || 'rent').toLowerCase()))
  );
  const monthRentRevenue = monthRentPayments.reduce((sum, p) => sum + (p.totalAmount || (p as any).total_amount || 0), 0);

  const monthExpenseItems = expenses.filter(e => e.branchId === branchContextId && e.month === payoutMonth && e.status !== 'rejected');
  const monthExpenseTotal = monthExpenseItems.reduce((sum, e) => sum + (e.amount || 0), 0);

  const monthSalaryItems = salaryPayments.filter(s => s.branchId === branchContextId && s.month === payoutMonth && s.status === 'paid');
  const monthSalaryTotal = monthSalaryItems.reduce((sum, s) => sum + (s.amount || 0), 0);

  const totalExpenses = monthExpenseTotal + monthSalaryTotal;
  const netProfit = monthRentRevenue - totalExpenses;

  // -- Partner Shares --
  const partnerShares = rawData.partnerShares || [];
  const branchShares = partnerShares
    .filter((s: any) => s.branchId === branchContextId && s.effectiveFrom <= payoutMonth)
    .sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  
  const latestShareMonth = branchShares[0]?.effectiveFrom;
  const activeShares = latestShareMonth ? branchShares.filter((s: any) => s.effectiveFrom === latestShareMonth) : [];
  const totalRatio = activeShares.reduce((sum: number, s: any) => sum + s.ratio, 0);

  // -- Payout Data --
  const rawPayouts = rawData.partnerPayouts || [];
  const monthPayouts = rawPayouts.filter((p: any) => p.month === payoutMonth && p.branchId === branchContextId);

  const isAdmin = user?.role === 'super' || user?.role === 'admin';
  const isPartner = user?.role === 'partner';

  // Resolvers
  const resolvePartnerName = (userId: string) => {
    const u = users.find((u: any) => u.id === userId);
    return u?.name || 'Partner';
  };
  const resolvePartnerEmail = (userId: string) => {
    const u = users.find((u: any) => u.id === userId);
    return u?.email || '';
  };
  
  const branchPartners = users.filter(u => u.role === 'partner' && u.branchIds?.includes(currentBranch?.id));

  // --- Handlers for Ratio & Partner CRUD ---
  const handleOpenRatioModal = () => {
    if (!currentBranch) return;
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const existingBranchShares = partnerShares
      .filter((s: any) => s.branchId === currentBranch.id && s.effectiveFrom <= currentMonthStr)
      .sort((a: any, b: any) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    
    const latestMonthValue = existingBranchShares[0]?.effectiveFrom;
    const latestSharesData = existingBranchShares.filter((s: any) => s.effectiveFrom === latestMonthValue);

    const initialRatios = branchPartners.map(p => {
      const existing = latestSharesData.find((s: any) => s.userId === p.id);
      return { userId: p.id, ratio: existing?.ratio || 0 };
    });

    setRatioFormData(initialRatios);
    setEffectiveFromMonth(format(new Date(), 'yyyy-MM'));
    setIsRatioModalOpen(true);
  };

  const handleSaveRatios = async () => {
    if (!currentBranch) return;
    await updatePartnerShareBatch(currentBranch.id, ratioFormData, effectiveFromMonth);
    setIsRatioModalOpen(false);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.password) {
      toast.error('Password is required for new users');
      return;
    }
    const res = await register({
      name: userFormData.name,
      username: userFormData.username,
      email: userFormData.email,
      role: 'partner',
      branchIds: [currentBranch?.id || ''],
      branchId: currentBranch?.id || '',
      seenAnnouncements: [],
      requiresPasswordChange: true
    }, userFormData.password);

    if (res.success) {
      toast.success(`Partner created successfully`);
    } else {
      toast.error(res.message || 'Registration failed');
    }

    setIsUserModalOpen(false);
    setUserFormData({ name: '', username: '', email: '', password: '', role: 'partner' });
  };

  // --- Rendering Helpers ---

  const renderWorkflowAction = (payoutInfo: any, partnerId: string, shareAmount: number) => {
    const isOwnerOfRow = partnerId === user?.id;

    if (!payoutInfo) {
       // Status: NOT CREATED => Can REQUEST
       if (!isAdmin && !isOwnerOfRow) return <span className="text-sm font-bold text-gray-500">N/A</span>;
       
       return (
         <button
            onClick={() => {
              if (netProfit <= 0 || totalRatio !== 100) return;
              processPartnerPayoutBatch([{
                partnerId,
                month: payoutMonth,
                branchId: currentBranch?.id || null,
                amount: shareAmount,
                status: 'REQUESTED',
                requestedBy: user?.id
              }]);
            }}
            disabled={netProfit <= 0 || totalRatio !== 100}
            className={cn(
              "px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
              netProfit > 0 && totalRatio === 100
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
                : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
            )}
         >
           Request Payout
         </button>
       );
    }

    if (payoutInfo.status === 'REQUESTED') {
       // Status: REQUESTED => Needs PARTNER_APPROVED
       // Any partner or admin can approve, except maybe the one who requested if we want strictness.
       // Let's say Admins + Partners can approve.
       return (
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-2 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded uppercase tracking-wider">Requested</span>
            <button
               onClick={() => updatePartnerPayoutStatus(payoutInfo.id, 'PARTNER_APPROVED', 'partner_approved_by', user?.id || '')}
               className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
            >
               Approve Request
            </button>
         </div>
       );
    }

    if (payoutInfo.status === 'PARTNER_APPROVED') {
       // Status: PARTNER_APPROVED => Needs PAID
       // Only admins can do final pay
       if (!isAdmin) {
          return <span className="text-[10px] font-black px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded uppercase tracking-wider">Partner Approved</span>;
       }

       return (
         <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 rounded uppercase tracking-wider">Partner Approved</span>
            <button
               onClick={() => updatePartnerPayoutStatus(payoutInfo.id, 'PAID', 'admin_approved_by', user?.id || '')}
               className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30"
            >
               Approve & Pay
            </button>
         </div>
       );
    }

    if (payoutInfo.status === 'PAID') {
       return (
         <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
           <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
           <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Paid</span>
         </div>
       );
    }

    return null;
  };

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight font-display">
            <Users className="w-8 h-8 text-indigo-500" />
            Partners & Payouts
          </h2>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">
            {currentBranch?.name || 'Active Branch'} • Manage partners, ratios, and distributions
          </p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('payouts')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === 'payouts' ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
            )}
          >
            Payouts
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === 'partners' ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
            )}
          >
            Partners
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-widest",
              activeTab === 'transactions' ? "bg-white dark:bg-gray-800 text-indigo-600 shadow-sm" : "text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
            )}
          >
            Transactions
          </button>
        </div>
      </div>

      {activeTab === 'partners' && (
         <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
               <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5 text-indigo-500" />
                 Partner Management
               </h3>
               {isAdmin && (
                  <div className="flex gap-2">
                     <button
                        onClick={handleOpenRatioModal}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                     >
                        Edit Ratios
                     </button>
                     <button
                        onClick={() => setIsUserModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                     >
                        <UserPlus className="w-4 h-4" />
                        Add Partner
                     </button>
                  </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {branchPartners.map(partner => (
                  <div key={partner.id} className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-xl border border-indigo-100 dark:border-indigo-500/20">
                           {partner.name.charAt(0)}
                        </div>
                        <div>
                           <h4 className="font-black text-gray-900 dark:text-white text-lg">{partner.name}</h4>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{partner.email}</span>
                        </div>
                     </div>
                     <div className="pt-4 border-t border-gray-50 dark:border-white/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Share</span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-display">
                           {activeShares.find((s: any) => s.userId === partner.id)?.ratio || 0}%
                        </span>
                     </div>
                  </div>
               ))}
               {branchPartners.length === 0 && (
                  <div className="col-span-full py-12 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 text-gray-400 text-sm font-bold">
                     No partners found for this branch.
                  </div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'payouts' && (
         <div className="space-y-8">
            <div className="flex justify-end relative">
               <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
               <select
                 value={payoutMonth}
                 onChange={(e) => setPayoutMonth(e.target.value)}
                 className="pl-12 pr-10 py-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-2xl text-sm font-black text-gray-900 dark:text-white shadow-sm appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/50 min-w-[220px]"
               >
                 {monthOptions.map(m => (
                   <option key={m.value} value={m.value}>{m.label}</option>
                 ))}
               </select>
               <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-white dark:bg-[#0d0d0d] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                     <Wallet className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Rent</span>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white relative z-10">₹{monthRentRevenue.toLocaleString()}</p>
              </div>
              
              <div className="p-6 bg-white dark:bg-[#0d0d0d] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden group hover:border-rose-200 dark:hover:border-rose-500/20 transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 flex items-center justify-center">
                     <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total Expenses</span>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white relative z-10">₹{totalExpenses.toLocaleString()}</p>
              </div>

              <div className={cn(
                "p-6 rounded-3xl border shadow-sm relative overflow-hidden group transition-all",
                netProfit > 0
                  ? "bg-indigo-600 border-indigo-500 hover:shadow-indigo-600/20 shadow-lg"
                  : "bg-white dark:bg-[#0d0d0d] border-gray-100 dark:border-white/5"
              )}>
                {netProfit > 0 && <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500 pointer-events-none" />}
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", netProfit > 0 ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500")}>
                     <DollarSign className="w-5 h-5" />
                  </div>
                  <span className={cn("text-xs font-black uppercase tracking-widest", netProfit > 0 ? "text-indigo-100" : "text-gray-500 dark:text-gray-400")}>Net Profit</span>
                </div>
                <p className={cn("text-3xl font-black relative z-10", netProfit > 0 ? "text-white" : "text-gray-900 dark:text-white")}>₹{netProfit.toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0d0d0d] rounded-3xl border border-gray-100 dark:border-white/5 p-8 shadow-sm">
               <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-4 mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 font-display">
                    <FileText className="w-6 h-6 text-indigo-500" />
                    Payout Workflow
                  </h3>
                  {totalRatio !== 100 && isAdmin && (
                    <span className="text-xs font-black px-4 py-2 bg-rose-50 text-rose-600 rounded-xl">
                      ⚠ Ratios Total: {totalRatio}% (Must equal 100%)
                    </span>
                  )}
               </div>

               {activeShares.length === 0 ? (
                 <div className="py-12 text-center text-gray-500 font-bold border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
                   No partner ratios assigned for this month.
                 </div>
               ) : (
                 <div className="space-y-4">
                   {activeShares
                     .filter((s: any) => users.some(u => u.id === s.userId && u.role === 'partner'))
                     .map((s: any) => {
                       const shareAmount = netProfit > 0 ? Math.round((netProfit * s.ratio) / 100) : 0;
                       const payoutInfo = monthPayouts.find((p: any) => p.partnerId === s.userId);
                       const displayAmount = payoutInfo?.amount || shareAmount;

                       if (isPartner && s.userId !== user?.id) return null;

                       return (
                         <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 dark:bg-white/[0.02] rounded-3xl border border-transparent hover:border-gray-200 dark:hover:border-white/10 transition-all gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#111111] shadow-sm flex items-center justify-center font-black text-indigo-600 text-xl">
                                 {resolvePartnerName(s.userId).charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-base font-black text-gray-900 dark:text-white">{resolvePartnerName(s.userId)}</h4>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase rounded tracking-widest">
                                  {s.ratio}% Share
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 sm:ml-auto">
                               <div className="text-right">
                                 <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Amount</p>
                                 <p className="text-2xl font-black text-gray-900 dark:text-white font-display">₹{displayAmount.toLocaleString()}</p>
                               </div>
                               <div>
                                  {renderWorkflowAction(payoutInfo, s.userId, shareAmount)}
                               </div>
                            </div>
                         </div>
                       );
                   })}
                 </div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'transactions' && (
         <div className="bg-white dark:bg-[#0d0d0d] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 font-display">
                  <History className="w-5 h-5 text-indigo-500" />
                  Transactions Grid
                </h3>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Month</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Partner</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Req By</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Partner Appr</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Admin Appr</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Logged At</th>
                    </tr>
                  </thead>
                  <tbody>
                     {rawPayouts.filter((p: any) => p.branchId === branchContextId).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-sm font-bold text-gray-400">No transactions recorded.</td>
                        </tr>
                     ) : rawPayouts
                       .filter((p: any) => p.branchId === branchContextId)
                       .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                       .map((p: any) => (
                        <tr key={p.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                           <td className="px-6 py-4 text-xs font-bold text-gray-600 dark:text-gray-400">{p.month}</td>
                           <td className="px-6 py-4 text-sm font-black text-gray-900 dark:text-white">{resolvePartnerName(p.partnerId)}</td>
                           <td className="px-6 py-4 text-sm font-black text-emerald-600 dark:text-emerald-400 font-display">₹{p.amount.toLocaleString()}</td>
                           <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 text-[10px] font-black rounded uppercase tracking-wider",
                                p.status === 'PAID' ? "bg-emerald-50 text-emerald-600" :
                                p.status === 'PARTNER_APPROVED' ? "bg-blue-50 text-blue-600" :
                                "bg-amber-50 text-amber-600"
                              )}>
                                {p.status.replace('_', ' ')}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase">{resolvePartnerName(p.requestedBy)}</td>
                           <td className="px-6 py-4 text-[10px] font-bold text-blue-500 uppercase">{p.partnerApprovedBy ? resolvePartnerName(p.partnerApprovedBy) : '-'}</td>
                           <td className="px-6 py-4 text-[10px] font-bold text-emerald-500 uppercase">{p.adminApprovedBy ? resolvePartnerName(p.adminApprovedBy) : '-'}</td>
                           <td className="px-6 py-4 text-[10px] font-bold text-gray-400">{format(new Date(p.createdAt), 'dd MMM, yy')}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
      )}

      {/* Ratios Modal */}
      {isRatioModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111111] rounded-3xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-white/10 shadow-2xl">
               <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Partner Ratios</h3>
                  <button onClick={() => setIsRatioModalOpen(false)} className="p-2 text-gray-400 hover:text-rose-500 transition-colors">
                     <Lock className="w-5 h-5 hover:hidden" />
                     <span className="hidden hover:block">×</span>
                  </button>
               </div>
               <div className="p-6 space-y-6">
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 block">Effective Month</label>
                    <input type="month" value={effectiveFromMonth} onChange={e => setEffectiveFromMonth(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="space-y-4">
                     {ratioFormData.map((item, idx) => (
                        <div key={item.userId} className="flex justify-between items-center gap-4 bg-gray-50 dark:bg-white/[0.02] p-4 rounded-2xl">
                           <span className="font-bold text-gray-900 dark:text-white flex-1">{resolvePartnerName(item.userId)}</span>
                           <div className="flex items-center gap-2">
                              <input 
                                 type="number" 
                                 value={item.ratio} 
                                 onChange={e => {
                                    const newRatios = [...ratioFormData];
                                    newRatios[idx].ratio = parseFloat(e.target.value) || 0;
                                    setRatioFormData(newRatios);
                                 }}
                                 className="w-24 px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl text-right font-black"
                              />
                              <span className="font-black text-gray-400">%</span>
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                     <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest">Total Assigned</span>
                     <span className={cn("font-black text-lg", ratioFormData.reduce((s, i) => s + i.ratio, 0) === 100 ? "text-emerald-600" : "text-rose-600")}>
                        {ratioFormData.reduce((s, i) => s + i.ratio, 0)}%
                     </span>
                  </div>
               </div>
               <div className="p-6 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                  <button onClick={() => setIsRatioModalOpen(false)} className="px-6 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10 uppercase tracking-widest transition-all">Cancel</button>
                  <button onClick={handleSaveRatios} disabled={ratioFormData.reduce((s, i) => s + i.ratio, 0) !== 100} className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 uppercase tracking-widest transition-all">Save Config</button>
               </div>
            </div>
         </div>
      )}

      {/* Add Partner Modal */}
      {isUserModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111111] rounded-3xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-white/10 shadow-2xl">
               <div className="p-6 border-b border-gray-100 dark:border-white/10">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Add Partner</h3>
               </div>
               <form onSubmit={handleUserSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                    <input required type="text" value={userFormData.name} onChange={e => setUserFormData({ ...userFormData, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Username</label>
                    <input required type="text" value={userFormData.username} onChange={e => setUserFormData({ ...userFormData, username: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Email</label>
                    <input required type="email" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Initial Password</label>
                    <input required type="text" value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div className="pt-4 flex justify-end gap-3">
                     <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-6 py-3 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 uppercase transition-all">Cancel</button>
                     <button type="submit" className="px-6 py-3 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 uppercase transition-all shadow-lg">Save Partner</button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
};
