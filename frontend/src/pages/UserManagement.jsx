import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch,
  HiOutlineX, HiOutlineRefresh, HiOutlineUsers, HiOutlineShieldCheck,
  HiOutlineBan, HiEye, HiEyeOff
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    return `${SOCKET_URL}${url}`;
  }
  return url;
};


const ROLES = [
  { value: 'super_admin', label: 'Super Admin', color: '#ef4444', emoji: '👑' },
  { value: 'admin', label: 'Admin', color: '#f97316', emoji: '🛡️' },
  { value: 'gate_guard', label: 'Security Guard', color: '#06b6d4', emoji: '💂' },
  { value: 'supervisor', label: 'Supervisor', color: '#a855f7', emoji: '👷' },
  { value: 'store_manager', label: 'Store Manager', color: '#22c55e', emoji: '📦' },
  { value: 'sales', label: 'Sales', color: '#3b82f6', emoji: '🛒' },
  { value: 'quality_checker', label: 'Quality Checker', color: '#8b5cf6', emoji: '📋' },
  { value: 'user', label: 'User (Custom)', color: '#94a3b8', emoji: '👤' },
];

const getRoleInfo = (role) => ROLES.find(r => r.value === role) || ROLES[6];

const PERMISSIONS = [
  { value: 'gate_entry', label: 'Gate Entry' },
  { value: 'production', label: 'Production' },
  { value: 'store', label: 'Store' },
  { value: 'orders', label: 'Orders' },
  { value: 'reports', label: 'Reports / Analytics' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR & Payroll' }
];

const emptyForm = {
  name: '', email: '', password: '', phone: '', department: '', role: 'user', permissions: [],
  orgName: '', orgIndustry: 'Manufacturing', orgAddress: ''
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [newPermissions, setNewPermissions] = useState([]);

  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '', email: '', phone: '', department: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterRole]);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data.data);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      toast.error('Fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.createUser(formData);
      toast.success(`${getRoleInfo(formData.role).label} account created!`);
      setShowModal(false);
      setFormData(emptyForm);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (u) => {
    setEditData({ id: u._id, name: u.name, email: u.email, phone: u.phone || '', department: u.department || '', profileImage: u.profileImage || '' });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.name || !editData.email) {
      toast.error('Name and Email are required');
      return;
    }
    setSubmitting(true);
    try {
      await adminAPI.updateUser(editData.id, editData);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async () => {
    if (!newRole || !selectedUser) return;
    try {
      await adminAPI.updateRole(selectedUser._id, newRole, newRole === 'user' ? newPermissions : []);
      toast.success(`Role updated to ${getRoleInfo(newRole).label}`);
      setShowRoleModal(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role update failed');
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await adminAPI.toggleStatus(userId);
      toast.success(res.data.message);
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status toggle failed');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const openRoleModal = (u) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setNewPermissions(u.permissions || []);
    setShowRoleModal(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

  return (
    <DashboardLayout pageTitle="User Management">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Users', value: stats?.totalUsers ?? '--', color: 'blue' },
          { label: 'Active', value: stats?.activeUsers ?? '--', color: 'green' },
          { label: 'Inactive', value: stats?.inactiveUsers ?? '--', color: 'orange' },
          { label: 'Roles', value: stats?.roleDistribution?.length ?? '--', color: 'purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color} fade-in-up`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role Distribution */}
      {stats?.roleDistribution && (() => {
        const processedDistribution = [];
        let adminSum = 0;
        stats.roleDistribution.forEach(rd => {
          if (rd._id === 'super_admin' || rd._id === 'admin') {
            adminSum += rd.count;
          } else {
            processedDistribution.push(rd);
          }
        });
        if (adminSum > 0) {
          // Find the index to place it, let's keep Admins first by unshifting it
          processedDistribution.unshift({ _id: 'super_admin,admin', count: adminSum });
        }
        return (
          <div style={{
            display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'
          }}>
            {processedDistribution.map((rd, i) => {
              let info = getRoleInfo(rd._id);
              if (rd._id === 'super_admin,admin') {
                info = { value: 'super_admin,admin', label: 'Admins', emoji: '🏢', color: '#f97316' };
              }
              return (
                <div key={i} style={{
                  padding: '8px 16px', borderRadius: '10px',
                  background: `${info.color}10`, border: `1px solid ${info.color}25`,
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }} onClick={() => { setFilterRole(rd._id); setPagination(p => ({ ...p, page: 1 })); }}>
                  <span>{info.emoji}</span>
                  <span style={{ fontSize: '0.8rem', color: info.color, fontWeight: 600 }}>{info.label}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem',
                    background: `${info.color}20`, color: info.color, fontWeight: 700
                  }}>{rd.count}</span>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '360px' }}>
          <HiOutlineSearch style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: '#6b7a99', fontSize: '1.1rem'
          }} />
          <input className="form-input" placeholder="Search name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ paddingLeft: '38px', height: '42px', fontSize: '0.85rem' }} />
        </div>
        <select className="form-input" value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          style={{ width: '180px', height: '42px', fontSize: '0.85rem', cursor: 'pointer' }}>
          <option value="">All Roles</option>
          <option value="super_admin,admin">🏢 Admins</option>
          {ROLES.filter(r => r.value !== 'super_admin' && r.value !== 'admin').map(r => (
            <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
          ))}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterRole(''); }}
          style={{ height: '42px' }}>
          <HiOutlineRefresh /> Reset
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => { setFormData(emptyForm); setShowModal(true); }}
          style={{ height: '42px' }}>
          <HiOutlinePlus /> Create User
        </button>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['User', 'Organization', 'Role', 'Phone', 'Status', 'Last Login', 'Actions'].map((h, i) => (
                  <th key={i} style={{
                    padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem',
                    fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '1px', background: 'var(--bg-input)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#6b7a99' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading users...
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#6b7a99' }}>
                  <HiOutlineUsers style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.3 }} />
                  <p>No users found</p>
                </td></tr>
              ) : users.map((u) => {
                const roleInfo = getRoleInfo(u.role);
                const isCurrentUser = u._id === currentUser?._id;
                
                let displayLabel = roleInfo.label;
                let displayColor = roleInfo.color;
                let displayEmoji = roleInfo.emoji;

                if (u.role === 'super_admin') {
                  if (u.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL) {
                    displayLabel = 'Platform Admin';
                    displayColor = '#3b82f6'; // Blue
                    displayEmoji = '👑';
                  } else {
                    displayLabel = 'Org Admin';
                    displayColor = '#f97316'; // Orange
                    displayEmoji = '🏢';
                  }
                }
                
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '10px',
                          background: `linear-gradient(135deg, ${displayColor}40, ${displayColor}20)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.85rem', fontWeight: 700, color: displayColor, flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {u.profileImage ? (
                            <img src={getImageUrl(u.profileImage)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            u.name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
                            {u.name} {isCurrentUser && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {u.organizationId?.name || '--'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                        background: `${displayColor}12`, color: displayColor,
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>{displayEmoji} {displayLabel}</span>
                    </td>
                    <td style={tdStyle}><span style={{ color: 'var(--text-secondary)' }}>{u.phone || '--'}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600,
                        background: u.isActive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                        color: u.isActive ? 'var(--success)' : 'var(--danger)'
                      }}>{u.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={tdStyle}><span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{formatDate(u.lastLogin)}</span></td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '6px' }}>
                      {!isCurrentUser && (
                        <>
                          <ActionBtn icon={<HiOutlinePencil />} title="Edit User" color="#3b82f6"
                            onClick={() => openEditModal(u)} />
                          <ActionBtn icon={<HiOutlineShieldCheck />} title="Change Role" color="#a855f7"
                            onClick={() => openRoleModal(u)} />
                          <ActionBtn icon={u.isActive ? <HiOutlineBan /> : <HiOutlineShieldCheck />}
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                            color={u.isActive ? '#f97316' : '#22c55e'}
                            onClick={() => handleToggleStatus(u._id)} />
                          {(
                            (currentUser?.role === 'super_admin' && u.role !== 'super_admin') ||
                            (currentUser?.email === process.env.REACT_APP_PLATFORM_ADMIN_EMAIL)
                          ) && (
                            <ActionBtn icon={<HiOutlineTrash />} title="Delete" color="#ef4444"
                              onClick={() => handleDelete(u._id)} />
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderTop: '1px solid var(--border)',
            fontSize: '0.82rem', color: 'var(--text-dim)'
          }}>
            <span>Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <PagBtn disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>← Prev</PagBtn>
              {[...Array(Math.min(pagination.pages, 5))].map((_, i) => (
                <PagBtn key={i} active={pagination.page === i + 1} onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}>{i + 1}</PagBtn>
              ))}
              <PagBtn disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next →</PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ===== CREATE USER MODAL ===== */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: '520px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                👤 Create New User
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer'
              }}><HiOutlineX /></button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Enter name" value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email *</label>
                  <input className="form-input" type="email" placeholder="Enter email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                 <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password *</label>
                  <div className="form-input-icon" style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 chars"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-dim)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 10
                      }}
                    >
                      {showPassword ? <HiEyeOff /> : <HiEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone</label>
                  <input className="form-input" placeholder="Phone number" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label">Role *</label>
                  <select className="form-input" value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value, permissions: e.target.value === 'user' ? [] : formData.permissions })}
                    style={{ cursor: 'pointer' }}>
                    {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                      <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.role === 'admin' && (
                <div style={{
                  marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                  padding: '16px', background: 'rgba(249,115,22,0.04)', borderRadius: '12px',
                  border: '1px solid rgba(249,115,22,0.12)'
                }}>
                  <h4 style={{ gridColumn: '1 / -1', margin: '0 0 4px 0', fontSize: '0.9rem', color: '#f97316', fontWeight: 600 }}>
                    🏢 Organization Details
                  </h4>
                  <p style={{ gridColumn: '1 / -1', margin: '0 0 8px 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Fill these to create a new organization/workspace. Leave blank to add to your current organization.
                  </p>
                  <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Organization Name</label>
                    <input className="form-input" placeholder="Enter organization name" value={formData.orgName}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Industry</label>
                    <select className="form-input" value={formData.orgIndustry}
                      onChange={(e) => setFormData({ ...formData, orgIndustry: e.target.value })}
                      style={{ cursor: 'pointer' }}>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Textiles">Textiles</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Address</label>
                    <input className="form-input" placeholder="Organization address" value={formData.orgAddress}
                      onChange={(e) => setFormData({ ...formData, orgAddress: e.target.value })} />
                  </div>
                </div>
              )}

              {formData.role === 'user' && (
                <div style={{ marginTop: '16px' }}>
                  <label className="form-label">Permissions (Select Modules)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                    {PERMISSIONS.map(p => (
                      <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                          checked={formData.permissions.includes(p.value)}
                          onChange={(e) => {
                            const newPerms = e.target.checked 
                              ? [...formData.permissions, p.value]
                              : formData.permissions.filter(x => x !== p.value);
                            setFormData({ ...formData, permissions: newPerms });
                          }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
                background: formData.role === 'admin' ? 'rgba(249,115,22,0.08)' : 'rgba(59,130,246,0.08)',
                border: formData.role === 'admin' ? '1px solid rgba(249,115,22,0.2)' : '1px solid rgba(59,130,246,0.2)'
              }}>
                <span style={{ fontSize: '0.8rem', color: formData.role === 'admin' ? '#f97316' : '#3b82f6', fontWeight: 500 }}>
                  {formData.role === 'admin' ? '🛡️ Admin — will have full access to all modules. Fill Organization Details to make this user an Org Admin (Super Admin).' : '👤 User — will only access the checked modules above.'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ===== CHANGE ROLE MODAL ===== */}
      {showRoleModal && selectedUser && (
        <ModalOverlay onClose={() => setShowRoleModal(false)}>
          <div style={{ maxWidth: '420px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                🛡️ Change Role
              </h3>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', color: '#6b7a99', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
            </div>

            <div style={{
              padding: '14px', borderRadius: '10px', marginBottom: '20px',
              background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)'
            }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{selectedUser.name}</div>
              <div style={{ color: '#6b7a99', fontSize: '0.82rem' }}>{selectedUser.email}</div>
              <div style={{ marginTop: '6px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem',
                  background: `${getRoleInfo(selectedUser.role).color}12`,
                  color: getRoleInfo(selectedUser.role).color, fontWeight: 600
                }}>Current: {getRoleInfo(selectedUser.role).label}</span>
              </div>
            </div>

            <label className="form-label">Select Base Role</label>
            <select className="form-input" value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ cursor: 'pointer', marginBottom: '20px' }}>
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.emoji} {r.label}</option>
              ))}
            </select>

            {newRole === 'user' && (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Assign Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                  {PERMISSIONS.map(p => (
                    <label key={p.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input type="checkbox" style={{ accentColor: '#3b82f6', width: '16px', height: '16px' }}
                        checked={newPermissions.includes(p.value)}
                        onChange={(e) => {
                          const newPerms = e.target.checked 
                            ? [...newPermissions, p.value]
                            : newPermissions.filter(x => x !== p.value);
                          setNewPermissions(newPerms);
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={handleRoleChange}>Update Role</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <ModalOverlay onClose={() => setShowEditModal(false)}>
          <div style={{ maxWidth: '520px', width: '100%', padding: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Edit Profile
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: '#6b7a99', fontSize: '1.4rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#6b7a99'}><HiOutlineX /></button>
            </div>

            {/* Avatar Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px',
              padding: '24px', background: 'linear-gradient(145deg, rgba(59,130,246,0.08), rgba(168,85,247,0.04))',
              borderRadius: '16px', border: '1px solid rgba(59,130,246,0.1)'
            }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', fontWeight: 700, color: '#ffffff', boxShadow: '0 8px 16px rgba(59,130,246,0.2)',
                overflow: 'hidden'
              }}>
                {editData.profileImage ? (
                  <img src={getImageUrl(editData.profileImage)} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  editData.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{editData.name || 'User'}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Update user details and contact info</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 500, letterSpacing: '0.5px' }}>FULL NAME *</label>
                  <input type="text" className="form-input" value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })} required 
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 500, letterSpacing: '0.5px' }}>EMAIL ADDRESS *</label>
                  <input type="email" className="form-input" value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })} required 
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 500, letterSpacing: '0.5px' }}>PHONE NUMBER</label>
                  <input type="text" className="form-input" value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })} 
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 500, letterSpacing: '0.5px' }}>DEPARTMENT</label>
                  <input type="text" className="form-input" value={editData.department}
                    onChange={(e) => setEditData({ ...editData, department: e.target.value })} 
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}
                  style={{ padding: '10px 24px', border: 'none' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}
                  style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

// Helpers
const tdStyle = { padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', verticalAlign: 'middle' };

const ActionBtn = ({ icon, title, color, onClick }) => (
  <button onClick={onClick} title={title} style={{
    width: '32px', height: '32px', borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: `1px solid var(--border)`, color,
    cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s'
  }} onMouseOver={e => e.currentTarget.style.background = `var(--bg-input)`}
     onMouseOut={e => e.currentTarget.style.background = `transparent`}
  >{icon}</button>
);

const PagBtn = ({ children, active, disabled, onClick }) => (
  <button onClick={onClick} disabled={disabled} style={{
    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500,
    background: active ? 'var(--primary-glow)' : 'transparent',
    border: `1px solid ${active ? 'var(--border-primary)' : 'var(--border)'}`,
    color: active ? 'var(--primary)' : disabled ? 'var(--text-ghost)' : 'var(--text-dim)',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
  }}>{children}</button>
);

const ModalOverlay = ({ children, onClose }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
  }}>
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: '20px',
      padding: '32px', maxHeight: '90vh', overflowY: 'auto',
      animation: 'fadeInUp 0.3s ease', width: '100%', maxWidth: '640px'
    }}>{children}</div>
  </div>
);

export default UserManagement;
