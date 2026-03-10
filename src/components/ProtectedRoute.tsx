import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const { checkFeatureAccess } = useApp();
  const location = useLocation();

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isKycRequired = checkFeatureAccess('kyc');
  if (user && isKycRequired && !user.isAuthorized && location.pathname !== '/unauthorized') {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
