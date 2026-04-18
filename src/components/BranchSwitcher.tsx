import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Building2, ChevronDown, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import toast from 'react-hot-toast';

interface BranchSwitcherProps {
  collapsed?: boolean;
  onAddBranch?: () => void;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ collapsed, onAddBranch }) => {
  const { branches } = useApp();
  const { user, switchBranch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId: urlBranchId } = useParams<{ branchId: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeBranchId = urlBranchId || user?.branchId;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ❌ HIDE for Super Admin — they use Platform Management instead
  if (user?.role === 'super') return null;

  // Only show for admin/partner (and multi-branch employees)
  const userBranchIds = user?.branchIds || (user?.branchId ? [user.branchId] : []);
  const ownedBranches = branches.filter(b => userBranchIds.includes(b.id));
  const activeBranch = branches.find(b => b.id === activeBranchId);

  // Admin/partner: ALWAYS show (even with 1 branch — shows clearly which branch is active)
  // Employees/tenants: only show if they have multiple branches
  const showSwitcher = ['admin', 'partner'].includes(user?.role || '') || ownedBranches.length > 1 || !!onAddBranch;
  if (!showSwitcher) return null;

  const handleSwitch = async (branchId: string) => {
    if (branchId === activeBranchId) return;
    const toastId = toast.loading('Switching branch...');
    try {
      switchBranch(branchId);
      
      // Extract current sub-path to maintain context (e.g., /branch/123/reports -> /reports)
      const pathParts = location.pathname.split('/');
      const subPath = pathParts.slice(3).join('/'); // Skip "", "branch", "ID"
      
      const newPath = subPath ? `/branch/${branchId}/${subPath}` : `/branch/${branchId}/dashboard`;
      
      navigate(newPath);
      
      toast.success('Switched successfully', { id: toastId });
    } catch (err) {
      toast.error('Failed to switch branch', { id: toastId });
    }
    setIsOpen(false);
  };

  if (collapsed) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-all"
          title={activeBranch?.branchName || 'Switch Branch'}
        >
          <Building2 className="w-5 h-5" />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              className="absolute left-full top-0 ml-2 w-64 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-[200]"
            >
              <BranchList
                branches={ownedBranches}
                activeBranchId={activeBranchId}
                onSelect={handleSwitch}
                onAddBranch={onAddBranch}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl border border-gray-100 dark:border-white/5 transition-all group"
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
            {activeBranch?.branchName || activeBranch?.name || 'Select Branch'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {activeBranch?.address?.split(',')[0] || activeBranch?.name || 'No branch selected'}
          </p>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden z-[200]"
          >
            <BranchList
              branches={ownedBranches}
              activeBranchId={activeBranchId}
              onSelect={handleSwitch}
              onAddBranch={onAddBranch}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Shared branch list — single branch selection only, no "Combined View"
const BranchList: React.FC<{
  branches: any[];
  activeBranchId?: string;
  onSelect: (id: string) => void;
  onAddBranch?: () => void;
}> = ({ branches, activeBranchId, onSelect, onAddBranch }) => (
  <div className="py-1 max-h-64 overflow-y-auto">
    <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5">
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        Your Branches ({branches.length})
      </p>
    </div>

    {branches.map(branch => (
      <button
        key={branch.id}
        onClick={() => onSelect(branch.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all",
          branch.id === activeBranchId && "bg-indigo-50/50 dark:bg-indigo-500/5"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
          branch.id === activeBranchId
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
            : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
        )}>
          {branch.branchName?.charAt(0) || branch.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {branch.branchName || branch.name}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
            {branch.address?.split(',')[0] || branch.name || ''}
          </p>
        </div>
        {branch.id === activeBranchId && (
          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        )}
      </button>
    ))}
    {onAddBranch && (
      <button
        onClick={onAddBranch}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all border-t border-gray-100 dark:border-white/5"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Add New Branch</span>
      </button>
    )}
  </div>
);
