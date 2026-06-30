import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

// Dashboards
import AdminTrackerDashboard from './admin/AdminTrackerDashboard';
import GateGuardDashboard from './gate/GateGuardDashboard';
import SupervisorDashboard from './production/SupervisorDashboard';
import QualityDashboard from './quality/QualityDashboard';
import StoreDashboard from './store/StoreDashboard';
import SalesDashboard from './sales/SalesDashboard';
import FinanceDashboard from './finance/FinanceDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle custom permissions for 'user' role
  if (user.role === 'user' && user.permissions && user.permissions.length > 0) {
    if (user.permissions.includes('production')) return <SupervisorDashboard />;
    if (user.permissions.includes('gate_entry')) return <GateGuardDashboard />;
    if (user.permissions.includes('store')) return <StoreDashboard />;
    if (user.permissions.includes('orders')) return <SalesDashboard />;
    if (user.permissions.includes('finance')) return <FinanceDashboard />;
  }

  // Render dashboard based on role
  switch (user.role) {
    case 'super_admin':
    case 'admin':
      return <AdminTrackerDashboard />;
    case 'gate_guard':
      return <GateGuardDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'quality_checker':
      return <QualityDashboard />;
    case 'store_manager':
      return <StoreDashboard />;
    case 'sales':
      return <SalesDashboard />;
    default:
      return (
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#fff' }}>
          <div>
            <h3>Welcome to Factory Automation ERP</h3>
            <p>Your account role "{user.role}" does not have a designated dashboard workspace yet. Please contact your administrator.</p>
          </div>
        </div>
      );
  }
};

export default Dashboard;
