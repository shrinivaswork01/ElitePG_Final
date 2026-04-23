import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  DoorOpen,
  CreditCard,
  MessageSquare,
  ShieldCheck,
  UserCog,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
  Megaphone,
  User,
  BarChart3,
  Building2,
  Zap,
  LifeBuoy,
  ClipboardList,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { AppFeature } from '../types';
import { ProfilePage } from '../pages/ProfilePage';
import { UnifiedStaffTasksPage } from '../pages/UnifiedStaffTasksPage';
import { HelpSupportPage } from '../pages/HelpSupportPage';
import { BranchSwitcher } from './BranchSwitcher';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pgConfig, checkFeatureAccess, currentBranch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { branchId: urlBranchId } = useParams<{ branchId: string }>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const activeBranchId = urlBranchId || user?.branchId;

  // Helper to prefix internal routes with branchId
  const getBranchPath = (path: string) => {
    if (!activeBranchId) return path;
    // Don't prefix absolute external or specific global routes if needed
    if (path === '/profile' || path === '/help' || path === '/unauthorized') return path;
    return `/branch/${activeBranchId}${path === '/' ? '/dashboard' : path}`;
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'partner', 'manager', 'receptionist', 'caretaker', 'security', 'cleaner', 'tenant', 'super'] },
    { name: 'Platform Management', href: '/platform-management', icon: Building2, roles: ['super'] },
    { name: 'Broadcast / WhatsApp', href: '/broadcast', icon: Megaphone, roles: ['admin', 'partner', 'super'] },
    { name: 'Rooms', href: '/rooms', icon: DoorOpen, roles: ['admin', 'manager', 'receptionist', 'caretaker'] },
    { name: 'Tenants', href: '/tenants', icon: Users, roles: ['admin', 'manager', 'receptionist', 'caretaker', 'security'] },
    { name: ['admin', 'manager', 'partner'].includes(user?.role || '') ? 'Payments' : 'My Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'manager', 'receptionist', 'caretaker', 'tenant'] },
    { name: 'Complaints', href: '/complaints', icon: MessageSquare, roles: ['admin', 'manager', 'receptionist', 'caretaker', 'security', 'cleaner', 'tenant'] },
    { name: 'KYC Verification', href: '/kyc', icon: ShieldCheck, roles: ['admin', 'manager', 'receptionist'] },
    { name: 'Employees', href: '/employees', icon: UserCog, roles: ['admin', 'manager'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'partner', 'manager'] },
    { name: 'Partners & Payouts', href: '/partner-payouts', icon: CreditCard, roles: ['admin', 'partner'] },
    { name: 'Expenses', href: '/expenses', icon: Receipt, roles: ['admin', 'partner', 'manager'] },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList, roles: ['admin', 'manager', 'receptionist', 'caretaker', 'security', 'cleaner'] },
    { name: 'Profile', href: '/profile', icon: User, roles: ['admin', 'partner', 'manager', 'receptionist', 'caretaker', 'security', 'cleaner', 'tenant', 'super'] },
    { name: 'Subscription Plan', href: '/subscription', icon: Zap, roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: UserCog, roles: ['admin'] },
    { name: 'Help & Support', href: '/help', icon: LifeBuoy, roles: ['admin', 'manager', 'receptionist', 'caretaker', 'security', 'cleaner', 'tenant'] },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (!user) return false;

    // Super admin sees everything relevant to them
    if (user.role === 'super') {
      return item.roles.includes('super');
    }

    // Role-based filtering
    const hasRole = item.roles.includes(user.role);
    if (!hasRole) return false;

    // Authorization check
    const isKycRequired = checkFeatureAccess('kyc');
    if (isKycRequired && !user.isAuthorized && item.href !== '/unauthorized' && item.href !== '/profile') {
      return false;
    }

    // Feature gating check (subscription-based)
    const featureMap: Record<string, AppFeature> = {
      '/tenants': 'tenants',
      '/rooms': 'rooms',
      '/payments': 'payments',
      '/complaints': 'complaints',
      '/reports': 'reports',
      '/partner-payouts': 'partner-payouts',
      '/expenses': 'expenses',
      '/tasks': 'tasks',
      '/broadcast': 'broadcast',
      '/kyc': 'kyc',
      '/employees': 'employees'
    };

    const feature = featureMap[item.href];
    if (feature && !checkFeatureAccess(feature)) {
      return false;
    }

    // Always-visible tabs that bypass PBAC
    const alwaysVisible = ['/', '/dashboard', '/profile', '/help'];
    if (alwaysVisible.includes(item.href)) return true;

    // PBAC Check: admin_permissions overrides take priority when defined (except for admins/partners, whose visibility is branch-based)
    if (user.role !== 'admin' && user.role !== 'partner' && user.permissions !== undefined) {
      const key = item.href.replace(/^\//, '');
      // These structural tabs (branches, settings, subscription) are always available to admin/partner
      const structuralTabs = ['branches', 'settings', 'subscription', 'platform-management'];
      if (structuralTabs.includes(key)) return true;
      return user.permissions.includes(key);
    }

    // Dynamic tab visibility from pgConfig (for employee roles)
    if (pgConfig?.rolePermissions) {
      const rolePerms = pgConfig.rolePermissions.find(p => p.role === user.role);
      if (rolePerms) {
        return rolePerms.visibleTabs.includes(item.href);
      }
    }

    return true;
  }).map(item => ({
    ...item,
    href: getBranchPath(item.href)
  }));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0a0a0a] flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#111111] border-r border-gray-200 dark:border-white/5 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          {pgConfig?.logoUrl ? (
            <img src={pgConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
              {pgConfig?.pgName?.charAt(0) || 'E'}
            </div>
          )}
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
            {pgConfig?.pgName || 'ElitePG'}
          </span>
        </div>

        {/* Branch Switcher — Desktop (admin/partner only, super uses Platform Management) */}
        {user && ['admin', 'partner'].includes(user.role) && (
          <div className="px-4 mb-2">
            <BranchSwitcher />
          </div>
        )}

        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar pb-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href === `/branch/${activeBranchId}/dashboard` && location.pathname === `/branch/${activeBranchId}/`);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                )}
                style={isActive && pgConfig?.primaryColor ? { 
                  background: pgConfig.primaryColor.includes('gradient') ? pgConfig.primaryColor : `${pgConfig.primaryColor}15`, 
                  color: pgConfig.primaryColor.includes('gradient') ? '#fff' : pgConfig.primaryColor 
                } : {}}
              >
                <item.icon 
                  className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")} 
                  style={isActive && pgConfig?.primaryColor ? { color: pgConfig.primaryColor.includes('gradient') ? '#fff' : pgConfig.primaryColor } : {}}
                />
                {item.name}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2",
              location.pathname === '/profile'
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs overflow-hidden" 
                 style={{ background: !user?.avatar ? (pgConfig?.primaryColor?.includes('gradient') ? pgConfig.primaryColor : `${pgConfig?.primaryColor}20`) : undefined, color: pgConfig?.primaryColor?.includes('gradient') ? '#fff' : pgConfig?.primaryColor }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                user?.name?.charAt(0) || '?'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-white dark:bg-[#111111] rounded-2xl shadow-xl shadow-indigo-600/10 border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white"
        >
          <div className="w-6 h-6 relative flex flex-col items-center justify-center gap-1.5">
            <motion.span 
              animate={{ 
                rotate: isMobileMenuOpen ? 45 : 0,
                y: isMobileMenuOpen ? 7.5 : 0 
              }}
              className="w-6 h-0.5 bg-current rounded-full absolute"
              style={{ top: '25%' }}
            />
            <motion.span 
              animate={{ 
                opacity: isMobileMenuOpen ? 0 : 1,
                x: isMobileMenuOpen ? -10 : 0
              }}
              className="w-6 h-0.5 bg-current rounded-full"
            />
            <motion.span 
              animate={{ 
                rotate: isMobileMenuOpen ? -45 : 0,
                y: isMobileMenuOpen ? -7.5 : 0 
              }}
              className="w-6 h-0.5 bg-current rounded-full absolute"
              style={{ bottom: '25%' }}
            />
          </div>
        </button>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0c0c0c] z-50 lg:hidden flex flex-col shadow-2xl border-r border-gray-200 dark:border-white/5"
            >
              <div className="p-6 flex items-center gap-3">
                {pgConfig?.logoUrl ? (
                  <img src={pgConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: pgConfig?.primaryColor || 'linear-gradient(to right, #4f46e5, #7c3aed)' }}>
                    {pgConfig?.pgName?.charAt(0) || 'E'}
                  </div>
                )}
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                  {pgConfig?.pgName || 'ElitePG'}
                </span>
              </div>

              {/* Branch Switcher — Mobile (admin/partner only) */}
              {user && ['admin', 'partner'].includes(user.role) && (
                <div className="px-4 mb-2">
                  <BranchSwitcher />
                </div>
              )}

              <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar pb-4">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href || (item.href === `/branch/${activeBranchId}/dashboard` && location.pathname === `/branch/${activeBranchId}/`);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                      )}
                      style={isActive && pgConfig?.primaryColor ? { 
                        background: pgConfig.primaryColor.includes('gradient') ? pgConfig.primaryColor : `${pgConfig.primaryColor}15`, 
                        color: pgConfig.primaryColor.includes('gradient') ? '#fff' : pgConfig.primaryColor 
                      } : {}}
                    >
                      <item.icon 
                        className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")} 
                        style={isActive && pgConfig?.primaryColor ? { color: pgConfig.primaryColor.includes('gradient') ? '#fff' : pgConfig.primaryColor } : {}}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-white/5">
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-2",
                    location.pathname === '/profile'
                      ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-none">
              {filteredNavigation.find(n => n.href === location.pathname)?.name || 
               (location.pathname.includes('/dashboard') ? 'Dashboard' : 'Portal')}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <Link
              to="/profile"
              className="flex items-center gap-2 sm:gap-3 p-1.5 pr-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm overflow-hidden"
                   style={{ background: !user?.avatar ? (pgConfig?.primaryColor?.includes('gradient') ? pgConfig.primaryColor : `${pgConfig?.primaryColor}20`) : undefined, color: pgConfig?.primaryColor?.includes('gradient') ? '#fff' : pgConfig?.primaryColor }}>
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user?.name?.charAt(0) || '?'
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user?.name}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 capitalize mt-1">{user?.role}</span>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div key={user?.branchId} className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {(user?.role === 'admin' || user?.role === 'partner') && currentBranch?.subscriptionStatus === 'trial' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}

                className="mb-8 p-4 bg-indigo-600 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-600/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Free Trial Active</p>
                    <p className="text-xs text-white/80">Your 14-day free trial expires on {currentBranch.subscriptionEndDate}. Upgrade now to keep your features!</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/subscription')}
                  className="px-6 py-2 bg-white text-indigo-600 rounded-xl text-sm font-black hover:bg-indigo-50 transition-all"
                >
                  Upgrade Plan
                </button>
              </motion.div>
            )}
            {children || <Outlet />}
          </div>
        </div>
      </main>
    </div>
  );
};

