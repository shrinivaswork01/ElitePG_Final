import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { AppFeature } from '../types';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { pgConfig, checkFeatureAccess, currentBranch } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'caretaker', 'tenant', 'cleaner', 'security', 'super'] },
    { name: 'Tenants', href: '/tenants', icon: Users, roles: ['admin', 'manager', 'caretaker'] },
    { name: 'Rooms', href: '/rooms', icon: DoorOpen, roles: ['admin', 'manager', 'caretaker'] },
    { name: 'Payments', href: '/payments', icon: CreditCard, roles: ['admin', 'manager', 'caretaker', 'tenant'] },
    { name: 'Complaints', href: '/complaints', icon: MessageSquare, roles: ['admin', 'manager', 'caretaker', 'tenant', 'cleaner', 'security'] },
    { name: 'KYC Verification', href: '/kyc', icon: ShieldCheck, roles: ['admin', 'manager', 'caretaker'] },
    { name: 'Employees', href: '/employees', icon: UserCog, roles: ['admin', 'manager', 'caretaker', 'cleaner', 'security'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'Broadcast', href: '/broadcast', icon: Megaphone, roles: ['admin'] },
    { name: 'Subscription', href: '/subscription', icon: Zap, roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: UserCog, roles: ['admin'] },
    { name: 'PG Branches', href: '/branches', icon: Building2, roles: ['super'] },
    { name: 'Tasks', href: '/tasks', icon: ClipboardList, roles: ['manager', 'caretaker', 'cleaner', 'security'] },
    { name: 'Profile', href: '/profile', icon: User, roles: ['admin', 'manager', 'caretaker', 'tenant', 'cleaner', 'security', 'super'] },
    { name: 'Help & Support', href: '/help', icon: LifeBuoy, roles: ['admin', 'manager', 'caretaker', 'tenant', 'cleaner', 'security'] },
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

    // Feature gating check
    const featureMap: Record<string, AppFeature> = {
      '/tenants': 'tenants',
      '/rooms': 'rooms',
      '/payments': 'payments',
      '/complaints': 'complaints',
      '/kyc': 'kyc',
      '/employees': 'employees',
      '/broadcast': 'broadcast',
      '/analytics': 'analytics',
      '/reports': 'reports'
    };

    const feature = featureMap[item.href];
    if (feature && !checkFeatureAccess(feature)) {
      return false;
    }

    // Dynamic tab visibility from pgConfig (Bypass Admin level routing suppression)
    if (pgConfig?.rolePermissions && user.role !== 'admin') {
      const rolePerms = pgConfig.rolePermissions.find(p => p.role === user.role);
      if (rolePerms) {
        return rolePerms.visibleTabs.includes(item.href);
      }
    }

    return true;
  });

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
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: pgConfig?.primaryColor }}>
              {pgConfig?.pgName?.charAt(0) || 'E'}
            </div>
          )}
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
            {pgConfig?.pgName || 'ElitePG'}
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
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
                  backgroundColor: `${pgConfig.primaryColor}15`, 
                  color: pgConfig.primaryColor 
                } : {}}
              >
                <item.icon 
                  className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")} 
                  style={isActive && pgConfig?.primaryColor ? { color: pgConfig.primaryColor } : {}}
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
                 style={{ backgroundColor: !user?.avatar ? `${pgConfig?.primaryColor}20` : undefined, color: pgConfig?.primaryColor }}>
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
          className="p-2 bg-white dark:bg-[#111111] rounded-lg shadow-md border border-gray-200 dark:border-white/5 text-gray-900 dark:text-white"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
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
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#111111] z-50 lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center gap-3">
                {pgConfig?.logoUrl ? (
                  <img src={pgConfig.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: pgConfig?.primaryColor }}>
                    {pgConfig?.pgName?.charAt(0) || 'E'}
                  </div>
                )}
                <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                  {pgConfig?.pgName || 'ElitePG'}
                </span>
              </div>

              <nav className="flex-1 px-4 space-y-1 mt-4">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
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
                        backgroundColor: `${pgConfig.primaryColor}15`, 
                        color: pgConfig.primaryColor 
                      } : {}}
                    >
                      <item.icon 
                        className={cn("w-5 h-5", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500")} 
                        style={isActive && pgConfig?.primaryColor ? { color: pgConfig.primaryColor } : {}}
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
              {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
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
                   style={{ backgroundColor: !user?.avatar ? `${pgConfig?.primaryColor}20` : undefined, color: pgConfig?.primaryColor }}>
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

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            {user?.role === 'admin' && currentBranch?.subscriptionStatus === 'trial' && (
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
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
