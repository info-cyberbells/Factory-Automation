import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { operationsAPI } from '../../services/api';
import {
  HiOutlineClipboardCheck, HiOutlineDocumentText, HiOutlineExclamation,
  HiOutlinePlus, HiOutlineCloudUpload, HiOutlineSave, HiOutlineTrash, HiOutlineSearch,
  HiOutlineX
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const QualityDashboard = () => {
  const [activeTab, setActiveTab] = useState('qc_inspections'); // 'qc_inspections', 'damaged_log', 'missed_log', 'invoice_portal'
  
  const [qualityLogs, setQualityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // Form States
  const [qcForm, setQcForm] = useState({ materialName: '', quantity: '', unit: 'pcs', remarks: '', qcType: 'inspected' });
  const [invoiceForm, setInvoiceForm] = useState({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
  const [showQcModal, setShowQcModal] = useState(false);

  const fetchQualityLogs = async () => {
    setLoading(true);
    try {
      const res = await operationsAPI.getQualityLogs();
      setQualityLogs(res.data.data);
    } catch (err) {
      toast.error('Failed to load quality reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityLogs();
  }, []);

  const handleSaveQC = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = activeTab === 'invoice_portal' ? invoiceForm : qcForm;
      // Force qcType based on tab
      if (activeTab === 'damaged_log') payload.qcType = 'damaged';
      if (activeTab === 'missed_log') payload.qcType = 'missed';
      if (activeTab === 'qc_inspections') payload.qcType = 'inspected';

      await operationsAPI.createQualityLog(payload);
      toast.success('Quality check report uploaded and synced to Store Manager & Sales in real-time!');
      setShowQcModal(false);
      
      // Reset Forms
      setQcForm({ materialName: '', quantity: '', unit: 'pcs', remarks: '', qcType: 'inspected' });
      setInvoiceForm({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
      fetchQualityLogs();
    } catch (err) {
      toast.error('Failed to submit QC report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      await operationsAPI.deleteQualityLog(id);
      toast.success('Log deleted successfully');
      fetchQualityLogs();
    } catch (err) {
      toast.error('Failed to delete log');
    }
  };

  const triggerMockUpload = () => {
    // Generate a mock URL for invoice upload simulation
    const mockUrls = [
      'https://microsoft.com/en-us/mock-invoice-10023.pdf',
      'https://gcp.google.com/billing/invoice-992381.pdf',
      'https://azure.microsoft.com/billing/inv-448821.pdf'
    ];
    const randUrl = mockUrls[Math.floor(Math.random() * mockUrls.length)];
    setInvoiceForm({ ...invoiceForm, invoiceUrl: randUrl });
    toast.success('Document uploaded successfully (Simulated)');
  };

  // Filter logs based on active tab and search query
  const getFilteredLogs = () => {
    const typeMap = {
      qc_inspections: 'inspected',
      damaged_log: 'damaged',
      missed_log: 'missed',
      invoice_portal: 'inspected' // Show raw invoice inspections
    };
    const targetType = typeMap[activeTab];
    return qualityLogs.filter(log => {
      const matchType = log.qcType === targetType;
      const matchSearch = log.materialName.toLowerCase().includes(search.toLowerCase()) || 
                          (log.invoiceNumber && log.invoiceNumber.toLowerCase().includes(search.toLowerCase()));
      // If invoice portal, only show logs that actually contain an invoice number
      if (activeTab === 'invoice_portal') {
        return matchType && matchSearch && log.invoiceNumber;
      }
      return matchType && matchSearch;
    });
  };

  const filteredLogs = getFilteredLogs();

  return (
    <DashboardLayout pageTitle="Quality Control Workspace">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'qc_inspections'} onClick={() => setActiveTab('qc_inspections')} icon={<HiOutlineClipboardCheck />}>
          Goods QC Inspections
        </TabBtn>
        <TabBtn active={activeTab === 'damaged_log'} onClick={() => setActiveTab('damaged_log')} icon={<HiOutlineExclamation />}>
          Damaged Materials Log
        </TabBtn>
        <TabBtn active={activeTab === 'missed_log'} onClick={() => setActiveTab('missed_log')} icon={<HiOutlineExclamation />}>
          Missed/Short Items
        </TabBtn>
        <TabBtn active={activeTab === 'invoice_portal'} onClick={() => setActiveTab('invoice_portal')} icon={<HiOutlineDocumentText />}>
          OCR Invoice Upload
        </TabBtn>
      </div>

      {/* Main Grid */}
      <div className="azure-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="form-input-icon" style={{ width: '300px' }}>
            <HiOutlineSearch className="icon" />
            <input type="text" className="form-input" style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }} placeholder="Search items or invoices..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => {
            setQcForm({ materialName: '', quantity: '', unit: 'pcs', remarks: '', qcType: 'inspected' });
            setInvoiceForm({ materialName: '', quantity: '', unit: 'pcs', invoiceNumber: '', remarks: '', qcType: 'inspected', invoiceUrl: '' });
            setShowQcModal(true);
          }}>
            <HiOutlinePlus /> {activeTab === 'invoice_portal' ? 'Upload Invoice Bill' : 'Add Inspection Record'}
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading Quality Reports...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>No quality logs found in this section.</div>
        ) : (
          <div className="azure-table-container">
            <table className="azure-table">
              <thead>
                <tr>
                  <th>Material / Item</th>
                  <th>Quantity Checked</th>
                  {activeTab === 'invoice_portal' && <th>Invoice Number</th>}
                  {activeTab === 'invoice_portal' && <th>Document URL</th>}
                  <th>Inspection Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.materialName}</td>
                    <td style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{log.quantity} {log.unit}</td>
                    {activeTab === 'invoice_portal' && <td style={{ fontWeight: 600, color: 'var(--success)' }}>{log.invoiceNumber}</td>}
                    {activeTab === 'invoice_portal' && (
                      <td>
                        <a href={log.invoiceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-light)', textDecoration: 'underline', fontSize: '0.8rem' }}>
                          View Scan
                        </a>
                      </td>
                    )}
                    <td>
                      <span className={`azure-badge ${
                        log.status === 'pending_verification' ? 'warning' :
                        log.status === 'verified' ? 'success' : 'danger'
                      }`}>
                        {log.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.remarks || 'No notes.'}</td>
                    <td>
                      <button style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleDeleteLog(log._id)}>
                        <HiOutlineTrash /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC & INVOICE ENTRY MODAL */}
      {showQcModal && (
        <ModalOverlay onClose={() => setShowQcModal(false)} title={activeTab === 'invoice_portal' ? "OCR Bill / Invoice Upload Portal" : "New Quality Inspection Log"}>
          <form onSubmit={handleSaveQC}>
            {activeTab === 'invoice_portal' ? (
              
              /* INVOICE PORTAL FORM */
              <>
                <div className="form-group">
                  <label className="form-label">Invoice / Bill Number *</label>
                  <input type="text" className="form-input" required value={invoiceForm.invoiceNumber} onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} placeholder="e.g. INV-2026-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Material Inward Name *</label>
                  <input type="text" className="form-input" required value={invoiceForm.materialName} onChange={e => setInvoiceForm({ ...invoiceForm, materialName: e.target.value })} placeholder="e.g. Nylon Drag Chains STR-35" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Billed Qty *</label>
                    <input type="number" step="0.01" className="form-input" required value={invoiceForm.quantity} onChange={e => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <select className="form-input" value={invoiceForm.unit} onChange={e => setInvoiceForm({ ...invoiceForm, unit: e.target.value })}>
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="meters">meters</option>
                      <option value="boxes">boxes</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Scan Invoice (PDF/Image) *</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" className="btn btn-secondary" onClick={triggerMockUpload} style={{ flex: 1 }}>
                      <HiOutlineCloudUpload /> Simulate Scan Document
                    </button>
                    {invoiceForm.invoiceUrl && <span style={{ color: 'var(--success)', alignSelf: 'center', fontSize: '0.8rem' }}>Uploaded ✅</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Remarks</label>
                  <textarea className="form-input" rows="2" value={invoiceForm.remarks} onChange={e => setInvoiceForm({ ...invoiceForm, remarks: e.target.value })} placeholder="Verify details..."></textarea>
                </div>
              </>

            ) : (

              /* INSPECTION LOG FORM */
              <>
                <div className="form-group">
                  <label className="form-label">Item / Material Name *</label>
                  <input type="text" className="form-input" required value={qcForm.materialName} onChange={e => setQcForm({ ...qcForm, materialName: e.target.value })} placeholder="e.g. STR-26 Chain Links" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input type="number" step="0.01" className="form-input" required value={qcForm.quantity} onChange={e => setQcForm({ ...qcForm, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unit *</label>
                    <select className="form-input" value={qcForm.unit} onChange={e => setQcForm({ ...qcForm, unit: e.target.value })}>
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="meters">meters</option>
                      <option value="boxes">boxes</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">QC Notes / Diagnostic Remarks</label>
                  <textarea className="form-input" rows="2" value={qcForm.remarks} onChange={e => setQcForm({ ...qcForm, remarks: e.target.value })} placeholder="State details of damages, shortages, or discrepancies..."></textarea>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowQcModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || (activeTab === 'invoice_portal' && !invoiceForm.invoiceUrl)}>
                <HiOutlineSave /> {submitting ? 'Submitting...' : 'Upload Document'}
              </button>
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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '32px', width: '100%', maxWidth: '520px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
      </div>
      {children}
    </div>
  </div>
);

export default QualityDashboard;
