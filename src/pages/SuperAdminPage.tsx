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
  Clock
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
    userInvites
  } = useApp();
  const { users, register, deleteUser, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'branches' | 'admins' | 'subscriptions'>('branches');
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [isAssigningPlan, setIsAssigningPlan] = useState(false);
  
  const [editingBranch, setEditingBranch] = useState<PGBranch | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<PGBranch | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Branch Form State
  const [branchForm, setBranchForm] = useState({ name: '', branchName: '', address: '', phone: '' });
  
  // Admin Form State
  const [adminForm, setAdminForm] = useState({ name: '', username: '', email: '', branchId: '', password: '123456' });

  // Plan Form State
  const [planForm, setPlanForm] = useState<Omit<SubscriptionPlan, 'id'>>({
    name: '',
    price: 0,
    annualPrice: 0,
    features: ['tenants', 'rooms', 'payments', 'complaints'],
    maxTenants: 20,
    maxRooms: 10,
    razorpayMonthlyPlanId: '',
    razorpayAnnualPlanId: ''
  });

  // Assign Plan Form State
  const [assignForm, setAssignForm] = useState({
    planId: '',
    status: 'active' as 'active' | 'expired' | 'trial',
    endDate: ''
  });

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateBranch(editingBranch.id, branchForm);
    } else {
      addBranch(branchForm);
    }
    setBranchForm({ name: '', branchName: '', address: '', phone: '' });
    setIsAddingBranch(false);
    setEditingBranch(null);
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateSubscriptionPlan(editingPlan.id, planForm);
    } else {
      addSubscriptionPlan(planForm);
    }
    setIsAddingPlan(false);
    setEditingPlan(null);
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
      updateUser(editingAdmin.id, {
        name: adminForm.name,
        username: adminForm.username,
        email: adminForm.email,
        branchId: adminForm.branchId,
        password: adminForm.password
      });
    } else {
      await register({
        name: adminForm.name,
        username: adminForm.username,
        email: adminForm.email,
        role: 'admin',
        branchId: adminForm.branchId
      }, adminForm.password);
    }
    setAdminForm({ name: '', username: '', email: '', branchId: '', password: '123456' });
    setIsAddingAdmin(false);
    setEditingAdmin(null);
  };

  const handleEditBranch = (branch: PGBranch) => {
    setEditingBranch(branch);
    setBranchForm({ 
      name: branch.name, 
      branchName: branch.branchName || '', 
      address: branch.address, 
      phone: branch.phone 
    });
    setIsAddingBranch(true);
  };

  const handleEditAdmin = (admin: User) => {
    setEditingAdmin(admin);
    setAdminForm({ 
      name: admin.name, 
      username: admin.username, 
      email: admin.email, 
      branchId: admin.branchId || '', 
      password: admin.password || '123456' 
    });
    setIsAddingAdmin(true);
  };

  const adminUsers = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Super Admin Panel</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage PG branches and system administrators</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'branches' && (
            <button
              onClick={() => {
                setEditingBranch(null);
                setBranchForm({ name: '', branchName: '', address: '', phone: '' });
                setIsAddingBranch(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Branch
            </button>
          )}
          {activeTab === 'admins' && (
            <button
              onClick={() => {
                setEditingAdmin(null);
                setAdminForm({ name: '', username: '', email: '', branchId: '', password: '123456' });
                setIsAddingAdmin(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Create Admin
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/5">
        <button
          onClick={() => setActiveTab('branches')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'branches' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Branches
          {activeTab === 'branches' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'admins' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Admins
          {activeTab === 'admins' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
        </button>
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            "px-6 py-3 text-sm font-medium transition-colors relative",
            activeTab === 'subscriptions' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Subscriptions
          {activeTab === 'subscriptions' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'branches' && (
          <motion.div
            key="branches"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase())).map((branch) => (
              <div key={branch.id} className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditBranch(branch)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => deleteBranch(branch.id)}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{branch.name}</h3>
                <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-4">{branch.branchName}</p>
                <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {branch.address}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {branch.phone}
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col gap-4">
                  <div className="flex justify-between items-center text-xs text-indigo-400">
                    <span className="text-gray-400">Invite Code</span>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md">
                      <span className="font-mono tracking-wider font-bold">
                        {userInvites?.find(i => i.branchId === branch.id)?.inviteCode || 'N/A'}
                      </span>
                      <button 
                        onClick={() => {
                          const code = userInvites?.find(i => i.branchId === branch.id)?.inviteCode;
                          if (code) {
                            navigator.clipboard.writeText(`${window.location.origin}/signup?invite=${code}`);
                            toast.success('Invite link copied!');
                          }
                        }}
                        className="p-1 hover:bg-white/10 rounded ml-1 transition-colors"
                        title="Copy Invite Link"
                      >
                        <UserPlus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Subscription</span>
                    <button 
                      onClick={() => {
                        setSelectedBranch(branch);
                        setAssignForm({
                          planId: branch.planId || '',
                          status: branch.subscriptionStatus || 'active',
                          endDate: branch.subscriptionEndDate || ''
                        });
                        setIsAssigningPlan(true);
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {subscriptionPlans.find(p => p.id === branch.planId)?.name || 'No Plan'}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Status</span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                      branch.subscriptionStatus === 'active' ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400" :
                      branch.subscriptionStatus === 'trial' ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                      "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                    )}>
                      {branch.subscriptionStatus || 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">ID: {branch.id}</span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {users.filter(u => u.branchId === branch.id).length} Users
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'admins' && (
          <motion.div
            key="admins"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin Name</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {adminUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {admin.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{admin.name}</p>
                            <p className="text-xs text-gray-500">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{admin.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {branches.find(b => b.id === admin.branchId) ? (
                          <>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {branches.find(b => b.id === admin.branchId)?.name}
                            </p>
                            <p className="text-xs">
                              {branches.find(b => b.id === admin.branchId)?.branchName}
                            </p>
                          </>
                        ) : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditAdmin(admin)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteUser(admin.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'subscriptions' && (
          <motion.div
            key="subscriptions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="bg-white dark:bg-[#111111] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm({ ...plan });
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

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">₹{plan.price}</span>
                  <span className="text-sm text-gray-500">/month</span>
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

                <div className="text-xs text-gray-400">
                  Used by {branches.filter(b => b.planId === plan.id).length} branches
                </div>
              </div>
            ))}
          </motion.div>
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
                    {(['tenants', 'rooms', 'payments', 'complaints', 'kyc', 'employees', 'broadcast', 'analytics', 'whatsapp', 'reports', 'multi-branch'] as AppFeature[]).map(feature => (
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
                          "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                          planForm.features.includes(feature)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                            : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500"
                        )}
                      >
                        {feature}
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

      {/* Add/Edit Admin Modal */}
      <AnimatePresence>
        {isAddingAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111111] rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-white/5 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingAdmin ? 'Edit Admin User' : 'Create Admin User'}
              </h3>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={adminForm.name}
                    onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Admin's full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      required
                      type="text"
                      value={adminForm.username}
                      onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Login username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                    <input
                      required
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input
                    required
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Branch</label>
                  <select
                    required
                    value={adminForm.branchId}
                    onChange={(e) => setAdminForm({ ...adminForm, branchId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">Select a branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAdmin(false);
                      setEditingAdmin(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    {editingAdmin ? 'Update Admin' : 'Create Admin'}
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

