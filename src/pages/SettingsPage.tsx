import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserRole, PGConfig } from '../types';
import { CheckCircle2, XCircle, Building2, Upload, Plus, AlertTriangle, Save } from 'lucide-react';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const SettingsPage = () => {
  const { pgConfig, updatePGConfig, currentPlan } = useApp();
  const { user } = useAuth();
  
  const [settingsForm, setSettingsForm] = useState<Partial<PGConfig>>({
    pgName: '',
    logoUrl: '',
    primaryColor: '#4f46e5',
    customRoles: [],
    rolePermissions: [],
    defaultPaymentDueDate: 1,
    defaultLateFeeDay: 5,
    lateFeeAmount: 50
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pgConfig) {
      setSettingsForm({
        pgName: pgConfig.pgName || '',
        logoUrl: pgConfig.logoUrl || '',
        primaryColor: pgConfig.primaryColor || '#4f46e5',
        customRoles: pgConfig.customRoles || [],
        rolePermissions: pgConfig.rolePermissions || [],
        defaultPaymentDueDate: pgConfig.defaultPaymentDueDate || 1,
        defaultLateFeeDay: pgConfig.defaultLateFeeDay || 5,
        lateFeeAmount: pgConfig.lateFeeAmount || 50
      });
    }
  }, [pgConfig]);

  const hasChanges = pgConfig && (
    settingsForm.pgName !== (pgConfig.pgName || '') ||
    settingsForm.logoUrl !== (pgConfig.logoUrl || '') ||
    settingsForm.primaryColor !== (pgConfig.primaryColor || '#4f46e5') ||
    settingsForm.defaultPaymentDueDate !== (pgConfig.defaultPaymentDueDate || 1) ||
    settingsForm.defaultLateFeeDay !== (pgConfig.defaultLateFeeDay || 5) ||
    settingsForm.lateFeeAmount !== (pgConfig.lateFeeAmount || 50)
  );

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await updatePGConfig(settingsForm);
      setIsConfirmModalOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">You do not have permission to access this page.</p>
      </div>
    );
  }

  const baseTabs = [
    { name: 'Dashboard', href: '/', id: 'dashboard' },
    { name: 'Tenants', href: '/tenants', id: 'tenants' },
    { name: 'Rooms', href: '/rooms', id: 'rooms' },
    { name: 'Payments', href: '/payments', id: 'payments' },
    { name: 'Complaints', href: '/complaints', id: 'complaints' },
    { name: 'KYC Verification', href: '/kyc', id: 'kyc' },
    { name: 'Employees', href: '/employees', id: 'employees' },
    { name: 'Broadcast', href: '/broadcast', id: 'broadcast' },
    { name: 'Profile', href: '/profile', id: 'profile' },
  ];

  const availableTabs = baseTabs.filter(tab => {
    if (['dashboard', 'profile'].includes(tab.id)) return false;
    if (['tenants', 'rooms', 'payments', 'complaints', 'kyc'].includes(tab.id)) return true;
    if (!currentPlan) return true;
    return currentPlan.features.includes(tab.id as any);
  });


  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-[#F8F9FA]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-40 py-4 -mt-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Branch Settings</h2>
          <p className="text-gray-500 dark:text-gray-400">Manage your PG branding, roles, and access</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => {
              setSettingsForm(prev => ({
                ...prev,
                pgName: 'ElitePG',
                logoUrl: '',
                primaryColor: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)'
              }));
            }}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center gap-2"
          >
            Reset Default
          </motion.button>
          
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setIsConfirmModalOpen(true)}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
              style={{ background: settingsForm.primaryColor }}
            >
              <Save className="w-5 h-5" />
              Save All 
            </motion.button>
          )}
        </div>
      </div>

      {/* App Branding Section */}
      <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">App Branding</h3>
          <p className="text-sm text-gray-500">Customize the look and feel of your PG's application</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">PG Name</label>
              <input
                type="text"
                value={settingsForm.pgName}
                onChange={(e) => setSettingsForm({ ...settingsForm, pgName: e.target.value })}
                placeholder="e.g. Elite Luxury Living"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden flex items-center justify-center">
                  {settingsForm.logoUrl ? (
                    <img src={settingsForm.logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <label className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {settingsForm.logoUrl ? 'Change Logo' : 'Upload Logo (PNG/JPG)'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('Logo file too large! Max 2MB allowed.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSettingsForm({ ...settingsForm, logoUrl: reader.result as string });
                          toast.success('Logo preview updated!');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Primary Brand Color</label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-xl border border-gray-200 dark:border-white/10 shrink-0 shadow-sm"
                  style={{ background: settingsForm.primaryColor }}
                />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={settingsForm.primaryColor?.startsWith('linear') ? '#4f46e5' : settingsForm.primaryColor}
                    onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={settingsForm.primaryColor}
                    onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                    placeholder="HEX, RGB, or linear-gradient"
                    className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500/20 text-gray-900 dark:text-white font-mono text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Supports HEX (#4f46e5), RGB/RGBA, or CSS Gradients (linear-gradient(...)). Copy & paste a value.</p>
            </div>
          </div>
        </div>
      </div>




      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <div className="p-2 bg-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold">Save All Changes?</h4>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to apply these settings? This will update branding, roles, and tab visibility for the entire app.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
                  style={{ background: settingsForm.primaryColor }}
                >
                  {isSaving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
