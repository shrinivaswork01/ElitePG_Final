import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleGuard } from './components/RoleGuard';
import { PermissionGuard } from './components/PermissionGuard';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
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
import { SubscriptionPage } from './pages/SubscriptionPage';
import { HelpSupportPage } from './pages/HelpSupportPage';
import { TasksPage } from './pages/TasksPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppProvider>
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
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<LoginPage isSignUp={true} />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/tenants" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="tenants">
                      <Layout>
                        <TenantsPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/rooms" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="rooms">
                      <Layout>
                        <RoomsPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/payments" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={1}>
                    <PermissionGuard requiredPermission="payments">
                      <Layout>
                        <PaymentsPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/complaints" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={1}>
                    <PermissionGuard requiredPermission="complaints">
                      <Layout>
                        <ComplaintsPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/kyc" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="kyc">
                      <Layout>
                        <KYCPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/employees" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="employees">
                      <Layout>
                        <EmployeesPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/broadcast" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={3}>
                    <Layout>
                      <BroadcastPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/reports" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="reports">
                      <Layout>
                        <ReportsPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={3}>
                    <Layout>
                      <SettingsPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/subscription" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={3}>
                    <Layout>
                      <SubscriptionPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/branches" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={4}>
                    <Layout>
                      <SuperAdminPage />
                    </Layout>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/help" element={
                <ProtectedRoute>
                  <Layout>
                    <HelpSupportPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/tasks" element={
                <ProtectedRoute>
                  <RoleGuard requiredLevel={2}>
                    <PermissionGuard requiredPermission="tasks">
                      <Layout>
                        <TasksPage />
                      </Layout>
                    </PermissionGuard>
                  </RoleGuard>
                </ProtectedRoute>
              } />

              <Route path="/unauthorized" element={
                <ProtectedRoute>
                  <Layout>
                    <UnauthorizedPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </AppProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
