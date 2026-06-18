import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { financeAPI } from '../../services/api';

import {
  HiOutlineDocumentText, HiOutlinePlus, HiOutlineLibrary,
  HiOutlineRefresh, HiOutlineX, HiOutlineLightningBolt
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const FinanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'vendors', 'pos'
  
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload/Scan State
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  
  // Forms
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  
  const [vendorForm, setVendorForm] = useState({ vendorName: '', gstNumber: '', materialSupplied: 'Nylon' });
  const [poForm, setPoForm] = useState({ vendorId: '', materialType: 'Nylon', quantityKg: '', ratePerKg: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, vendRes, poRes] = await Promise.all([
        financeAPI.getInvoices(),
        financeAPI.getVendors(),
        financeAPI.getPOs()
      ]);
      setInvoices(invRes.data.data);
      setVendors(vendRes.data.data);
      setPos(poRes.data.data);
    } catch (err) {
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleAddVendor = async (e) => {
    e.preventDefault();
    try {
      await financeAPI.addVendor(vendorForm);
      toast.success('Vendor added successfully');
      setShowVendorModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to add vendor');
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      await financeAPI.createPO(poForm);
      toast.success('Purchase Order Created');
      setShowPOModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to create PO');
    }
  };

  const handleScanInvoice = async () => {
    if (!selectedFile) return toast.error('Please select an image or PDF bill');
    setScanning(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await financeAPI.scanInvoice(formData);
      toast.success(`OCR Success: Bill from ${res.data.aiExtracted.vendor_name}`);
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      toast.error('AI Scan failed');
    } finally {
      setScanning(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Finance & Purchase">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} icon={<HiOutlineLightningBolt />}>AI Invoice Scanner</TabBtn>
        <TabBtn active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<HiOutlineDocumentText />}>Purchase Orders</TabBtn>
        <TabBtn active={activeTab === 'vendors'} onClick={() => setActiveTab('vendors')} icon={<HiOutlineLibrary />}>Vendors</TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7a99' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading...
        </div>
      ) : activeTab === 'invoices' ? (
        /* AI INVOICE SCANNER VIEW */
        <div>
          <div className="glass-card" style={{ marginBottom: '24px', background: 'linear-gradient(145deg, rgba(59,130,246,0.05), rgba(168,85,247,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineLightningBolt style={{ color: '#a855f7' }} /> AI Auto-Invoice Entry (OCR)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>Upload a scanned vendor bill. Our AI will automatically extract the Vendor Name, Invoice Number, and Total Amount to create an ERP entry.</p>
            
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <input type="file" className="form-input" style={{ width: '300px' }} accept="image/*,.pdf" onChange={e => setSelectedFile(e.target.files[0])} />
              <button className="btn btn-primary" disabled={!selectedFile || scanning} onClick={handleScanInvoice} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineLightningBolt /> {scanning ? 'Scanning via OpenAI...' : 'Extract Data & Save'}
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Invoice No', 'Vendor Name', 'Total Amount', 'Tax', 'Extracted Via', 'Status'].map((h, i) => (
                    <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: '#6b7a99', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No invoices scanned yet.</td></tr> : invoices.map(inv => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                    <td style={tdStyle}>{inv.vendorName}</td>
                    <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 600 }}>₹{inv.totalAmount}</td>
                    <td style={tdStyle}>₹{inv.taxAmount}</td>
                    <td style={tdStyle}><span style={{ fontSize: '0.75rem', background: 'rgba(168,85,247,0.1)', color: '#c084fc', padding: '4px 8px', borderRadius: '4px' }}>{inv.rawOcrText.substring(0,25)}...</span></td>
                    <td style={tdStyle}><span className="status-badge verified">{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'pos' ? (
        /* PURCHASE ORDERS VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Material Purchase Orders</h3>
            <button className="btn btn-primary" onClick={() => setShowPOModal(true)}><HiOutlinePlus /> Create PO</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Vendor', 'Material', 'Qty (kg)', 'Rate', 'Total Amount', 'Status'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.length === 0 ? <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No POs found.</td></tr> : pos.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.vendorId?.vendorName}</span></td>
                  <td style={tdStyle}>{p.materialType}</td>
                  <td style={tdStyle}>{p.quantityKg} kg</td>
                  <td style={tdStyle}>₹{p.ratePerKg}/kg</td>
                  <td style={{ ...tdStyle, color: 'var(--success)', fontWeight: 600 }}>₹{p.totalAmount}</td>
                  <td style={tdStyle}><span className={`status-badge ${p.status === 'Received' ? 'verified' : 'pending'}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* VENDORS VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Supplier Directory</h3>
            <button className="btn btn-primary" onClick={() => setShowVendorModal(true)}><HiOutlinePlus /> Add Vendor</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Vendor Name', 'GST Number', 'Material Supplied', 'Rating'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>No vendors found.</td></tr> : vendors.map(v => (
                <tr key={v._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v.vendorName}</span></td>
                  <td style={tdStyle}>{v.gstNumber || '--'}</td>
                  <td style={tdStyle}>{v.materialSupplied}</td>
                  <td style={tdStyle}>{'⭐'.repeat(v.rating)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {showVendorModal && (
        <ModalOverlay onClose={() => setShowVendorModal(false)} title="Add Supplier">
          <form onSubmit={handleAddVendor}>
            <div className="form-group">
              <label className="form-label">Vendor Name *</label>
              <input className="form-input" required value={vendorForm.vendorName} onChange={e => setVendorForm({ ...vendorForm, vendorName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">GST Number</label>
              <input className="form-input" value={vendorForm.gstNumber} onChange={e => setVendorForm({ ...vendorForm, gstNumber: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowVendorModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Vendor</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {showPOModal && (
        <ModalOverlay onClose={() => setShowPOModal(false)} title="Create Purchase Order">
          <form onSubmit={handleCreatePO}>
            <div className="form-group">
              <label className="form-label">Select Vendor *</label>
              <select className="form-input" required value={poForm.vendorId} onChange={e => setPoForm({ ...poForm, vendorId: e.target.value })}>
                <option value="">-- Select --</option>
                {vendors.map(v => <option key={v._id} value={v._id}>{v.vendorName}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Quantity (kg) *</label>
                <input type="number" className="form-input" required value={poForm.quantityKg} onChange={e => setPoForm({ ...poForm, quantityKg: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Rate / kg (₹) *</label>
                <input type="number" className="form-input" required value={poForm.ratePerKg} onChange={e => setPoForm({ ...poForm, ratePerKg: e.target.value })} />
              </div>
            </div>
            <div style={{ background: 'var(--primary-glow)', padding: '12px', borderRadius: '8px', color: 'var(--primary)', fontWeight: 600, marginTop: '10px' }}>
              Total PO Amount: ₹{(poForm.quantityKg * poForm.ratePerKg) || 0}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create PO</button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

const tdStyle = { padding: '14px 20px', color: 'var(--text-secondary)', verticalAlign: 'middle', fontSize: '0.85rem' };

const TabBtn = ({ children, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
    fontSize: '0.9rem', fontWeight: 600, background: active ? 'var(--primary-glow)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)', border: `1px solid ${active ? 'var(--border-primary)' : 'transparent'}`,
    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
  }} onMouseOver={e => !active && (e.currentTarget.style.color = 'var(--text-primary)')} onMouseOut={e => !active && (e.currentTarget.style.color = 'var(--text-dim)')}>
    {icon} {children}
  </button>
);

const ModalOverlay = ({ children, onClose, title }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
  }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '500px', animation: 'fadeInUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
      </div>
      {children}
    </div>
  </div>
);

export default FinanceDashboard;
