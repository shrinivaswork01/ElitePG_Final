import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Home, Phone, Mail, Calendar, CreditCard, Shield, FileCheck, MessageCircle, Edit2, Trash2, Zap } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../utils';

interface TenantDetailPanelProps {
  tenant: any | null;
  onClose: () => void;
  onEdit?: (t: any) => void;
  onDelete?: (t: any) => void;
  onViewAgreement?: (t: any) => void;
  onViewPayments?: (t: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  onAuthorize?: (userId: string) => void;
  electricityShare?: { baseShare: number; acShare: number; total: number; month: string; billUrl?: string } | null;
}

const Field = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col gap-0.5", className)}>
    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{value || '—'}</span>
  </div>
);

const kycColor: Record<string, string> = {
  verified: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  unsubmitted: 'bg-gray-100 dark:bg-white/5 text-gray-500',
  rejected: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
};
const statusColor: Record<string, string> = {
  active: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600',
  vacating: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600',
  vacated: 'bg-gray-100 dark:bg-white/5 text-gray-500',
  blacklisted: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600',
};

export const TenantDetailPanel: React.FC<TenantDetailPanelProps> = ({
  tenant, onClose, onEdit, onDelete, onViewAgreement, onViewPayments, canEdit, canDelete, onAuthorize, electricityShare
}) => {
  return (
    <AnimatePresence>
      {tenant && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-[#0f0f0f] shadow-2xl flex flex-col overflow-hidden border-l border-gray-100 dark:border-white/5"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20 uppercase">
                  {tenant.name?.charAt(0) || '?'}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{tenant.name}</h3>
                  <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', statusColor[tenant.status] || statusColor.vacated)}>
                    {tenant.status}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Contact */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Contact Info</p>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 break-all">{tenant.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{tenant.phone || '—'}</span>
                </div>
              </div>

              {/* Room & Rent */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <p className="col-span-2 text-xs font-black uppercase tracking-widest text-gray-400">Room & Rent</p>
                <Field label="Room" value={tenant.rooms?.room_number ? `Room ${tenant.rooms.room_number}` : (tenant.room_number ? `Room ${tenant.room_number}` : '—')} />
                <Field label="Bed" value={tenant.bed_number ? `Bed ${tenant.bed_number}` : '—'} />
                <Field label="Rent" value={tenant.rent_amount ? `₹${Number(tenant.rent_amount).toLocaleString()}/mo` : '—'} />
                <Field label="Due Date" value={tenant.payment_due_date ? `${tenant.payment_due_date}th` : '—'} />
                <Field label="Deposit" value={tenant.deposit_amount ? `₹${Number(tenant.deposit_amount).toLocaleString()}` : '—'} />
                <Field label="Joining" value={tenant.joining_date ? format(parseISO(tenant.joining_date), 'dd MMM yyyy') : '—'} />
              </div>

              {/* KYC */}
              <div className="bg-gray-50 dark:bg-white/3 rounded-2xl p-4 flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">KYC Status</p>
                    <span className={cn('text-xs font-bold uppercase px-2.5 py-1 rounded-full', kycColor[tenant.kyc_status] || kycColor.unsubmitted)}>
                      {tenant.kyc_status || 'Unsubmitted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Login Authorization */}
              {tenant.userId && !tenant.isAuthorized && (
                 <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 space-y-3 border border-amber-100 dark:border-amber-500/20">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                       <Shield className="w-5 h-5" />
                       <span className="text-sm font-bold">Action Required: Login Pending</span>
                    </div>
                    <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                       This tenant has joined but their login is not yet authorized. They cannot access the app until you approve them.
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onAuthorize?.(tenant.userId); }}
                      className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all"
                    >
                      Authorize Login
                    </button>
                 </div>
              )}

              {tenant.userId && tenant.isAuthorized && (
                 <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-4 flex items-center gap-3 border border-emerald-100 dark:border-emerald-500/10">
                    <Shield className="w-5 h-5 text-emerald-500" />
                    <div>
                       <p className="text-[10px] font-black uppercase text-gray-400">Login Access</p>
                       <p className="text-xs font-bold text-emerald-600">Authorized & Active</p>
                    </div>
                 </div>
              )}

              {/* Rent Agreement */}
              {(tenant.rent_agreement_url || tenant.rentAgreementUrl) && (
                <button
                  onClick={() => onViewAgreement?.(tenant)}
                  className="w-full flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                >
                  <FileCheck className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-bold">View Rent Agreement</span>
                </button>
              )}

              {/* Electricity Share */}
              {electricityShare && electricityShare.total > 0 && (
                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 space-y-3 border border-amber-100 dark:border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Electricity ({electricityShare.month})</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-300">₹{electricityShare.total.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Base Share</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">₹{electricityShare.baseShare.toLocaleString()}</span>
                    </div>
                    {electricityShare.acShare > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">AC Share</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">₹{electricityShare.acShare.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  {electricityShare.billUrl && (
                    <button
                      onClick={() => window.open(electricityShare.billUrl, '_blank')}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors"
                    >
                      View Bill
                    </button>
                  )}
                </div>
              )}

              {/* Payment history button */}
              <button
                onClick={() => onViewPayments?.(tenant)}
                className="w-full flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
              >
                <CreditCard className="w-5 h-5 shrink-0" />
                <span className="text-sm font-bold">View Payment History</span>
              </button>
            </div>

            {/* Footer Actions */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/5 flex gap-3 shrink-0">
              {canEdit && onEdit && (
                <button
                  onClick={() => { onClose(); onEdit(tenant); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Tenant
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  onClick={() => { onClose(); onDelete(tenant); }}
                  className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
