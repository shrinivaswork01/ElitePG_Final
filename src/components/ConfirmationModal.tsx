import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Loader2 } from 'lucide-react';
import { cn } from '../utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false
}) => {
  const iconColor = variant === 'danger' ? 'text-rose-600' : variant === 'warning' ? 'text-amber-600' : 'text-indigo-600';
  const iconBg = variant === 'danger' ? 'bg-rose-50 dark:bg-rose-500/10' : variant === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10';
  const confirmBtnBg = variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700';
  const confirmBtnShadow = variant === 'danger' ? 'shadow-rose-600/20' : variant === 'warning' ? 'shadow-amber-600/20' : 'shadow-indigo-600/20';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#111111] rounded-3xl shadow-2xl overflow-hidden border border-white/5 p-6 text-center"
          >
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4", iconBg, iconColor)}>
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {message}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "flex-1 px-4 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all text-sm active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50",
                  confirmBtnBg,
                  confirmBtnShadow
                )}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

