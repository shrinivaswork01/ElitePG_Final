import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPermission: string;
}

export const PermissionGuard = ({ children, requiredPermission }: PermissionGuardProps) => {
  const { user, isInitializing } = useAuth();

  if (isInitializing || !user) {
    return <>{children}</>;
  }

  const employeeRoles = ['manager', 'caretaker', 'cleaner', 'security'];
  const isEmployee = employeeRoles.includes(user.role);

  if (isEmployee) {
    const permissionKey = requiredPermission.replace(/^\//, '');
    const hasPermission = user.permissions?.includes(permissionKey);

    if (!hasPermission) {
      // Use useEffect or timeout for toast to avoid React component rendering warnings
      setTimeout(() => {
        toast.error('You do not have permission to access that module.');
      }, 0);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
};

