import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI } from '../../services/api';
import { HiOutlineTruck, HiOutlineSave, HiOutlineClipboardList, HiOutlineSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';

const GateGuardDashboard = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  
  const fileInputRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    billNumber: '',
    vendorName: '',
    vendorContact: '',
    materialType: 'nylon',
    materialDescription: '',
    quantity: '',
    unit: 'kg',
    vehicleNumber: '',
    driverName: ''
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await gateEntryAPI.getAll({ search });
      setEntries(res.data.data);
    } catch (err) {
      toast.error('Failed to load gate entry logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
      });
      if (invoiceFile) {
        formData.append('invoiceFile', invoiceFile);
      }

      await gateEntryAPI.create(formData);
      toast.success('Gate entry saved and dispatched to production queue in real-time!');
      setForm({
        billNumber: '',
        vendorName: '',
        vendorContact: '',
        materialType: 'nylon',
        materialDescription: '',
        quantity: '',
        unit: 'kg',
        vehicleNumber: '',
        driverName: ''
      });
      setInvoiceFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save gate entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Gate Operations Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px' }}>
        
        {/* Log Entry Form */}
        <div className="azure-card" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem' }}>
            <HiOutlineTruck style={{ color: 'var(--primary)' }} /> Log Inward Material
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Bill / Invoice Number *</label>
              <input type="text" className="form-input" required value={form.billNumber} onChange={e => setForm({ ...form, billNumber: e.target.value })} placeholder="e.g. BILL-99231" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Vendor Name *</label>
                <input type="text" className="form-input" required value={form.vendorName} onChange={e => setForm({ ...form, vendorName: e.target.value })} placeholder="e.g. Nylon Corp" />
              </div>
              <div className="form-group">
                <label className="form-label">Vendor Contact</label>
                <input type="text" className="form-input" value={form.vendorContact} onChange={e => setForm({ ...form, vendorContact: e.target.value })} placeholder="e.g. +91 99999..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Material Type *</label>
                <select className="form-input" required value={form.materialType} onChange={e => setForm({ ...form, materialType: e.target.value })}>
                  <option value="nylon">Nylon (Raw Material)</option>
                  <option value="pigment">Pigment</option>
                  <option value="packaging">Packaging</option>
                  <option value="hardware">Hardware</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">Quantity *</label>
                  <input type="number" step="0.01" className="form-input" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Unit</label>
                  <select className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="meters">meters</option>
                    <option value="liters">liters</option>
                    <option value="bags">bags</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Vehicle Number</label>
                <input type="text" className="form-input" value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g. DL-01-AB-1234" />
              </div>
              <div className="form-group">
                <label className="form-label">Driver Name</label>
                <input type="text" className="form-input" value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="Driver name" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Invoice File / Bill Document (Image/PDF)</label>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="form-input" 
                accept="image/*,application/pdf"
                style={{ padding: '8px 12px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Remarks</label>
              <textarea className="form-input" rows="2" value={form.materialDescription} onChange={e => setForm({ ...form, materialDescription: e.target.value })} placeholder="Item details, packaging condition..."></textarea>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              <HiOutlineSave /> {submitting ? 'Saving...' : 'Save & Dispatch Inward'}
            </button>
          </form>
        </div>

        {/* History / Logs */}
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.1rem', margin: 0 }}>
              <HiOutlineClipboardList style={{ color: 'var(--primary)' }} /> Gate Log Entries
            </h3>
            <div className="form-input-icon" style={{ width: '220px' }}>
              <HiOutlineSearch className="icon" />
              <input type="text" className="form-input" style={{ padding: '8px 12px 8px 36px', fontSize: '0.85rem' }} placeholder="Search Bill/Vendor..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading gate logs...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No gate entries found today.</div>
          ) : (
            <div className="azure-table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Vendor</th>
                    <th>Material</th>
                    <th>Vehicle</th>
                    <th>Invoice Document</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.billNumber}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>⏱️ {new Date(entry.createdAt).toLocaleString()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{entry.vendorName}</div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{entry.quantity} {entry.unit}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{entry.materialType}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        <div>{entry.vehicleNumber || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{entry.driverName || ''}</div>
                      </td>
                      <td>
                        {entry.invoiceUrl ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {/* <a 
                              href={`http://${window.location.hostname}:5000${entry.invoiceUrl}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              View
                            </a> */}
                            <a 
                              href={`http://49.13.70.253:9898${entry.invoiceUrl}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              View
                            </a>
                            {/* <a 
                              href={`http://${window.location.hostname}:5000${entry.invoiceUrl}`} 
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--success)', color: 'var(--success)' }}
                            >
                              Download
                            </a> */}
                            <a 
                              href={`http://49.13.70.253:9898${entry.invoiceUrl}`} 
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--success)', color: 'var(--success)' }}
                            >
                              Download
                            </a>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No Invoice</span>
                        )}
                      </td>
                      <td>
                        <span className={`azure-badge ${
                          entry.status === 'pending' ? 'warning' :
                          entry.status === 'verified' ? 'running' : 'success'
                        }`}>
                          {entry.status === 'pending' ? 'Pending Approval' :
                           entry.status === 'verified' ? 'Verified' : 'GRN Created'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GateGuardDashboard;
