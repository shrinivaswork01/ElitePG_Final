import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: string;
}

export const PermissionGuard = ({ children, requiredPermission }: PermissionGuardProps) => {
  const { user, isInitializing } = useAuth();
  const { branchId } = useParams<{ branchId: string }>();

  if (isInitializing || !user) {
    return <>{children}</>;
  }

  const controlledRoles = ['admin', 'manager', 'caretaker', 'cleaner', 'security'];
  const isControlled = controlledRoles.includes(user.role);

  // If user has permissions explicitly defined, and they are in the controlled roles list
  if (isControlled && user.permissions !== undefined) {
    const permissionKey = requiredPermission.replace(/^\//, '');
    const hasPermission = user.permissions?.includes(permissionKey);

    if (!hasPermission) {
      setTimeout(() => {
        toast.error('You do not have permission to access that module.');
      }, 0);
      // Redirect to user's branch dashboard instead of /unauthorized to avoid blank page
      const fallback = branchId ? `/branch/${branchId}/dashboard` : '/';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

