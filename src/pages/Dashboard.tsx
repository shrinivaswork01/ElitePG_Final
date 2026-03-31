import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { Link } from 'react-router-dom';
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
  Zap
} from 'lucide-react';
import { WHATSAPP_GROUP_URL } from '../constants';
import { ElectricityBreakdownCard } from '../components/ElectricityBreakdownCard';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { ElectricityShare, Payment } from '../types';
import { PaymentDetailPanel } from '../components/PaymentDetailPanel';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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
    checkFeatureAccess
  } = useApp();
  const { user, markAnnouncementAsRead } = useAuth();
  const [isEditingRules, setIsEditingRules] = React.useState(false);
  const [editedRules, setEditedRules] = React.useState(pgConfig?.rules || []);
  const [myElectricityShare, setMyElectricityShare] = React.useState<ElectricityShare | null>(null);
  const [myElectricityBill, setMyElectricityBill] = React.useState<any>(null);
  const [viewerDoc, setViewerDoc] = React.useState<{ url: string, title: string } | null>(null);
  const [detailPayment, setDetailPayment] = React.useState<any | null>(null);

  const handleSaveRules = () => {
    updatePGConfig({ rules: editedRules });
    setIsEditingRules(false);
  };

  const handleAddRule = () => {
    setEditedRules([...editedRules, ""]);
  };

  const handleRemoveRule = (index: number) => {
    setEditedRules(editedRules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...editedRules];
    newRules[index] = value;
    setEditedRules(newRules);
  };
  const stats = getStats();

  const isSuper = user?.role === 'super';
  const isTenant = user?.role === 'tenant';
  const isEmployee = ['manager', 'caretaker', 'cleaner', 'security', 'receptionist'].includes(user?.role || '');

  const tenantData = isTenant && user ? tenants.find(t => t.userId === user.id) : null;
  const employeeData = isEmployee ? employees.find(e => e.userId === user?.id) : null;

  const tenantRoom = tenantData ? rooms.find(r => r.id === tenantData.roomId) : null;
  const tenantComplaints = isTenant ? complaints.filter(c => c.tenantId === tenantData?.id) : [];
  const tenantPayments = isTenant ? payments.filter(p => p.tenantId === tenantData?.id) : [];

  const employeeTasks = isEmployee ? tasks.filter(t => t.employeeId === employeeData?.id) : [];
  const employeeComplaints = isEmployee ? complaints.filter(c => c.assignedTo === employeeData?.id) : [];
  const employeeSalaries = isEmployee ? salaryPayments.filter(p => p.employeeId === employeeData?.id) : [];

  // Calculate trends for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newTenantsLast30 = (tenants || []).filter(t => new Date(t.joiningDate) > thirtyDaysAgo).length;
  const tenantTrend = (tenants || []).length > 0 ? `+${Math.round((newTenantsLast30 / tenants.length) * 100)}%` : '0%';

  let statCards = [];
  if (isSuper) {
    const authUsers = useAuth().users || [];
    statCards = [
      { label: 'Total Branches', value: branches.length, icon: Building2, color: 'bg-indigo-600', trend: 'Active', link: '/branches' },
      { label: 'Total Admins', value: authUsers.filter(u => u.role === 'admin').length, icon: Users, color: 'bg-blue-500', trend: 'System', link: '/branches' },
      { label: 'Total Revenue', value: `₹${(payments || []).filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}`, icon: TrendingUp, color: 'bg-emerald-500', trend: 'Lifetime', link: '/branches' },
    ];
  } else if (isTenant) {
    statCards = [
      { label: 'My Rent', value: `₹${(tenantData?.rentAmount || 0).toLocaleString()}`, icon: CreditCard, color: 'bg-indigo-500', trend: 'Monthly', link: '/payments' },
      { 
        label: 'Electricity Due', 
        value: `₹${(myElectricityShare?.total || 0).toLocaleString()}`, 
        icon: DollarSign, 
        color: (myElectricityShare?.total || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500', 
        trend: (myElectricityShare?.total || 0) > 0 ? 'Action Needed' : 'Paid', 
        onClick: () => {
          if (myElectricityShare) {
            setDetailPayment({
              id: 'upcoming',
              tenantId: tenantData?.id,
              amount: tenantData?.rentAmount || 0,
              lateFee: 0,
              totalAmount: (tenantData?.rentAmount || 0) + (myElectricityShare?.total || 0),
              month: new Date().toISOString().slice(0, 7),
              status: 'pending',
              method: 'Online',
              electricityAmount: myElectricityShare?.total || 0,
              electricityBillId: myElectricityBill?.id,
              baseShare: myElectricityShare?.baseShare,
              acShare: myElectricityShare?.acShare,
              branchId: user?.branchId || '',
              actualBillUrl: myElectricityBill?.actualBillUrl,
              acBillUrl: myElectricityBill?.acBillUrl,
              tenants: { name: tenantData?.name }
            });
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
  }

  const isAdmin = user?.role === 'admin';
  const isManagerial = ['admin', 'manager', 'caretaker', 'receptionist'].includes(user?.role || '');
  const canSendWhatsApp = checkFeatureAccess('whatsapp');
  const canViewReports = checkFeatureAccess('reports');

  const revenueData = stats.revenueHistory;
  const occupancyData = stats.occupancyByFloor;

  const handleDownloadReport = () => {
    const reportData = [
      ['Label', 'Value'],
      ...statCards.map(s => [s.label, s.value])
    ];
    const csvContent = "data:text/csv;charset=utf-8,"
      + reportData.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ElitePG_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [vacateConfirmModal, setVacateConfirmModal] = React.useState<{ isOpen: boolean, tenantId: string, isVacating: boolean } | null>(null);

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
      updateTenant(vacateConfirmModal.tenantId, { status: vacateConfirmModal.isVacating ? 'active' : 'vacating' });
      setVacateConfirmModal(null);
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

  React.useEffect(() => {
    if (isTenant && tenantData && tenantRoom?.meterGroupId) {
      import('../utils/electricityUtils').then(async ({ fetchElectricityBill, calculateElectricityShares, fetchRoomAcReadings }) => {
        try {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const bill = await fetchElectricityBill(tenantRoom.meterGroupId!, currentMonth);
          if (bill) {
            const flatRooms = rooms.filter(r => r.meterGroupId === tenantRoom.meterGroupId);
            const flatTenants = tenants.filter(t => {
              const r = rooms.find(rm => rm.id === t.roomId);
              return r?.meterGroupId === tenantRoom.meterGroupId && t.status === 'active';
            }).map(t => ({
              id: t.id,
              name: t.name,
              roomId: t.roomId || (t as any).room_id || '',
              is_ac_user: rooms.find(r => r.id === t.roomId)?.type === 'AC' || false,
              isAcUser: rooms.find(r => r.id === t.roomId)?.type === 'AC' || false
            }));

            let acReadings: any[] = [];
            if (bill.totalUnits && bill.totalUnits > 0) {
              acReadings = await fetchRoomAcReadings(tenantRoom.meterGroupId!, currentMonth, rooms);
            }

            const shares = calculateElectricityShares(bill, flatTenants, flatRooms, acReadings);
            const myShare = shares.find(s => s.tenantId === tenantData.id);
            if (myShare) {
              setMyElectricityShare(myShare);
              setMyElectricityBill(bill);
            }
          }
        } catch (err) {
          console.warn('Failed to fetch electricity share:', err);
        }
      }).catch(err => console.warn('Failed to load electricityUtils:', err));
    }
  }, [isTenant, tenantData, tenantRoom, tenants, rooms]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-600/20 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="block"
          >
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
              className="bg-white dark:bg-[#111111] p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all group h-full cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-2xl text-white transition-transform group-hover:scale-110", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold",
                  stat.trend.startsWith('+') || stat.trend === 'Current' || stat.trend === 'Identity' || stat.trend === 'Lifetime' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}>
                  {stat.trend.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {isManagerial && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white dark:bg-[#111111] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Overview</h3>
              <select className="bg-gray-50 dark:bg-white/5 border-none text-sm font-medium rounded-lg px-3 py-1 focus:ring-0 text-gray-900 dark:text-white">
                <option>2024</option>
                <option>2023</option>
              </select>
            </div>
            <div className="h-[250px] sm:h-[300px] w-full">
              {revenueData && revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'var(--tooltip-text, #111)' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke={pgConfig?.primaryColor || '#4F46E5'} strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/10">
                  No Revenue Data Available
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-[#111111] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Occupancy by Floor</h3>
              <Link to="/rooms" className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline">View Details</Link>
            </div>
            <div className="h-[250px] sm:h-[300px] w-full">
              {occupancyData && occupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" className="dark:opacity-10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <Tooltip
                      cursor={{ fill: 'var(--chart-cursor, #F8FAFC)' }}
                      contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'var(--tooltip-text, #111)' }}
                    />
                    <Bar dataKey="occupied" fill={pgConfig?.primaryColor || '#4F46E5'} radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold bg-gray-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-gray-100 dark:border-white/10">
                  No Occupancy Data Available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isSuper && (
        <div className={cn("grid grid-cols-1 gap-6 sm:gap-8", (isTenant || isEmployee) ? "lg:grid-cols-1" : "lg:grid-cols-3")}>
          <div className={cn("bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden", isManagerial && "lg:col-span-2")}>
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEmployee ? 'My Recent Tasks' : isTenant ? 'My Recent Complaints' : 'Recent Complaints'}
              </h3>
              <Link to={isEmployee ? "/tasks" : "/complaints"} className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold hover:underline">View All</Link>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/5">
              {isEmployee ? (
                <>
                  {employeeTasks
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((item: any) => (
                      <div key={item.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600">
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.status} • Due: {item.dueDate}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  }
                  {employeeTasks.length === 0 && (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">No recent tasks</div>
                  )}
                </>
              ) : (isTenant ? tenantComplaints : complaints).slice(0, 5).map((complaint) => (
                <div key={complaint.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      complaint.priority === 'high' ? "bg-red-500" : complaint.priority === 'medium' ? "bg-amber-500" : "bg-blue-500"
                    )} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{complaint.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{complaint.category} • {complaint.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-medium text-gray-400 block">{complaint.createdAt}</span>
                    </div>
                    {canSendWhatsApp && !isTenant && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const tenant = tenants.find(t => t.id === complaint.tenantId);
                          if (tenant) {
                            const message = `*Complaint Update*\n\nHi ${tenant.name}, regarding your complaint: "${complaint.title}". We are looking into it.`;
                            const encodedMessage = encodeURIComponent(message);
                            window.open(`https://wa.me/${tenant.phone}?text=${encodedMessage}`, '_blank');
                          }
                        }}
                        className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                        title="Contact Tenant via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(isEmployee ? employeeTasks : (isTenant ? tenantComplaints : complaints)).length === 0 && (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">No recent items</div>
              )}
            </div>
          </div>

          {isManagerial && (
            <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h3>
              </div>
              <div className="p-3 sm:p-4 grid grid-cols-1 gap-2">
                <Link to="/tenants" state={{ openAddModal: true }} className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group">
                  <div className="p-2 bg-gray-100 dark:bg-white/5 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 rounded-xl transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Add New Tenant</span>
                </Link>
                <Link to="/payments" className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all group">
                  <div className="p-2 bg-gray-100 dark:bg-white/5 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 rounded-xl transition-colors">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Record Payment</span>
                </Link>
                <Link to="/rooms" className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-500/10 text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all group">
                  <div className="p-2 bg-gray-100 dark:bg-white/5 group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20 rounded-xl transition-colors">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Manage Rooms</span>
                </Link>
                {canViewReports && (
                  <Link to="/reports" className="flex items-center gap-3 w-full p-4 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-500/10 text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-all group">
                    <div className="p-2 bg-gray-100 dark:bg-white/5 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 rounded-xl transition-colors">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <span className="font-medium">View Reports</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {isTenant && (
            <div className="lg:col-span-1">
              <ElectricityBreakdownCard
                baseAmount={myElectricityShare?.baseShare || 0}
                acAmount={myElectricityShare?.acShare || 0}
                totalAmount={myElectricityShare?.total || 0}
                costPerUnit={myElectricityShare?.costPerUnit}
                unitsConsumed={myElectricityShare?.unitsConsumed}
                billUrl={myElectricityBill?.actualBillUrl}
                acBillUrl={myElectricityBill?.acBillUrl}
                onViewDoc={(url, title) => setViewerDoc({ url, title })}
              />
            </div>
          )}
          {isTenant && (
            <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
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
                  <div className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-wider">Joining Date</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{tenantData?.joiningDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</p>
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider",
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
                      "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg text-sm",
                      tenantData?.status === 'vacating'
                        ? "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 shadow-none border border-gray-200 dark:border-white/5"
                        : "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-600/20 active:scale-[0.98]"
                    )}
                  >
                    <LogOut className="w-5 h-5" />
                    {tenantData?.status === 'vacating' ? 'Cancel Vacate Request' : 'Request to Vacate'}
                  </button>

                  <div className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-500/5 p-3 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400/80 leading-relaxed">
                      Vacating requires 30 days notice. Your request will be reviewed by the property manager.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isTenant || isEmployee || isAdmin) && pgConfig && (
            <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-indigo-600" />
                  PG Rules & Guidelines
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      if (isEditingRules) handleSaveRules();
                      else setIsEditingRules(true);
                    }}
                    className="text-sm font-bold text-indigo-600 hover:underline"
                  >
                    {isEditingRules ? 'Save Changes' : 'Edit Rules'}
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4">
                {isEditingRules ? (
                  <div className="space-y-3">
                    {editedRules.map((rule, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule}
                          onChange={(e) => handleRuleChange(i, e.target.value)}
                          className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                        />
                        <button onClick={() => handleRemoveRule(i)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg">
                          <LogOut className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                    <button onClick={handleAddRule} className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-all">
                      + Add Rule
                    </button>
                  </div>
                ) : (
                  pgConfig.rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">{rule}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {(isTenant || isEmployee) && (
            <div className="lg:col-span-2 bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
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
                          "p-4 rounded-2xl border transition-all group/item relative",
                          isUnseen
                            ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/20 shadow-sm"
                            : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5"
                        )}
                        onMouseEnter={() => isUnseen && markAnnouncementAsRead(announcement.id)}
                      >
                        {isUnseen && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white dark:border-[#111111] z-10" />
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className={cn("font-bold text-gray-900 dark:text-white", isUnseen && "text-indigo-600 dark:text-indigo-400")}>
                              {announcement.title}
                            </h4>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">{announcement.createdAt}</span>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleBroadcast(announcement)}
                              className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl transition-colors"
                              title="Broadcast via WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{announcement.content}</p>
                      </div>
                    );
                  })}
                {announcements.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">No announcements at the moment.</p>
                )}
              </div>
            </div>
          )}
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

