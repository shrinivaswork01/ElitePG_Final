import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AppFeature } from '../types';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface FeatureGuardProps {
  feature: AppFeature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const FeatureGuard: React.FC<FeatureGuardProps> = ({ feature, children, fallback }) => {
  const { checkFeatureAccess } = useApp();
  const { user } = useAuth();
  const hasAccess = checkFeatureAccess(feature);

  if (!hasAccess && user?.role !== 'super') {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white dark:bg-[#0d0d0d] rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm">
        <motion.div
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-600 mb-6"
        >
          <ShieldAlert className="w-10 h-10" />
        </motion.div>
        
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3 uppercase">Module Locked</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
          The <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">{feature}</span> module is not included in your current subscription plan. Contact support or your Super Admin to upgrade.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
