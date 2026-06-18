import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useOrg } from '../../context/OrgContext';
import { notificationAPI, adminOrgAPI, authAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { compressImage } from '../../services/compress';
import {
  HiOutlineHome, HiOutlineTruck, HiOutlineCog, HiOutlineClipboardCheck,
  HiOutlineCube, HiOutlineShoppingCart, HiOutlineChartBar, HiOutlineLightningBolt,
  HiOutlineBell, HiOutlineLogout, HiOutlineAdjustments, HiOutlineUsers,
  HiOutlineDocumentReport, HiOutlineUserGroup, HiOutlineMenu, HiOutlineOfficeBuilding,
  HiOutlineSun, HiOutlineMoon
} from 'react-icons/hi';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://localhost:9898`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    return `${SOCKET_URL}${url}`;
  }
  return url;
};


// Role-based menu configuration
const getMenuForRole = (role, email, permissions = []) => {
  const allMenus = {
    dashboard: { icon: <HiOutlineHome />, label: 'Tracker Dashboard', path: '/dashboard' },
    gateGuard: { icon: <HiOutlineTruck />, label: 'Gate Operations', path: '/gate-guard' },
    supervisor: { icon: <HiOutlineCog />, label: 'Production Line', path: '/supervisor' },
    qualityChecker: { icon: <HiOutlineClipboardCheck />, label: 'Quality Control', path: '/quality' },
    storeManager: { icon: <HiOutlineCube />, label: 'Store & Godown', path: '/store' },
    sales: { icon: <HiOutlineShoppingCart />, label: 'Sales & Orders', path: '/sales' },
    users: { icon: <HiOutlineUsers />, label: 'User Management', path: '/users' },
    organizations: { icon: <HiOutlineOfficeBuilding />, label: 'SaaS Tenants', path: '/admin/organizations' },
    settings: { icon: <HiOutlineAdjustments />, label: 'Settings', path: '/settings' },
    support: { icon: <HiOutlineDocumentReport />, label: 'Help & Support', path: '/admin/support' },
  };

  // Define what each role can see
  const roleMenus = {
    super_admin: [
      { section: 'Enterprise', items: ['dashboard', 'users', 'support'] },
      { section: 'Gate Log', items: ['gateGuard'] },
      { section: 'Production', items: ['supervisor'] },
      { section: 'QC Inspection', items: ['qualityChecker'] },
      { section: 'Store Operations', items: ['storeManager'] },
      { section: 'Sales Log', items: ['sales'] },
      { section: 'Platform', items: ['settings'] }
    ],
    admin: [
      { section: 'Enterprise', items: ['dashboard', 'users'] }
    ],
    gate_guard: [
      { section: 'Gate Log', items: ['gateGuard'] }
    ],
    supervisor: [
      { section: 'Production', items: ['supervisor'] }
    ],
    quality_checker: [
      { section: 'QC Inspection', items: ['qualityChecker'] }
    ],
    store_manager: [
      { section: 'Store Operations', items: ['storeManager'] }
    ],
    sales: [
      { section: 'Sales Log', items: ['sales'] }
    ]
  };

  const menuConfig = roleMenus[role] || [{ section: 'Main', items: ['dashboard'] }];

  return menuConfig.map(section => ({
    section: section.section,
    items: section.items.map(key => allMenus[key]).filter(Boolean)
  }));
};

const ICON_MAP = {
  HiOutlineHome: <HiOutlineHome />,
  HiOutlineTruck: <HiOutlineTruck />,
  HiOutlineCog: <HiOutlineCog />,
  HiOutlineClipboardCheck: <HiOutlineClipboardCheck />,
  HiOutlineCube: <HiOutlineCube />,
  HiOutlineShoppingCart: <HiOutlineShoppingCart />,
  HiOutlineChartBar: <HiOutlineChartBar />,
  HiOutlineLightningBolt: <HiOutlineLightningBolt />,
  HiOutlineBell: <HiOutlineBell />,
  HiOutlineLogout: <HiOutlineLogout />,
  HiOutlineAdjustments: <HiOutlineAdjustments />,
  HiOutlineUsers: <HiOutlineUsers />,
  HiOutlineDocumentReport: <HiOutlineDocumentReport />,
  HiOutlineUserGroup: <HiOutlineUserGroup />,
  HiOutlineMenu: <HiOutlineMenu />,
  HiOutlineOfficeBuilding: <HiOutlineOfficeBuilding />
};

const ROLE_LABELS = {
  super_admin: 'Platform Admin',
  admin: 'Organisation Admin',
  gate_guard: 'Gate Guard',
  supervisor: 'Supervisor',
  quality_checker: 'Quality Checker',
  store_manager: 'Store Manager',
  sales: 'Sales Officer'
};

const ROLE_COLORS = {
  super_admin: '#0078d4',
  admin: '#8660a9',
  gate_guard: '#00b7c3',
  supervisor: '#107c41',
  quality_checker: '#c43e1c',
  store_manager: '#f2c811',
  sales: '#a855f7'
};

const DashboardLayout = ({ children, pageTitle = 'Dashboard' }) => {
  const { user, setUser, logout, isReverificationRequired, setIsReverificationRequired } = useAuth();
  const { settings } = useOrg();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const prevNotifCount = useRef(0);
  const bellRef = useRef(null);

  // Profile State
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const profileRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  const handleProfileImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingProfile(true);
    try {
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append('file', compressedFile);

      const uploadRes = await uploadAPI.uploadFile(formData);
      if (uploadRes.data && uploadRes.data.success) {
        const fileUrl = uploadRes.data.fileUrl;
        
        // Update user profile in backend
        const updateRes = await authAPI.updateProfile({ profileImage: fileUrl });
        if (updateRes.data && updateRes.data.success) {
          // Update user in context
          const updatedUser = { ...user, profileImage: fileUrl };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success('Profile image updated successfully!');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload profile image');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Superadmin Org Selection State
  const [orgs, setOrgs] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(localStorage.getItem('selectedOrgId') || '');

  useEffect(() => {
    const fetchOrgs = async () => {
      if (user?.role === 'super_admin' && !user?.organizationId) {
        try {
          const res = await adminOrgAPI.getAll();
          setOrgs(res.data.data || []);
        } catch (err) {
          console.error('Failed to load organizations for superadmin selector', err);
        }
      }
    };
    fetchOrgs();
  }, [user]);

  const handleOrgChange = (e) => {
    const orgId = e.target.value;
    setSelectedOrgId(orgId);
    if (orgId) {
      localStorage.setItem('selectedOrgId', orgId);
    } else {
      localStorage.removeItem('selectedOrgId');
    }
    window.location.reload();
  };

  const isPlatformPage = ['/admin/organizations', '/settings'].includes(location.pathname);
  const needsOrgSelection = user?.role === 'super_admin' && !user?.organizationId && !selectedOrgId && !isPlatformPage;

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);

  const playSound = () => {
    // Use Web Audio API beep for reliable cross-browser sound without external file
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log(e); }
  };

  const fetchNotifications = async () => {
    if (!isAdmin) return;
    try {
      const res = await notificationAPI.getNotifications();
      const notifs = res.data.data;
      setNotifications(notifs);
      
      const unreadCount = notifs.filter(n => !n.isRead).length;
      if (unreadCount > prevNotifCount.current) {
        playSound(); // Play sound if new unread appears
      }
      prevNotifCount.current = unreadCount;
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000); // Poll every 20s as fallback

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      
      socket.on('connect', () => {
        socket.emit('join_org', user.organizationId);
      });

      const refresh = () => {
        fetchNotifications();
      };

      socket.on('build_updated', refresh);
      socket.on('inventory_updated', refresh);
      socket.on('quality_updated', refresh);
      socket.on('machine_updated', refresh);
      socket.on('gate_entry_updated', refresh);
    }

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user?.organizationId]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      fetchNotifications();
    } catch (e) { }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      fetchNotifications();
      setShowNotifPanel(false);
    } catch (e) { }
  };

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setShowNotifPanel(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfilePanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bellRef, profileRef]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Dynamically compile menu items based on organization settings database config
  const rawMenus = [...(settings?.menus || [])];
  
  // Always ensure dashboard menu is at the very top of the sidebar for super_admin and admin
  if (['super_admin', 'admin'].includes(user?.role)) {
    const dashIndex = rawMenus.findIndex(m => m.key === 'dashboard');
    if (dashIndex > -1) {
      const [dash] = rawMenus.splice(dashIndex, 1);
      rawMenus.unshift(dash);
    } else {
      rawMenus.unshift({
        key: 'dashboard',
        label: 'Tracker Dashboard',
        icon: 'HiOutlineHome',
        path: '/dashboard',
        visible: true,
        roles: ['super_admin', 'admin']
      });
    }
  }

  // Always ensure support menu is present in the list for platform admin
  if (user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL && !rawMenus.some(m => m.key === 'support')) {
    rawMenus.push({
      key: 'support',
      label: 'Help & Support',
      icon: 'HiOutlineDocumentReport',
      path: '/admin/support',
      visible: true,
      roles: ['super_admin']
    });
  }

  const activeMenus = rawMenus
    .filter(item => {
      // 1. Must be marked visible globally
      if (!item.visible) return false;
      
      // Platform-level menus only visible to platform admin
      if (['organizations', 'support'].includes(item.key)) {
        return user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;
      }

      // 2. Role access check
      if (item.roles && item.roles.length > 0) {
        // Platform admin gets access to everything
        if (user?.role === 'super_admin' && user?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL) return true;
        return item.roles.includes(user?.role);
      }
      return true;
    });

  // Group menus by section dynamically
  const menuItems = [];
  activeMenus.forEach(item => {
    let sectionName = item.section;
    if (!sectionName) {
      if (['dashboard', 'users'].includes(item.key)) sectionName = 'Enterprise';
      else if (item.key === 'gateGuard') sectionName = 'Gate Log';
      else if (item.key === 'supervisor') sectionName = 'Production';
      else if (item.key === 'qualityChecker') sectionName = 'QC Inspection';
      else if (item.key === 'storeManager') sectionName = 'Store Operations';
      else if (item.key === 'sales') sectionName = 'Sales Log';
      else if (['organizations', 'settings'].includes(item.key)) sectionName = 'Platform';
      else sectionName = 'General';
    }

    let sect = menuItems.find(s => s.section === sectionName);
    if (!sect) {
      sect = { section: sectionName, items: [] };
      menuItems.push(sect);
    }
    
    // Resolve icon component from string name
    const iconComponent = ICON_MAP[item.icon] || <HiOutlineHome />;
    
    sect.items.push({
      ...item,
      icon: iconComponent
    });
  });

  let roleLabel = ROLE_LABELS[user?.role] || 'User';
  if (user?.role === 'super_admin') {
    roleLabel = user.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL ? 'Platform Admin' : 'Organisation Admin';
  }
  const roleColor = ROLE_COLORS[user?.role] || '#8892b0';

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await adminOrgAPI.reverifyOTP({ otp });
      toast.success('Reverification successful!');
      setIsReverificationRequired(false);
      window.location.reload(); // Refresh to clear state and fetch data
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await adminOrgAPI.resendReverifyOTP();
      toast.success('OTP resent to your email');
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  if (isReverificationRequired) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="glass-card" style={{ maxWidth: '450px', width: '100%', padding: '40px', textAlign: 'center', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: '3rem', color: 'var(--danger)', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px' }}>Reverification Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
            Your organization's access has been temporarily suspended pending verification.
            Please click "Send OTP" to email your Organization Admin, then enter the code to unlock your workspace.
          </p>

          <form onSubmit={handleVerifyOTP}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Enter 6-digit OTP" 
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              required
              style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '4px', marginBottom: '16px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '12px' }} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify OTP & Unlock'}
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleResendOTP}>
                Send OTP
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{
      backgroundImage: 'var(--auth-bg-gradient), url("/factory_bg.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={settings.logo?.includes('logo.png') ? { padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)' } : {}}>
          {settings.logo && settings.logo.includes('logo.png') ? (
            <>
              <div className="logo" style={{ background: 'none', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0, flexShrink: 0 }}>
                <img src="/logo_icon.png" alt="TrackBells Icon" style={{ maxHeight: '48px', maxWidth: '48px', objectFit: 'contain' }} />
              </div>
              <div className="brand" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>TrackBells</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, lineHeight: 1.2 }}>ERP Automation</span>
              </div>
            </>
          ) : (
            <>
              {settings.logo && (settings.logo.startsWith('http') || settings.logo.startsWith('/') || settings.logo.startsWith('data:') || settings.logo.startsWith('blob:')) ? (
                <div className="logo">
                  <img src={getImageUrl(settings.logo)} alt="Logo" style={{ maxHeight: '36px', maxWidth: '36px', borderRadius: '4px' }} />
                </div>
              ) : (
                <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '1.8rem' }}>{settings.logo || '🏭'}</span>
                </div>
              )}
              <div className="brand">
                <h3>{settings.brandName || 'TrackBells ERP'}</h3>
                <span>{settings.brandSubtitle || 'Factory Automation'}</span>
              </div>
            </>
          )}
        </div>

        {/* Role Badge */}
          <div style={{
            margin: '12px 16px', padding: '8px 14px',
            background: `${roleColor}12`, border: `1px solid ${roleColor}30`,
            borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: roleColor, boxShadow: `0 0 8px ${roleColor}60`
            }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: roleColor, letterSpacing: '0.5px' }}>
              {roleLabel}
            </span>
          </div>

        <nav className="sidebar-nav">
          {menuItems.map((section, si) => (
            <div className="sidebar-section" key={si}>
              <div className="sidebar-section-title">{section.section}</div>
              {section.items.map((item, ii) => (
                <div
                  key={ii}
                  className={`sidebar-item ${location.pathname === item.path ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!item.disabled) {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }
                  }}
                >
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && <span className="badge soon">{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div className="sidebar-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
              <span className="icon"><HiOutlineLogout /></span>
              <span>Logout</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <div className="main-content">
        <header className="top-navbar">
          <div className="navbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}>
              {settings?.logo && (settings.logo.startsWith('http') || settings.logo.startsWith('/') || settings.logo.startsWith('data:') || settings.logo.startsWith('blob:')) ? (
                <img src={getImageUrl(settings.logo)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '20px' }}>{settings?.logo || '🏭'}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {settings?.brandName || 'TrackBells ERP'}
              </h1>
              <span style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, lineHeight: 1.2, marginTop: '2px' }}>
                {pageTitle}
              </span>
            </div>
          </div>
          <div className="navbar-right">
            {user?.role === 'super_admin' && !user?.organizationId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '12px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Choose Org:</span>
                <select
                  value={selectedOrgId}
                  onChange={handleOrgChange}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select Organization --</option>
                  {orgs.map(org => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isAdmin && (
              <>
                <div className="notification-wrapper" ref={bellRef}>
                  <button className="navbar-icon-btn" onClick={() => setShowNotifPanel(!showNotifPanel)}>
                    <HiOutlineBell />
                    {unreadCount > 0 && <span className="notification-dot"></span>}
                  </button>

                {/* NOTIFICATION PANEL */}
                {showNotifPanel && (
                  <div className="notification-dropdown glass-card">
                    <div className="notif-header">
                      <h4>Notifications</h4>
                      {unreadCount > 0 && <button onClick={handleMarkAllRead} className="btn-text">Mark all read</button>}
                    </div>
                    <div className="notif-body">
                      {notifications.filter(n => !n.isRead).length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No notifications</div>
                      ) : notifications.filter(n => !n.isRead).map(n => (
                        <div key={n._id} className="notif-item unread" onClick={() => handleMarkRead(n._id)}>
                          <div className="notif-icon">
                            {n.type === 'user_added' ? <HiOutlineUsers /> : n.type === 'order_created' ? <HiOutlineShoppingCart /> : <HiOutlineBell />}
                          </div>
                          <div className="notif-content">
                            <h5>{n.title}</h5>
                            <p>{n.message}</p>
                            <span className="time">{new Date(n.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <div className="unread-dot"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </>
            )}
            
            <div className="profile-wrapper" ref={profileRef} style={{ position: 'relative' }}>
              <div className="user-menu" onClick={() => setShowProfilePanel(!showProfilePanel)} title="View Profile">
                <div className="user-avatar" style={{ overflow: 'hidden' }}>
                  {user?.profileImage ? (
                    <img src={getImageUrl(user.profileImage)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getUserInitials(user?.name)
                  )}
                </div>
                <div className="user-info">
                  <div className="user-name">{user?.name || 'User'}</div>
                  <div className="user-role" style={{ color: roleColor }}>{roleLabel}</div>
                </div>
              </div>

              {/* PROFILE PANEL */}
              {showProfilePanel && (
                <div className="notification-dropdown glass-card" style={{ width: '300px' }}>
                  <div className="notif-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 16px' }}>
                    <div className="user-avatar" style={{ width: '64px', height: '64px', fontSize: '1.5rem', background: `linear-gradient(135deg, ${roleColor}, var(--accent))`, overflow: 'hidden', position: 'relative' }}>
                      {user?.profileImage ? (
                        <img src={getImageUrl(user.profileImage)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        getUserInitials(user?.name)
                      )}
                    </div>
                    
                    {/* Upload button */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleProfileImageChange} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={uploadingProfile}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                      >
                        {uploadingProfile ? 'Uploading...' : 'Change Photo'}
                      </button>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '1.2rem', marginBottom: '4px' }}>{user?.name || 'User'}</h4>
                      <span style={{ fontSize: '0.8rem', color: roleColor, fontWeight: 600, background: `${roleColor}15`, padding: '4px 12px', borderRadius: '12px' }}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>
                  <div className="notif-body" style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Email</label>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.email}</div>
                    </div>
                    {user?.phone && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Mobile Number</label>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.phone}</div>
                      </div>
                    )}
                    
                    {/* Organization Field logic - Non-editable, hiding for platform super_admin if no org */}
                    {!['super_admin', 'admin'].includes(user?.role) && user?.organizationId && user?.organizationId?.name ? (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Organization</label>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.organizationId.name}</div>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px' }}>
                    <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleLogout}>
                      <HiOutlineLogout /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="dashboard-content">
          {needsOrgSelection ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              maxWidth: '600px',
              margin: '60px auto',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🏢</div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>
                Select an Organization to Manage
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px', maxWidth: '480px' }}>
                Aap platform Super Admin hain. Is page ke features (Add, Edit, Delete aur logs) ko view/manage karne ke liye kripya top navbar me se kisi ek <b>Organization</b> ko select karein.
              </p>
              {orgs.length > 0 && (
                <div style={{ width: '100%', maxWidth: '280px' }}>
                  <select
                    value={selectedOrgId}
                    onChange={handleOrgChange}
                    className="form-input"
                    style={{ textAlign: 'center', fontWeight: 600, cursor: 'pointer' }}
                  >
                    <option value="">-- Choose Organization --</option>
                    {orgs.map(org => (
                      <option key={org._id} value={org._id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <>
              {children}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
