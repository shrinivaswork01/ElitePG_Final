import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { Tenant } from '../types';
import {
  CheckCircle2, MessageCircle, FileCheck, Edit2,
  Trash2, History, Share2, X, AlertCircle, FileText
} from 'lucide-react';
import { cn } from '../utils';

interface TenantMobileListProps {
  tenants: any[];
  onManage: (t: Tenant) => void;
  onEdit: (t: Tenant) => void;
  onPaymentHistory: (t: Tenant) => void;
  onViewAgreement: (t: Tenant) => void;
  onWhatsAppReminder: (t: Tenant) => void;
  onDelete: (t: Tenant) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkWhatsApp: (ids: string[]) => void;
  onShareDetails: (ids: string[]) => void;
}

const TenantMobileCard = memo(({ 
  tenant, 
  isSelected, 
  isSelectionMode, 
  onSelect, 
  onTap 
}: { 
  tenant: any; 
  isSelected: boolean; 
  isSelectionMode: boolean;
  onSelect: (id: string) => void; 
  onTap: (t: Tenant) => void; 
}) => {
  const handleLongPress = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    onSelect(tenant.id);
  }, [onSelect, tenant.id]);

  const handleClick = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (isSelectionMode) {
      onSelect(tenant.id);
    } else {
      onTap(tenant);
    }
  }, [isSelectionMode, onSelect, onTap, tenant]);

  const longPressProps = useLongPress(handleLongPress, handleClick, { delay: 400 });

  const statusMap: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400',
    vacating: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400',
    vacated: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-400',
    blacklisted: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400'
  };

  return (
    <div
      {...longPressProps}
      className={cn(
        "relative select-none p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden",
        isSelected
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-md transform scale-[0.98]"
          : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] shadow-sm active:scale-[0.98]"
      )}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 text-indigo-600">
          <CheckCircle2 className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900" />
        </div>
      )}

      <div className="flex items-start gap-4 mb-3">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg uppercase shrink-0 transition-colors",
          isSelected 
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
        )}>
          {tenant.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{tenant.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tenant.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Room / Bed</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {tenant.rooms?.room_number || 'N/A'} • Bed {tenant.bed_number}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Rent</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            ₹{tenant.rent_amount?.toLocaleString() || tenant.rentAmount?.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
          statusMap[tenant.status] || statusMap.vacated
        )}>
          {tenant.status}
        </span>
        {tenant.kyc_status === 'verified' && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> KYC Done
          </span>
        )}
        {tenant.kyc_status === 'pending' && (
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> KYC Pending
          </span>
        )}
      </div>
    </div>
  );
});

TenantMobileCard.displayName = 'TenantMobileCard';

export const TenantMobileList: React.FC<TenantMobileListProps> = ({
  tenants, onManage, onEdit, onPaymentHistory, onViewAgreement,
  onWhatsAppReminder, onDelete, onBulkDelete, onBulkWhatsApp, onShareDetails
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelectionMode = selectedIds.size > 0;

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = () => setSelectedIds(new Set());

  const getSelectedTenants = () => tenants.filter(t => selectedIds.has(t.id));
  const firstSelected = getSelectedTenants()[0];

  const ActionButton = ({ icon: Icon, label, onClick, primary = false, danger = false }: any) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center min-w-[72px] p-3 rounded-2xl gap-1.5 transition-all shrink-0",
        primary
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
          : danger
            ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            : "bg-gray-50 text-gray-700 dark:bg-white/5 dark:text-gray-300 active:bg-gray-100 dark:active:bg-white/10"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-bold whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="pb-24 space-y-3">
      {tenants.map(tenant => (
        <TenantMobileCard
          key={tenant.id}
          tenant={tenant}
          isSelected={selectedIds.has(tenant.id)}
          isSelectionMode={isSelectionMode}
          onSelect={toggleSelection}
          onTap={onManage}
        />
      ))}

      {/* Floating Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 right-4 z-[100] bg-white dark:bg-[#1A1A1A] rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                {selectedIds.size} Selected
              </span>
              <button 
                onClick={clearSelection}
                className="p-1.5 bg-gray-200 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions Scroll Area */}
            <div className="flex overflow-x-auto gap-2 p-3 snap-x hide-scrollbar mask-edges">
              {selectedIds.size === 1 ? (
                // Single Selection Actions
                <>
                  <ActionButton icon={CheckCircle2} label="Manage" primary onClick={() => { clearSelection(); onManage(firstSelected); }} />
                  <ActionButton icon={Edit2} label="Edit Info" onClick={() => { clearSelection(); onEdit(firstSelected); }} />
                  <ActionButton icon={History} label="Payments" onClick={() => { clearSelection(); onPaymentHistory(firstSelected); }} />
                  {(firstSelected.rent_agreement_url || firstSelected.rentAgreementUrl) && (
                    <ActionButton icon={FileText} label="Agreement" onClick={() => { clearSelection(); onViewAgreement(firstSelected); }} />
                  )}
                  <ActionButton icon={MessageCircle} label="WhatsApp" onClick={() => { clearSelection(); onWhatsAppReminder(firstSelected); }} />
                  <ActionButton icon={Trash2} label="Delete" danger onClick={() => { clearSelection(); onDelete(firstSelected); }} />
                </>
              ) : (
                // Multi Selection Actions
                <>
                  <ActionButton icon={Share2} label="Share Details" primary onClick={() => { onShareDetails(Array.from(selectedIds)); clearSelection(); }} />
                  <ActionButton icon={MessageCircle} label="Bulk Reminder" onClick={() => { onBulkWhatsApp(Array.from(selectedIds)); clearSelection(); }} />
                  <ActionButton icon={Trash2} label="Delete All" danger onClick={() => { onBulkDelete(Array.from(selectedIds)); clearSelection(); }} />
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
