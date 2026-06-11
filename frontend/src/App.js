import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import GateEntry from './pages/GateEntry';
import UserManagement from './pages/UserManagement';
import ProductionDashboard from './pages/production/ProductionDashboard';
import StoreDashboard from './pages/store/StoreDashboard';
import OrderDashboard from './pages/orders/OrderDashboard';
import ReportsDashboard from './pages/reports/ReportsDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import SettingsDashboard from './pages/admin/SettingsDashboard';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import FinanceDashboard from './pages/finance/FinanceDashboard';
import AIChatbot from './components/chat/AIChatbot';
import RemoteScanner from './pages/store/RemoteScanner';

// New consolidated role dashboards
import GateGuardDashboard from './pages/gate/GateGuardDashboard';
import SupervisorDashboard from './pages/production/SupervisorDashboard';
import QualityDashboard from './pages/quality/QualityDashboard';
import SalesDashboard from './pages/sales/SalesDashboard';
import AdminTrackerDashboard from './pages/admin/AdminTrackerDashboard';

// Protected Route - requires auth
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route - redirect to dashboard if already logged in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

// Role-based Route - requires specific roles
const RoleRoute = ({ children, roles = [], permission }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isMasterAdmin = ['super_admin', 'admin'].includes(user?.role);
  
  // Master admins have access to everything (except specific pages maybe, but generally all modules)
  if (isMasterAdmin) return children;

  // For regular users, if a permission is required, check their permissions array
  if (permission && user?.permissions) {
    if (!user.permissions.includes(permission)) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // Fallback to legacy role check
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AIChatbot />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-secondary, #1a1f3a)',
                color: 'var(--text-primary, #e0e6f0)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontFamily: 'Inter, sans-serif',
                boxShadow: 'var(--shadow-lg, 0 10px 40px rgba(0,0,0,0.3))',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/scanner" element={<RemoteScanner />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/gate-guard" element={
            <RoleRoute roles={['super_admin', 'admin', 'gate_guard']}><GateGuardDashboard /></RoleRoute>
          } />
          <Route path="/supervisor" element={
            <RoleRoute roles={['super_admin', 'admin', 'supervisor']}><SupervisorDashboard /></RoleRoute>
          } />
          <Route path="/quality" element={
            <RoleRoute roles={['super_admin', 'admin', 'quality_checker']}><QualityDashboard /></RoleRoute>
          } />
          <Route path="/store" element={
            <RoleRoute roles={['super_admin', 'admin', 'store_manager']}><StoreDashboard /></RoleRoute>
          } />
          <Route path="/sales" element={
            <RoleRoute roles={['super_admin', 'admin', 'sales']}><SalesDashboard /></RoleRoute>
          } />
          <Route path="/users" element={
            <RoleRoute roles={['super_admin', 'admin']}><UserManagement /></RoleRoute>
          } />
          <Route path="/settings" element={
            <RoleRoute roles={['super_admin']}><SettingsDashboard /></RoleRoute>
          } />
          <Route path="/admin/organizations" element={
            <RoleRoute roles={['super_admin']}><OrganizationManagement /></RoleRoute>
          } />

          {/* 404 */}
          <Route path="*" element={
            <div style={{
              minHeight: '100vh', display: 'flex', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center', background: '#0a0e1a'
            }}>
              <div>
                <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔍</div>
                <h1 style={{
                  fontFamily: 'Poppins, sans-serif', fontSize: '3rem',
                  fontWeight: 800, color: '#fff', marginBottom: '8px'
                }}>404</h1>
                <p style={{ color: '#8892b0', fontSize: '1.1rem', marginBottom: '24px' }}>
                  Page not found
                </p>
                <a href="/" className="btn btn-primary">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
