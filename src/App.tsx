import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { PermissionGuard } from './components/PermissionGuard';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import { LoadingScreen } from './components/LoadingScreen';
import { FeatureGuard } from './components/FeatureGuard';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { TenantsPage } from './pages/TenantsPage';
import { RoomsPage } from './pages/RoomsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { KYCPage } from './pages/KYCPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { BroadcastPage } from './pages/BroadcastPage';
import { ProfilePage } from './pages/ProfilePage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { PartnerPayoutsPage } from './pages/PartnerPayoutsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { TasksPage } from './pages/TasksPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { ExpensesPage } from './pages/ExpensesPage';

const RootRedirect = () => {
  const { user, isInitializing } = useAuth();
  if (isInitializing) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  // For super admin: land on first available branch dashboard
  if (user.role === 'super') {
    const defaultBranchId = user.branchId || user.branchIds?.[0];
    if (defaultBranchId) {
      return <Navigate to={`/branch/${defaultBranchId}/dashboard`} replace />;
    }
    // Super admin with no branches yet — still valid, send to first branch context
    return <Navigate to="/unauthorized" replace />;
  }

  // For admin/partner: MUST have a branch. AuthContext setActiveUser guarantees this,
  // but as a safety net, try branchIds[0] as well.
  const defaultBranchId = user.branchId || user.branchIds?.[0];
  if (!defaultBranchId) {
    // Absolute fallback — should never happen after AuthContext fix
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <Navigate to={`/branch/${defaultBranchId}/dashboard`} replace />;
};

const BranchLayoutWrapper = () => {
  const { branchId } = useParams();
  if (!branchId) return <Navigate to="/" replace />;
  
  return (
    <AppProvider key={branchId}>
      <Layout />
    </AppProvider>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-[#111111] dark:text-white border dark:border-white/10',
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: 'white',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage isSignUp={true} />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Branch-Specific Hierarchical Routes */}
            <Route path="/branch/:branchId" element={
              <ProtectedRoute>
                <BranchLayoutWrapper />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="tenants" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="tenants">
                    <FeatureGuard feature="tenants" fallback={<Navigate to="dashboard" replace />}>
                      <TenantsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="rooms" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="rooms">
                    <FeatureGuard feature="rooms" fallback={<Navigate to="dashboard" replace />}>
                      <RoomsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="payments" element={
                <RoleGuard requiredLevel={1}>
                  <PermissionGuard requiredPermission="payments">
                    <FeatureGuard feature="payments" fallback={<Navigate to="dashboard" replace />}>
                      <PaymentsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="complaints" element={
                <RoleGuard requiredLevel={1}>
                  <PermissionGuard requiredPermission="complaints">
                    <FeatureGuard feature="complaints" fallback={<Navigate to="dashboard" replace />}>
                      <ComplaintsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="kyc" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="kyc">
                    <KYCPage />
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="employees" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="employees">
                    <FeatureGuard feature="employees" fallback={<Navigate to="dashboard" replace />}>
                      <EmployeesPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="broadcast" element={
                <RoleGuard requiredLevel={3}>
                  <BroadcastPage />
                </RoleGuard>
              } />
              <Route path="reports" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="reports">
                    <FeatureGuard feature="reports" fallback={<Navigate to="dashboard" replace />}>
                      <ReportsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="partner-payouts" element={
                <RoleGuard requiredLevel={3}>
                  <PermissionGuard requiredPermission="partner-payouts">
                    <FeatureGuard feature="partner-payouts" fallback={<Navigate to="dashboard" replace />}>
                      <PartnerPayoutsPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="settings" element={
                <RoleGuard requiredLevel={3}>
                  <SettingsPage />
                </RoleGuard>
              } />
              <Route path="subscription" element={
                <RoleGuard requiredLevel={3}>
                  <SubscriptionPage />
                </RoleGuard>
              } />
              <Route path="platform-management" element={
                <RoleGuard requiredLevel={4}>
                  <SuperAdminPage />
                </RoleGuard>
              } />
              <Route path="tasks" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="tasks">
                    <FeatureGuard feature="tasks" fallback={<Navigate to="dashboard" replace />}>
                      <TasksPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="expenses" element={
                <RoleGuard requiredLevel={2}>
                  <PermissionGuard requiredPermission="expenses">
                    <FeatureGuard feature="expenses" fallback={<Navigate to="dashboard" replace />}>
                      <ExpensesPage />
                    </FeatureGuard>
                  </PermissionGuard>
                </RoleGuard>
              } />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Global non-branch routes */}
            <Route path="/profile" element={
              <ProtectedRoute>
                {/* Fallback to non-branch AppProvider if needed, or just standard layout */}
                <AppProvider>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            } />
            
            <Route path="/help" element={
              <ProtectedRoute>
                <AppProvider>
                   <Layout>
                    <HelpSupportPage />
                  </Layout>
                </AppProvider>
              </ProtectedRoute>
            } />

            <Route path="/unauthorized" element={
              <ProtectedRoute>
                <Layout>
                  <UnauthorizedPage />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

