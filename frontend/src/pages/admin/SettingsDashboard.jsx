import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import { HiOutlineShieldCheck as IconShield, HiOutlineLockClosed as IconLock, HiOutlineAdjustments as IconSettings } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Org Admin' },
  { value: 'gate_guard', label: 'Gate Guard' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'quality_checker', label: 'Quality Checker' },
  { value: 'store_manager', label: 'Store Manager' },
  { value: 'sales', label: 'Sales Officer' }
];

const SettingsDashboard = () => {
  const { user } = useAuth();
  const { settings, updateSettings, reloadSettings } = useOrg();

  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      setActiveTab('security');
    } else if (user && user.role !== 'super_admin') {
      setActiveTab('branding');
    }
  }, [user]);

  // 1. Security & Compliance states
  const [securitySettings, setSecuritySettings] = useState({
    disableScreenshots: true,
    requireBiometric: true,
    restrictCrossDepartment: true,
    allowMobileApp: false
  });

  // 2. Branding states
  const [brandName, setBrandName] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');
  const [logo, setLogo] = useState('');
  const [themeColor, setThemeColor] = useState('#f97316');
  const [footerText, setFooterText] = useState('');

  // 3. Sidebar Menus states
  const [menus, setMenus] = useState([]);

  useEffect(() => {
    if (settings) {
      setBrandName(settings.brandName || '');
      setBrandSubtitle(settings.brandSubtitle || '');
      setLogo(settings.logo || '');
      setThemeColor(settings.themeColor || '#f97316');
      setFooterText(settings.footerText || '');
      setMenus(settings.menus ? JSON.parse(JSON.stringify(settings.menus)) : []);
      setSecuritySettings({
        disableScreenshots: settings.disableScreenshots !== undefined ? settings.disableScreenshots : true,
        requireBiometric: settings.requireBiometric !== undefined ? settings.requireBiometric : true,
        restrictCrossDepartment: settings.restrictCrossDepartment !== undefined ? settings.restrictCrossDepartment : true,
        allowMobileApp: settings.allowMobileApp !== undefined ? settings.allowMobileApp : false
      });
    }
  }, [settings]);

  const handleSecurityToggle = (key) => {
    setSecuritySettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...settings,
        disableScreenshots: securitySettings.disableScreenshots,
        requireBiometric: securitySettings.requireBiometric,
        restrictCrossDepartment: securitySettings.restrictCrossDepartment,
        allowMobileApp: securitySettings.allowMobileApp
      });
      toast.success('Global security policies applied successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update security policies');
    } finally {
      setSaving(false);
    }
  };

  // Menu Handlers
  const handleMenuLabelChange = (index, val) => {
    const updated = [...menus];
    updated[index].label = val;
    setMenus(updated);
  };

  const handleMenuVisibilityToggle = (index) => {
    const updated = [...menus];
    updated[index].visible = !updated[index].visible;
    setMenus(updated);
  };

  const handleRoleToggle = (index, roleVal) => {
    const updated = [...menus];
    const rolesArray = updated[index].roles || [];
    if (rolesArray.includes(roleVal)) {
      updated[index].roles = rolesArray.filter(r => r !== roleVal);
    } else {
      updated[index].roles = [...rolesArray, roleVal];
    }
    setMenus(updated);
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await updateSettings({
        brandName,
        brandSubtitle,
        logo,
        themeColor,
        footerText,
        menus
      });
      toast.success('Organization branding and sidebar configuration updated successfully!');
      reloadSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update configurations');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Are you sure you want to reset all branding settings and menus to defaults?')) return;
    setBrandName('TrackBells ERP');
    setBrandSubtitle('Factory Automation');
    setLogo('/logo.png');
    setThemeColor('#f97316');
    setFooterText('Powered by Cyberbells ITES services pvt ltd');
    setMenus([
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
    ]);
  };

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <DashboardLayout pageTitle="Settings">
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--danger)' }}>
          <h3>Access Denied</h3>
          <p>Only the Organization Admin can access configuration settings.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Workspace Configuration">
      <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px' }}>

        {/* TABS NAVBAR */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', overflowX: 'auto' }}>
          {user?.role === 'super_admin' && (
            <button
              onClick={() => setActiveTab('security')}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: activeTab === 'security' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                color: activeTab === 'security' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition-fast)', whiteSpace: 'nowrap'
              }}
            >
              🛡️ Security & Compliance
            </button>
          )}
          <button
            onClick={() => setActiveTab('branding')}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: activeTab === 'branding' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
              color: activeTab === 'branding' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition-fast)', whiteSpace: 'nowrap'
            }}
          >
            🎨 Branding & Theme
          </button>
          <button
            onClick={() => setActiveTab('menus')}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: activeTab === 'menus' ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
              color: activeTab === 'menus' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition-fast)', whiteSpace: 'nowrap'
            }}
          >
            📋 Sidebar & Menu Access
          </button>
        </div>

        {/* TAB 1: SECURITY & COMPLIANCE */}
        {activeTab === 'security' && user?.role === 'super_admin' && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconShield style={{ color: 'var(--primary)' }} /> Security Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px' }}>
              Manage organization-wide device and compliance parameters.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={settingRowStyle}>
                <div>
                  <div style={settingTitleStyle}>Disable Screenshots (Mobile App)</div>
                  <div style={settingDescStyle}>Enables FLAG_SECURE on mobile nodes to prevent visual data leaks.</div>
                </div>
                <ToggleSwitch checked={securitySettings.disableScreenshots} onChange={() => handleSecurityToggle('disableScreenshots')} />
              </div>

              <div style={settingRowStyle}>
                <div>
                  <div style={settingTitleStyle}>Require Biometric Login</div>
                  <div style={settingDescStyle}>Enforce face/fingerprint authentication on mobile scanner nodes.</div>
                </div>
                <ToggleSwitch checked={securitySettings.requireBiometric} onChange={() => handleSecurityToggle('requireBiometric')} />
              </div>

              <div style={settingRowStyle}>
                <div>
                  <div style={settingTitleStyle}>Strict Department Isolation</div>
                  <div style={settingDescStyle}>Prevent roles from accessing other department logs (e.g. sales views supervisor logs).</div>
                </div>
                <ToggleSwitch checked={securitySettings.restrictCrossDepartment} onChange={() => handleSecurityToggle('restrictCrossDepartment')} />
              </div>

              <div style={settingRowStyle}>
                <div>
                  <div style={settingTitleStyle}>Enable Mobile App Access</div>
                  <div style={settingDescStyle}>Permit employee connections via React Native application endpoints.</div>
                </div>
                <ToggleSwitch checked={securitySettings.allowMobileApp} onChange={() => handleSecurityToggle('allowMobileApp')} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSaveSecurity} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconLock /> {saving ? 'Saving...' : 'Save Policies'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: BRANDING & THEME */}
        {activeTab === 'branding' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
            {/* Form inputs */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏢 Organization Branding
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Brand Name *</label>
                    <input className="form-input" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. TrackBells ERP" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand Subtitle</label>
                    <input className="form-input" value={brandSubtitle} onChange={e => setBrandSubtitle(e.target.value)} placeholder="e.g. Factory Automation" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr', gap: '16px', alignItems: 'end' }}>
                  <div className="form-group">
                    <label className="form-label">Logo (Emoji or Image URL) *</label>
                    <input className="form-input" value={logo} onChange={e => setLogo(e.target.value)} placeholder="e.g. 🏭 or https://..." required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Primary Color *</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input type="color" value={themeColor} onChange={e => setThemeColor(e.target.value)} style={{ width: '44px', height: '42px', padding: '0', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{themeColor}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Footer Copyright Text</label>
                  <input className="form-input" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="e.g. Powered by Cyberbells ITES..." />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleResetDefaults} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  Reset Defaults
                </button>
                <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving}>
                  {saving ? 'Updating Branding...' : 'Apply Branding & Theme'}
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', border: '1px dashed var(--border)' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sidebar Header Live Preview</h4>
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: logo && (logo.startsWith('http') || logo.startsWith('/') || logo.startsWith('data:')) && !logo.includes('logo.png') ? '#ffffff' : `linear-gradient(135deg, ${themeColor}, ${themeColor}aa)`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    color: '#fff',
                    padding: logo && (logo.startsWith('http') || logo.startsWith('/') || logo.startsWith('data:')) && !logo.includes('logo.png') ? '4px' : '0'
                  }}>
                    {logo && (logo.startsWith('http') || logo.startsWith('/') || logo.startsWith('data:')) ? (
                      <img src={getImageUrl(logo)} alt="Logo" style={{ maxHeight: '32px', maxWidth: '32px', borderRadius: '2px', objectFit: 'contain' }} />
                    ) : (
                      logo || '🏭'
                    )}
                  </div>
                  <div>
                    <h5 style={{ margin: 0, color: '#0f172a', fontSize: '0.95rem', fontWeight: 700 }}>{brandName || 'TrackBells ERP'}</h5>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>{brandSubtitle || 'Factory Automation'}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', border: '1px dashed var(--border)' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>UI Accent Color Preview</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button className="btn btn-primary" style={{ background: themeColor, borderColor: themeColor }} onClick={() => toast.success(`This is a preview of the Primary Button with theme color ${themeColor}`)}>Primary Button</button>
                  <button className="btn btn-secondary" style={{ color: themeColor, borderColor: themeColor }} onClick={() => toast.success(`This is a preview of the Outline Button with theme color ${themeColor}`)}>Outline Button</button>
                  <span style={{ display: 'inline-flex', padding: '4px 12px', borderRadius: '12px', background: `${themeColor}20`, color: themeColor, fontSize: '0.75rem', fontWeight: 600, alignItems: 'center', cursor: 'pointer' }} onClick={() => toast.success(`This is a preview of the Badge/Status color`)}>Active Status</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', border: '1px dashed var(--border)' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Footer Live Preview</h4>
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                  <p>© 2026 {brandName || 'TrackBells'}</p>
                  <p style={{ marginTop: '4px', fontWeight: 600, color: themeColor }}>{footerText || 'Powered by Cyberbells ITES services pvt ltd'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIDEBAR & MENU CONFIGURATOR */}
        {activeTab === 'menus' && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📋 App Navigation Configuration
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Rename menus, show/hide them globally, and select role checkboxes to dynamically configure which teams see which links.
            </p>

            <div style={{ overflowX: 'auto', marginBottom: '28px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--border-light)', borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>Menu Identifier</th>
                    <th style={thStyle}>Display Label</th>
                    <th style={thStyle}>Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {menus.map((menu, index) => (
                    <tr key={menu.key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={tdCellStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{menu.key}</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>Path: {menu.path}</div>
                      </td>
                      <td style={tdCellStyle}>
                        <input className="form-input" value={menu.label} onChange={e => handleMenuLabelChange(index, e.target.value)} style={{ padding: '6px 12px', fontSize: '0.85rem', width: '160px' }} />
                      </td>
                      <td style={tdCellStyle}>
                        <ToggleSwitch checked={menu.visible} onChange={() => handleMenuVisibilityToggle(index)} />
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleResetDefaults} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                Reset Defaults
              </button>
              <button className="btn btn-primary" onClick={handleSaveConfig} disabled={saving}>
                {saving ? 'Saving Sidebar Config...' : 'Apply Sidebar Settings'}
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

// Styles
const settingRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '20px',
  borderBottom: '1px solid var(--border-light)'
};

const settingTitleStyle = {
  color: 'var(--text-primary)',
  fontWeight: 600,
  fontSize: '1rem'
};

const settingDescStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  marginTop: '4px'
};

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  fontSize: '0.72rem',
  letterSpacing: '0.5px'
};

const tdCellStyle = {
  padding: '12px 16px',
  verticalAlign: 'middle',
  color: 'var(--text-secondary)'
};

const ToggleSwitch = ({ checked, onChange }) => (
  <div
    onClick={onChange}
    style={{
      width: '40px', height: '22px', background: checked ? 'var(--primary, #f97316)' : 'var(--bg-input, #e2e8f0)',
      borderRadius: '11px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
    }}
  >
    <div style={{
      width: '18px', height: '18px', background: '#fff', borderRadius: '50%',
      position: 'absolute', top: '2px', left: checked ? '20px' : '2px', transition: 'left 0.3s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    }} />
  </div>
);

export default SettingsDashboard;
