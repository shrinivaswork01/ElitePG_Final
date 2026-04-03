import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Link } from 'react-router-dom';
import { InviteCodeCard } from '../components/InviteCodeCard';
import {
  Users,
  DoorOpen,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  CalendarDays,
  Megaphone,
  Send,
  ScrollText,
  CheckCircle,
  ClipboardList,
  DollarSign,
  BarChart3,
  Building2,
  MessageCircle,
  Zap,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  Lock,
  Share2,
  Star
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { RevenueChart } from '../components/RevenueChart';
import { FloorOccupancy } from '../components/FloorOccupancy';
import { RulesManager } from '../components/RulesManager';
import { WHATSAPP_GROUP_URL } from '../constants';
import { exportToExcel } from '../utils/exportUtils';
import { ElectricityBreakdownCard } from '../components/ElectricityBreakdownCard';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { ElectricityShare, Payment } from '../types';
import { PaymentDetailPanel } from '../components/PaymentDetailPanel';

export const Dashboard = () => {
  const {
    getStats,
    tenants,
    complaints,
    payments,
    updateTenant,
    announcements,
    rooms,
    pgConfig,
    updatePGConfig,
    employees,
    tasks,
    salaryPayments,
    branches,
    meterGroups,
    checkFeatureAccess,
    fetchData,
    requestVacating,
    completeCheckout,
    userInvites,
    currentBranch
  } = useApp();
  const { user, markAnnouncementAsRead } = useAuth();
  const [viewerDoc, setViewerDoc] = React.useState<{ url: string, title: string } | null>(null);
  const [detailPayment, setDetailPayment] = React.useState<any | null>(null);
  const [showAllRules, setShowAllRules] = React.useState(false);

  const extractBaseColor = (colorStr?: string) => {
    if (!colorStr) return '#4f46e5';
    if (!colorStr.includes('gradient')) return colorStr;
    const match = colorStr.match(/(?:#[a-fA-F0-9]{3,8}|rgba?\([^\)]+\)|hsla?\([^\)]+\))/);
    return match ? match[0] : '#4f46e5';
  };

  const themeColor = extractBaseColor(pgConfig?.primaryColor);
  
  useEffect(() => {
    fetchData();
  }, []);

  const stats = getStats();

  const isSuper = user?.role === 'super';
  const isTenant = user?.role === 'tenant';
  const isEmployee = ['manager', 'caretaker', 'cleaner', 'security', 'receptionist'].includes(user?.role || '');

  const tenantData = isTenant && user ? tenants.find(t => t.userId === user.id) : null;
  const employeeData = isEmployee ? employees.find(e => e.userId === user?.id) : null;

  const tenantRoom = tenantData ? rooms.find(r => r.id === tenantData.roomId) : null;
  const tenantComplaints = isTenant ? complaints.filter(c => c.tenantId === tenantData?.id) : [];
  const tenantPayments = isTenant ? payments.filter(p => p.tenantId === tenantData?.id) : [];
  const electricityPaymentThisMonth = isTenant ? tenantPayments.find(p => p.month === format(new Date(), 'yyyy-MM') && p.paymentType === 'electricity') : null;

  const employeeTasks = isEmployee ? tasks.filter(t => t.employeeId === employeeData?.id) : [];
  const employeeComplaints = isEmployee ? complaints.filter(c => c.assignedTo === employeeData?.id) : [];
  const employeeSalaries = isEmployee ? salaryPayments.filter(p => p.employeeId === employeeData?.id) : [];

  // Calculate trends for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const newTenantsLast30 = (tenants || []).filter(t => new Date(t.joiningDate) > thirtyDaysAgo).length;
  const prevTenantsLast30 = (tenants || []).filter(t => {
    const d = new Date(t.joiningDate);
    return d > ninetyDaysAgo && d <= thirtyDaysAgo;
  }).length;

  const tenantGrowth = prevTenantsLast30 > 0 ? Math.round(((newTenantsLast30 - prevTenantsLast30) / prevTenantsLast30) * 100) : 0;
  const tenantTrend = `${tenantGrowth >= 0 ? '+' : ''}${tenantGrowth}%`;

  // Super Admin Specific Trends
  const branchesThisMonth = branches.filter(b => b.createdAt && new Date(b.createdAt) > thirtyDaysAgo).length;
  const activeSubscriptions = branches.filter(b => b.subscriptionStatus === 'active').length;
  const pendingRenewals = branches.filter(b => {
    if (!b.subscriptionEndDate) return false;
    const daysLeft = Math.ceil((new Date(b.subscriptionEndDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 15;
  }).length;

  let statCards = [];
  if (isSuper) {
    const authUsers = useAuth().users || [];
    statCards = [
      { label: 'Total Branches', value: branches.length, icon: Building2, color: 'bg-indigo-600', trend: `+${branchesThisMonth} this month`, trendIcon: TrendingUp, trendColor: 'emerald', link: '/branches' },
      { label: 'Total Tenants', value: (tenants || []).length, icon: Users, color: 'bg-blue-500', trend: `${tenantTrend} growth`, trendIcon: TrendingUp, trendColor: 'emerald', link: '/tenants' },
      { label: 'Total Revenue', value: `₹${(payments || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500', trend: 'Lifetime', trendIcon: Star, trendColor: 'emerald', link: '/branches' },
      { label: 'Active Subscriptions', value: activeSubscriptions, icon: CreditCard, color: 'bg-violet-600', trend: 'Paying', trendIcon: CheckCircle, trendColor: 'emerald', link: '/branches' },
      { label: 'Pending Renewals', value: pendingRenewals, icon: Clock, color: 'bg-amber-500', trend: 'Next 15 Days', trendIcon: CalendarDays, trendColor: 'amber', link: '/branches' },
      { label: 'System Health', value: '100%', icon: ShieldCheck, color: 'bg-emerald-600', trend: 'Operational', trendIcon: CheckCircle, trendColor: 'emerald', link: '/branches' },
    ];
  } else if (isTenant) {
    const pendingElec = tenantPayments.filter(p => p.paymentType === 'electricity' && p.status === 'pending');
    const totalElecDue = pendingElec.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const earliestElecDue = pendingElec.length > 0 ? pendingElec[0] : null;

    statCards = [
      { label: 'My Rent', value: `₹${(tenantData?.rentAmount || 0).toLocaleString()}`, icon: CreditCard, color: 'bg-indigo-500', trend: 'Monthly', link: '/payments' },
      { 
        label: 'Electricity Due', 
        value: `₹${totalElecDue.toLocaleString()}`, 
        icon: DollarSign, 
        color: totalElecDue > 0 ? 'bg-amber-500' : 'bg-emerald-500', 
        trend: totalElecDue > 0 ? 'Action Needed' : 'Paid', 
        onClick: () => {
          if (earliestElecDue) {
            setDetailPayment(earliestElecDue);
          }
        }
      },
      { label: 'My Complaints', value: tenantComplaints.filter(c => c.status !== 'resolved').length, icon: AlertCircle, color: 'bg-rose-500', trend: 'Active', link: '/complaints' },
      { label: 'Total Paid', value: `₹${(tenantPayments || []).reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-violet-500', trend: 'Lifetime', link: '/payments' },
    ];
  } else if (isEmployee) {
    statCards = [
      { label: 'Pending Tasks', value: employeeTasks.filter(t => t.status === 'pending').length, icon: ClipboardList, color: 'bg-amber-500', trend: 'Action Needed', link: '/tasks' },
      { label: 'KYC Status', value: employeeData?.kycStatus?.toUpperCase() || 'UNKNOWN', icon: ShieldCheck, color: employeeData?.kycStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500', trend: 'Identity', link: '/profile' },
      { label: 'Tasks Completed', value: employeeTasks.filter(t => t.status === 'completed').length, icon: CheckCircle, color: 'bg-emerald-500', trend: 'Lifetime', link: '/tasks' },
      { label: 'Total Salary Received', value: `₹${employeeSalaries.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`, icon: DollarSign, color: 'bg-violet-500', trend: 'Earnings', link: '/employees' },
    ];
  } else {
    statCards = [
      { label: 'Total Tenants', value: stats.totalTenants, icon: Users, color: 'bg-blue-500', trend: tenantTrend, link: '/tenants' },
      { label: 'Pending Tasks', value: stats.pendingTasks, icon: ClipboardList, color: 'bg-amber-500', trend: 'Action', link: '/tasks' },
      { label: 'Verified Tenants', value: stats.verifiedTenants, icon: ShieldCheck, color: 'bg-emerald-500', trend: 'KYC', link: '/tenants' },
      { label: 'Pending KYC', value: stats.pendingKYC, icon: AlertCircle, color: 'bg-amber-500', trend: 'Action', link: '/kyc' },
      { label: 'Vacant Beds', value: stats.vacantBeds, icon: DoorOpen, color: 'bg-indigo-500', trend: `${stats.vacantBeds} left`, link: '/rooms' },
      { label: 'Monthly Revenue', value: `₹${(stats.monthlyRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-violet-500', trend: 'Current', link: '/payments' },
      { label: 'Open Complaints', value: stats.openComplaints, icon: AlertCircle, color: 'bg-rose-500', trend: 'Active', link: '/complaints' },
    ];

    const branchInvite = userInvites?.find(i => i.branchId === user?.branchId && i.role === 'tenant' && i.status === 'pending');
    if (branchInvite) {
      statCards.push({
        label: 'Quick Invite',
        value: branchInvite.inviteCode,
        icon: Share2,
        color: 'bg-emerald-500',
        trend: 'Active',
        isInviteCard: true
      });
    }
  }

  const isAdmin = user?.role === 'admin';
  const isManagerial = ['admin', 'manager', 'caretaker', 'receptionist'].includes(user?.role || '');
  const canSendWhatsApp = checkFeatureAccess('whatsapp');
  const canViewReports = checkFeatureAccess('reports');

  const revenueData = stats.revenueHistory;
  const occupancyData = stats.occupancyByFlat;

  const handleDownloadReport = async () => {
    try {
      const branch = (branches || []).find(b => b.id === user?.branchId);
      await exportToExcel(tenants, rooms, payments, complaints, meterGroups, branch, stats);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const [vacateConfirmModal, setVacateConfirmModal] = React.useState<{ isOpen: boolean, tenantId: string, isVacating: boolean } | null>(null);
  const [checkoutConfirmModal, setCheckoutConfirmModal] = React.useState<{ isOpen: boolean, tenantId: string, tenantName: string } | null>(null);

  const handleVacateRequest = () => {
    if (tenantData) {
      setVacateConfirmModal({
        isOpen: true,
        tenantId: tenantData.id,
        isVacating: tenantData.status === 'vacating'
      });
    }
  };

  const confirmVacateAction = () => {
    if (vacateConfirmModal) {
      if (vacateConfirmModal.isVacating) {
        // Cancel request: return to active
        updateTenant(vacateConfirmModal.tenantId, { 
          status: 'active', 
          vacatingStatus: 'active',
          vacatingDate: undefined,
          exitDate: undefined
        });
      } else {
        // Start 30-day notice
        requestVacating(vacateConfirmModal.tenantId);
      }
      setVacateConfirmModal(null);
    }
  };

  const confirmCheckoutAction = () => {
    if (checkoutConfirmModal) {
      completeCheckout(checkoutConfirmModal.tenantId);
      setCheckoutConfirmModal(null);
    }
  };

  const handleBroadcast = (announcement: any) => {
    const message = `*${announcement.title}*\n\n${announcement.content}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `${WHATSAPP_GROUP_URL}?text=${encodedMessage}`;

    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendWhatsAppReminder = (tenant: any) => {
    const message = `*Rent Reminder*\n\nHi ${tenant.name}, this is a friendly reminder that your rent of ₹${tenant.rentAmount} is due. Please ignore if already paid.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tenant.phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // Electricity dashboard fetch removed. Payments will automatically sync.

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/20 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white shadow-inner" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                {user?.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {isSuper ? 'System Overview' : (
                <>
                  {isEmployee ? `Staff Dashboard - ${user?.role}` : isTenant ? 'Your resident dashboard' : "Here's what's happening with your property today."}
                  {user?.branchId && (
                    <span className="block text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                      {pgConfig?.pgName || (branches || []).find(b => b.id === user?.branchId)?.name} - {(branches || []).find(b => b.id === user?.branchId)?.branchName}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 shadow-sm">
            Last 30 Days
          </div>
          {isManagerial && (
            <button
              onClick={handleDownloadReport}
              className="px-4 py-2 text-white rounded-xl text-sm font-medium shadow-lg hover:brightness-110 transition-all"
              style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)', boxShadow: `0 10px 15px -3px ${pgConfig?.primaryColor}20` }}
            >
              Download Report
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6",
        isManagerial ? "lg:grid-cols-4" : (isTenant ? "lg:grid-cols-4" : "lg:grid-cols-3")
      )}>
        {statCards.map((stat, index) => {
          const CardContent = (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={(e) => {
                if (stat.onClick) {
                  e.preventDefault();
                  stat.onClick();
                }
              }}
              className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all group h-full cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className={cn("p-4 rounded-2xl text-white shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider",
                  stat.trendColor === 'emerald'
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                    : stat.trendColor === 'amber'
                    ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                    : (stat.trend.startsWith('+') || ['Current', 'Identity', 'Lifetime', 'Active', 'System', 'Paid'].includes(stat.trend))
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" 
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                )}>
                  {stat.trendIcon ? (
                    <stat.trendIcon className="w-3.5 h-3.5" />
                  ) : stat.trend.startsWith('+') ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : stat.trend === 'Paid' || stat.trend === 'Active' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-8 relative z-10">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter transition-all group-hover:translate-x-1">{stat.value}</h3>
              </div>
            </motion.div>
          );
          
          if (stat.isInviteCard) {
            return (
              <InviteCodeCard 
                key={stat.label}
                inviteCode={stat.value as string}
                branchName={currentBranch?.name}
                variant="compact"
              />
            );
          }

          return stat.link ? (
            <Link key={stat.label} to={stat.link} className="block">
              {CardContent}
            </Link>
          ) : (
            <div key={stat.label} className="block">
              {CardContent}
            </div>
          );
        })}
      </div>

      {isManagerial ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col"
        >
          <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/tenants" state={{ openAddModal: true }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 transition-all group">
              <div className="p-3 bg-white dark:bg-white/10 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Add Tenant</span>
            </Link>
            <Link to="/payments" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 border border-emerald-100/50 dark:border-emerald-500/20 transition-all group">
              <div className="p-3 bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Record Rent</span>
            </Link>
            <Link to="/rooms" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-500/5 hover:bg-amber-100 dark:hover:bg-amber-500/10 border border-amber-100/50 dark:border-amber-500/20 transition-all group">
              <div className="p-3 bg-white dark:bg-white/10 text-amber-600 dark:text-amber-400 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all">
                <DoorOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Rooms</span>
            </Link>
            <Link to="/reports" className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-500/5 hover:bg-violet-100 dark:hover:bg-violet-500/10 border border-violet-100/50 dark:border-violet-500/20 transition-all group">
              <div className="p-3 bg-white dark:bg-white/10 text-violet-600 dark:text-violet-400 rounded-xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Reports</span>
            </Link>
          </div>
        </motion.div>
      ) : null}

      {isManagerial && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart 
              data={revenueData} 
              primaryColor={pgConfig?.primaryColor} 
            />
          </div>

          <div className="lg:col-span-1">
            <FloorOccupancy 
              data={stats.occupancyByFlat} 
              primaryColor={pgConfig?.primaryColor} 
            />
          </div>
        </div>
      )}

      {!isSuper && (
        <div className="flex flex-col gap-8">
          {isManagerial && tenants.filter(t => t.vacatingStatus === 'notice_given').length > 0 ? (
            <div className="bg-white dark:bg-[#111111] rounded-3xl border border-rose-100 dark:border-rose-500/10 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-rose-500/5">
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 bg-rose-50/30 dark:bg-rose-500/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-600" />
                  Vacating Tenants (Notice Period)
                </h3>
                <span className="px-3 py-1 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black uppercase tracking-widest rounded-full">
                  Action Required
                </span>
              </div>
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tenants.filter(t => t.vacatingStatus === 'notice_given').map(tenant => {
                  const daysRemaining = Math.max(0, Math.ceil((new Date(tenant.exitDate || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div key={tenant.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between group transition-all hover:bg-rose-50/50 dark:hover:bg-rose-500/5 hover:border-rose-200 dark:hover:border-rose-500/20">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 text-sm font-black shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform">
                          {rooms.find(r => r.id === tenant.roomId)?.roomNumber || 'N/A'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{tenant.name}</p>
                          <p className="text-[10px] font-bold text-rose-500 opacity-80 uppercase tracking-widest mt-0.5">{daysRemaining} days left • {tenant.exitDate}</p>
                        </div>
                      </div>
                      <Link 
                        to="/tenants" 
                        state={{ selectedTenantId: tenant.id }}
                        className="p-2 bg-white dark:bg-white/10 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm transition-all hover:scale-110 active:scale-95"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                      {daysRemaining === 0 && (
                        <button
                          onClick={() => setCheckoutConfirmModal({ isOpen: true, tenantId: tenant.id, tenantName: tenant.name })}
                          className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all hover:scale-110 active:scale-95"
                          title="Confirm Checkout"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8")}>
            <div className={cn("bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-indigo-500/5", (isManagerial || isTenant) && "lg:col-span-2")}>
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
              <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {isEmployee ? 'My Recent Tasks' : isTenant ? 'My Recent Complaints' : 'Recent Complaints'}
              </h3>
              <Link to={isEmployee ? "/tasks" : "/complaints"} className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all border border-indigo-100 dark:border-indigo-500/20">View All</Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {isEmployee ? (
                <>
                  {employeeTasks
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((item: any) => (
                      <Link key={item.id} to="/tasks" className="p-4 sm:p-6 flex items-center justify-between hover:bg-indigo-50/30 dark:hover:bg-white/5 transition-all border-b border-gray-100 last:border-0 dark:border-white/5 group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-white/10 text-indigo-600 shadow-sm border border-gray-100 dark:border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all">
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                              {item.title}
                            </p>
                            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                              {item.status} • Due: {item.dueDate}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </Link>
                    ))
                  }
                  {employeeTasks.length === 0 && (
                    <div className="p-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No recent tasks</div>
                  )}
                </>
              ) : (isTenant ? tenantComplaints : complaints).slice(0, 5).map((complaint) => (
                <Link key={complaint.id} to="/complaints" className="p-4 sm:p-6 flex items-center justify-between hover:bg-indigo-50/30 dark:hover:bg-white/10 transition-all border-b border-gray-100 last:border-0 dark:border-white/5 group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-1.5 h-6 rounded-full",
                      complaint.priority === 'high' ? "bg-red-500" : complaint.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{complaint.title}</p>
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest mt-0.5">{complaint.category} • {complaint.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 block uppercase tracking-tighter">{complaint.createdAt}</span>
                    </div>
                    {canSendWhatsApp && !isTenant && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const tenant = tenants.find(t => t.id === complaint.tenantId);
                          if (tenant) {
                            const message = `*Complaint Update*\n\nHi ${tenant.name}, regarding your complaint: "${complaint.title}". We are looking into it.`;
                            const encodedMessage = encodeURIComponent(message);
                            window.open(`https://wa.me/${tenant.phone}?text=${encodedMessage}`, '_blank');
                          }
                        }}
                        className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm hover:scale-110 active:scale-95"
                        title="Contact Tenant"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                    <div className="p-2 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
              {(isEmployee ? employeeTasks : (isTenant ? tenantComplaints : complaints)).length === 0 && (
                <div className="p-16 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No recent items</div>
              )}
            </div>
          </div>


          {isTenant && electricityPaymentThisMonth ? (
            <div className="lg:col-span-1">
              <ElectricityBreakdownCard
                baseAmount={electricityPaymentThisMonth.baseShare || 0}
                acAmount={electricityPaymentThisMonth.acShare || 0}
                totalAmount={(electricityPaymentThisMonth.baseShare || 0) + (electricityPaymentThisMonth.acShare || 0)}
                costPerUnit={electricityPaymentThisMonth.costPerUnit}
                unitsConsumed={electricityPaymentThisMonth.unitsConsumed}
                billUrl={electricityPaymentThisMonth.actualBillUrl}
                acBillUrl={electricityPaymentThisMonth.acBillUrl}
                onViewDoc={(url, title) => setViewerDoc({ url, title })}
                onPay={() => setDetailPayment(electricityPaymentThisMonth)}
                themeColor={themeColor}
              />
            </div>
          ) : null}
          {isTenant && tenantData ? (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col h-full bg-gradient-to-br from-white to-gray-50/50 dark:from-[#111111] dark:to-white/[0.02]">
                  <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                      <Building2 className="w-5 h-5" style={{ color: themeColor }} />
                      Manage My Stay
                    </h3>
                  </div>
                  <div className="p-6 sm:p-8 space-y-6 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Room No.</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{tenantRoom?.roomNumber || 'N/A'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Bed No.</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{tenantData?.bedNumber || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl" style={{ background: `${themeColor}20`, color: themeColor }}>
                            <CalendarDays className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Joining Date</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{tenantData?.joiningDate}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                          <span className={cn(
                            "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
                            tenantData?.status === 'active'
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          )}>
                            {tenantData?.status}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleVacateRequest}
                        className={cn(
                          "w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black transition-all shadow-xl text-sm relative group overflow-hidden",
                          tenantData?.vacatingStatus === 'notice_given'
                            ? "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 shadow-none border border-gray-200 dark:border-white/5"
                            : "text-white active:scale-[0.98] hover:shadow-2xl hover:-translate-y-0.5"
                        )}
                        style={tenantData?.vacatingStatus !== 'notice_given' ? { 
                          background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)',
                          boxShadow: `0 20px 40px -15px ${themeColor}40`
                        } : {}}
                      >
                         <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                         <LogOut className="w-5 h-5 relative z-10" />
                         <span className="relative z-10">
                           {tenantData?.vacatingStatus === 'notice_given' ? 'Cancel Vacate Request' : 'Request to Vacate'}
                         </span>
                      </button>

                      {tenantData?.vacatingStatus === 'notice_given' && (
                        <div className="flex items-center justify-between p-4 bg-rose-50/50 dark:bg-rose-500/5 rounded-2xl border border-rose-100 dark:border-rose-500/10">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl">
                              <Clock className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-rose-600/60 dark:text-rose-400/60 uppercase tracking-wider">Expected Exit Date</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{tenantData.exitDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Remaining</p>
                            <span className="text-sm font-black text-rose-600">
                              {Math.max(0, Math.ceil((new Date(tenantData.exitDate || '').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                          Vacating requires 30 days notice. Your request will be reviewed by the property manager.
                        </p>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          ) : null}

          {isTenant && tenantData ? (
            <div className="lg:col-span-1">
                {/* PG Rules Section for Tenants */}
                <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden h-full flex flex-col transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                  <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl" style={{ background: `${themeColor}15` }}>
                        <ScrollText className="w-5 h-5" style={{ color: themeColor }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Property Guidelines</h3>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-1">Rules & Regulations</p>
                      </div>
                    </div>
                  </div>
                  <div className={cn("p-6 sm:p-10", !showAllRules && "overflow-hidden")}>
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                      {(pgConfig?.rules || []).slice(0, showAllRules ? undefined : 5).map((rule, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-4 p-5 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100/50 dark:border-white/5 group hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all hover:shadow-lg hover:shadow-indigo-500/5"
                        >
                          <div className="mt-1 shrink-0 p-1.5 bg-emerald-500/10 rounded-lg" style={{ background: `${themeColor}15` }}>
                            <CheckCircle2 
                              className="w-4 h-4" 
                              style={{ color: themeColor }} 
                            />
                          </div>
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 leading-relaxed uppercase tracking-tight">
                            {rule}
                          </span>
                        </motion.div>
                      ))}
                      {(pgConfig?.rules || []).length === 0 && (
                        <div className="col-span-full text-center py-16">
                          <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ScrollText className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                          </div>
                          <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">No specific guidelines found</p>
                        </div>
                      )}
                    </div>
                    
                    {(pgConfig?.rules || []).length > 5 && (
                       <button
                         onClick={() => setShowAllRules(!showAllRules)}
                         className="w-full mt-8 py-3 bg-gray-100 dark:bg-white/5 rounded-xl text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                       >
                         {showAllRules ? 'Show Less' : `View All ${(pgConfig?.rules || []).length} Guidelines`}
                       </button>
                    )}
                  </div>
                </div>
              </div>
          ) : null}


          {(isTenant || isEmployee) ? (
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden h-full">
                <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                    Announcements
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {announcements
                    .filter(a => a.target === 'all' || (isTenant && a.target === tenantData?.status))
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 3)
                    .map(announcement => {
                      const isUnseen = !user?.seenAnnouncements?.includes(announcement.id);
                      return (
                        <div
                          key={announcement.id}
                          className={cn(
                            "p-5 rounded-2xl border transition-all group/item relative",
                            isUnseen
                              ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 shadow-sm"
                              : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5"
                          )}
                          onMouseEnter={() => isUnseen && markAnnouncementAsRead(announcement.id)}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className={cn("font-black text-gray-900 dark:text-white uppercase tracking-tight", isUnseen && "text-indigo-600 dark:text-indigo-400")}>
                                  {announcement.title}
                                </h4>
                                {isUnseen && (
                                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full animate-pulse">
                                    Important
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{announcement.createdAt}</span>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleBroadcast(announcement)}
                                className="p-2 bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:scale-110 transition-all"
                                title="Broadcast via WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium line-clamp-3">{announcement.content}</p>
                        </div>
                      );
                    })}
                  {announcements.length === 0 && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">No announcements at the moment.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    )}
      <AnimatePresence>
        {vacateConfirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVacateConfirmModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {vacateConfirmModal.isVacating ? 'Cancel Vacate Request?' : 'Request to Vacate?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {vacateConfirmModal.isVacating
                  ? "Are you sure you want to cancel your request to vacate? Your status will return to active."
                  : "Are you sure you want to request to vacate? This will notify the manager and start the notice period."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setVacateConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVacateAction}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {checkoutConfirmModal?.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCheckoutConfirmModal(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Final Check-out
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Finalize checkout for <span className="font-bold text-gray-900 dark:text-white">{checkoutConfirmModal.tenantName}</span>? <br/>Bed will be freed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCheckoutConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCheckoutAction}
                  className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all"
                >
                  Finalize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <DocumentViewerModal
        isOpen={!!viewerDoc}
        url={viewerDoc?.url || ''}
        title={viewerDoc?.title || ''}
        onClose={() => setViewerDoc(null)}
      />
      <PaymentDetailPanel
        payment={detailPayment}
        tenantName={detailPayment?.tenants?.name}
        onClose={() => setDetailPayment(null)}
        onViewDoc={(url, title) => setViewerDoc({ url, title })}
      />
    </div>
  );
};

