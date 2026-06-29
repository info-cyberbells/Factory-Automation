import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { gateEntryAPI, operationsAPI } from '../../services/api';
import {
  HiOutlineTruck, HiOutlineCog, HiOutlineClock, HiOutlineExclamation
} from 'react-icons/hi';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://localhost:9898`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const AdminTrackerDashboard = () => {
  const { user } = useAuth();
  

  const [totalGateCount, setTotalGateCount] = useState(0);
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
      setTotalGateCount(gateRes.data.pagination?.total || gateRes.data.data.length);
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

  // Recharts Data Sets
  const registryVolumeData = [
    { name: 'Gate Logs', count: totalGateCount, color: '#3b82f6' },
    { name: 'Quality Audits', count: qcLogs.length, color: '#10b981' },
    { name: 'Production Runs', count: buildJobs.length, color: '#8b5cf6' },
    { name: 'Shortage Flags', count: sbsLogs.filter(l => l.type === 'shortage').length, color: '#ef4444' }
  ];

  const machineryStatusData = [
    { name: 'Working', value: machines.filter(m => m.status === 'working').length, color: '#10b981' },
    { name: 'Broken', value: machines.filter(m => m.status === 'broken').length, color: '#ef4444' },
    { name: 'Idle/Other', value: machines.filter(m => !['working', 'broken'].includes(m.status)).length, color: '#64748b' }
  ].filter(d => d.value > 0);

  const wipStagesData = [
    { name: 'Pending', value: buildJobs.filter(j => j.status === 'pending').length, color: '#eab308' },
    { name: 'Processing', value: buildJobs.filter(j => j.status === 'processing').length, color: '#3b82f6' },
    { name: 'Completed', value: buildJobs.filter(j => j.status === 'completed').length, color: '#22c55e' },
    { name: 'Shortages', value: buildJobs.filter(j => j.status === 'shortage_reported').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const topInventoryData = [...inventory]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map(item => ({
      name: item.name.length > 15 ? `${item.name.substring(0, 15)}...` : item.name,
      quantity: item.quantity
    }));

  const qcInspectionData = [
    { name: 'Inspected', value: qcLogs.filter(l => l.qcType === 'inspected').length, color: '#10b981' },
    { name: 'Damaged', value: qcLogs.filter(l => l.qcType === 'damaged').length, color: '#ef4444' },
    { name: 'Missed', value: qcLogs.filter(l => l.qcType === 'missed').length, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  const sourcingStatusData = [
    { name: 'Pending', value: sbsLogs.filter(l => l.status === 'pending').length, color: '#ef4444' },
    { name: 'Assigned', value: sbsLogs.filter(l => l.status === 'assigned').length, color: '#3b82f6' },
    { name: 'Sourced', value: sbsLogs.filter(l => l.status === 'completed' || l.status === 'ordered').length, color: '#10b981' }
  ].filter(d => d.value > 0);

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
              <div className="stat-value">{totalGateCount}</div>
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



          {/* Detailed Lists Grids replaced by Recharts Graphical Components */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '28px', marginBottom: '28px' }}>
            
            {/* WIP Stages Donut Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Production WIP Stages Distribution</h3>
              <div style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {wipStagesData.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No active production runs.</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={wipStagesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {wipStagesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Operations Registry Volume Bar Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Operations Registry Volume Chart</h3>
              <div style={{ width: '100%', height: '260px', flexGrow: 1 }}>
                <ResponsiveContainer>
                  <BarChart data={registryVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" fontSize={11} stroke="var(--text-dim)" tickLine={false} />
                    <YAxis fontSize={11} stroke="var(--text-dim)" tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(249, 115, 22, 0.04)' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {registryVolumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px', marginBottom: '28px' }}>
            
            {/* Machinery Live Status Donut Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Machinery Health & Status</h3>
              <div style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {machineryStatusData.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No machinery modules registered.</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={machineryStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {machineryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Inventory Levels Bar Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Top Inventory Stock Snapshot</h3>
              <div style={{ width: '100%', height: '260px', flexGrow: 1 }}>
                {topInventoryData.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>No inventory data available.</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={topInventoryData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" fontSize={11} stroke="var(--text-dim)" tickLine={false} />
                      <YAxis dataKey="name" type="category" fontSize={11} stroke="var(--text-dim)" tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="quantity" fill="#f97316" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '28px' }}>
            
            {/* Quality control results Pie Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Quality Inspections Audit Outcomes</h3>
              <div style={{ width: '100%', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qcInspectionData.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>No quality inspections logged.</div>
                ) : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={qcInspectionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {qcInspectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Shortage & Sourcing Status Bar Chart */}
            <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '1rem', fontWeight: 700 }}>Shortage & Sourcing Sourcing Registry</h3>
              <div style={{ width: '100%', height: '260px', flexGrow: 1 }}>
                {sourcingStatusData.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>No shortages or sourcing logs.</div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={sourcingStatusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" fontSize={11} stroke="var(--text-dim)" tickLine={false} />
                      <YAxis fontSize={11} stroke="var(--text-dim)" tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(249, 115, 22, 0.04)' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {sourcingStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        </>
      )}

    </DashboardLayout>
  );
};

export default AdminTrackerDashboard;
