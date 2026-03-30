import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ChevronDown, FileText, Camera, Info, DollarSign } from 'lucide-react';
import { cn } from '../utils';

interface ElectricityBreakdownCardProps {
  baseAmount: number;
  acAmount: number;
  totalAmount: number;
  billUrl?: string | null;
  acReadingUrl?: string | null;
  onViewDoc: (url: string, title: string) => void;
}

export const ElectricityBreakdownCard = ({
  baseAmount,
  acAmount,
  totalAmount,
  billUrl,
  acReadingUrl,
  onViewDoc
}: ElectricityBreakdownCardProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="bg-white dark:bg-[#111111] rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Electricity Status</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Current month sharing breakdown</p>
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
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ₹{(totalAmount || 0).toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mt-1">Total Due</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <DollarSign className="w-6 h-6" />
          </div>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Base Amount</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">₹{(baseAmount || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">AC Amount</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">₹{(acAmount || 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                      Base amount is shared equally among residents. AC amount is shared only among AC-enabled residents based on respective meter sub-readings.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    disabled={!billUrl}
                    onClick={() => onViewDoc(billUrl!, 'Electricity Bill Proof')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border",
                      billUrl 
                        ? "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10" 
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-white/5 cursor-not-allowed"
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    View Bill
                  </button>
                  <button
                    disabled={!acReadingUrl}
                    onClick={() => onViewDoc(acReadingUrl!, 'AC Reading Proof')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border",
                      acReadingUrl 
                        ? "bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10" 
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600 border-gray-100 dark:border-white/5 cursor-not-allowed"
                    )}
                  >
                    <Camera className="w-4 h-4" />
                    View AC Proof
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isExpanded && (
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Base: ₹{baseAmount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              AC: ₹{acAmount.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

