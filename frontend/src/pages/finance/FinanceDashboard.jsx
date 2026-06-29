import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { financeAPI } from '../../services/api';

import {
  HiOutlineRefresh, HiOutlineX, HiOutlineLightningBolt,
  HiOutlineEye
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const FinanceDashboard = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload/Scan State
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const invRes = await financeAPI.getInvoices();
      setInvoices(invRes.data.data);
    } catch (err) {
      toast.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>AI Invoice Scanner</h3>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7a99' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading...
        </div>
      ) : (
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
                  {['Invoice No', 'Vendor Name', 'Total Amount', 'Tax', 'Extracted Via', 'View', 'Status'].map((h, i) => (
                    <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: '#6b7a99', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No invoices scanned yet.</td></tr> : invoices.map(inv => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                    <td style={tdStyle}>{inv.vendorName}</td>
                    <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 600 }}>₹{inv.totalAmount}</td>
                    <td style={tdStyle}>₹{inv.taxAmount}</td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(168,85,247,0.1)', color: '#c084fc', padding: '4px 8px', borderRadius: '4px' }}>
                        {inv.rawOcrText && (inv.rawOcrText.includes('OpenAI') || inv.rawOcrText.includes('GPT')) ? 'OpenAI GPT' : 'Fallback Engine'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setSelectedInvoiceForView(inv)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '0.75rem', height: '28px' }}
                      >
                        <HiOutlineEye /> View
                      </button>
                    </td>
                    <td style={tdStyle}><span className="status-badge verified">{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedInvoiceForView && (
        <ModalOverlay onClose={() => setSelectedInvoiceForView(null)} title={`Invoice Details: ${selectedInvoiceForView.invoiceNumber}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.06)', 
              borderRadius: '12px', 
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 16px'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Name</span>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                  {selectedInvoiceForView.vendorName}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Invoice Number</span>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                  {selectedInvoiceForView.invoiceNumber}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Total Amount</span>
                <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                  ₹{selectedInvoiceForView.totalAmount}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Tax Amount</span>
                <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                  ₹{selectedInvoiceForView.taxAmount}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
                <div style={{ marginTop: '2px' }}>
                  <span className="status-badge verified" style={{ display: 'inline-block' }}>{selectedInvoiceForView.status}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#6b7a99', textTransform: 'uppercase', fontWeight: 600 }}>Extracted Via</span>
                <div style={{ color: '#c084fc', fontWeight: 500, fontSize: '0.85rem', marginTop: '2px' }}>
                  {selectedInvoiceForView.rawOcrText && (selectedInvoiceForView.rawOcrText.includes('OpenAI') || selectedInvoiceForView.rawOcrText.includes('GPT')) ? 'OpenAI GPT-4o-mini' : 'Fallback OCR Engine'}
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '8px', fontWeight: 600 }}>Raw Extracted / Scanned Content</h4>
              <div style={{ 
                background: '#0d1117', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px', 
                padding: '16px', 
                maxHeight: '350px', 
                overflowY: 'auto',
                fontSize: '0.8rem',
                lineHeight: '1.6',
                color: '#c9d1d9',
                fontFamily: 'Consolas, Monaco, monospace',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedInvoiceForView.rawOcrText || "No text available"}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedInvoiceForView(null)}>Close</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

const tdStyle = { padding: '14px 20px', color: 'var(--text-secondary)', verticalAlign: 'middle', fontSize: '0.85rem' };

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
