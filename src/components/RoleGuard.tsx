import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: ReactNode;
  requiredLevel: number;
}

export const RoleGuard = ({ children, requiredLevel }: RoleGuardProps) => {
  const { user, isInitializing } = useAuth();

  if (isInitializing || !user) {
    return <>{children}</>; // Let ProtectedRoute handle unauthorized redirects initially
  }

  const getRoleLevel = (role: UserRole): number => {
    switch (role) {
      case 'super': return 4;
      case 'admin': return 3;
      case 'manager':
      case 'caretaker':
      case 'cleaner':
      case 'security':
        return 2;
      case 'tenant':
      default:
        return 1;
    }
  };

  const userLevel = getRoleLevel(user.role);

  if (userLevel < requiredLevel) {
    // Safely fallback to user's assigned dashboard path
    const fallbackRoute = user.role === 'super' ? '/branches' : '/';
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};

