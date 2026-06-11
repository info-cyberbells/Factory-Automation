import React, { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineShieldCheck, HiOutlineLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';

const SettingsDashboard = () => {
  const { user } = useAuth();
  
  // Mock settings state
  const [settings, setSettings] = useState({
    disableScreenshots: true,
    requireBiometric: true,
    restrictCrossDepartment: true,
    allowMobileApp: false
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    // Mock save delay
    setTimeout(() => {
      setSaving(false);
      toast.success('Global security settings updated successfully!');
    }, 800);
  };

  if (user?.role !== 'super_admin') {
    return (
      <DashboardLayout pageTitle="Settings">
        <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
          <h3>Access Denied</h3>
          <p>Only the Super Admin (CEO) can access global settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Global System Settings">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <div className="glass-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineShieldCheck style={{ color: '#3b82f6' }} /> Security & Compliance
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Manage organization-wide security policies. These settings apply to all users across Web and Mobile applications.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Setting 1 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Disable Screenshots (Mobile App)</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Enables FLAG_SECURE on Android and UIScreen protection on iOS to prevent data theft.</div>
              </div>
              <ToggleSwitch checked={settings.disableScreenshots} onChange={() => handleToggle('disableScreenshots')} />
            </div>

            {/* Setting 2 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Require Biometric Login</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Force Security Guards and Floor Staff to use fingerprint/face scanning for entry.</div>
              </div>
              <ToggleSwitch checked={settings.requireBiometric} onChange={() => handleToggle('requireBiometric')} />
            </div>

            {/* Setting 3 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Strict Department Isolation</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Prevents cross-department data access. e.g., Sales cannot see Production DIY models.</div>
              </div>
              <ToggleSwitch checked={settings.restrictCrossDepartment} onChange={() => handleToggle('restrictCrossDepartment')} />
            </div>

            {/* Setting 4 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>Enable Mobile App Access</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Allow employees to login via the React Native mobile application.</div>
              </div>
              <ToggleSwitch checked={settings.allowMobileApp} onChange={() => handleToggle('allowMobileApp')} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem' }}
          >
            <HiOutlineLockClosed /> {saving ? 'Applying Policies...' : 'Save Security Policies'}
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
};

const ToggleSwitch = ({ checked, onChange }) => (
  <div 
    onClick={onChange}
    style={{
      width: '44px', height: '24px', background: checked ? '#3b82f6' : 'var(--bg-input)',
      borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
    }}
  >
    <div style={{
      width: '20px', height: '20px', background: '#fff', borderRadius: '50%',
      position: 'absolute', top: '2px', left: checked ? '22px' : '2px', transition: 'left 0.3s',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }} />
  </div>
);

export default SettingsDashboard;
