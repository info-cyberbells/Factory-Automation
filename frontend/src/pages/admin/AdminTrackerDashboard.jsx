import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI } from '../../services/api';
import {
  HiOutlineTruck, HiOutlineCog, HiOutlineClipboardCheck, HiOutlineCube,
  HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineClock, HiOutlineTrendingUp
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;

const AdminTrackerDashboard = () => {
  const { user } = useAuth();
  
  const [gateLogs, setGateLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [buildJobs, setBuildJobs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [qcLogs, setQcLogs] = useState([]);
  const [sbsLogs, setSbsLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);

  const fetchTrackerData = useCallback(async () => {
    try {
      const [gateRes, machRes, buildRes, invRes, qcRes, sbsRes] = await Promise.all([
        gateEntryAPI.getAll({ limit: 10 }),
        operationsAPI.getMachines(),
        operationsAPI.getBuildJobs(),
        operationsAPI.getInventory(),
        operationsAPI.getQualityLogs(),
        operationsAPI.getShortageBuySales()
      ]);
      setGateLogs(gateRes.data.data);
      setMachines(machRes.data.data);
      setBuildJobs(buildRes.data.data);
      setInventory(invRes.data.data);
      setQcLogs(qcRes.data.data);
      setSbsLogs(sbsRes.data.data);
    } catch (err) {
      toast.error('Failed to update dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrackerData();

    let socket;
    if (user?.organizationId) {
      socket = io(SOCKET_URL, { withCredentials: true });
      socket.emit('join_org', user.organizationId);

      socket.on('gate_entry_updated', fetchTrackerData);
      socket.on('build_updated', fetchTrackerData);
      socket.on('inventory_updated', fetchTrackerData);
      socket.on('quality_updated', fetchTrackerData);
      socket.on('machine_updated', fetchTrackerData);
      socket.on('communication_updated', fetchTrackerData);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [fetchTrackerData, user?.organizationId]);

  // Aggregate Stats
  const activeMachines = machines.filter(m => m.status === 'working').length;
  const brokenMachines = machines.filter(m => m.status === 'broken').length;
  const totalStockCount = inventory.reduce((acc, curr) => acc + curr.quantity, 0);
  const activeBuildOrders = buildJobs.filter(j => ['pending', 'processing'].includes(j.status)).length;
  const shortageOrders = buildJobs.filter(j => j.status === 'shortage_reported').length;

  return (
    <DashboardLayout pageTitle="Enterprise Real-Time Pipeline Tracker">
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Initializing real-time analytics...
        </div>
      ) : (
        <>
          {/* Azure Status Cards */}
          <div className="stats-grid">
            <div className="stat-card blue">
              <div className="stat-header">
                <div className="stat-icon blue"><HiOutlineTruck /></div>
                <span className="azure-badge running">Live</span>
              </div>
              <div className="stat-value">{gateLogs.length}</div>
              <div className="stat-label">Inward Gate Shipments Logs</div>
            </div>

            <div className="stat-card green">
              <div className="stat-header">
                <div className="stat-icon green"><HiOutlineCog /></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{activeMachines} Active / {brokenMachines} Repair</span>
              </div>
              <div className="stat-value">{machines.length}</div>
              <div className="stat-label">Factory Machinery Modules</div>
            </div>

            <div className="stat-card purple">
              <div className="stat-header">
                <div className="stat-icon purple"><HiOutlineClock /></div>
                <span className="azure-badge warning">{activeBuildOrders} In Line</span>
              </div>
              <div className="stat-value">{buildJobs.length}</div>
              <div className="stat-label">Production Build Jobs</div>
            </div>

            <div className="stat-card orange">
              <div className="stat-header">
                <div className="stat-icon orange"><HiOutlineExclamation /></div>
                <span className="azure-badge danger">{shortageOrders} Shortages</span>
              </div>
              <div className="stat-value">{totalStockCount}</div>
              <div className="stat-label">Unified Inventory Units Stocked</div>
            </div>
          </div>

          {/* Real-time Flow Pipeline Tracker */}
          <div className="azure-card" style={{ padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
              <HiOutlineTrendingUp style={{ color: 'var(--primary)' }} /> Live Manufacturing Pipeline flow
            </h3>
            
            <div className="pipeline-container">
              <div className={`pipeline-step ${gateLogs.length > 0 ? 'completed' : 'active'}`}>
                <div className="pipeline-step-circle">🚚</div>
                <div className="pipeline-step-label">Gate Log inward</div>
              </div>
              
              <div className={`pipeline-step ${qcLogs.filter(l => l.status === 'verified').length > 0 ? 'completed' : 'active'}`}>
                <div className="pipeline-step-circle">🔎</div>
                <div className="pipeline-step-label">QC inspected</div>
              </div>
              
              <div className={`pipeline-step ${buildJobs.filter(j => j.status === 'processing').length > 0 ? 'completed' : 'active'}`}>
                <div className="pipeline-step-circle">⚙️</div>
                <div className="pipeline-step-label">Production build</div>
              </div>
              
              <div className={`pipeline-step ${buildJobs.filter(j => j.status === 'completed').length > 0 ? 'completed' : 'active'}`}>
                <div className="pipeline-step-circle">📦</div>
                <div className="pipeline-step-label">Dispatched to Store</div>
              </div>

              <div className={`pipeline-step ${buildJobs.filter(j => j.status === 'received').length > 0 ? 'completed' : ''}`}>
                <div className="pipeline-step-circle">✅</div>
                <div className="pipeline-step-label">Godown stocked</div>
              </div>
            </div>
          </div>

          {/* Detailed Lists Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '28px', marginBottom: '28px' }}>
            
            {/* Live Build Queue status */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Manufacturing Line Status</h3>
              <div className="azure-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Stage</th>
                      <th>Expected date</th>
                    </tr>
                  </thead>
                  <tbody>
                     {buildJobs.map(job => (
                      <tr key={job._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{job.productName}</div>
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
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {job.estimatedDate ? new Date(job.estimatedDate).toLocaleString() : 'Scheduling...'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality & OCR Logs Warnings */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Quality Inspections Audit Trail</h3>
              <div className="azure-table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Report Type</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcLogs.map(log => (
                      <tr key={log._id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.materialName}</td>
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
                          <span className={`azure-badge ${
                            log.status === 'verified' ? 'success' : 'warning'
                          }`}>
                            {log.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px' }}>
            
            {/* Machine Automation monitoring */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Machinery Live Status</h3>
              <div className="azure-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Machine Name</th>
                      <th>Operating Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map(m => (
                      <tr key={m._id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</td>
                        <td>
                          <span className={`azure-badge ${
                            m.status === 'working' ? 'success' :
                            m.status === 'running' || m.status === 'idle' ? 'warning' : 'danger'
                          }`}>
                            {m.status === 'running' ? 'in progress' : m.status === 'broken' ? 'damaged' : m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inward shipments log */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Recent Gate Logs</h3>
              <div className="azure-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Bill Info</th>
                      <th>Vendor Sourcing</th>
                      <th>Inward Qty</th>
                      <th>Invoice Document</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gateLogs.map(entry => (
                      <tr key={entry._id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{entry.billNumber}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                            ⏱️ {new Date(entry.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td>{entry.vendorName}</td>
                        <td style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{entry.quantity} {entry.unit}</td>
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
                          <span className={`azure-badge ${
                            entry.status === 'pending' ? 'warning' : 'success'
                          }`}>
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Third row: Shortage/Buy/Sales & Available Stock levels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px', marginTop: '28px' }}>
            
            {/* Shortage & Sourcing Communications */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Shortage & Sourcing Registry</h3>
              <div className="azure-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Assignee</th>
                      <th>Sourcing Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sbsLogs.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '10px' }}>No active shortages or procurement logs.</td></tr>
                    ) : (
                      sbsLogs.map(log => (
                        <tr key={log._id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {log.itemName}
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{log.remarks || 'No remarks'}</div>
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inventory Levels Snapshot */}
            <div className="azure-card" style={{ padding: '24px' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1rem' }}>Inventory Stock Snapshot</h3>
              <div className="azure-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table className="azure-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Type</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '10px' }}>No inventory items found.</td></tr>
                    ) : (
                      inventory.slice(0, 10).map(item => (
                        <tr key={item._id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</td>
                          <td style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>{item.type.replace('_', ' ')}</td>
                          <td style={{ fontWeight: 700, color: item.quantity === 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {item.quantity} {item.unit}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

    </DashboardLayout>
  );
};

export default AdminTrackerDashboard;
