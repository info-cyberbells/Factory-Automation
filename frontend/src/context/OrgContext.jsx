import React, { createContext, useContext, useState, useEffect } from 'react';
import { adminOrgAPI } from '../services/api';
import { useAuth } from './AuthContext';

const OrgContext = createContext(null);

export const useOrg = () => {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
};

const defaultSettings = {
  brandName: 'TrackBells ERP',
  brandSubtitle: 'Factory Automation',
  logo: '/logo.png',
  themeColor: '#f97316',
  footerText: 'Powered by Cyberbells ITES services pvt ltd',
  menus: [
    { key: 'gateGuard', label: 'Gate Operations', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'gate_guard'] },
    { key: 'supervisor', label: 'Production Line', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'supervisor'] },
    { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'quality_checker'] },
    { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'store_manager'] },
    { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'sales'] },
    { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'optionalFeature', label: 'Optional Feature', icon: 'HiOutlineLightningBolt', path: '/optional-feature', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'organizations', label: 'SaaS Tenants', icon: 'HiOutlineOfficeBuilding', path: '/admin/organizations', visible: true, roles: ['super_admin'] },
    { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'support', label: 'Help & Support', icon: 'HiOutlineDocumentReport', path: '/admin/support', visible: true, roles: ['super_admin'] }
  ]
};

export const OrgProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const applyThemeColor = (color) => {
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    
    const darkenColor = (hex, percent) => {
      let num = parseInt(hex.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
      return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
    };

    const lightenColor = (hex, percent) => {
      let num = parseInt(hex.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
      return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
    };
    
    try {
      const dark = darkenColor(color, 10);
      const light = lightenColor(color, 30);
      
      root.style.setProperty('--primary-dark', dark);
      root.style.setProperty('--primary-light', light);
      root.style.setProperty('--accent', color);
      root.style.setProperty('--accent-dark', dark);
      root.style.setProperty('--accent-light', light);
      root.style.setProperty('--border-primary', `${color}4d`);
      root.style.setProperty('--border-accent', `${color}4d`);
      root.style.setProperty('--shadow-glow', `0 0 20px ${color}1f`);
    } catch (e) {
      console.error('Error applying custom theme colors:', e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await adminOrgAPI.getSettings();
      if (res.data && res.data.success) {
        const orgData = res.data.data;
        if (orgData && orgData.logo === '🏭') {
          orgData.logo = '/logo.png';
        }
        setSettings(orgData);
        applyThemeColor(orgData.themeColor);
      }
    } catch (error) {
      console.error('Failed to fetch organization settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSettings();
    } else {
      setSettings(defaultSettings);
      applyThemeColor(defaultSettings.themeColor);
      setLoading(false);
    }
  }, [isAuthenticated, user?.organizationId]);

  const updateSettings = async (newSettings) => {
    const res = await adminOrgAPI.updateSettings(newSettings);
    if (res.data && res.data.success) {
      setSettings(res.data.data);
      applyThemeColor(res.data.data.themeColor);
      return res.data.data;
    }
    throw new Error('Failed to update organization settings');
  };

  return (
    <OrgContext.Provider value={{ settings, loading, reloadSettings: fetchSettings, updateSettings }}>
      {children}
    </OrgContext.Provider>
  );
};
