import React from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../utils';

export const SettingsPage = () => {
  const { pgConfig, updatePGConfig, currentPlan } = useApp();
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">You do not have permission to access this page.</p>
      </div>
    );
  }

  const toggleTabVisibility = (role: UserRole, tabHref: string) => {
    if (!pgConfig) return;

    let permissions = pgConfig.rolePermissions || [];

    // Check if role completely missing
    if (!permissions.some(rp => rp.role === role)) {
      permissions = [...permissions, { role, visibleTabs: availableTabs.map(t => t.href) }];
    }

    const newPermissions = permissions.map((rp: any) => {
      // Create a clean copy to prevent reference mutation
      const clonedRp = { ...rp, visibleTabs: [...(rp.visibleTabs || [])] };

      if (clonedRp.role === role) {
        const isVisible = clonedRp.visibleTabs.includes(tabHref);
        clonedRp.visibleTabs = isVisible
          ? clonedRp.visibleTabs.filter((t: string) => t !== tabHref)
          : [...clonedRp.visibleTabs, tabHref];
      }
      return clonedRp;
    });

    updatePGConfig({ rolePermissions: newPermissions });
  };

  const baseTabs = [
    { name: 'Dashboard', href: '/', id: 'dashboard' },
    { name: 'Tenants', href: '/tenants', id: 'tenants' },
    { name: 'Rooms', href: '/rooms', id: 'rooms' },
    { name: 'Payments', href: '/payments', id: 'payments' },
    { name: 'Complaints', href: '/complaints', id: 'complaints' },
    { name: 'KYC Verification', href: '/kyc', id: 'kyc' },
    { name: 'Employees', href: '/employees', id: 'employees' },
    { name: 'Broadcast', href: '/broadcast', id: 'broadcast' },
    { name: 'Authorize Users', href: '/authorize', id: 'tenants' }, // Tied to general tenant/employee access
    { name: 'Profile', href: '/profile', id: 'dashboard' },
  ];

  // Dynamically derive available tabs strictly based on the active PG subscription
  const availableTabs = baseTabs.filter(tab => {
    // Core universal views required everywhere
    if (['dashboard', 'tenants', 'rooms', 'payments', 'complaints'].includes(tab.id)) return true;
    if (!currentPlan) return true; // Fail safe

    return currentPlan.features.includes(tab.id as any);
  });

  const roles: UserRole[] = ['admin', 'manager', 'caretaker', 'tenant', 'cleaner', 'security'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Branch Settings</h2>
        <p className="text-gray-500 dark:text-gray-400">Configure tab visibility for different roles in your branch</p>
      </div>

      <div className="bg-white dark:bg-[#111111] rounded-2xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Role Permissions</h3>
          <p className="text-sm text-gray-500">Enable or disable navigation tabs for each role</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tab Name</th>
                {roles.map(role => (
                  <th key={role} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center capitalize">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {availableTabs.map((tab) => (
                <tr key={tab.href} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{tab.name}</td>
                  {roles.map(role => {
                    const mappedRole = pgConfig?.rolePermissions?.find((p: any) => p.role === role);
                    // Assume completely visible if the role mapping doesn't exist yet
                    const isVisible = mappedRole ? mappedRole.visibleTabs.includes(tab.href) : true;
                    return (
                      <td key={`${role}-${tab.href}`} className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleTabVisibility(role, tab.href)}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            isVisible
                              ? "text-green-600 bg-green-50 dark:bg-green-500/10"
                              : "text-gray-300 dark:text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          )}
                        >
                          {isVisible ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
