import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI } from '../../services/api';
import {
  HiOutlineCheckCircle, HiOutlineCog, HiOutlineAdjustments, HiOutlinePlus,
  HiOutlinePlay, HiOutlineArrowCircleRight, HiOutlineX, HiOutlineTrash
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('gate_approvals'); // 'gate_approvals', 'machines', 'build_queue'
  
  const [gateEntries, setGateEntries] = useState([]);
  const [machines, setMachines] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showMachineModal, setShowMachineModal] = useState(false);
  
  // Gate Entry Verification Remark Modal
  const [showGateVerifyModal, setShowGateVerifyModal] = useState(false);
  const [selectedGateEntryId, setSelectedGateEntryId] = useState(null);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  // Machine Form
  const [machineForm, setMachineForm] = useState({ name: '', status: 'working', remarks: '' });
  const [editingMachineId, setEditingMachineId] = useState(null);

  // Build Form
  const [estimatedDate, setEstimatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [buildTime, setBuildTime] = useState(new Date().toTimeString().slice(0, 5));
  const [materialsUsed, setMaterialsUsed] = useState([{ materialName: '', quantity: 25, unit: 'kg' }]);
  const [customFields, setCustomFields] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gateRes, machRes, buildRes, invRes] = await Promise.all([
        gateEntryAPI.getAll({ status: 'pending' }),
        operationsAPI.getMachines(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getInventory()
      ]);
      setGateEntries(gateRes.data.data);
      setMachines(machRes.data.data);
      setBuildJobs(buildRes.data.data);
      // Filter inventory to only get raw materials for dropdowns
      setRawMaterials(invRes.data.data.filter(item => item.type === 'raw_material'));
    } catch (err) {
      toast.error('Failed to load supervisor workspace data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Listen to real-time events to reload queue
    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('gate_entry_updated', fetchData);
      socket.on('build_updated', fetchData);
      socket.on('machine_updated', fetchData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchData, user?.organizationId]);

  // Open Gate Verify Modal
  const handleOpenGateVerify = (id) => {
    setSelectedGateEntryId(id);
    setVerificationRemarks('');
    setShowGateVerifyModal(true);
  };

  // Gate Approval Handler
  const handleApproveGate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await gateEntryAPI.update(selectedGateEntryId, {
        status: 'verified',
        remarks: verificationRemarks,
        verifiedBy: user._id
      });
      toast.success('Gate Entry approved & verified with remarks successfully');
      setShowGateVerifyModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve Gate Entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Machine Handlers
  const handleSaveMachine = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingMachineId) {
        await operationsAPI.updateMachine(editingMachineId, machineForm);
        toast.success('Machine status updated');
      } else {
        await operationsAPI.createMachine(machineForm);
        toast.success('Machine added to directory');
      }
      setShowMachineModal(false);
      setMachineForm({ name: '', status: 'working', remarks: '' });
      setEditingMachineId(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to save machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMachine = (mach) => {
    setMachineForm({ name: mach.name, status: mach.status, remarks: mach.remarks || '' });
    setEditingMachineId(mach._id);
    setShowMachineModal(true);
  };

  const handleDeleteMachine = async (id) => {
    if (!window.confirm('Delete this machine?')) return;
    try {
      await operationsAPI.deleteMachine(id);
      toast.success('Machine deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete machine');
    }
  };

  // Build Queue Handlers
  const handleOpenBuild = (job) => {
    setSelectedJob(job);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));
    // Pre-populate with first raw material if available
    setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setShowBuildModal(true);
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleAddMaterial = () => {
    setMaterialsUsed([...materialsUsed, { materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 1, unit: 'kg' }]);
  };

  const handleRemoveMaterial = (index) => {
    setMaterialsUsed(materialsUsed.filter((_, i) => i !== index));
  };

  const handleStartProcessBuild = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await operationsAPI.updateBuildJob(selectedJob._id, {
        status: 'processing',
        estimatedDate: estimatedDate ? new Date(`${estimatedDate}T${buildTime}:00`) : undefined,
        materialsUsed,
        customFields,
        startedAt: Date.now()
      });
      toast.success('Product has been loaded into production line!');
      setShowBuildModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to process build');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendToStore = async (id) => {
    try {
      await operationsAPI.sendToStore(id);
      toast.success('Product completed and dispatched to Store (Handshake Sent)!');
      fetchData();
    } catch (err) {
      toast.error('Failed to complete build job');
    }
  };

  const reportShortage = async (job) => {
    try {
      await operationsAPI.updateBuildJob(job._id, { status: 'shortage_reported' });
      toast.success('Shortage report sent to Sales and Store Manager');
      fetchData();
    } catch (err) {
      toast.error('Failed to report shortage');
    }
  };

  return (
    <DashboardLayout pageTitle="Supervisor Operations Control">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'gate_approvals'} onClick={() => setActiveTab('gate_approvals')} icon={<HiOutlineCheckCircle />}>
          Gate Approvals ({gateEntries.length})
        </TabBtn>
        <TabBtn active={activeTab === 'machines'} onClick={() => setActiveTab('machines')} icon={<HiOutlineCog />}>
          Machine Automation ({machines.length})
        </TabBtn>
        <TabBtn active={activeTab === 'build_queue'} onClick={() => setActiveTab('build_queue')} icon={<HiOutlineAdjustments />}>
          Product Build Queue ({buildJobs.filter(j => ['pending', 'processing', 'shortage_reported'].includes(j.status)).length})
        </TabBtn>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading...
        </div>
      ) : activeTab === 'gate_approvals' ? (
        
        /* GATE APPROVALS */
        <div className="azure-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Pending Gate Approvals</h3>
          {gateEntries.length === 0 ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No pending gate entry approvals.</p> : (
            <div className="azure-table-container">
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Vendor</th>
                    <th>Material Type</th>
                    <th>Quantity</th>
                    <th>Driver / Vehicle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gateEntries.map(entry => (
                    <tr key={entry._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.billNumber}</td>
                      <td>{entry.vendorName}</td>
                      <td>{entry.materialType}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{entry.quantity} {entry.unit}</td>
                      <td>{entry.driverName} ({entry.vehicleNumber})</td>
                      <td>
                        <button className="btn btn-accent btn-sm" onClick={() => handleOpenGateVerify(entry._id)}>
                          <HiOutlineCheckCircle /> Verify & Approve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : activeTab === 'machines' ? (
        
        /* MACHINE AUTOMATION */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>Factory Machinery Status</h3>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditingMachineId(null);
              setMachineForm({ name: '', status: 'working', remarks: '' });
              setShowMachineModal(true);
            }}><HiOutlinePlus /> Add Machine</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {machines.map(mach => (
              <div key={mach._id} className={`azure-card ${mach.status === 'working' ? 'success' : mach.status === 'idle' ? 'warning' : 'danger'}`} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{mach.name}</h4>
                  <span className={`azure-badge ${mach.status === 'working' ? 'success' : mach.status === 'idle' ? 'warning' : 'danger'}`}>
                    {mach.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', minHeight: '32px', marginBottom: '16px' }}>{mach.remarks || 'No remarks.'}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }} onClick={() => handleEditMachine(mach)}>Edit</button>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeleteMachine(mach._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      ) : (
        
        /* PRODUCTION BUILD QUEUE */
        <div className="azure-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', color: 'var(--text-primary)', fontSize: '1.1rem' }}>Active Build Queue</h3>
          {buildJobs.length === 0 ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>No production orders in queue.</p> : (
            <div className="azure-table-container">
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Product Details</th>
                    <th>Ordered Qty</th>
                    <th>Ordered By</th>
                    <th>Status</th>
                    <th>Build Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {buildJobs.map(job => (
                    <tr key={job._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>Size: {job.productSize || 'N/A'}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{job.orderQuantity} pcs</td>
                      <td>
                        <div>{job.orderedBy?.name}</div>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {job.orderedRole}
                        </span>
                      </td>
                      <td>
                        <span className={`azure-badge ${
                          job.status === 'pending' ? 'warning' :
                          job.status === 'shortage_reported' ? 'danger' :
                          job.status === 'processing' ? 'running' : 'success'
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {job.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenBuild(job)}>
                              <HiOutlinePlay /> Start Build
                            </button>
                            <button className="btn btn-secondary btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => reportShortage(job)}>
                              Report Shortage
                            </button>
                          </div>
                        )}
                        {job.status === 'shortage_reported' && (
                          <button className="btn btn-primary btn-sm" onClick={() => handleOpenBuild(job)}>
                            <HiOutlinePlay /> Start Build (Override)
                          </button>
                        )}
                        {job.status === 'processing' && (
                          <button className="btn btn-accent btn-sm" onClick={() => handleSendToStore(job._id)}>
                            <HiOutlineArrowCircleRight /> Send to Store
                          </button>
                        )}
                        {['completed', 'received', 'declined'].includes(job.status) && (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Finished ({job.status})</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* GATE VERIFY REMARK MODAL */}
      {showGateVerifyModal && (
        <ModalOverlay onClose={() => setShowGateVerifyModal(false)} title="Verify Gate shipment">
          <form onSubmit={handleApproveGate}>
            <div className="form-group">
              <label className="form-label">Verification remarks *</label>
              <textarea className="form-input" required rows="3" value={verificationRemarks} onChange={e => setVerificationRemarks(e.target.value)} placeholder="e.g. Nylon sacks quantity verified, bags checked, no damages found."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyItems: 'flex-end', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowGateVerifyModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Verifying...' : 'Verify & Approve Shipment'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* MACHINE FORM MODAL */}
      {showMachineModal && (
        <ModalOverlay onClose={() => setShowMachineModal(false)} title={editingMachineId ? "Edit Machine Status" : "Add Factory Machine"}>
          <form onSubmit={handleSaveMachine}>
            <div className="form-group">
              <label className="form-label">Machine Name *</label>
              <input type="text" className="form-input" required value={machineForm.name} onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} placeholder="e.g. Molding Machine 01" />
            </div>
            <div className="form-group">
              <label className="form-label">Operational Status *</label>
              <select className="form-input" value={machineForm.status} onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}>
                <option value="working">Working</option>
                <option value="idle">Idle / Standby</option>
                <option value="broken">Broken / Maintenance</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Maintenance Notes</label>
              <textarea className="form-input" value={machineForm.remarks} onChange={e => setMachineForm({ ...machineForm, remarks: e.target.value })} placeholder="Recent faults or service details..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowMachineModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Machine'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* START BUILD FORM MODAL */}
      {showBuildModal && (
        <ModalOverlay onClose={() => setShowBuildModal(false)} title="Production Build Process Configuration">
          <div style={{ background: 'var(--primary-glow)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
            <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Product: {selectedJob?.productName}</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Qty: {selectedJob?.orderQuantity} pcs</div>
          </div>
          <form onSubmit={handleStartProcessBuild}>
            
            {/* Standard Target Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Estimated Completion Date *</label>
                <input type="date" className="form-input" required value={estimatedDate} onChange={e => setEstimatedDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Completion Time *</label>
                <input type="time" className="form-input" required value={buildTime} onChange={e => setBuildTime(e.target.value)} />
              </div>
            </div>

            {/* Material Consumption Logs */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Material Inwards Log</span>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={handleAddMaterial}>+ Add Material</button>
              </label>
              {materialsUsed.map((mat, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <select className="form-input" style={{ padding: '8px 12px' }} value={mat.materialName} onChange={e => {
                    const updated = [...materialsUsed];
                    updated[idx].materialName = e.target.value;
                    setMaterialsUsed(updated);
                  }}>
                    {rawMaterials.length === 0 ? (
                      <option value="Unspecified Raw Material">Unspecified Raw Material (None in Inventory)</option>
                    ) : (
                      rawMaterials.map(item => (
                        <option key={item._id} value={item.name}>{item.name}</option>
                      ))
                    )}
                  </select>
                  <input type="number" className="form-input" style={{ padding: '8px 12px' }} placeholder="Qty" required value={mat.quantity} onChange={e => {
                    const updated = [...materialsUsed];
                    updated[idx].quantity = Number(e.target.value);
                    setMaterialsUsed(updated);
                  }} />
                  <select className="form-input" style={{ padding: '8px 12px' }} value={mat.unit} onChange={e => {
                    const updated = [...materialsUsed];
                    updated[idx].unit = e.target.value;
                    setMaterialsUsed(updated);
                  }}>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                    <option value="bags">bags</option>
                    <option value="liters">liters</option>
                  </select>
                  {materialsUsed.length > 1 && (
                    <button type="button" style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleRemoveMaterial(idx)}>
                      <HiOutlineTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Flexible Custom Fields */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Custom Inputs / Build Specs</span>
                <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={handleAddCustomField}>+ Add Custom Field</button>
              </label>
              {customFields.map((field, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input type="text" className="form-input" style={{ padding: '8px 12px' }} placeholder="Field Label (e.g. Mold ID)" required value={field.key} onChange={e => {
                    const updated = [...customFields];
                    updated[idx].key = e.target.value;
                    setCustomFields(updated);
                  }} />
                  <input type="text" className="form-input" style={{ padding: '8px 12px' }} placeholder="Value (e.g. M-88)" required value={field.value} onChange={e => {
                    const updated = [...customFields];
                    updated[idx].value = e.target.value;
                    setCustomFields(updated);
                  }} />
                  <button type="button" style={{ color: 'var(--danger)', background: 'none' }} onClick={() => handleRemoveCustomField(idx)}>
                    <HiOutlineTrash />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowBuildModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Starting Build...' : 'Load Production Process'}</button>
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

export default SupervisorDashboard;
