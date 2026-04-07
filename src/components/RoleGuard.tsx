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

  if (isInitializing) return null;
  
  if (!user) {
    console.log('[RoleGuard] No user found, allowing children to let ProtectedRoute handle it.');
    return <>{children}</>;
  }

  const getRoleLevel = (role: UserRole): number => {
    switch (role?.toLowerCase()) {
      case 'super': return 4;
      case 'admin':
      case 'partner':
        return 3;
      case 'manager':
      case 'caretaker':
      case 'receptionist':
      case 'cleaner':
      case 'security':
        return 2;
      case 'tenant':
        return 1;
      case 'none':
      default:
        return 0;
    }
  };

  const userLevel = getRoleLevel(user.role);

  if (userLevel < requiredLevel) {
    console.warn(`[RoleGuard] Access Denied: User role "${user.role}" (Level ${userLevel}) < Required Level ${requiredLevel}. Redirecting to dashboard.`);
    // Safely fallback to user's assigned dashboard path
    const fallbackRoute = user.role === 'super' ? '/branches' : '/';
    return <Navigate to={fallbackRoute} replace />;
  }

  return <>{children}</>;
};

