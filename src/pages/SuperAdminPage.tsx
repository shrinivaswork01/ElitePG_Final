import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  UserPlus, 
  Trash2, 
  Edit2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LayoutDashboard,
  CreditCard,
  Zap,
  Calendar,
  Check,
  Clock,
  Eye,
  EyeOff,
  Settings2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { PGBranch, UserRole, User, SubscriptionPlan, AppFeature } from '../types';

export const SuperAdminPage = () => {
  const { 
    branches, 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    subscriptionPlans, 
    addSubscriptionPlan, 
    updateSubscriptionPlan, 
    deleteSubscriptionPlan,
    updateBranchSubscription,
    userInvites,
    tenants,
    rooms,
    pgConfigs,
    updatePGConfig,
    payments,
    branchTabPermissions,
    toggleBranchTabPermission
  } = useApp();
  const { users, register, deleteUser, updateUser, user } = useAuth();
  
  const primaryBranch = branches.find(b => b.id === user?.branchId) || branches.find(b => user?.branchIds?.includes(b.id));
  const currentPlan = subscriptionPlans.find(plan => plan.id === primaryBranch?.planId);
  
  const [activeTab, setActiveTab] = useState<'branches' | 'subscriptions' | 'admins'>('branches');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  const [isManagingVisibility, setIsManagingVisibility] = useState(false);
  
  const [editingBranch, setEditingBranch] = useState<PGBranch | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<PGBranch | null>(null);
  const [selectedBranchIdForVisibility, setSelectedBranchIdForVisibility] = useState<string | null>(null);
  
  const [adminBranchFilter, setAdminBranchFilter] = useState('all');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const [searchTerm, setSearchTerm] = useState('');

  // Branch Form State
  const [branchForm, setBranchForm] = useState({ name: '', branchName: '', address: '', phone: '', razorpayKeyId: '' });

  // Admin Form State
  const [adminForm, setAdminForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    branchIds: [] as string[]
  });

  // Plan Form State
  const [planForm, setPlanForm] = useState<Omit<SubscriptionPlan, 'id'>>({
    name: '',
    price: 0,
    annualPrice: 0,
    features: ['tenants', 'rooms', 'payments', 'complaints'],
    maxTenants: 20,
    maxRooms: 10,
    maxBranches: 1,
    razorpayMonthlyPlanId: '',
    razorpayAnnualPlanId: ''
  });

  // Assign Plan Form State
  const [assignForm, setAssignForm] = useState({
    planId: '',
    status: 'active' as 'active' | 'expired' | 'trial',
    endDate: ''
  });

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role === 'admin' || user?.role === 'partner') {
      const allowedCount = currentPlan?.maxBranches || 1;
      const userOwnedBranches = branches.filter((b) => user.branchIds?.includes(b.id)) || [];
      if (!editingBranch && userOwnedBranches.length >= allowedCount) {
        toast.error(`You have reached your limit of ${allowedCount} branches.`);
        return;
      }
    }

    if (editingBranch) {
      await updateBranch(editingBranch.id, branchForm);
      if (branchForm.razorpayKeyId !== undefined) {
        await updatePGConfig({ razorpayKeyId: branchForm.razorpayKeyId }, editingBranch.id);
      }
    } else {
      const newId = await addBranch(branchForm);
      if (newId && branchForm.razorpayKeyId) {
        await updatePGConfig({ razorpayKeyId: branchForm.razorpayKeyId }, newId as string);
      }
      
      // If admin or partner, auto-assign this new branch to their branchIds
      if (newId && (user?.role === 'admin' || user?.role === 'partner') && user.id) {
         const updatedBranchIds = [...(user.branchIds || []), newId as string];
         await updateUser(user.id, { branchIds: updatedBranchIds });
      }
    }
    setBranchForm({ name: '', branchName: '', address: '', phone: '', razorpayKeyId: '' });
    setIsAddingBranch(false);
    setEditingBranch(null);
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    let success = false;
    
    // Explicitly exclude 'id' from planForm to avoid conflicts during update
    const { id, ...planData } = planForm as any;

    if (editingPlan) {
      success = await updateSubscriptionPlan(editingPlan.id, planData);
    } else {
      success = await addSubscriptionPlan(planData);
    }

    if (success) {
      setIsAddingPlan(false);
      setEditingPlan(null);
    }
  };

  const handleAssignPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBranch) {
      updateBranchSubscription(selectedBranch.id, assignForm.planId, assignForm.status, assignForm.endDate);
    }
    setIsAssigningPlan(false);
    setSelectedBranch(null);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAdmin) {
      await updateUser(editingAdmin.id, {
        name: adminForm.name,
        username: adminForm.username,
        email: adminForm.email,
        phone: adminForm.phone,
        branchIds: adminForm.branchIds,
        // Ensure role stays admin
        role: 'admin'
      });
      toast.success('Admin updated successfully');
    } else {
      const result = await register({
        name: adminForm.name,
        username: adminForm.username,
        email: adminForm.email,
        role: 'admin',
        phone: adminForm.phone,
        branchIds: adminForm.branchIds,
        requiresPasswordChange: true
      });
      
      if (result.success) {
        toast.success('Admin created successfully');
      } else {
        toast.error(result.message || 'Failed to create admin');
        return;
      }
    }
    
    setIsAddingAdmin(false);
    setEditingAdmin(null);
    setAdminForm({ name: '', username: '', email: '', phone: '', branchIds: [] });
  };

  const handleEditBranch = (branch: PGBranch) => {
    setEditingBranch(branch);
    const existingConfig = pgConfigs?.find(c => c.branchId === branch.id);
    setBranchForm({ 
      name: branch.name, 
      branchName: branch.branchName || '', 
      address: branch.address, 
      phone: branch.phone,
      razorpayKeyId: existingConfig?.razorpayKeyId || ''
    });
    setIsAddingBranch(true);
  };

  const getRevenuePerPlan = (planId: string) => {
    const branchIds = branches.filter(b => b.planId === planId).map(b => b.id);
    return (payments || [])
      .filter(p => p.status === 'paid' && branchIds.includes(p.branchId))
      .reduce((sum, p) => sum + p.totalAmount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {user?.role === 'super' ? 'Super Admin Panel' : 'Manage My Branches'}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            {user?.role === 'super' ? 'Manage PG branches and system administrators' : 'Add and manage your PG properties'}
          </p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'super' && (
            <>
              <button
                onClick={() => setActiveTab('branches')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'branches' ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                PG Branches
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'subscriptions' ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                  activeTab === 'admins' ? "bg-indigo-600 text-white shadow-sm" : "bg-white dark:bg-[#111111] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                System Admins
              </button>
            </>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-[#111111] p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-3">
          {activeTab === 'branches' && (
            <button
              onClick={() => {
                setEditingBranch(null);
                setBranchForm({ name: '', branchName: '', address: '', phone: '', razorpayKeyId: '' });
                setIsAddingBranch(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Building2 className="w-4 h-4" />
              New Branch
            </button>
          )}
          {activeTab === 'subscriptions' && (
            <button
              onClick={() => {
                setEditingPlan(null);
                setPlanForm({
                  name: '',
                  price: 0,
                  features: ['tenants', 'rooms', 'payments', 'complaints'],
                  maxTenants: 20,
                  maxRooms: 10,
                  maxBranches: 1,
                  annualPrice: 0,
                  razorpayMonthlyPlanId: '',
                  razorpayAnnualPlanId: ''
                });
                setIsAddingPlan(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </button>
          )}
          {activeTab === 'admins' && (
            <button
              onClick={() => {
                setEditingAdmin(null);
                setAdminForm({ name: '', username: '', email: '', phone: '', branchIds: [] });
                setIsAddingAdmin(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              New Admin
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'branches' && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {(user?.role === 'super' ? branches : (branches.filter(b => user?.branchIds?.includes(b.id)))).map((branch) => (
              <div key={branch.id} className="bg-white dark:bg-[#111111] rounded-[24px] border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button onClick={() => handleEditBranch(branch)} className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur block rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm hover:scale-110 transition-transform">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {user?.role === 'super' && (
                    <button onClick={() => deleteBranch(branch.id)} className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur block rounded-xl text-red-600 shadow-sm hover:scale-110 transition-transform">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="p-6 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100 dark:border-indigo-500/20">
                      {branch.branchName?.charAt(0) || branch.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{branch.name}</h3>
                      <p className="text-xs font-bold text-gray-500">{branch.branchName || 'Main Branch'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="w-4 h-4" /> <span className="truncate">{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="w-4 h-4" /> <span>{branch.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-[#0a0a0a] space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Plan</span>
                    {user?.role === 'super' ? (
                      <button
                        onClick={() => {
                          setSelectedBranch(branch);
                          setAssignForm({
                            planId: branch.planId || '',
                            status: branch.subscriptionStatus || 'trial',
                            endDate: branch.subscriptionEndDate || ''
                          });
                          setIsAssigningPlan(true);
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {subscriptionPlans.find(p => p.id === branch.planId)?.name || 'Assign Plan'}
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {subscriptionPlans.find(p => p.id === branch.planId)?.name || 'No Plan'}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      branch.subscriptionStatus === 'active' ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                      branch.subscriptionStatus === 'trial' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    )}>
                      {branch.subscriptionStatus || 'Inactive'}
                    </span>
                  </div>
                  {user?.role === 'super' && (
                    <button
                      onClick={() => {
                        setSelectedBranchIdForVisibility(branch.id);
                        setIsManagingVisibility(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 transition-all group"
                    >
                      <Settings2 className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                      Tab Visibility
                    </button>
                  )}
                  {user?.role === 'super' && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">ID: {branch.id}</span>
                      <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {users.filter(u => u.branchId === branch.id).length} Users
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'subscriptions' && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Global Subscription Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
               <div className="relative z-10">
                 <h3 className="text-2xl font-black uppercase tracking-tight mb-1">Global Subscription Analytics</h3>
                 <p className="text-indigo-100 text-sm font-medium">Monitoring revenue streams and renewal cycles across all branches</p>
               </div>
               <div className="flex items-center bg-white/10 p-1.5 rounded-2xl border border-white/10 relative z-10">
                  <button 
                    onClick={() => setBillingInterval('monthly')}
                    className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", billingInterval === 'monthly' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/5")}
                  >Monthly</button>
                  <button 
                    onClick={() => setBillingInterval('yearly')}
                    className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", billingInterval === 'yearly' ? "bg-white text-indigo-600 shadow-lg" : "text-white hover:bg-white/5")}
                  >Yearly</button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      const { id, ...planData } = plan;
                      setEditingPlan(plan);
                      setPlanForm(planData);
                      setIsAddingPlan(true);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteSubscriptionPlan(plan.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                  <Zap className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
                    ₹{billingInterval === 'monthly' ? plan.price : plan.annualPrice}
                  </span>
                  <span className="text-sm font-bold text-gray-400">/{billingInterval === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{plan.annualPrice}</span>
                  <span className="text-xs text-gray-500">/year</span>
                  {plan.annualPrice > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                      {Math.round((1 - (plan.annualPrice / (plan.price * 12))) * 100)}% off
                    </span>
                  )}
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.maxTenants >= 9999 ? 'Unlimited' : `Up to ${plan.maxTenants}`} Tenants
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.maxRooms >= 9999 ? 'Unlimited' : `Up to ${plan.maxRooms}`} Rooms
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.maxBranches >= 9999 ? 'Unlimited' : `Up to ${plan.maxBranches}`} Branches
                  </div>
                  <div className="pt-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Features Included</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map(f => (
                        <span key={f} className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-white/5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Branches</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">{branches.filter(b => b.planId === plan.id).length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">₹{getRevenuePerPlan(plan.id).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div
            key="admins"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {users
              .filter(u => u.role === 'admin' && (
                u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.username.toLowerCase().includes(searchTerm.toLowerCase())
              ))
              .map((admin) => (
                <div key={admin.id} className="bg-white dark:bg-[#111111] rounded-[24px] border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-xl transition-all group relative">
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={() => {
                        setEditingAdmin(admin);
                        setAdminForm({
                          name: admin.name,
                          username: admin.username,
                          email: admin.email,
                          phone: admin.phone || '',
                          branchIds: admin.branchIds || []
                        });
                        setIsAddingAdmin(true);
                      }} 
                      className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm hover:scale-110 transition-transform"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete admin ${admin.name}?`)) {
                          deleteUser(admin.id);
                          toast.success('Admin deleted successfully');
                        }
                      }} 
                      className="p-2 bg-white/90 dark:bg-black/50 backdrop-blur rounded-xl text-red-600 shadow-sm hover:scale-110 transition-transform"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-inner border border-indigo-100 dark:border-indigo-500/20 uppercase">
                        {admin.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{admin.name}</h3>
                        <p className="text-xs font-medium text-gray-500">@{admin.username}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                         <Search className="w-3 h-3" /> {admin.email}
                       </p>
                       {admin.phone && (
                         <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                           <Phone className="w-3 h-3" /> {admin.phone}
                         </p>
                       )}
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-2 bg-gray-50 dark:bg-[#0a0a0a]">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Branch Assignments</p>
                     <div className="flex flex-wrap gap-1.5">
                        {admin.branchIds && admin.branchIds.length > 0 ? (
                          admin.branchIds.map(bid => {
                            const b = branches.find(branch => branch.id === bid);
                            return (
                              <span key={bid} className="px-2 py-0.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                {b?.branchName || b?.name || bid}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No branches assigned</span>
                        )}
                     </div>
                  </div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Admin Modal */}
      <AnimatePresence>
        {isAddingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
             <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-[32px] p-8 w-full max-w-xl border border-gray-200 dark:border-white/5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                {editingAdmin ? 'Edit System Admin' : 'Create System Admin'}
              </h3>
              <form onSubmit={handleAddAdmin} className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input
                        required
                        type="text"
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Username</label>
                      <input
                        required
                        type="text"
                        value={adminForm.username}
                        onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="e.g. johndoe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        required
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        value={adminForm.phone}
                        onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="10-digit mobile"
                        maxLength={10}
                      />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Assigned Branches</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                       {branches.map(branch => (
                         <button
                           key={branch.id}
                           type="button"
                           onClick={() => {
                             const branchIds = adminForm.branchIds.includes(branch.id)
                               ? adminForm.branchIds.filter(id => id !== branch.id)
                               : [...adminForm.branchIds, branch.id];
                             setAdminForm({ ...adminForm, branchIds });
                           }}
                           className={cn(
                             "flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all",
                             adminForm.branchIds.includes(branch.id)
                               ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                               : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500"
                           )}
                         >
                           <div className={cn(
                             "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                             adminForm.branchIds.includes(branch.id) ? "bg-indigo-600 border-indigo-600" : "bg-white dark:bg-white/5 border-gray-300 dark:border-white/20"
                           )}>
                             {adminForm.branchIds.includes(branch.id) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <div className="min-w-0">
                             <p className="text-sm font-bold truncate">{branch.name}</p>
                             <p className="text-[10px] opacity-70 truncate">{branch.branchName || 'Main'}</p>
                           </div>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingAdmin(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {editingAdmin ? 'Update Admin' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Plan Modal */}
      <AnimatePresence>
        {isAddingPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-[32px] p-8 w-full max-w-2xl border border-gray-200 dark:border-white/5 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h3>
              <form onSubmit={handleAddPlan} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Plan Name</label>
                    <input
                      required
                      type="text"
                      value={planForm.name}
                      onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Professional"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Monthly Price (₹)</label>
                    <input
                      required
                      type="number"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. 499"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Annual Price (₹) <span className="text-indigo-400 normal-case font-normal">(total billed yearly)</span></label>
                    <input
                      type="number"
                      value={planForm.annualPrice}
                      onChange={(e) => setPlanForm({ ...planForm, annualPrice: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. 4999"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Max Tenants</label>
                    <input
                      required
                      type="number"
                      value={planForm.maxTenants}
                      onChange={(e) => setPlanForm({ ...planForm, maxTenants: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Max Rooms</label>
                    <input
                      required
                      type="number"
                      value={planForm.maxRooms}
                      onChange={(e) => setPlanForm({ ...planForm, maxRooms: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Max Branches</label>
                    <input
                      required
                      type="number"
                      value={planForm.maxBranches}
                      onChange={(e) => setPlanForm({ ...planForm, maxBranches: Number(e.target.value) })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Razorpay Monthly Plan ID</label>
                    <input
                      type="text"
                      value={planForm.razorpayMonthlyPlanId || ''}
                      onChange={(e) => setPlanForm({ ...planForm, razorpayMonthlyPlanId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="plan_XXXXXXXXX (monthly)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Razorpay Annual Plan ID</label>
                    <input
                      type="text"
                      value={planForm.razorpayAnnualPlanId || ''}
                      onChange={(e) => setPlanForm({ ...planForm, razorpayAnnualPlanId: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="plan_XXXXXXXXX (annual)"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Features Access</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(['tenants', 'rooms', 'payments', 'complaints', 'kyc', 'employees', 'broadcast', 'analytics', 'whatsapp', 'reports', 'multi-branch', 'expenses', 'tasks'] as AppFeature[]).map(feature => (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => {
                          const features = planForm.features.includes(feature)
                            ? planForm.features.filter(f => f !== feature)
                            : [...planForm.features, feature];
                          setPlanForm({ ...planForm, features });
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.05em] transition-all border",
                          planForm.features.includes(feature)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-400 hover:border-indigo-500/30"
                        )}
                      >
                        {feature.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingPlan(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Plan Modal */}
      <AnimatePresence>
        {isAssigningPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-[32px] p-8 w-full max-w-md border border-gray-200 dark:border-white/5 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Manage Subscription</h3>
              <p className="text-sm text-gray-500 mb-8">Assign plan to {selectedBranch?.name}</p>
              
              <form onSubmit={handleAssignPlan} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Select Plan</label>
                  <select
                    required
                    value={assignForm.planId}
                    onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Choose a plan</option>
                    {subscriptionPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['active', 'trial', 'expired'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setAssignForm({ ...assignForm, status })}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                          assignForm.status === status
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Expiry Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      required
                      type="date"
                      value={assignForm.endDate}
                      onChange={(e) => setAssignForm({ ...assignForm, endDate: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAssigningPlan(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Branch Modal */}
      <AnimatePresence>
        {isAddingBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-white/5 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingBranch ? 'Edit PG Branch' : 'Add New PG Branch'}
              </h3>
              <form onSubmit={handleAddBranch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PG Name</label>
                  <input
                    required
                    type="text"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Elite PG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PG Branch</label>
                  <input
                    required
                    type="text"
                    value={branchForm.branchName}
                    onChange={(e) => setBranchForm({ ...branchForm, branchName: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. HSR Layout"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PG Address</label>
                  <textarea
                    required
                    value={branchForm.address}
                    onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Full address of the branch"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact</label>
                  <input
                    required
                    type="tel"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    title="Please enter a valid 10-digit mobile number"
                    value={branchForm.phone}
                    onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Contact number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razorpay Key ID <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={branchForm.razorpayKeyId}
                    onChange={(e) => setBranchForm({ ...branchForm, razorpayKeyId: e.target.value.trim() })}
                    className="w-full px-4 py-2 bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    placeholder="e.g. rzp_live_xxxxx"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Routes tenant payments directly to this branch's gateway account.</p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBranch(false);
                      setEditingBranch(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {editingBranch ? 'Update Branch' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Visibility Modal */}
      <AnimatePresence>
        {isManagingVisibility && selectedBranchIdForVisibility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {(() => {
              const liveBranch = branches.find(b => b.id === selectedBranchIdForVisibility);
              if (!liveBranch) return null;

              const plan = subscriptionPlans.find(p => p.id === liveBranch.planId);
              const planFeatures = plan?.features || [];
              // Merge plan features with core features so super admin can toggle everything
              const coreFeatures = ['tenants', 'rooms', 'payments', 'complaints'];
              const features = [...new Set([...coreFeatures, ...planFeatures])];
              
              const featureLabels: Record<string, string> = {
                tenants: 'Tenants Management',
                rooms: 'Rooms & Occupancy',
                payments: 'Rent & Payments',
                complaints: 'Complaint Desk',
                kyc: 'Digital KYC',
                employees: 'Staff Management',
                broadcast: 'Announcements',
                analytics: 'Platform Analytics',
                whatsapp: 'WhatsApp Automation',
                reports: 'Financial Reports',
                'multi-branch': 'Multi-Branch Support',
                expenses: 'Expense Tracker',
                tasks: 'Task Management'
              };

              return (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-[#111111] rounded-[32px] p-8 w-full max-w-2xl border border-gray-200 dark:border-white/5 shadow-2xl"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Branch Tab Visibility</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Control which modules are accessible for <span className="font-bold text-indigo-600 dark:text-indigo-400">{liveBranch.name}</span>
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsManagingVisibility(false);
                        setSelectedBranchIdForVisibility(null);
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 mb-6">
                       <div className="flex gap-3">
                          <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed font-medium">
                            These controls allow you to <span className="font-bold">restrict</span> access to modules that are included in the branch's subscription (<span className="font-bold">{plan?.name || 'No Plan'}</span>). You cannot enable modules that are not part of their plan.
                          </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {features.map(feature => {
                        const permission = branchTabPermissions.find(p => p.branchId === liveBranch.id && p.moduleName === feature);
                        const isEnabled = permission ? permission.isEnabled : true;

                        return (
                          <div key={feature} className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            isEnabled 
                              ? "bg-white dark:bg-white/5 border-gray-100 dark:border-white/10" 
                              : "bg-gray-50/50 dark:bg-black/20 border-gray-200 dark:border-white/5 opacity-70"
                          )}>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{featureLabels[feature] || feature}</p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">{feature}</p>
                            </div>
                            
                            <button
                              onClick={() => toggleBranchTabPermission(liveBranch.id, feature as AppFeature, !isEnabled)}
                              className={cn(
                                "relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer",
                                isEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-white/10"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm",
                                isEnabled ? "left-7" : "left-1"
                              )} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                     <button
                       onClick={() => {
                         setIsManagingVisibility(false);
                         setSelectedBranchIdForVisibility(null);
                       }}
                       className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                     >
                       Done
                     </button>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

