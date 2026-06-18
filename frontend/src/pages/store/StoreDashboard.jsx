import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineCube, HiOutlineClipboardCheck, HiOutlineAdjustments, HiOutlinePlus,
  HiOutlineTrash, HiOutlineRefresh, HiOutlineCheckCircle, HiOutlineUserGroup, HiOutlineX,
  HiOutlineClipboardList
} from 'react-icons/hi';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const StoreDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'qc_verification', 'sbs_logs', 'assignment'
  
  const [inventory, setInventory] = useState([]);
  const [qualityLogs, setQualityLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Sockets for Handshake Popup
  const [handshakeJob, setHandshakeJob] = useState(null);
  const [rackLocation, setRackLocation] = useState('Rack A - Bin 1');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Unassigned', size: '', description: '' });

  // QC Log Modal (Store Manager CRUD on QC Logs)
  const [showQcModal, setShowQcModal] = useState(false);
  const [editingQcId, setEditingQcId] = useState(null);
  const [qcForm, setQcForm] = useState({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
  const [invoiceFile, setInvoiceFile] = useState(null);

  // Shortage/Buy/Sale Modal
  const [showSbsModal, setShowSbsModal] = useState(false);
  const [editingSbsId, setEditingSbsId] = useState(null);
  const [sbsForm, setSbsForm] = useState({ type: 'shortage', itemName: '', quantity: 0, unit: 'pcs', assignedTo: 'unassigned', remarks: '' });

  // Task Assignment form
  const [selectedSbsId, setSelectedSbsId] = useState('');
  const [assigneeRole, setAssigneeRole] = useState('supervisor');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, qcRes, sbsRes] = await Promise.all([
        operationsAPI.getInventory(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales()
      ]);
      setInventory(invRes.data.data);
      setQualityLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
    } catch (err) {
      toast.error('Failed to load store operations data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('product_sent_to_store', (data) => {
        setHandshakeJob(data);
        toast('New Finished Product Dispatched from Production!', { icon: '🏭' });
      });

      socket.on('inventory_updated', fetchData);
      socket.on('quality_updated', fetchData);
      socket.on('communication_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // Inventory CRUD
  const handleSaveItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingItemId) {
        await operationsAPI.updateInventoryItem(editingItemId, itemForm);
        toast.success('Inventory item updated');
      } else {
        await operationsAPI.createInventoryItem(itemForm);
        toast.success('Inventory item created');
      }
      setShowItemModal(false);
      setItemForm({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Unassigned', size: '', description: '' });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      name: item.name,
      type: item.type,
      quantity: item.quantity,
      unit: item.unit,
      location: item.location || 'Unassigned',
      size: item.size || '',
      description: item.description || ''
    });
    setEditingItemId(item._id);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('Delete this inventory item?')) return;
    try {
      await operationsAPI.deleteInventoryItem(id);
      toast.success('Item deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleSendForQC = async (item) => {
    try {
      await operationsAPI.updateInventoryItem(item._id, {
        qualityStatus: 'sent_for_qc',
        qcRequestedAt: new Date()
      });
      toast.success(`Sent "${item.name}" for Quality Control Check!`);
      fetchData();
    } catch (err) {
      toast.error('Failed to send for quality check');
    }
  };

  // QC Log CRUD (Store Manager full access)
  const handleSaveQcLog = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('materialName', qcForm.materialName);
      formData.append('quantity', qcForm.quantity);
      formData.append('unit', qcForm.unit);
      formData.append('remarks', qcForm.remarks);
      formData.append('qcType', qcForm.qcType);
      formData.append('invoiceNumber', qcForm.invoiceNumber);

      if (invoiceFile) {
        formData.append('invoiceFile', invoiceFile);
      } else {
        formData.append('invoiceUrl', qcForm.invoiceUrl);
      }

      if (editingQcId) {
        await operationsAPI.updateQualityLog(editingQcId, formData);
        toast.success('Quality inspection log updated');
      } else {
        await operationsAPI.createQualityLog(formData);
        toast.success('Quality inspection log created');
      }
      setShowQcModal(false);
      setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
      setInvoiceFile(null);
      setEditingQcId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save quality log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditQcLog = (log) => {
    setQcForm({
      materialName: log.materialName,
      quantity: log.quantity,
      unit: log.unit,
      remarks: log.remarks || '',
      qcType: log.qcType,
      invoiceNumber: log.invoiceNumber || '',
      invoiceUrl: log.invoiceUrl || ''
    });
    setInvoiceFile(null);
    setEditingQcId(log._id);
    setShowQcModal(true);
  };

  const handleDeleteQcLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Quality log?')) return;
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Quality inspection log deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete quality log');
    }
  };

  const handleVerifyQC = async (id) => {
    try {
      await operationsAPI.verifyQualityLog(id);
      toast.success('Quality log verified and inventory adjusted!');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify QC entry');
    }
  };

  // Shortage / Buy / Sales Log CRUD
  const handleSaveSbs = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSbsId) {
        await operationsAPI.updateShortageBuySale(editingSbsId, sbsForm);
        toast.success('Communication log updated');
      } else {
        await operationsAPI.createShortageBuySale(sbsForm);
        toast.success('Communication log created & synced to Sales in real-time');
      }
      setShowSbsModal(false);
      setSbsForm({ type: 'shortage', itemName: '', quantity: 0, unit: 'pcs', assignedTo: 'unassigned', remarks: '' });
      setEditingSbsId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSbs = (log) => {
    setSbsForm({
      type: log.type,
      itemName: log.itemName,
      quantity: log.quantity,
      unit: log.unit,
      assignedTo: log.assignedTo || 'unassigned',
      remarks: log.remarks || ''
    });
    setEditingSbsId(log._id);
    setShowSbsModal(true);
  };

  const handleDeleteSbs = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await operationsAPI.deleteShortageBuySale(id);
      toast.success('Log entry deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log entry');
    }
  };

  // Handshake verification
  const handleHandshakeSubmit = async (accepted) => {
    try {
      await operationsAPI.receiveProduct(handshakeJob.jobId, { accepted, rackLocation });
      if (accepted) {
        toast.success('Product accepted and stocked in inventory!');
      } else {
        toast.error('Product dispatch rejected!');
      }
      setHandshakeJob(null);
      fetchData();
    } catch (err) {
      toast.error('Handshake failed');
    }
  };

  // Task Assignment
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!selectedSbsId) {
      toast.error('Please select an active shortage/buy log');
      return;
    }
    setSubmitting(true);
    try {
      await operationsAPI.updateShortageBuySale(selectedSbsId, {
        status: 'assigned',
        assignedTo: assigneeRole
      });
      toast.success(`Task successfully assigned to ${assigneeRole.toUpperCase()} in real-time!`);
      setSelectedSbsId('');
      fetchData();
    } catch (err) {
      toast.error('Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout pageTitle="Godown & Store Operations">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<HiOutlineCube />}>
          Unified Inventory
        </TabBtn>
        <TabBtn active={activeTab === 'sbs_logs'} onClick={() => setActiveTab('sbs_logs')} icon={<HiOutlineClipboardList />}>
          Shortage, Buy & Sales
        </TabBtn>
        <TabBtn active={activeTab === 'qc_verification'} onClick={() => setActiveTab('qc_verification')} icon={<HiOutlineClipboardCheck />}>
          Quality Logs Verification ({qualityLogs.filter(l => l.status === 'pending_verification').length})
        </TabBtn>
        <TabBtn active={activeTab === 'assignment'} onClick={() => setActiveTab('assignment')} icon={<HiOutlineUserGroup />}>
          Real-time Task Assignment
        </TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Reload</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading Store database...
        </div>
      ) : activeTab === 'inventory' ? (
        
        /* UNIFIED INVENTORY VIEW */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input type="text" className="form-input" style={{ width: '260px', padding: '8px 12px' }} placeholder="Search inventory name or type..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingItemId(null);
              setItemForm({ name: '', type: 'raw_material', quantity: 0, unit: 'kg', location: 'Unassigned', size: '', description: '' });
              setShowItemModal(true);
            }}><HiOutlinePlus /> Add Stock Item</button>
          </div>

          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Stock Quantity</th>
                  <th>Warehouse Location</th>
                  <th>Item Specs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No inventory items matches the search.</td></tr> : filteredInventory.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {item.quantity} {item.unit}
                    </td>
                    <td style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{item.location}</td>
                    <td style={{ fontSize: '0.85rem' }}>{item.size || 'N/A'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button style={{ color: 'var(--primary-light)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleEditItem(item)}>Edit</button>
                        <button style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleDeleteItem(item._id)}>Delete</button>
                        
                        {/* Quality Check Request Action */}
                        {(!item.qualityStatus || item.qualityStatus === 'pending') && (
                          <button 
                            style={{ 
                              color: 'var(--accent)', 
                              background: 'rgba(249, 115, 22, 0.1)', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              border: '1px solid var(--border-primary)',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }} 
                            onClick={() => handleSendForQC(item)}
                          >
                            <HiOutlineClipboardCheck /> QC Check
                          </button>
                        )}
                        {item.qualityStatus === 'sent_for_qc' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--warning)', background: 'rgba(234, 88, 12, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(234, 88, 12, 0.2)' }}>
                            🔍 QC Sent
                          </span>
                        )}
                        {item.qualityStatus === 'verified' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--success)', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            ✅ QC Verified
                          </span>
                        )}
                        {item.qualityStatus === 'rejected' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }} title={item.qcRemarks || 'No remarks'}>
                            ❌ QC Rejected
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : activeTab === 'sbs_logs' ? (

        /* SHORTAGE, BUY & SALES LOGS */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>Shortage, Buy & Sales Registry</h3>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingSbsId(null);
              setSbsForm({ type: 'shortage', itemName: '', quantity: 0, unit: 'pcs', assignedTo: 'unassigned', remarks: '' });
              setShowSbsModal(true);
            }}><HiOutlinePlus /> Log New Entry</button>
          </div>

          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Item Details</th>
                  <th>Log Type</th>
                  <th>Required Qty</th>
                  <th>Assigned Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sbsLogs.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>No logs registered yet.</td></tr> : sbsLogs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.itemName}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{log.remarks || 'No remarks.'}</div>
                    </td>
                    <td>
                      <span className={`azure-badge ${
                        log.type === 'shortage' ? 'danger' :
                        log.type === 'buy' ? 'warning' : 'success'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{log.quantity} {log.unit}</td>
                    <td style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{log.assignedTo}</td>
                    <td>
                      <span className={`azure-badge ${
                        log.status === 'pending' ? 'warning' :
                        log.status === 'assigned' ? 'running' : 'success'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ color: 'var(--primary-light)', background: 'none' }} onClick={() => handleEditSbs(log)}>Edit</button>
                        <button style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleDeleteSbs(log._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : activeTab === 'qc_verification' ? (

        /* QC VERIFICATION VIEW (WITH FULL STORE MANAGER CRUD) */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>Quality Logs & Invoices Verification Panel</h3>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingQcId(null);
              setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
              setShowQcModal(true);
            }}><HiOutlinePlus /> Add QC Log</button>
          </div>

          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Material Name</th>
                  <th>Quantity & Unit</th>
                  <th>Log Type</th>
                  <th>Invoice / Scan</th>
                  <th>Status</th>
                  <th>Verification Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {qualityLogs.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No QC log documents registered.</td></tr> : qualityLogs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.materialName}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{log.remarks}</div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{log.quantity} {log.unit}</td>
                    <td>
                      <span className={`azure-badge ${
                        log.qcType === 'inspected' ? 'success' :
                        log.qcType === 'damaged' ? 'danger' : 'warning'
                      }`}>
                        {log.qcType}
                      </span>
                    </td>
                    <td>
                      {log.invoiceNumber ? (
                        <div>
                          <span style={{ fontWeight: 600 }}>{log.invoiceNumber}</span>
                          <br />
                          {/* <a href={log.invoiceUrl?.startsWith('/uploads/') ? `http://${window.location.hostname}:5000${log.invoiceUrl}` : log.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)', fontSize: '0.78rem' }}>View Scan</a> */}
                          <a href={log.invoiceUrl?.startsWith('/uploads/') ? `${SOCKET_URL}${log.invoiceUrl}` : log.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)', fontSize: '0.78rem' }}>View Scan</a>
                        </div>
                      ) : 'No invoice'}
                    </td>
                    <td>
                      <span className={`azure-badge ${
                        log.status === 'pending_verification' ? 'warning' :
                        log.status === 'verified' ? 'success' : 'danger'
                      }`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {log.status === 'pending_verification' ? (
                        <button className="btn btn-accent btn-sm" onClick={() => handleVerifyQC(log._id)}>
                          <HiOutlineCheckCircle /> Verify & Stock
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>Verified</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ color: 'var(--primary-light)', background: 'none' }} onClick={() => handleEditQcLog(log)}>Edit</button>
                        <button style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleDeleteQcLog(log._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : (

        /* REAL-TIME ASSIGNMENT PANEL VIEW */
        <div className="azure-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Shortage & Task Assignments Panel</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <form onSubmit={handleAssignTask}>
              <div className="form-group">
                <label className="form-label">Select Shortage / Sourcing Sbs Log *</label>
                <select className="form-input" required value={selectedSbsId} onChange={e => setSelectedSbsId(e.target.value)}>
                  <option value="">-- Choose Log Entry --</option>
                  {sbsLogs.filter(j => j.status === 'pending').map(job => (
                    <option key={job._id} value={job._id}>
                      [{job.type.toUpperCase()}] {job.itemName} (Qty: {job.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign to Role / Workspace *</label>
                <select className="form-input" value={assigneeRole} onChange={e => setAssigneeRole(e.target.value)}>
                  <option value="supervisor">Supervisor (Production Line)</option>
                  <option value="sales">Sales Officer (Purchase sourcing)</option>
                  <option value="quality_checker">Quality Checker (QC Inspections)</option>
                  <option value="gate_guard">Gate Guard (Gate Entry checks)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                <HiOutlineCheckCircle /> Dispatch Assignment
              </button>
            </form>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px' }}>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Active Shortages Tracking</h4>
              {sbsLogs.filter(j => j.type === 'shortage').length === 0 ? <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active shortages reported.</p> : (
                <ul style={{ padding: 0, margin: 0 }}>
                  {sbsLogs.filter(j => j.type === 'shortage').map(job => (
                    <li key={job._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{job.itemName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Assigned to: {job.assignedTo}</div>
                      </div>
                      <span className="azure-badge danger" style={{ alignSelf: 'center' }}>Shortage: {job.quantity} {job.unit}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HANDSHAKE VERIFICATION FLOATING MODAL */}
      {handshakeJob && (
        <ModalOverlay onClose={() => setHandshakeJob(null)} title="Finished Product Handshake Verification">
          <div style={{ background: 'var(--primary-glow)', border: '1px solid var(--border-primary)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '0.95rem' }}>
              Supervisor has sent a finished batch of <strong>{handshakeJob.productName}</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <div>Size: {handshakeJob.productSize}</div>
              <div>Quantity: {handshakeJob.quantity} pcs</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Stock Location *</label>
            <input type="text" className="form-input" value={rackLocation} onChange={e => setRackLocation(e.target.value)} placeholder="e.g. Rack B - Bin 3" />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Confirming "Yes" will automatically increase the stock in your Unified Store Inventory with Date & Time logs.
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-accent" style={{ flex: 1 }} onClick={() => handleHandshakeSubmit(true)}>
              Yes, Recieved Properly
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleHandshakeSubmit(false)}>
              No, Reject Shipment
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* STOCK ITEM MODAL */}
      {showItemModal && (
        <ModalOverlay onClose={() => setShowItemModal(false)} title={editingItemId ? "Edit Stock Item Details" : "Add New Stock Item"}>
          <form onSubmit={handleSaveItem}>
            <div className="form-group">
              <label className="form-label">Item / Material Name *</label>
              <input type="text" className="form-input" required value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="e.g. STR-35 Nylon Drag Chain" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Item Type *</label>
                <select className="form-input" value={itemForm.type} onChange={e => setItemForm({ ...itemForm, type: e.target.value })}>
                  <option value="raw_material">Raw Material</option>
                  <option value="finished_good">Finished Good</option>
                  <option value="hardware">Hardware / Tools</option>
                  <option value="custom">Custom Tooling</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Stock Unit *</label>
                <input type="text" className="form-input" required value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="e.g. kg, pcs, meters" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Initial Quantity *</label>
                <input type="number" className="form-input" required value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Warehouse Location</label>
                <input type="text" className="form-input" value={itemForm.location} onChange={e => setItemForm({ ...itemForm, location: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Size / Gauge Specifications</label>
              <input type="text" className="form-input" value={itemForm.size} onChange={e => setItemForm({ ...itemForm, size: e.target.value })} placeholder="e.g. 35mm x 100mm" />
            </div>

            <div className="form-group">
              <label className="form-label">Item Description</label>
              <textarea className="form-input" rows="2" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Supplier info..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Item'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* QC LOG ENTRY MODAL (Store Manager CRUD) */}
      {showQcModal && (
        <ModalOverlay onClose={() => setShowQcModal(false)} title={editingQcId ? "Edit QC Document" : "Log QC Inspection & Invoice Scan"}>
          <form onSubmit={handleSaveQcLog}>
            <div className="form-group">
              <label className="form-label">Material / Item Name *</label>
              <input type="text" className="form-input" required value={qcForm.materialName} onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })} placeholder="e.g. Nylon Slices" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Quantity Checked *</label>
                <input type="number" step="0.01" className="form-input" required value={qcForm.quantity} onChange={e => setQcForm({ ...qcForm, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <input type="text" className="form-input" required value={qcForm.unit} onChange={e => setQcForm({ ...qcForm, unit: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Report Category *</label>
                <select className="form-input" value={qcForm.qcType} onChange={e => setQcForm({ ...qcForm, qcType: e.target.value })}>
                  <option value="inspected">Inspected Goods</option>
                  <option value="damaged">Damaged Materials</option>
                  <option value="missed">Missed/Short Items</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice / Bill Number</label>
                <input type="text" className="form-input" value={qcForm.invoiceNumber} onChange={e => setQcForm({ ...qcForm, invoiceNumber: e.target.value })} placeholder="Optional Bill Number" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Upload Invoice Document</label>
              <input 
                type="file" 
                className="form-input" 
                onChange={e => setInvoiceFile(e.target.files[0])} 
                accept="image/*,application/pdf"
                style={{ padding: '8px 12px' }}
              />
              {qcForm.invoiceUrl && !invoiceFile && (
                <div style={{ fontSize: '0.78rem', marginTop: '6px' }}>
                  {/* Current: <a href={qcForm.invoiceUrl.startsWith('/uploads/') ? `http://${window.location.hostname}:5000${qcForm.invoiceUrl}` : qcForm.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)' }}>View Existing Scan</a> */}
                  Current: <a href={qcForm.invoiceUrl.startsWith('/uploads/') ? `${SOCKET_URL}${qcForm.invoiceUrl}` : qcForm.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)' }}>View Existing Scan</a>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Inspector Remarks</label>
              <textarea className="form-input" rows="2" value={qcForm.remarks} onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })} placeholder="Quality or discrepancy state details..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQcModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save QC Log'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* SHORTAGE / BUY / SALE LOG MODAL */}
      {showSbsModal && (
        <ModalOverlay onClose={() => setShowSbsModal(false)} title={editingSbsId ? "Edit Log Entry" : "Log Shortage, Buy or Sales Entry"}>
          <form onSubmit={handleSaveSbs}>
            <div className="form-group">
              <label className="form-label">Register Type *</label>
              <select className="form-input" value={sbsForm.type} onChange={e => setSbsForm({ ...sbsForm, type: e.target.value })}>
                <option value="shortage">Shortage (Lack of stock)</option>
                <option value="buy">Buy (Purchase Request)</option>
                <option value="sale">Sale (Sales Order)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Item / Product Name *</label>
              <input type="text" className="form-input" required value={sbsForm.itemName} onChange={e => setSbsForm({ ...sbsForm, itemName: e.target.value })} placeholder="e.g. STR-26 chains" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
                <input type="number" step="0.01" className="form-input" required value={sbsForm.quantity} onChange={e => setSbsForm({ ...sbsForm, quantity: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit *</label>
                <input type="text" className="form-input" required value={sbsForm.unit} onChange={e => setSbsForm({ ...sbsForm, unit: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Sourcing Assignment</label>
              <select className="form-input" value={sbsForm.assignedTo} onChange={e => setSbsForm({ ...sbsForm, assignedTo: e.target.value })}>
                <option value="unassigned">Unassigned</option>
                <option value="supervisor">Supervisor (Production Line)</option>
                <option value="sales">Sales Officer (Purchase sourcing)</option>
                <option value="quality_checker">Quality Checker (QC Inspections)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-input" rows="2" value={sbsForm.remarks} onChange={e => setSbsForm({ ...sbsForm, remarks: e.target.value })} placeholder="Describe details..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowSbsModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Log'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

    </DashboardLayout>
  );
};

const TabBtn = ({ children, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px',
    fontSize: '0.9rem', fontWeight: 600, background: active ? 'var(--primary-glow)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)', border: `1px solid ${active ? 'var(--border-primary)' : 'transparent'}`,
    cursor: 'pointer', transition: 'all 0.2s'
  }}>
    {icon} {children}
  </button>
);

const ModalOverlay = ({ children, onClose, title }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
  }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
      </div>
      {children}
    </div>
  </div>
);

export default StoreDashboard;
