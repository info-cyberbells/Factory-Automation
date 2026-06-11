import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { gateEntryAPI } from '../services/api';
import {
  HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineDocumentText, HiOutlineX, HiOutlineRefresh,
  HiOutlineTruck
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const MATERIAL_TYPES = [
  { value: 'nylon', label: 'Nylon' },
  { value: 'pigment', label: 'Pigment' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'other', label: 'Other' },
];

const UNITS = [
  { value: 'kg', label: 'KG' },
  { value: 'pcs', label: 'PCS' },
  { value: 'meters', label: 'Meters' },
  { value: 'liters', label: 'Liters' },
  { value: 'bags', label: 'Bags' },
  { value: 'boxes', label: 'Boxes' },
];

const STATUS_COLORS = {
  pending: { bg: 'rgba(249,115,22,0.12)', color: '#fb923c', text: 'Pending' },
  verified: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', text: 'Verified' },
  grn_created: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', text: 'GRN Created' },
  rejected: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', text: 'Rejected' },
};

const emptyForm = {
  billNumber: '', billDate: new Date().toISOString().split('T')[0],
  vendorName: '', vendorContact: '', materialType: 'nylon',
  materialDescription: '', quantity: '', unit: 'kg',
  vehicleNumber: '', driverName: '', remarks: ''
};

const GateEntry = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add | edit
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // GRN Modal
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnEntry, setGrnEntry] = useState(null);
  const [grnForm, setGrnForm] = useState({ receivedQuantity: '', qualityStatus: 'approved', remarks: '' });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const res = await gateEntryAPI.getAll(params);
      setEntries(res.data.data);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      toast.error('Failed to load gate entries');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterStatus]);

  const fetchStats = async () => {
    try {
      const res = await gateEntryAPI.getStats();
      setStats(res.data.data);
    } catch (err) { /* silent */ }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
  }, [fetchEntries]);

  // Handlers
  const openAddModal = () => {
    setModalMode('add');
    setFormData(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (entry) => {
    setModalMode('edit');
    setEditingId(entry._id);
    setFormData({
      billNumber: entry.billNumber,
      billDate: entry.billDate?.split('T')[0] || '',
      vendorName: entry.vendorName,
      vendorContact: entry.vendorContact || '',
      materialType: entry.materialType,
      materialDescription: entry.materialDescription || '',
      quantity: entry.quantity,
      unit: entry.unit,
      vehicleNumber: entry.vehicleNumber || '',
      driverName: entry.driverName || '',
      remarks: entry.remarks || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.billNumber || !formData.vendorName || !formData.quantity) {
      toast.error('Please fill required fields: Bill Number, Vendor, Quantity');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'add') {
        await gateEntryAPI.create({ ...formData, quantity: Number(formData.quantity) });
        toast.success('Gate entry created successfully!');
      } else {
        await gateEntryAPI.update(editingId, { ...formData, quantity: Number(formData.quantity) });
        toast.success('Gate entry updated successfully!');
      }
      setShowModal(false);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await gateEntryAPI.delete(id);
      toast.success('Entry deleted');
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleVerify = async (id) => {
    try {
      await gateEntryAPI.verify(id);
      toast.success('Entry verified!');
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const openGRNModal = (entry) => {
    setGrnEntry(entry);
    setGrnForm({ receivedQuantity: entry.quantity, qualityStatus: 'approved', remarks: '' });
    setShowGRNModal(true);
  };

  const handleCreateGRN = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await gateEntryAPI.createGRN(grnEntry._id, {
        ...grnForm,
        receivedQuantity: Number(grnForm.receivedQuantity)
      });
      toast.success(res.data.message || 'GRN Created!');
      setShowGRNModal(false);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'GRN creation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout pageTitle="Gate Entry">
      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Entries', value: stats?.totalEntries ?? '--', color: 'blue' },
          { label: 'Pending', value: stats?.pendingEntries ?? '--', color: 'orange' },
          { label: 'GRN Created', value: stats?.grnCreated ?? '--', color: 'green' },
          { label: "Today's Material", value: stats?.todayMaterialQty ? `${stats.todayMaterialQty} kg` : '--', color: 'purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color} fade-in-up`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="stat-value" style={{ fontSize: '1.6rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '360px' }}>
          <HiOutlineSearch style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: '#6b7a99', fontSize: '1.1rem'
          }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search bill, vendor, vehicle..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ paddingLeft: '38px', height: '42px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Filter Status */}
        <select
          className="form-input"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          style={{ width: '160px', height: '42px', fontSize: '0.85rem', cursor: 'pointer' }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="grn_created">GRN Created</option>
          <option value="rejected">Rejected</option>
        </select>

        <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); }}
          style={{ height: '42px' }}>
          <HiOutlineRefresh /> Reset
        </button>

        <div style={{ flex: 1 }} />

        <button className="btn btn-primary" onClick={openAddModal} style={{ height: '42px' }}>
          <HiOutlinePlus /> New Gate Entry
        </button>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)', borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Bill No', 'Date', 'Vendor', 'Material', 'Qty', 'Vehicle', 'Status', 'GRN', 'Actions'].map((h, i) => (
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
                <tr><td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading entries...
                </td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <HiOutlineTruck style={{ fontSize: '2.5rem', marginBottom: '12px', opacity: 0.3 }} />
                  <p>No gate entries found</p>
                  <button className="btn btn-primary btn-sm" onClick={openAddModal} style={{ marginTop: '12px' }}>
                    <HiOutlinePlus /> Create First Entry
                  </button>
                </td></tr>
              ) : entries.map((entry) => {
                const st = STATUS_COLORS[entry.status] || STATUS_COLORS.pending;
                return (
                  <tr key={entry._id} style={{
                    borderBottom: '1px solid var(--border-light)',
                    transition: 'background 0.2s'
                  }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                     onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}><span style={{ color: 'var(--primary)', fontWeight: 600 }}>{entry.billNumber}</span></td>
                    <td style={tdStyle}>{formatDate(entry.billDate)}</td>
                    <td style={tdStyle}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{entry.vendorName}</div>
                      {entry.vendorContact && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.vendorContact}</div>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem',
                        background: 'var(--primary-glow)', color: 'var(--accent)', fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>{entry.materialType}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.quantity}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginLeft: '4px' }}>{entry.unit}</span>
                    </td>
                    <td style={tdStyle}><span style={{ color: 'var(--text-secondary)' }}>{entry.vehicleNumber || '--'}</span></td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem',
                        fontWeight: 600, background: st.bg, color: st.color
                      }}>{st.text}</span>
                    </td>
                    <td style={tdStyle}>
                      {entry.grnNumber ? (
                        <span style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.82rem' }}>{entry.grnNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>--</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, display: 'flex', gap: '6px' }}>
                      {entry.status === 'pending' && (
                        <>
                          <ActionBtn icon={<HiOutlineCheckCircle />} title="Verify" color="#3b82f6"
                            onClick={() => handleVerify(entry._id)} />
                          <ActionBtn icon={<HiOutlinePencil />} title="Edit" color="#f97316"
                            onClick={() => openEditModal(entry)} />
                        </>
                      )}
                      {entry.status === 'verified' && (
                        <ActionBtn icon={<HiOutlineDocumentText />} title="Create GRN" color="#22c55e"
                          onClick={() => openGRNModal(entry)} />
                      )}
                      {entry.status !== 'grn_created' && (
                        <ActionBtn icon={<HiOutlineTrash />} title="Delete" color="#ef4444"
                          onClick={() => handleDelete(entry._id)} />
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
              <PagBtn disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>← Prev</PagBtn>
              {[...Array(Math.min(pagination.pages, 5))].map((_, i) => (
                <PagBtn key={i} active={pagination.page === i + 1}
                  onClick={() => setPagination(p => ({ ...p, page: i + 1 }))}>{i + 1}</PagBtn>
              ))}
              <PagBtn disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next →</PagBtn>
            </div>
          </div>
        )}
      </div>

      {/* ===== ADD/EDIT MODAL ===== */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div style={{ maxWidth: '640px', width: '100%' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {modalMode === 'add' ? '➕ New Gate Entry' : '✏️ Edit Gate Entry'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer'
              }}><HiOutlineX /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Bill Number *</label>
                  <input className="form-input" placeholder="e.g., INV-2026-001"
                    value={formData.billNumber}
                    onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Bill Date *</label>
                  <input className="form-input" type="date" value={formData.billDate}
                    onChange={(e) => setFormData({ ...formData, billDate: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Vendor Name *</label>
                  <input className="form-input" placeholder="Supplier company name"
                    value={formData.vendorName}
                    onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Vendor Contact</label>
                  <input className="form-input" placeholder="Phone / email"
                    value={formData.vendorContact}
                    onChange={(e) => setFormData({ ...formData, vendorContact: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Material Type *</label>
                  <select className="form-input" value={formData.materialType}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                    style={{ cursor: 'pointer' }}>
                    {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Material Description</label>
                  <input className="form-input" placeholder="Grade, color, etc."
                    value={formData.materialDescription}
                    onChange={(e) => setFormData({ ...formData, materialDescription: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Quantity *</label>
                  <input className="form-input" type="number" step="0.01" min="0.01"
                    placeholder="Enter quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{ cursor: 'pointer' }}>
                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Vehicle Number</label>
                  <input className="form-input" placeholder="e.g., MH-12-AB-1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Driver Name</label>
                  <input className="form-input" placeholder="Driver's name"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })} />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Remarks</label>
                <input className="form-input" placeholder="Any notes..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : modalMode === 'add' ? 'Create Entry' : 'Update Entry'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* ===== GRN MODAL ===== */}
      {showGRNModal && grnEntry && (
        <ModalOverlay onClose={() => setShowGRNModal(false)}>
          <div style={{ maxWidth: '480px', width: '100%' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                📋 Create GRN
              </h3>
              <button onClick={() => setShowGRNModal(false)} style={{
                background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer'
              }}><HiOutlineX /></button>
            </div>

            {/* Entry Summary */}
            <div style={{
              background: 'var(--primary-glow)', border: '1px solid var(--border-primary)',
              borderRadius: '12px', padding: '16px', marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-dim)' }}>Bill:</span> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{grnEntry.billNumber}</span></div>
                <div><span style={{ color: 'var(--text-dim)' }}>Vendor:</span> <span style={{ color: 'var(--text-primary)' }}>{grnEntry.vendorName}</span></div>
                <div><span style={{ color: 'var(--text-dim)' }}>Material:</span> <span style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{grnEntry.materialType}</span></div>
                <div><span style={{ color: 'var(--text-dim)' }}>Bill Qty:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{grnEntry.quantity} {grnEntry.unit}</span></div>
              </div>
            </div>

            <form onSubmit={handleCreateGRN}>
              <div className="form-group">
                <label className="form-label">Received Quantity ({grnEntry.unit})</label>
                <input className="form-input" type="number" step="0.01" min="0"
                  value={grnForm.receivedQuantity}
                  onChange={(e) => setGrnForm({ ...grnForm, receivedQuantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Quality Status</label>
                <select className="form-input" value={grnForm.qualityStatus}
                  onChange={(e) => setGrnForm({ ...grnForm, qualityStatus: e.target.value })}
                  style={{ cursor: 'pointer' }}>
                  <option value="approved">Approved ✅</option>
                  <option value="partial">Partial ⚠️</option>
                  <option value="rejected">Rejected ❌</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input className="form-input" placeholder="Quality notes, discrepancies..."
                  value={grnForm.remarks}
                  onChange={(e) => setGrnForm({ ...grnForm, remarks: e.target.value })} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGRNModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  {submitting ? 'Creating...' : 'Create GRN & Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

// ===== Helper Components =====
const tdStyle = { padding: '12px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', verticalAlign: 'middle' };

const ActionBtn = ({ icon, title, color, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: '32px', height: '32px', borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', border: `1px solid var(--border)`, color,
      cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s'
    }}
    onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-input)'; }}
    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}
  >{icon}</button>
);

const PagBtn = ({ children, active, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500,
      background: active ? 'var(--primary-glow)' : 'transparent',
      border: `1px solid ${active ? 'var(--border-primary)' : 'var(--border)'}`,
      color: active ? 'var(--primary)' : disabled ? 'var(--text-ghost)' : 'var(--text-dim)',
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
    }}
  >{children}</button>
);

const ModalOverlay = ({ children, onClose }) => (
  <div
    onClick={(e) => e.target === e.currentTarget && onClose()}
    style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
    }}
  >
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: '20px',
      padding: '32px', maxHeight: '90vh', overflowY: 'auto',
      animation: 'fadeInUp 0.3s ease', width: '100%', maxWidth: '640px'
    }}>
      {children}
    </div>
  </div>
);

export default GateEntry;
