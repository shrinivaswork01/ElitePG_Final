import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ChevronDown, FileText, Info, DollarSign, Gauge } from 'lucide-react';
import { cn } from '../utils';

interface ElectricityBreakdownCardProps {
  baseAmount: number;
  acAmount: number;
  totalAmount: number;
  costPerUnit?: number;
  unitsConsumed?: number;
  billUrl?: string | null;
  acBillUrl?: string | null;
  onViewDoc: (url: string, title: string) => void;
  onPay?: () => void;
  themeColor?: string;
}

export const ElectricityBreakdownCard = ({
  baseAmount,
  acAmount,
  totalAmount,
  costPerUnit,
  unitsConsumed,
  billUrl,
  acBillUrl,
  onViewDoc,
  onPay,
  themeColor = '#4f46e5'
}: ElectricityBreakdownCardProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isUnitBased = costPerUnit != null && costPerUnit > 0;

  return (
    <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl" style={{ background: `${themeColor}15`, color: themeColor }}>
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Electricity Status</h3>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
              {isUnitBased ? 'Unit-based split' : 'Sharing breakdown'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all duration-300",
            isExpanded ? "rotate-180 bg-gray-50 dark:bg-white/5" : ""
          )}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
              ₹{(totalAmount || 0).toLocaleString()}
            </p>
            <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1">Total Amount Due</p>
          </div>
          {onPay ? (
            <button
               onClick={(e) => { e.stopPropagation(); onPay(); }}
               className="px-6 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-lg active:scale-95"
               style={{ background: themeColor, boxShadow: `0 10px 20px -5px ${themeColor}40` }}
            >
               Pay Now
            </button>
          ) : (
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <DollarSign className="w-6 h-6" />
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-4">
                {/* Cost per unit badge */}
                {isUnitBased && (
                  <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20" style={{ background: `${themeColor}10`, borderColor: `${themeColor}20` }}>
                    <Gauge className="w-4 h-4" style={{ color: themeColor }} />
                    <span className="text-xs font-black uppercase tracking-tight" style={{ color: themeColor }}>
                      Rate: ₹{costPerUnit?.toFixed(2)}/unit
                    </span>
                    {unitsConsumed != null && unitsConsumed > 0 && (
                      <span className="text-[10px] font-black uppercase tracking-widest ml-auto opacity-60" style={{ color: themeColor }}>
                        Your AC: {unitsConsumed} Units
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Base Share</p>
                    </div>
                    <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight">₹{(baseAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">AC Share</p>
                    </div>
                    <p className="text-lg font-black text-gray-900 dark:text-white tracking-tight">₹{(acAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" style={{ color: themeColor }} />
                    <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed uppercase tracking-tight">
                      {isUnitBased
                        ? 'Base amount is shared equally. AC cost is computed from sub-meter readings and split among residents.'
                        : 'Base amount is shared equally. AC amount is shared only among AC room residents.'
                      }
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={!billUrl}
                    onClick={() => onViewDoc(billUrl!, 'Electricity Bill Proof')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      billUrl 
                        ? "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10" 
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-white/5 cursor-not-allowed"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    View Bill
                  </button>
                  <button
                    disabled={!acBillUrl}
                    onClick={() => onViewDoc(acBillUrl!, 'AC Bill Proof')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                      acBillUrl 
                        ? "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10" 
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-white/5 cursor-not-allowed"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    View AC Proof
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Base: ₹{baseAmount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              AC: ₹{acAmount.toLocaleString()}
            </span>
            {isUnitBased && (
              <span className="flex items-center gap-1.5 ml-auto">
                <Gauge className="w-3 h-3" />
                ₹{costPerUnit?.toFixed(1)}/u
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
