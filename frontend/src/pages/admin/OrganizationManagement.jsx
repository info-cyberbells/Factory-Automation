import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminOrgAPI } from '../../services/api';
import { HiOutlineOfficeBuilding, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlinePlus, HiOutlineShieldCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

const OrganizationManagement = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Forms
  const [remark, setRemark] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '', industry: 'Manufacturing', address: '',
    adminName: '', adminEmail: '', adminPhone: '', adminPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    const intervalId = setInterval(() => {
      fetchOrganizations();
    }, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await adminOrgAPI.getAll();
      setOrganizations(res.data.data);
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this workspace?')) return;
    try {
      await adminOrgAPI.approve(id);
      toast.success('Workspace approved successfully!');
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    }
  };

  const openDeclineModal = (org) => {
    setSelectedOrg(org);
    setRemark('');
    setShowDeclineModal(true);
  };

  const handleForceReverify = async (id) => {
    if (!window.confirm('Are you sure you want to enforce reverification on this organization? All users will be locked out until the Admin enters the OTP.')) return;
    try {
      await adminOrgAPI.forceReverify(id);
      toast.success('Reverification enforced successfully. OTP sent to admin.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to enforce reverification');
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    if (!remark) return toast.error('Please enter a remark');
    
    try {
      await adminOrgAPI.decline(selectedOrg._id, remark);
      toast.success('Workspace declined');
      setShowDeclineModal(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Decline failed');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminOrgAPI.create(createForm);
      toast.success('Organization created & auto-approved successfully!');
      setShowCreateModal(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="SaaS Tenants Management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Platform Organizations</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>Approve, decline, or manually create new tenant workspaces.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <HiOutlinePlus /> Create Tenant
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>
      ) : (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                {['Organization Name', 'Industry', 'Admin Details', 'Status', 'Actions', 'Last Verified'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {organizations.map(org => (
                <tr key={org._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{org.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{org.address || 'No Address'}</div>
                  </td>
                  <td style={tdStyle}>{org.industry}</td>
                  <td style={tdStyle}>
                    {org.owner ? (
                      <>
                        <div style={{ color: 'var(--text-primary)' }}>{org.owner.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{org.owner.email}</div>
                      </>
                    ) : <span style={{ color: 'var(--danger)' }}>No Owner</span>}
                  </td>
                  <td style={tdStyle}>
                    <span className={`status-badge ${org.status === 'approved' ? 'verified' : org.status === 'declined' ? 'failed' : 'pending'}`}>
                      {org.status.toUpperCase()}
                    </span>
                    {org.status === 'declined' && <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: '4px' }}>{org.declineRemark}</div>}
                  </td>
                  <td style={tdStyle}>
                    {org.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }} onClick={() => handleApprove(org._id)}>
                          <HiOutlineCheckCircle /> Approve
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} onClick={() => openDeclineModal(org)}>
                          <HiOutlineXCircle /> Decline
                        </button>
                      </div>
                    )}
                    {org.status === 'approved' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm" style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' }} onClick={() => handleForceReverify(org._id)}>
                          <HiOutlineShieldCheck /> Force Reverify
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {org.lastVerifiedAt ? new Date(org.lastVerifiedAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : 'Never'}
                    </div>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No organizations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <ModalOverlay onClose={() => setShowDeclineModal(false)} title="Decline Workspace">
          <form onSubmit={handleDecline}>
            <div className="form-group">
              <label className="form-label">Reason for Decline *</label>
              <textarea 
                className="form-input" 
                placeholder="Explain why the application is declined. The user will receive this in an email." 
                value={remark} 
                onChange={e => setRemark(e.target.value)} 
                rows={4}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeclineModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--danger)' }}>Decline</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)} title="Create New Tenant (Auto-Approved)">
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Org Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)' }}>1. Factory Details</h4>
                <input className="form-input" placeholder="Organization Name *" required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                <select className="form-input" value={createForm.industry} onChange={e => setCreateForm({...createForm, industry: e.target.value})}>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
                <input className="form-input" placeholder="Address" value={createForm.address} onChange={e => setCreateForm({...createForm, address: e.target.value})} />
              </div>
              {/* Admin Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ margin: 0, color: 'var(--primary)' }}>2. Admin Details</h4>
                <input className="form-input" placeholder="Admin Name *" required value={createForm.adminName} onChange={e => setCreateForm({...createForm, adminName: e.target.value})} />
                <input className="form-input" type="email" placeholder="Admin Email *" required value={createForm.adminEmail} onChange={e => setCreateForm({...createForm, adminEmail: e.target.value})} />
                <input className="form-input" placeholder="Admin Phone" value={createForm.adminPhone} onChange={e => setCreateForm({...createForm, adminPhone: e.target.value})} />
                <input className="form-input" type="password" placeholder="Password *" required minLength={6} value={createForm.adminPassword} onChange={e => setCreateForm({...createForm, adminPassword: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Tenant'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

    </DashboardLayout>
  );
};

// Helpers
const tdStyle = { padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', verticalAlign: 'middle' };

const ModalOverlay = ({ children, onClose, title }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
  }}>
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '700px', animation: 'fadeInUp 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}>&times;</button>
      </div>
      {children}
    </div>
  </div>
);

export default OrganizationManagement;
