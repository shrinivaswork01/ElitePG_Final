import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { AuthorizationPage } from './pages/AuthorizationPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';

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

              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/tenants" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'caretaker']}>
                  <Layout>
                    <TenantsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/rooms" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'caretaker']}>
                  <Layout>
                    <RoomsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/payments" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'tenant']}>
                  <Layout>
                    <PaymentsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/complaints" element={
                <ProtectedRoute>
                  <Layout>
                    <ComplaintsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/kyc" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'caretaker']}>
                  <Layout>
                    <KYCPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/employees" element={
                <ProtectedRoute allowedRoles={['admin', 'manager', 'caretaker']}>
                  <Layout>
                    <EmployeesPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/broadcast" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <BroadcastPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/reports" element={
                <ProtectedRoute allowedRoles={['admin', 'manager']}>
                  <Layout>
                    <ReportsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/authorize" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AuthorizationPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <SettingsPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/subscription" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <SubscriptionPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/branches" element={
                <ProtectedRoute allowedRoles={['super']}>
                  <Layout>
                    <SuperAdminPage />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
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
