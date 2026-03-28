import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Phone, Shield, Save, LogOut, Camera, FileText, Upload, CheckCircle, Clock, AlertCircle, X, Zap, Star, Eye, EyeOff, Copy, Share2, MessageSquare, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { cn } from '../utils';
import { AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

export const ProfilePage = () => {
  const { user, updateProfile, logout } = useAuth();
  const { tenants, updateTenant, kycs, employees, updateEmployee, currentPlan, currentBranch, updateBranch, userInvites } = useApp();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    password: user?.password || '',
    signatureUrl: user?.signatureUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Branch invite code for tenant onboarding
  const branchInvite = userInvites?.find(i => i.branchId === user?.branchId && i.role === 'tenant' && i.status === 'pending');

  const isTenant = user?.role === 'tenant';
  const tenantData = isTenant ? tenants.find(t => t.userId === user.id) : null;
  const tenantKYC = tenantData ? kycs.find(k => k.tenantId === tenantData.id) : null;

  const isEmployee = ['manager', 'caretaker', 'cleaner', 'security'].includes(user?.role || '');
  const employeeData = isEmployee ? employees.find(e => e.userId === user?.id) : null;
  const employeeKYC = employeeData ? kycs.find(k => k.employeeId === employeeData.id) : null;

  const currentKYC = isTenant ? tenantKYC : employeeKYC;
  const currentData = isTenant ? tenantData : employeeData;

  const [kycFile, setKycFile] = useState<{ type: string, file?: File, url?: string } | null>(null);
  const [kycType, setKycType] = useState('Aadhar Card');
  const [isKYCModalOpen, setIsKYCModalOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Signature file size exceeds 2MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, signatureUrl: reader.result as string }));
        toast.success('Signature uploaded! Save changes to apply.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKYCUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size exceeds 5MB limit');
        e.target.value = '';
        return;
      }
      setKycFile({
        type: kycType,
        file,
        url: URL.createObjectURL(file)
      });
      toast.success(`Selected ${file.name}`);
      // Clear the input value so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  const handleKYCSubmit = () => {
    if (currentData && kycFile) {
      if (isTenant) {
        updateTenant(currentData.id, {}, { type: kycType, file: kycFile.file, url: kycFile.url });
      } else {
        updateEmployee(currentData.id, {}, { type: kycType, file: kycFile.file, url: kycFile.url });
      }
      toast.success('KYC document submitted for verification!');
      setKycFile(null);
    }
  };

  const handleSetOfficialSignature = async () => {
    if (!formData.signatureUrl) {
      toast.error('Please upload a signature first');
      return;
    }
    if (currentBranch) {
      try {
        await updateBranch(currentBranch.id, { officialSignatureUrl: formData.signatureUrl });
        toast.success('Official branch signature updated!');
      } catch (err) {
        toast.error('Failed to update official signature');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      if (isTenant && currentData) {
        await updateTenant(currentData.id, { name: formData.name, email: formData.email, phone: formData.phone });
      } else if (isEmployee && currentData) {
        await updateEmployee(currentData.id, { name: formData.name, email: formData.email, phone: formData.phone });
      }
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Profile Settings</h2>
        <p className="text-gray-500 dark:text-gray-400">Manage your personal information and account security.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-600/20 overflow-hidden">
                {formData.avatar ? (
                  <img src={formData.avatar} alt={user?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.name?.charAt(0) || '?'
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                <Camera className="w-6 h-6" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-indigo-500" />
                {user?.role} Account
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                placeholder="Your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all shadow-inner"
                placeholder="your.username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                Phone Number
              </label>
              <input
                type="tel"
                pattern="[0-9]{10}"
                maxLength={10}
                title="Please enter a valid 10-digit mobile number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all"
                placeholder="Your phone number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white transition-all shadow-inner pr-12"
                  placeholder="••••••••"
                  required={!user?.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {!isTenant && (
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Official Signature (For Receipts)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                  <div className="w-40 h-20 bg-white dark:bg-black/20 rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/5 overflow-hidden">
                    {formData.signatureUrl ? (
                      <img src={formData.signatureUrl} alt="Signature" className="max-w-full max-h-full object-contain p-2" />
                    ) : (
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center px-4">No Signature Added</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      Upload a transparent PNG signature. This will appear on all generated payment receipts.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-colors">
                        <Upload className="w-3 h-3" />
                        {formData.signatureUrl ? 'Change Signature' : 'Upload Signature'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                      {formData.signatureUrl && (user?.role === 'admin' || user?.role === 'super') && (
                        <button
                          type="button"
                          onClick={handleSetOfficialSignature}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Set as Official
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl font-bold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Logout from Device
            </button>
          </div>
        </form>
      </motion.div>

      {user?.role === 'admin' && currentPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Zap className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Subscription</p>
                  <h3 className="text-xl font-black tracking-tight">{currentPlan.name} Plan</h3>
                </div>
              </div>
              <button
                onClick={() => navigate('/subscription')}
                className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all"
              >
                Upgrade
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl">
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-bold capitalize">{currentBranch?.subscriptionStatus}</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl">
                <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">Renews On</p>
                <p className="text-lg font-bold">{currentBranch?.subscriptionEndDate}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Invite Code Card — for admins/managers to share with new tenants */}
      {['super', 'admin', 'manager', 'receptionist'].includes(user?.role || '') && branchInvite && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm p-6 space-y-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Tenant Invite Code</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Share this with new tenants to let them sign up.</p>
            </div>
          </div>

          {/* Code display */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
            <code className="flex-1 text-2xl font-black tracking-widest text-indigo-600 dark:text-indigo-400 font-mono">
              {branchInvite.inviteCode}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(branchInvite.inviteCode);
                setCopiedInvite(true);
                setTimeout(() => setCopiedInvite(false), 2000);
              }}
              className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-all"
              title="Copy invite code"
            >
              {copiedInvite ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/signup?code=${branchInvite.inviteCode}`;
                navigator.clipboard.writeText(url);
                toast.success('Signup link copied to clipboard!');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Signup Link
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/signup?code=${branchInvite.inviteCode}`;
                const msg = `Hi! Please use this link to sign up for our PG:\n${url}\n\nOr use invite code: *${branchInvite.inviteCode}*`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Share via WhatsApp
            </button>
          </div>
        </motion.div>
      )}

      {(isTenant || isEmployee) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-gray-100 dark:border-white/5">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              KYC Verification
            </h3>
          </div>
          <div className="p-8 space-y-6">
            {currentKYC ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl shadow-sm",
                      currentKYC.status === 'verified' ? "bg-emerald-100 text-emerald-600" :
                        currentKYC.status === 'rejected' ? "bg-rose-100 text-rose-600" :
                          "bg-amber-100 text-amber-600"
                    )}>
                      {currentKYC.status === 'verified' ? <CheckCircle className="w-6 h-6" /> :
                        currentKYC.status === 'rejected' ? <AlertCircle className="w-6 h-6" /> :
                          <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white capitalize text-lg">
                        {currentKYC.status === 'verified' ? 'Identity Verified' :
                          currentKYC.status === 'pending' ? 'Verification Pending' :
                            currentKYC.status === 'rejected' ? 'Verification Rejected' :
                              currentKYC.status}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {currentKYC.status === 'verified' ? `Officially approved on ${currentKYC.verifiedAt || 'recently'}` :
                          currentKYC.status === 'rejected' ? `Reason: ${currentKYC.rejectionReason}` :
                            'Pending for Verification - Admin is reviewing your document.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsKYCModalOpen(true)}
                    className="text-indigo-600 font-bold text-sm hover:underline px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl"
                  >
                    View
                  </button>
                </div>

                {currentKYC.status === 'verified' && (
                  <div className="mt-2 p-4 bg-gray-50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Verified Document Preview</p>
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-white dark:bg-black/20 group/preview">
                      {currentKYC.documentUrl.startsWith('data:application/pdf') || currentKYC.documentUrl.endsWith('.pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <FileText className="w-12 h-12 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">PDF - Click View to See Full Document</span>
                        </div>
                      ) : (
                        <img
                          src={currentKYC.documentUrl}
                          alt="Verified KYC"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => setIsKYCModalOpen(true)}
                          className="p-2 bg-white rounded-full text-indigo-600 shadow-lg hover:scale-110 transition-transform"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentKYC.status === 'rejected' && (
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your previous document was rejected. Please upload a new identity document to continue.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <select
                        value={kycType}
                        onChange={(e) => setKycType(e.target.value)}
                        className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                      >
                        <option value="Aadhar Card">Aadhar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                      <div className="relative">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:border-indigo-500/50 transition-colors cursor-pointer bg-gray-50/50 dark:bg-white/[0.02]">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {kycFile ? 'Document Selected' : 'Upload New KYC'}
                          </span>
                          <input type="file" className="hidden" onChange={handleKYCUpload} accept="image/*,.pdf" />
                        </label>
                      </div>
                    </div>
                    {kycFile && (
                      <button
                        onClick={handleKYCSubmit}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                      >
                        Resubmit KYC
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Please upload a valid identity document (Aadhar Card, PAN Card, etc.) to verify your identity.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={kycType}
                    onChange={(e) => setKycType(e.target.value)}
                    className="px-4 py-3 bg-gray-50 dark:bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
                  >
                    <option value="Aadhar Card">Aadhar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                  <div className="relative">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl hover:border-indigo-500/50 transition-colors cursor-pointer bg-gray-50/50 dark:bg-white/[0.02]">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {kycFile ? 'Document Selected' : 'Click to upload KYC'}
                      </span>
                      <input type="file" className="hidden" onChange={handleKYCUpload} accept="image/*,.pdf" />
                    </label>
                  </div>
                </div>
                {kycFile && (
                  <button
                    onClick={handleKYCSubmit}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                  >
                    Submit KYC for Verification
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="bg-amber-50 dark:bg-amber-500/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-500/20">
        <h4 className="text-amber-800 dark:text-amber-400 font-bold flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5" />
          Security Note
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-400/80 leading-relaxed">
          Please keep your login credentials secure. Changing your password here will immediately update your active login constraints.
        </p>
      </div>

      <AnimatePresence>
        {isKYCModalOpen && currentKYC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsKYCModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/5"
            >
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">KYC Document</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentKYC.documentType}</p>
                </div>
                <button onClick={() => setIsKYCModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-white/5 flex items-center justify-center min-h-[400px]">
                {currentKYC.documentUrl.startsWith('data:application/pdf') || currentKYC.documentUrl.endsWith('.pdf') ? (
                  <object
                    data={currentKYC.documentUrl}
                    type="application/pdf"
                    className="w-full h-full min-h-[600px] rounded-xl shadow-lg bg-white"
                  >
                    <div className="p-8 text-center">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400 mb-4">PDF preview not available.</p>
                      <a href={currentKYC.documentUrl} download className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Download PDF</a>
                    </div>
                  </object>
                ) : (
                  <img
                    src={currentKYC.documentUrl}
                    alt="KYC Document"
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
