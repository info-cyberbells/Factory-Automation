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
  const [gateFilter, setGateFilter] = useState('pending'); // 'pending', 'completed', 'all'
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

  // Predefined Belt Machinery
  const PREDEFINED_MACHINES = [
    "Belt Extruder 01",
    "Belt Extruder 02",
    "Conveyor Vulcanizer A",
    "Conveyor Vulcanizer B",
    "Drag Chain Link Assembler 01",
    "Drag Chain Link Assembler 02",
    "Belt Cutting Machine",
    "Tensile Strength Tester",
    "Link Molding Machine 01"
  ];

  // Machine Form
  const [machineForm, setMachineForm] = useState({ name: '', status: 'working', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '' });
  const [editingMachineId, setEditingMachineId] = useState(null);
  const [selectedMachineType, setSelectedMachineType] = useState('');
  const [isCustomMachineName, setIsCustomMachineName] = useState(false);

  // Build Form
  const [buildModalMode, setBuildModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedJobId, setSelectedJobId] = useState('');
  const [buildStatus, setBuildStatus] = useState('processing');
  const [estimatedDate, setEstimatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [buildTime, setBuildTime] = useState(new Date().toTimeString().slice(0, 5));
  const [materialsUsed, setMaterialsUsed] = useState([{ materialName: '', quantity: 25, unit: 'kg' }]);
  const [customFields, setCustomFields] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  // Automatically update selectedJob in create mode when a job is picked from the dropdown
  useEffect(() => {
    if (buildModalMode === 'create') {
      if (selectedJobId) {
        const job = buildJobs.find(j => j._id === selectedJobId);
        setSelectedJob(job || null);
      } else {
        setSelectedJob(null);
      }
    }
  }, [selectedJobId, buildJobs, buildModalMode]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [gateRes, machRes, buildRes, invRes] = await Promise.all([
        gateEntryAPI.getAll({ limit: 100 }),
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
    if (!machineForm.name.trim()) {
      toast.error('Please specify a machine name');
      return;
    }
    setSubmitting(true);
    try {
      if (editingMachineId) {
        await operationsAPI.updateMachine(editingMachineId, machineForm);
        toast.success('Machine status updated');
      } else {
        await operationsAPI.createMachine(machineForm);
        toast.success('Machine added to directory');
      }
      setMachineForm({ name: '', status: 'working', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '' });
      setEditingMachineId(null);
      setSelectedMachineType('');
      setIsCustomMachineName(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to save machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMachine = (mach) => {
    setMachineForm({
      name: mach.name,
      status: mach.status,
      remarks: mach.remarks || '',
      capacity: mach.capacity || '',
      modelNumber: mach.modelNumber || '',
      powerRating: mach.powerRating || '',
      lastServiceDate: mach.lastServiceDate ? new Date(mach.lastServiceDate).toISOString().split('T')[0] : ''
    });
    setEditingMachineId(mach._id);
    
    if (PREDEFINED_MACHINES.includes(mach.name)) {
      setSelectedMachineType(mach.name);
      setIsCustomMachineName(false);
    } else {
      setSelectedMachineType('custom');
      setIsCustomMachineName(true);
    }
    
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
  const handleOpenCreateBuild = () => {
    setBuildModalMode('create');
    setSelectedJobId('');
    setSelectedJob(null);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));
    setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setSelectedMachineId('');
    setShowBuildModal(true);
  };

  const handleOpenBuild = (job) => {
    setBuildModalMode('create');
    setSelectedJobId(job._id);
    setSelectedJob(job);
    setEstimatedDate(new Date().toISOString().split('T')[0]);
    setBuildTime(new Date().toTimeString().slice(0, 5));
    setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    setCustomFields([]);
    setSelectedMachineId('');
    setShowBuildModal(true);
  };

  const handleOpenEditBuild = (job) => {
    setBuildModalMode('edit');
    setSelectedJobId(job._id);
    setSelectedJob(job);
    setBuildStatus(job.status);
    
    if (job.estimatedDate) {
      const d = new Date(job.estimatedDate);
      setEstimatedDate(d.toISOString().split('T')[0]);
      setBuildTime(d.toTimeString().slice(0, 5));
    } else {
      setEstimatedDate(new Date().toISOString().split('T')[0]);
      setBuildTime(new Date().toTimeString().slice(0, 5));
    }

    if (job.materialsUsed && job.materialsUsed.length > 0) {
      setMaterialsUsed(job.materialsUsed.map(m => ({
        materialName: m.materialName,
        quantity: m.quantity,
        unit: m.unit
      })));
    } else {
      setMaterialsUsed([{ materialName: rawMaterials[0]?.name || 'Unspecified Raw Material', quantity: 25, unit: 'kg' }]);
    }

    if (job.customFields && job.customFields.length > 0) {
      setCustomFields(job.customFields.map(f => ({
        key: f.key,
        value: f.value
      })));
    } else {
      setCustomFields([]);
    }

    if (job.machineId) {
      setSelectedMachineId(job.machineId._id || job.machineId);
    } else {
      setSelectedMachineId('');
    }

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
    if (!selectedJob) {
      toast.error('Please select a build order.');
      return;
    }
    if (!selectedMachineId) {
      toast.error('Please assign a machine for this build.');
      return;
    }
    setSubmitting(true);
    try {
      const machName = machines.find(m => m._id === selectedMachineId)?.name || '';
      
      const payload = {
        status: buildModalMode === 'create' ? 'processing' : buildStatus,
        estimatedDate: estimatedDate ? new Date(`${estimatedDate}T${buildTime}:00`) : undefined,
        materialsUsed,
        customFields,
        machineId: selectedMachineId,
        machineName: machName
      };

      if (buildModalMode === 'create') {
        payload.startedAt = Date.now();
      }

      await operationsAPI.updateBuildJob(selectedJob._id, payload);
      toast.success(
        buildModalMode === 'create' 
          ? 'Product has been loaded into production line!' 
          : 'Build process configuration updated!'
      );
      setShowBuildModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to update build process');
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

  const handleStatusChange = async (job, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (['processing', 'delayed'].includes(newStatus) && !job.machineId) {
        toast.error('Please assign a machine first by clicking "Start Build" or "Edit Process".');
        return;
      }
      await operationsAPI.updateBuildJob(job._id, payload);
      toast.success(`Build status updated to ${newStatus.replace('_', ' ')}!`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <DashboardLayout pageTitle="Supervisor Operations Control">
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'gate_approvals'} onClick={() => setActiveTab('gate_approvals')} icon={<HiOutlineCheckCircle />}>
          Gate Approvals ({gateEntries.filter(entry => entry.status === 'pending').length})
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>
              {gateFilter === 'pending' ? 'Pending Gate Approvals' : gateFilter === 'completed' ? 'Completed Gate Approvals' : 'All Gate Approvals'}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status Filter:</span>
              <select
                value={gateFilter}
                onChange={e => setGateFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  background: '#1e293b',
                  color: '#ffffff',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  outline: 'none',
                  width: '180px'
                }}
              >
                <option value="pending" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Pending Approvals</option>
                <option value="completed" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Completed Approvals</option>
                <option value="all" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>All Approvals</option>
              </select>
            </div>
          </div>

          {gateEntries.filter(entry => {
            if (gateFilter === 'pending') return entry.status === 'pending';
            if (gateFilter === 'completed') return ['verified', 'grn_created', 'rejected'].includes(entry.status);
            return true;
          }).length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '20px' }}>
              {gateFilter === 'pending' ? 'No pending gate entry approvals.' : gateFilter === 'completed' ? 'No completed approvals found.' : 'No gate entries found.'}
            </p>
          ) : (
            <div className="azure-table-container">
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Bill Info</th>
                    <th>Vendor</th>
                    <th>Material Type</th>
                    <th>Quantity</th>
                    <th>Driver / Vehicle</th>
                    <th>Invoice Document</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gateEntries.filter(entry => {
                    if (gateFilter === 'pending') return entry.status === 'pending';
                    if (gateFilter === 'completed') return ['verified', 'grn_created', 'rejected'].includes(entry.status);
                    return true;
                  }).map(entry => (
                    <tr key={entry._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.billNumber}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                          ⏱️ {new Date(entry.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td>{entry.vendorName}</td>
                      <td>{entry.materialType}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-light)' }}>{entry.quantity} {entry.unit}</td>
                      <td>{entry.driverName} ({entry.vehicleNumber})</td>
                      <td>
                        {entry.invoiceUrl ? (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <a 
                              href={`http://${window.location.hostname}:5000${entry.invoiceUrl}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              View
                            </a>
                            <a 
                              href={`http://${window.location.hostname}:5000${entry.invoiceUrl}`} 
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
                        {entry.status === 'pending' ? (
                          <button className="btn btn-accent btn-sm" onClick={() => handleOpenGateVerify(entry._id)}>
                            <HiOutlineCheckCircle /> Verify & Approve
                          </button>
                        ) : (
                          <span className={`azure-badge ${
                            entry.status === 'verified' ? 'running' :
                            entry.status === 'grn_created' ? 'success' : 'danger'
                          }`} style={{ textTransform: 'capitalize' }}>
                            {entry.status === 'verified' ? 'Verified' :
                             entry.status === 'grn_created' ? 'GRN Created' : entry.status}
                          </span>
                        )}
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
              setMachineForm({ name: '', status: 'working', remarks: '', capacity: '', modelNumber: '', powerRating: '', lastServiceDate: '' });
              setSelectedMachineType('');
              setIsCustomMachineName(false);
              setShowMachineModal(true);
            }}><HiOutlinePlus /> Add Machine</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {machines.map(mach => {
              const cardClass = mach.status === 'working' ? 'success' : 
                                mach.status === 'broken' ? 'danger' : 'warning';
              const badgeClass = cardClass;
              const statusText = mach.status === 'running' ? 'in progress' : 
                                 mach.status === 'broken' ? 'damaged' : mach.status;
              return (
                <div key={mach._id} className={`azure-card ${cardClass}`} style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{mach.name}</h4>
                    <span className={`azure-badge ${badgeClass}`} style={{ textTransform: 'uppercase' }}>
                      {statusText}
                    </span>
                  </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '10px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div><strong>Cap:</strong> {mach.capacity || '--'}</div>
                  <div><strong>Model:</strong> {mach.modelNumber || '--'}</div>
                  <div><strong>Power:</strong> {mach.powerRating || '--'}</div>
                  <div><strong>Serviced:</strong> {mach.lastServiceDate ? new Date(mach.lastServiceDate).toLocaleDateString() : '--'}</div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', minHeight: '32px', marginBottom: '16px' }}>{mach.remarks || 'No remarks.'}</p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px' }} onClick={() => handleEditMachine(mach)}>Edit</button>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeleteMachine(mach._id)}>Delete</button>
                </div>
                </div>
              );
            })}
          </div>
        </div>

      ) : (
        
        /* PRODUCTION BUILD QUEUE */
        <div className="azure-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', margin: 0 }}>Active Build Queue</h3>
            <button className="btn btn-primary btn-sm" onClick={handleOpenCreateBuild}>
              <HiOutlinePlus /> Create Build Process
            </button>
          </div>
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
                        {job.machineId && typeof job.machineId === 'object' ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                            ⚙️ Machine: {job.machineId.name} {job.machineId.capacity ? `(${job.machineId.capacity})` : ''} {job.machineId.modelNumber ? `[Model: ${job.machineId.modelNumber}]` : ''}
                          </div>
                        ) : job.machineName ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 600 }}>
                            ⚙️ Machine: {job.machineName}
                          </div>
                        ) : null}
                        {job.materialsUsed && job.materialsUsed.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            📦 Materials: {job.materialsUsed.map(m => `${m.quantity} ${m.unit} ${m.materialName}`).join(', ')}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>{job.orderQuantity} pcs</td>
                      <td>
                        <div>{job.orderedBy?.name}</div>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                          {job.orderedRole}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <select
                            value={job.status}
                            onChange={(e) => handleStatusChange(job, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              background: job.status === 'completed' || job.status === 'received' ? 'rgba(16, 124, 65, 0.15)' :
                                          job.status === 'processing' ? 'rgba(0, 120, 212, 0.15)' :
                                          job.status === 'delayed' || job.status === 'shortage_reported' ? 'rgba(168, 0, 0, 0.15)' : 'rgba(255, 185, 0, 0.15)',
                              color: job.status === 'completed' || job.status === 'received' ? '#107c41' :
                                     job.status === 'processing' ? '#0078d4' :
                                     job.status === 'delayed' || job.status === 'shortage_reported' ? '#a80000' : '#d29200',
                              border: '1px solid currentColor',
                              cursor: 'pointer',
                              textTransform: 'capitalize',
                              outline: 'none'
                            }}
                          >
                            <option value="pending" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Pending</option>
                            <option value="processing" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Processing</option>
                            <option value="delayed" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Delayed</option>
                            <option value="shortage_reported" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Shortage Reported</option>
                            <option value="completed" style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Completed</option>
                            <option value="received" disabled={job.status !== 'received'} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Received</option>
                            <option value="declined" disabled={job.status !== 'declined'} style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>Declined</option>
                          </select>
                          {job.estimatedDate && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                              Est: {new Date(job.estimatedDate).toLocaleString()}
                            </div>
                          )}
                        </div>
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenBuild(job)}>
                              <HiOutlinePlay /> Start Build (Override)
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditBuild(job)}>
                              Edit Process
                            </button>
                          </div>
                        )}
                        {['processing', 'delayed'].includes(job.status) && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn btn-accent btn-sm" onClick={() => handleSendToStore(job._id)}>
                              <HiOutlineArrowCircleRight /> Send to Store
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditBuild(job)}>
                              Edit Process
                            </button>
                          </div>
                        )}
                        {['completed', 'received', 'declined'].includes(job.status) && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Finished ({job.status})</span>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '0.72rem' }} onClick={() => handleOpenEditBuild(job)}>
                              Edit
                            </button>
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
        <ModalOverlay onClose={() => setShowMachineModal(false)} title={editingMachineId ? "Edit Belt Machine Status" : "Add Belt Production Machine"}>
          <form onSubmit={handleSaveMachine}>
            <div style={{ display: 'grid', gridTemplateColumns: isCustomMachineName ? '1fr 1fr 1fr' : '1.2fr 0.8fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Machine Type *</label>
                <select 
                  className="form-input" 
                  required 
                  value={selectedMachineType} 
                  onChange={e => {
                    const val = e.target.value;
                    setSelectedMachineType(val);
                    if (val === 'custom') {
                      setIsCustomMachineName(true);
                      setMachineForm(prev => ({ ...prev, name: '' }));
                    } else {
                      setIsCustomMachineName(false);
                      setMachineForm(prev => ({ ...prev, name: val }));
                    }
                  }}
                >
                  <option value="">-- Choose Type --</option>
                  {PREDEFINED_MACHINES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                  <option value="custom">-- Custom Name --</option>
                </select>
              </div>
              
              {isCustomMachineName && (
                <div className="form-group">
                  <label className="form-label">Custom Machine Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={machineForm.name} 
                    onChange={e => setMachineForm({ ...machineForm, name: e.target.value })} 
                    placeholder="Enter custom machine name" 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Operational Status *</label>
                <select className="form-input" value={machineForm.status} onChange={e => setMachineForm({ ...machineForm, status: e.target.value })}>
                  <option value="working">Working</option>
                  <option value="idle">Idle</option>
                  <option value="broken">Damaged</option>
                  <option value="running">In Progress</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Production Capacity *</label>
                <input type="text" className="form-input" value={machineForm.capacity} onChange={e => setMachineForm({ ...machineForm, capacity: e.target.value })} placeholder="e.g. 200 meters/hour or 500 pcs/day" />
              </div>
              <div className="form-group">
                <label className="form-label">Model Number</label>
                <input type="text" className="form-input" value={machineForm.modelNumber} onChange={e => setMachineForm({ ...machineForm, modelNumber: e.target.value })} placeholder="e.g. BELT-VULC-300" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Power Rating (e.g. 15 kW)</label>
                <input type="text" className="form-input" value={machineForm.powerRating} onChange={e => setMachineForm({ ...machineForm, powerRating: e.target.value })} placeholder="e.g. 15 kW" />
              </div>
              <div className="form-group">
                <label className="form-label">Last Service Date</label>
                <input type="date" className="form-input" value={machineForm.lastServiceDate} onChange={e => setMachineForm({ ...machineForm, lastServiceDate: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Maintenance Notes / Mold Config</label>
              <textarea className="form-input" value={machineForm.remarks} onChange={e => setMachineForm({ ...machineForm, remarks: e.target.value })} placeholder="Mold width configurations, tension calibration, or recent maintenance details..."></textarea>
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
        <ModalOverlay onClose={() => setShowBuildModal(false)} title={buildModalMode === 'create' ? "Configure Production Build Process" : "Edit Build Process Configuration"}>
          
          {buildModalMode === 'create' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Select Pending Build Order *</label>
              <select
                className="form-input"
                required
                value={selectedJobId}
                onChange={e => setSelectedJobId(e.target.value)}
              >
                <option value="">-- Choose Pending Order --</option>
                {buildJobs.filter(j => ['pending', 'shortage_reported'].includes(j.status) || j._id === selectedJobId).map(j => (
                  <option key={j._id} value={j._id}>
                    {j.productName} (Qty: {j.orderQuantity} pcs, Size: {j.productSize || 'Standard'}) - {j.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {buildModalMode === 'edit' && (
            <div style={{ background: 'var(--primary-glow)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Editing Process: {selectedJob?.productName}</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Qty: {selectedJob?.orderQuantity} pcs</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Original Status: <span style={{ textTransform: 'capitalize' }}>{selectedJob?.status?.replace('_', ' ')}</span></div>
            </div>
          )}

          {selectedJob ? (
            <form onSubmit={handleStartProcessBuild}>
              
              {/* Target Details for Create Mode */}
              {buildModalMode === 'create' && (
                <div style={{ background: 'var(--primary-glow)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-primary)', marginBottom: '20px' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Target Product: {selectedJob.productName}</h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target Qty: {selectedJob.orderQuantity} pcs</div>
                </div>
              )}

              {/* Status Selection (Edit Mode only) */}
              {buildModalMode === 'edit' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Supervise Status *</label>
                  <select
                    className="form-input"
                    required
                    value={buildStatus}
                    onChange={e => setBuildStatus(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing / In Production</option>
                    <option value="delayed">Delayed</option>
                    <option value="shortage_reported">Shortage Reported</option>
                    <option value="completed">Completed / Sent to Store</option>
                  </select>
                </div>
              )}

              {/* Machine Selection */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Assign Machine for Build *</label>
                <select className="form-input" required value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}>
                  <option value="">-- Select Available Machine --</option>
                  {machines.filter(m => m.status === 'working' || m.status === 'idle' || m._id === selectedMachineId).map(m => (
                    <option key={m._id} value={m._id}>{m.name} {m.status === 'running' ? '(Currently Assigned)' : `(Cap: ${m.capacity || 'N/A'})`}</option>
                  ))}
                </select>
              </div>

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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (buildModalMode === 'create' ? 'Load Production Process' : 'Save Process Updates')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Please select a pending build order above to configure details.
            </div>
          )}
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
