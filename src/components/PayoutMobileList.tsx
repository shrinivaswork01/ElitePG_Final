import React, { memo } from 'react';
import { format } from 'date-fns';
import { Wallet, Trash2 } from 'lucide-react';
import { cn } from '../utils';

interface PayoutMobileListProps {
  payouts: any[];
  branches: any[];
  resolvePartnerName: (id: string) => string;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

const PayoutMobileCard = memo(({
  payout,
  branches,
  resolvePartnerName,
  isAdmin,
  onDelete
}: {
  payout: any;
  branches: any[];
  resolvePartnerName: (id: string) => string;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}) => {
  const branchName = branches.find(b => b.id === payout.branchId)?.name || 'Global';
  const partnerName = resolvePartnerName(payout.partnerId);
  const reqByName = resolvePartnerName(payout.requestedBy);
  const partnerApprName = payout.partnerApprovedBy ? resolvePartnerName(payout.partnerApprovedBy) : (payout.status === 'PAID' ? 'Admin Bypassed' : '-');
  const adminApprName = payout.adminApprovedBy ? resolvePartnerName(payout.adminApprovedBy) : '-';

  return (
    <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#111111] shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white">{partnerName}</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {payout.month} • {branchName}
            </p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">₹{payout.amount.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-bold">{format(new Date(payout.createdAt), 'dd MMM')}</p>
          </div>
          {isAdmin && onDelete && (
            <button
              onClick={() => onDelete(payout.id)}
              className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-white/5 rounded-xl p-2 text-[10px]">
        <div>
          <span className="text-gray-400 font-bold uppercase block">Req By</span>
          <span className="font-bold text-gray-700 dark:text-gray-300 truncate block">{reqByName}</span>
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase block">Partner Appr</span>
          <span className={cn(
            "font-bold truncate block",
            payout.partnerApprovedBy ? "text-blue-500" : (payout.status === 'PAID' ? "text-rose-400" : "text-gray-400")
          )}>
            {partnerApprName}
          </span>
        </div>
        <div>
          <span className="text-gray-400 font-bold uppercase block">Admin Appr</span>
          <span className={cn(
            "font-bold truncate block",
            payout.adminApprovedBy ? "text-emerald-500" : "text-gray-400"
          )}>
            {adminApprName}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5">
        <span className={cn(
          "px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider",
          payout.status === 'PAID' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
          payout.status === 'PARTNER_APPROVED' ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" :
          payout.status === 'REJECTED' ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" :
          "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        )}>
          {payout.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
});

PayoutMobileCard.displayName = 'PayoutMobileCard';

export const PayoutMobileList: React.FC<PayoutMobileListProps> = ({
  payouts,
  branches,
  resolvePartnerName,
  isAdmin,
  onDelete
}) => {
  if (payouts.length === 0) {
    return (
      <div className="py-12 text-center text-sm font-bold text-gray-400 bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5">
        No transactions recorded.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payouts.map(payout => (
        <PayoutMobileCard
          key={payout.id}
          payout={payout}
          branches={branches}
          resolvePartnerName={resolvePartnerName}
          isAdmin={isAdmin}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
