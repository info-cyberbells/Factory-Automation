import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import API, { financeAPI } from '../../services/api';
import {
  HiOutlineDocumentAdd, HiOutlinePlus, HiOutlineTrash,
  HiOutlineRefresh, HiOutlineX, HiOutlineDownload, HiOutlineEye,
  HiOutlineSearch
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const InvoiceGenerator = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientGST, setClientGST] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: 1, rate: 0, taxRate: 18 }
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await financeAPI.getSalesInvoices();
      setInvoices(res.data.data);
    } catch (err) {
      toast.error('Failed to load generated invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0, taxRate: 18 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast.error('At least one item is required');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity') {
      newItems[index].quantity = Math.max(0, parseInt(value) || 0);
    } else if (field === 'rate') {
      newItems[index].rate = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'taxRate') {
      newItems[index].taxRate = parseInt(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  // Calculations
  const calculateInvoice = () => {
    let subtotal = 0;
    let taxAmount = 0;
    const computedItems = items.map(item => {
      const lineSubtotal = item.quantity * item.rate;
      const lineTax = lineSubtotal * (item.taxRate / 100);
      const amount = lineSubtotal;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
      return { ...item, amount };
    });
    const grandTotal = subtotal + taxAmount;
    return { items: computedItems, subtotal, taxAmount, grandTotal };
  };

  const { subtotal, taxAmount, grandTotal } = calculateInvoice();

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (items.some(item => !item.description.trim())) {
      toast.error('Please enter a description for all items');
      return;
    }

    const { items: computedItems, subtotal, taxAmount, grandTotal } = calculateInvoice();

    try {
      await financeAPI.createSalesInvoice({
        invoiceNumber,
        clientName,
        clientAddress,
        clientGST,
        dueDate,
        notes,
        items: computedItems,
        subtotal,
        taxAmount,
        grandTotal
      });

      toast.success('Sales Invoice generated successfully!');
      setShowCreateModal(false);
      
      // Reset form
      setClientName('');
      setClientAddress('');
      setClientGST('');
      setInvoiceNumber('');
      setDueDate('');
      setNotes('');
      setItems([{ description: '', quantity: 1, rate: 0, taxRate: 18 }]);

      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const handleDownloadPDF = async (id, invNum) => {
    const toastId = toast.loading('Generating PDF...');
    try {
      const response = await API.get(`/finance/sales-invoices/${id}/pdf?t=${Date.now()}`, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF', { id: toastId });
    }
  };

  const handleDeleteInvoice = async (id, invNum) => {
    if (!window.confirm(`Are you sure you want to delete Invoice ${invNum}?`)) return;
    try {
      toast.loading('Deleting invoice...', { id: 'delete-toast' });
      await financeAPI.deleteSalesInvoice(id);
      toast.success('Invoice deleted successfully', { id: 'delete-toast' });
      fetchData();
    } catch (err) {
      toast.error('Failed to delete invoice', { id: 'delete-toast' });
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const invoiceNo = (inv.invoiceNumber || '').toLowerCase();
    const clientName = (inv.clientName || '').toLowerCase();
    const subtotal = String(inv.subtotal || '');
    const taxAmount = String(inv.taxAmount || '');
    const grandTotal = String(inv.grandTotal || '');
    
    return invoiceNo.includes(query) || 
           clientName.includes(query) || 
           subtotal.includes(query) || 
           taxAmount.includes(query) || 
           grandTotal.includes(query);
  });

  return (
    <DashboardLayout pageTitle="Invoice Generator">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <h3 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Client Invoice Directory</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HiOutlinePlus /> Create Client Invoice
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7a99', display: 'flex', alignItems: 'center' }}>
          <HiOutlineSearch size={18} />
        </span>
        <input 
          className="form-input" 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          placeholder="Search by client name, invoice number, or price..." 
          style={{ width: '100%', paddingLeft: '38px', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)' }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7a99', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <HiOutlineX size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7a99' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading...
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Invoice No', 'Client Name', 'Date', 'Subtotal', 'Tax Amount', 'Grand Total', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: '#6b7a99', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {searchQuery ? 'No invoices match your search criteria.' : 'No client invoices generated yet. Click "Create Client Invoice" to get started!'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{inv.invoiceNumber}</span></td>
                    <td style={tdStyle}>{inv.clientName}</td>
                    <td style={tdStyle}>{new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td style={tdStyle}>₹{inv.subtotal.toFixed(2)}</td>
                    <td style={tdStyle}>₹{inv.taxAmount.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: 700 }}>₹{inv.grandTotal.toFixed(2)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', height: '28px', width: '28px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Download Invoice PDF"
                        >
                          <HiOutlineDownload />
                        </button>
                        <button 
                          onClick={() => handleDeleteInvoice(inv._id, inv.invoiceNumber)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px', height: '28px', width: '28px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer' }}
                          title="Delete Invoice"
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '24px', padding: '32px',
            width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HiOutlineDocumentAdd style={{ color: 'var(--primary)' }} /> Generate Professional Tax Invoice
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Row 1 - Client Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>CLIENT / COMPANY NAME *</label>
                  <input className="form-input" required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp Pvt Ltd" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>CLIENT GSTIN (OPTIONAL)</label>
                  <input className="form-input" value={clientGST} onChange={e => setClientGST(e.target.value)} placeholder="e.g. 07AAAAA1111A1Z1" />
                </div>
              </div>

              {/* Row 2 - Address & Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>CLIENT BILLING ADDRESS</label>
                  <textarea className="form-input" style={{ minHeight: '60px', resize: 'vertical' }} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="Full Billing Address" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>INVOICE NO (AUTO IF EMPTY)</label>
                    <input className="form-input" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-0021" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>DUE DATE</label>
                    <input type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', margin: 0, fontWeight: 700 }}>Line Items / Bill Details</h4>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddItem} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '6px 12px' }}>
                    <HiOutlinePlus /> Add Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input 
                        className="form-input" 
                        style={{ flex: 2 }} 
                        placeholder="Item Description" 
                        required 
                        value={item.description} 
                        onChange={e => handleItemChange(idx, 'description', e.target.value)} 
                      />
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ width: '80px' }} 
                        placeholder="Qty" 
                        required 
                        min="1"
                        value={item.quantity} 
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                      />
                      <input 
                        type="number" 
                        className="form-input" 
                        style={{ width: '110px' }} 
                        placeholder="Rate (₹)" 
                        required 
                        min="0"
                        value={item.rate || ''} 
                        onChange={e => handleItemChange(idx, 'rate', e.target.value)} 
                      />
                      <select 
                        className="form-input" 
                        style={{ width: '90px' }}
                        value={item.taxRate} 
                        onChange={e => handleItemChange(idx, 'taxRate', e.target.value)}
                      >
                        <option value="0">GST 0%</option>
                        <option value="5">GST 5%</option>
                        <option value="12">GST 12%</option>
                        <option value="18">GST 18%</option>
                        <option value="28">GST 28%</option>
                      </select>
                      <div style={{ width: '100px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        ₹{(item.quantity * item.rate).toFixed(2)}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(idx)} 
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <HiOutlineTrash />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>INVOICE NOTES / T&C</label>
                  <textarea className="form-input" style={{ minHeight: '100px', resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Terms, bank account details, or instructions..." />
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>Subtotal:</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>GST Tax Amount:</span>
                    <span>₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px', marginTop: '4px' }}>
                    <span>Grand Total:</span>
                    <span style={{ color: '#3b82f6' }}>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow: 'var(--shadow-glow)' }}>Save & Register Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const tdStyle = { padding: '14px 20px', color: 'var(--text-secondary)', verticalAlign: 'middle', fontSize: '0.85rem' };

export default InvoiceGenerator;
