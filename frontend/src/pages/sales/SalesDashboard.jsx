import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import {
  HiOutlineCube, HiOutlineClipboardCheck, HiOutlineShoppingBag, HiOutlinePlus,
  HiOutlineClipboardList, HiOutlineRefresh, HiOutlineSave, HiOutlineSearch,
  HiOutlineCheckCircle, HiOutlineTrash, HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const SalesDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('store_stock'); // 'store_stock', 'shortages_buy', 'place_orders', 'qc_verification'
  
  const [inventory, setInventory] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [qualityLogs, setQualityLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Sourcing Order form
  const [orderForm, setOrderForm] = useState({ productName: '', productSize: '', orderQuantity: 100 });

  // QC Log Modal (Sales CRUD on QC Logs)
  const [showQcModal, setShowQcModal] = useState(false);
  const [editingQcId, setEditingQcId] = useState(null);
  const [qcForm, setQcForm] = useState({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
  const [invoiceFile, setInvoiceFile] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, buildRes, qcRes, sbsRes] = await Promise.all([
        operationsAPI.getInventory(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales()
      ]);
      setInventory(invRes.data.data);
      setBuildJobs(buildRes.data.data);
      setQualityLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
    } catch (err) {
      toast.error('Failed to load sales database');
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

      socket.on('inventory_updated', fetchData);
      socket.on('build_updated', fetchData);
      socket.on('quality_updated', fetchData);
      socket.on('communication_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // Create Build Order
  const handlePlaceBuildOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await operationsAPI.createBuildJob(orderForm);
      toast.success('Production order placed! Supervisor has been alerted in real-time.');
      setOrderForm({ productName: '', productSize: '', orderQuantity: 100 });
      setActiveTab('place_orders');
      fetchData();
    } catch (err) {
      toast.error('Failed to place production order');
    } finally {
      setSubmitting(false);
    }
  };

  // QC Log CRUD (Sales full access)
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
        toast.success('Quality invoice record updated');
      } else {
        await operationsAPI.createQualityLog(formData);
        toast.success('Quality invoice record created');
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
    if (!window.confirm('Delete this quality log/invoice entry?')) return;
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Quality log entry deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const handleVerifyQC = async (id) => {
    try {
      await operationsAPI.verifyQualityLog(id);
      toast.success('Quality document verified!');
      fetchData();
    } catch (err) {
      toast.error('Failed to verify document');
    }
  };

  // Sourcing Shortage/Buy Order Action
  const handleOrderShortage = async (id) => {
    try {
      await operationsAPI.updateShortageBuySale(id, { status: 'ordered' });
      toast.success('Shortage raw materials ordered! Logged in pipeline.');
      fetchData();
    } catch (err) {
      toast.error('Failed to order shortage items');
    }
  };

  const handleAddSourcingRemarks = async (id, remarks) => {
    try {
      await operationsAPI.updateShortageBuySale(id, { remarks });
      toast.success('Remarks updated in real-time');
      fetchData();
    } catch (err) {
      toast.error('Failed to save remarks');
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout pageTitle="Sales & Sourcing Workspace">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'store_stock'} onClick={() => setActiveTab('store_stock')} icon={<HiOutlineCube />}>
          Available Store Stock
        </TabBtn>
        <TabBtn active={activeTab === 'shortages_buy'} onClick={() => setActiveTab('shortages_buy')} icon={<HiOutlineClipboardList />}>
          Shortage & Buy Logs
        </TabBtn>
        <TabBtn active={activeTab === 'place_orders'} onClick={() => setActiveTab('place_orders')} icon={<HiOutlineShoppingBag />}>
          Manufacturing Orders
        </TabBtn>
        <TabBtn active={activeTab === 'qc_verification'} onClick={() => setActiveTab('qc_verification')} icon={<HiOutlineClipboardCheck />}>
          QC Invoice Verification ({qualityLogs.filter(l => l.invoiceNumber && l.status === 'pending_verification').length})
        </TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Reload</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading Sales operations...
        </div>
      ) : activeTab === 'store_stock' ? (
        
        /* STORE STOCK VIEW */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>Available Inventory Levels</h3>
            <div className="form-input-icon" style={{ width: '260px' }}>
              <HiOutlineSearch className="icon" />
              <input type="text" className="form-input" style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }} placeholder="Search available items..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Type</th>
                  <th>Quantity in Godown</th>
                  <th>Location</th>
                  <th>Size Spec</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>No items in stock.</td></tr> : filteredInventory.map(item => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{item.type.replace('_', ' ')}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{item.quantity} {item.unit}</td>
                    <td>{item.location}</td>
                    <td>{item.size || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : activeTab === 'shortages_buy' ? (

        /* SHORTAGES BUY LOGS */
        <div className="azure-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Active Purchase, Sales & Shortages Log</h3>
          {sbsLogs.filter(j => ['shortage', 'buy', 'sale'].includes(j.type)).length === 0 ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No active shortages, sales, or buy requests logged.</p> : (
            <div className="azure-table-container">
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Log Category</th>
                    <th>Required Quantity</th>
                    <th>Assignee</th>
                    <th>Sourcing Status</th>
                    <th>Purchase Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sbsLogs.filter(j => ['shortage', 'buy', 'sale'].includes(j.type)).map(job => (
                    <tr key={job._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.itemName}</td>
                      <td>
                        <span className={`azure-badge ${job.type === 'shortage' ? 'danger' : job.type === 'buy' ? 'warning' : 'success'}`}>
                          {job.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{job.quantity} {job.unit}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-light)' }}>{job.assignedTo}</td>
                      <td>
                        <span className={`azure-badge ${
                          job.status === 'pending' ? 'warning' :
                          job.status === 'assigned' ? 'running' : 'success'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 12px', fontSize: '0.85rem', width: '250px' }}
                          placeholder="Add sourcing updates..."
                          defaultValue={job.remarks || ''}
                          onBlur={(e) => handleAddSourcingRemarks(job._id, e.target.value)}
                        />
                      </td>
                      <td>
                        {job.status !== 'ordered' ? (
                          <button className="btn btn-primary btn-sm" onClick={() => handleOrderShortage(job._id)}>
                            Order
                          </button>
                        ) : (
                          <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600 }}>Ordered</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : activeTab === 'place_orders' ? (

        /* MANUFACTURING ORDERS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '28px' }}>
          {/* Order Placement Form */}
          <div className="azure-card" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
              <HiOutlinePlus style={{ color: 'var(--primary)' }} /> Order Product Build
            </h3>
            <form onSubmit={handlePlaceBuildOrder}>
              <div className="form-group">
                <label className="form-label">Product Name / Model *</label>
                <input type="text" className="form-input" required value={orderForm.productName} onChange={e => setOrderForm({ ...orderForm, productName: e.target.value })} placeholder="e.g. Drag Chain STR-26" />
              </div>

              <div className="form-group">
                <label className="form-label">Dimensions / Size Specification</label>
                <input type="text" className="form-input" value={orderForm.productSize} onChange={e => setOrderForm({ ...orderForm, productSize: e.target.value })} placeholder="e.g. 26mm x 50mm" />
              </div>

              <div className="form-group">
                <label className="form-label">Required Build Quantity (pcs) *</label>
                <input type="number" className="form-input" required value={orderForm.orderQuantity} onChange={e => setOrderForm({ ...orderForm, orderQuantity: Number(e.target.value) })} />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                <HiOutlineSave /> {submitting ? 'Placing Order...' : 'Submit Build Order'}
              </button>
            </form>
          </div>

          {/* Active Orders List */}
          <div className="azure-card" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1.1rem' }}>Manufacturing Queue Status</h3>
            {buildJobs.length === 0 ? <p style={{ color: 'var(--text-dim)' }}>No orders in queue.</p> : (
              <div className="azure-table-container">
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Process Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                     {buildJobs.map(job => (
                      <tr key={job._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Size: {job.productSize || 'N/A'}</div>
                          {job.machineId && typeof job.machineId === 'object' ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>⚙️ {job.machineId.name} {job.machineId.capacity ? `(${job.machineId.capacity})` : ''}</div>
                          ) : job.machineName ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>⚙️ {job.machineName}</div>
                          ) : null}
                          {job.materialsUsed && job.materialsUsed.length > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>📦 {job.materialsUsed.map(m => `${m.quantity} ${m.unit} ${m.materialName}`).join(', ')}</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{job.orderQuantity} pcs</td>
                        <td>
                          <span className={`azure-badge ${
                            job.status === 'pending' ? 'warning' :
                            job.status === 'shortage_reported' ? 'danger' :
                            job.status === 'processing' ? 'running' :
                            job.status === 'delayed' ? 'danger' : 'success'
                          }`}>
                            {job.status === 'delayed' ? '⚠️ delayed' : job.status.replace('_', ' ')}
                          </span>
                          {job.estimatedDate && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                              Est: {new Date(job.estimatedDate).toLocaleString()}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      ) : (

        /* QC INVOICE VERIFICATION PANEL (WITH FULL CRUD FOR SALES) */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>QC Invoice Document Registry</h3>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingQcId(null);
              setQcForm({ materialName: '', quantity: 0, unit: 'pcs', remarks: '', qcType: 'inspected', invoiceNumber: '', invoiceUrl: '' });
              setShowQcModal(true);
            }}><HiOutlinePlus /> Add QC Invoice Log</button>
          </div>

          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Item Billed</th>
                  <th>Qty Sourced</th>
                  <th>Invoice Number</th>
                  <th>Document Scan</th>
                  <th>Status</th>
                  <th>Verification Action</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {qualityLogs.filter(l => l.invoiceNumber).length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
                      No QC invoice logs registered.
                    </td>
                  </tr>
                ) : (
                  qualityLogs.filter(l => l.invoiceNumber).map(log => (
                    <tr key={log._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {log.materialName}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{log.remarks}</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{log.quantity} {log.unit}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{log.invoiceNumber}</td>
                      <td>
                        {/* <a href={log.invoiceUrl?.startsWith('/uploads/') ? `http://${window.location.hostname}:5000${log.invoiceUrl}` : log.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                          View Scan
                        </a> */}
                        <a href={log.invoiceUrl?.startsWith('/uploads/') ? `${SOCKET_URL}${log.invoiceUrl}` : log.invoiceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--primary-light)', fontSize: '0.8rem' }}>
                          View Scan
                        </a>
                      </td>
                      <td>
                        <span className={`azure-badge ${
                          log.status === 'pending_verification' ? 'warning' : 'success'
                        }`}>
                          {log.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {log.status === 'pending_verification' ? (
                          <button className="btn btn-accent btn-sm" onClick={() => handleVerifyQC(log._id)}>
                            <HiOutlineCheckCircle /> Verify
                          </button>
                        ) : (
                          <span style={{ color: 'var(--success)', fontWeight: 600 }}>Verified</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button style={{ color: 'var(--primary-light)', background: 'none' }} onClick={() => handleEditQcLog(log)}>Edit</button>
                          <button style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleDeleteQcLog(log._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QC LOG ENTRY MODAL (Sales CRUD) */}
      {showQcModal && (
        <ModalOverlay onClose={() => setShowQcModal(false)} title={editingQcId ? "Edit Invoice Log" : "Log New Sourcing Invoice"}>
          <form onSubmit={handleSaveQcLog}>
            <div className="form-group">
              <label className="form-label">Material / Item Billed *</label>
              <input type="text" className="form-input" required value={qcForm.materialName} onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })} placeholder="e.g. STR-35 Drag Chain links" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Quantity *</label>
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
                <label className="form-label">Invoice Number *</label>
                <input type="text" className="form-input" required value={qcForm.invoiceNumber} onChange={e => setQcForm({ ...qcForm, invoiceNumber: e.target.value })} placeholder="Invoice code" />
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
              <textarea className="form-input" rows="2" value={qcForm.remarks} onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })} placeholder="Invoice/Discrepancy state notes..."></textarea>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyItems: 'flex-end', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQcModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Invoice Log'}</button>
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
    display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
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

export default SalesDashboard;
