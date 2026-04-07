import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  // Show spinner while auth state is being initialized (prevents flash of Access Denied
  // when restoring a valid session from localStorage which may have stale isAuthorized)
  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force password change: if user needs to set a new password, redirect to login
  // which handles the password setup flow. Admin/super are exempt.
  const isAdminOrSuper = user?.role === 'admin' || user?.role === 'super' || user?.role === 'partner';
  if (user?.requiresPasswordChange && !isAdminOrSuper) {
    return <Navigate to="/login" state={{ forcePasswordChange: true, from: location }} replace />;
  }

  // Only check authorization after initialization is fully complete.
  // admin/super roles are always considered authorized regardless of DB flag.
  if (user && !user.isAuthorized && !isAdminOrSuper && location.pathname !== '/unauthorized') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
