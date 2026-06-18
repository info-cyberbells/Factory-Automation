import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import {
  HiOutlineClipboardCheck, HiOutlineCheck, HiOutlineX, HiOutlineRefresh,
  HiOutlineChatAlt2, HiOutlineSearch, HiOutlineClock
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const QCInventoryRequests = () => {
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [qcFilter, setQcFilter] = useState('pending'); // 'pending', 'completed'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [remarks, setRemarks] = useState('');

  const fetchQCRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await operationsAPI.getInventory();
      setAllItems(res.data.data);
    } catch (err) {
      toast.error('Failed to load QC requests');
    } finally {
      setLoading(false);
    }
  }, []);

  const requests = allItems.filter(item => {
    if (qcFilter === 'pending') {
      return item.qualityStatus === 'sent_for_qc';
    } else {
      return ['verified', 'rejected'].includes(item.qualityStatus);
    }
  });

  useEffect(() => {
    fetchQCRequests();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('inventory_updated', fetchQCRequests);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchQCRequests, user?.organizationId]);

  const handleApprove = async (item) => {
    if (!window.confirm(`Approve quality check for "${item.name}"?`)) return;
    try {
      await operationsAPI.updateInventoryItem(item._id, {
        qualityStatus: 'verified',
        qcRemarks: 'Quality check passed. Item verified.'
      });
      toast.success(`QC Approved: "${item.name}" is now marked verified!`);
      fetchQCRequests();
    } catch (err) {
      toast.error('Failed to approve quality check');
    }
  };

  const openRejectModal = (item) => {
    setSelectedItem(item);
    setRemarks('');
    setShowRejectModal(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!remarks.trim()) {
      toast.error('Please enter discrepancy remarks for rejection');
      return;
    }
    setSubmitting(true);
    try {
      await operationsAPI.updateInventoryItem(selectedItem._id, {
        qualityStatus: 'rejected',
        qcRemarks: remarks
      });
      toast.error(`QC Rejected: "${selectedItem.name}" has been flagged.`);
      setShowRejectModal(false);
      fetchQCRequests();
    } catch (err) {
      toast.error('Failed to reject quality check');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '--';
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = requests.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout pageTitle="QC Inventory Requests">
      
      <div className="azure-card fade-in-up" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem' }}>QC Audit Inspections Queue</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Verify newly arrived or manufactured inventory items flagged by Store Managers.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={fetchQCRequests}>
            <HiOutlineRefresh /> Refresh List
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
            <button 
              onClick={() => setQcFilter('pending')} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: qcFilter === 'pending' ? 'var(--primary-glow)' : 'transparent',
                color: qcFilter === 'pending' ? 'var(--primary)' : 'var(--text-dim)',
                border: `1px solid ${qcFilter === 'pending' ? 'var(--border-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              Pending Verification ({allItems.filter(i => i.qualityStatus === 'sent_for_qc').length})
            </button>
            <button 
              onClick={() => setQcFilter('completed')} 
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: qcFilter === 'completed' ? 'var(--primary-glow)' : 'transparent',
                color: qcFilter === 'completed' ? 'var(--primary)' : 'var(--text-dim)',
                border: `1px solid ${qcFilter === 'completed' ? 'var(--border-primary)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              Inspection History ({allItems.filter(i => ['verified', 'rejected'].includes(i.qualityStatus)).length})
            </button>
          </div>

          <div className="form-input-icon" style={{ width: '100%', maxWidth: '300px' }}>
            <HiOutlineSearch className="icon" />
            <input
              type="text"
              className="form-input"
              style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem', height: '40px' }}
              placeholder="Search by item name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading QC queue...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
            <HiOutlineClipboardCheck style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.2, color: 'var(--success)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {qcFilter === 'pending' ? 'No Pending QC Requests' : 'No Inspection History'}
            </p>
            <p style={{ fontSize: '0.82rem' }}>
              {qcFilter === 'pending' ? 'All materials and items are currently verified.' : 'Items verified or rejected by you will appear here.'}
            </p>
          </div>
        ) : (
          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Item / Material</th>
                  <th>Stock Type</th>
                  <th>Billed Quantity</th>
                  <th>Warehouse Location</th>
                  <th>Item Specifications</th>
                  {qcFilter === 'pending' ? (
                    <>
                      <th>Request Date</th>
                      <th style={{ textAlign: 'center' }}>QC Actions</th>
                    </>
                  ) : (
                    <>
                      <th>QC Status</th>
                      <th>QC Remarks</th>
                      <th>Audit Date</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>
                      <span style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{item.location}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.size || item.description || 'Standard Specs'}</td>
                    {qcFilter === 'pending' ? (
                      <>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          <HiOutlineClock style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {formatDate(item.qcRequestedAt)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleApprove(item)}
                              title="Approve Quality (Verify)"
                              style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                borderRadius: '6px',
                                color: 'var(--success)',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}
                            >
                              <HiOutlineCheck /> Verify
                            </button>
                            <button
                              onClick={() => openRejectModal(item)}
                              title="Reject / Flag Issues"
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '6px',
                                color: 'var(--danger)',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}
                            >
                              <HiOutlineX /> Reject
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span className={`azure-badge ${item.qualityStatus === 'verified' ? 'success' : 'danger'}`} style={{ textTransform: 'uppercase' }}>
                            {item.qualityStatus === 'verified' ? 'Passed' : 'Rejected'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {item.qcRemarks || 'No remarks provided.'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                          <HiOutlineClock style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {formatDate(item.updatedAt)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== REJECT / REMARKS MODAL ===== */}
      {showRejectModal && selectedItem && (
        <div onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', animation: 'fadeInUp 0.3s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineChatAlt2 style={{ color: 'var(--danger)' }} /> QC Rejection & Remarks
              </h3>
              <button onClick={() => setShowRejectModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Flagging: </span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{selectedItem.name}</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>Qty: {selectedItem.quantity} {selectedItem.unit} | Location: {selectedItem.location}</div>
            </div>

            <form onSubmit={handleReject}>
              <div className="form-group">
                <label className="form-label">Discrepancy / Damage Remarks *</label>
                <textarea
                  className="form-input"
                  required
                  rows="3"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Specify why the item failed quality control checks (e.g. physical damage, missing count, incorrect gauge)..."
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? 'Rejecting...' : 'Confirm QC Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default QCInventoryRequests;
