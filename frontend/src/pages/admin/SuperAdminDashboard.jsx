import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { adminAPI } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  HiOutlineUsers, HiOutlineTruck, HiOutlineCog, 
  HiOutlineClipboardCheck, HiOutlineChatAlt, HiOutlineExclamationCircle,
  HiOutlineShieldCheck, HiOutlineCube
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#3b82f6', '#107c41', '#a855f7', '#c43e1c', '#f2c811'];

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSuperStats();
      setStats(res.data.data);
    } catch (err) {
      toast.error('Failed to load global ERP analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Super Admin Central Control">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
          <div className="spinner" style={{ marginBottom: '16px' }} />
          <h3>Compiling global database metrics...</h3>
        </div>
      </DashboardLayout>
    );
  }

  // Graphical Data Preparation
  const volumeData = [
    { name: 'Gate Entry', count: stats.totalGateEntries, color: '#3b82f6' },
    { name: 'Quality Audits', count: stats.totalQcLogs, color: '#c43e1c' },
    { name: 'Build Jobs', count: stats.totalBuildJobs, color: '#107c41' },
    { name: 'Shortages', count: stats.totalShortages, color: '#ea580c' },
    { name: 'Email Queries', count: stats.totalTickets, color: '#a855f7' }
  ];

  const userData = [
    { name: 'Admin/SuperAdmins', value: stats.totalAdmins },
    { name: 'Staff Users', value: Math.max(0, stats.totalUsers - stats.totalAdmins) },
  ];

  return (
    <DashboardLayout pageTitle="Platform Executive Dashboard">
      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
        
        {/* Banner Block */}
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff, #fff7ed)',
          border: '1px solid #e2e8f0',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '28px',
          boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.4rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
              Global SaaS Platform Control
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px' }}>
              Real-time aggregated statistics across all factory operations, workflows, and communication modules.
            </p>
          </div>
          <span className="azure-badge running" style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}>
            🛰️ Live Synchronized
          </span>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="stats-grid" style={{ marginBottom: '28px' }}>
          
          <div className="stat-card blue">
            <div className="stat-header">
              <div className="stat-icon blue"><HiOutlineShieldCheck /></div>
              <span className="azure-badge success">Active</span>
            </div>
            <div className="stat-value">{stats.totalAdmins}</div>
            <div className="stat-label">Total Administrators</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-header">
              <div className="stat-icon purple"><HiOutlineUsers /></div>
              <span className="azure-badge success">Accounts</span>
            </div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total System Users</div>
          </div>

          <div className="stat-card orange">
            <div className="stat-header">
              <div className="stat-icon orange"><HiOutlineChatAlt /></div>
              <span className="azure-badge warning">{stats.recentTickets.filter(t => t.status === 'pending').length} New</span>
            </div>
            <div className="stat-value">{stats.totalTickets}</div>
            <div className="stat-label">Help & Support Queries</div>
          </div>

          <div className="stat-card green">
            <div className="stat-header">
              <div className="stat-icon green"><HiOutlineTruck /></div>
              <span className="azure-badge running">Logs</span>
            </div>
            <div className="stat-value">{stats.totalGateEntries}</div>
            <div className="stat-label">Inward Gate Entries</div>
          </div>

        </div>

        {/* Charts & Graphical Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '28px', marginBottom: '28px' }}>
          
          {/* Operations Volume Bar Chart */}
          <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '20px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
              Operations Registry Volume Chart
            </h3>
            <div style={{ width: '100%', height: '300px', flexGrow: 1 }}>
              <ResponsiveContainer>
                <BarChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#64748b" tickLine={false} />
                  <YAxis fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(249, 115, 22, 0.04)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {volumeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Distribution Pie Chart */}
          <div className="azure-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '20px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
              User Role Distribution
            </h3>
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={userData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#f97316" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#f97316' }} />
                  Administrators
                </span>
                <strong style={{ color: '#0f172a' }}>{stats.totalAdmins} ({Math.round(stats.totalAdmins / Math.max(1, stats.totalUsers) * 100)}%)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }} />
                  Staff Users
                </span>
                <strong style={{ color: '#0f172a' }}>{Math.max(0, stats.totalUsers - stats.totalAdmins)} ({Math.round((stats.totalUsers - stats.totalAdmins) / Math.max(1, stats.totalUsers) * 100)}%)</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Detailed Recent Entries Grids */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px' }}>
          
          {/* Recent Support Tickets */}
          <div className="azure-card" style={{ padding: '24px' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '16px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
              Recent Support Concerns
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
              {stats.recentTickets.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.88rem', textAlign: 'center', padding: '20px' }}>No tickets registered.</div>
              ) : (
                stats.recentTickets.map(t => (
                  <div key={t._id} style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                      <span style={{ color: '#0f172a' }}>{t.name}</span>
                      <span style={{ color: t.status === 'pending' ? '#f97316' : '#107c41' }}>
                        {t.status === 'pending' ? 'Pending' : 'Replied'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                      "{t.concern.substring(0, 60)}{t.concern.length > 60 ? '...' : ''}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Build Jobs */}
          <div className="azure-card" style={{ padding: '24px' }}>
            <h3 style={{ color: '#0f172a', marginBottom: '16px', fontSize: '1rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>
              Recent Production Build Jobs
            </h3>
            <div className="azure-table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table className="azure-table">
                <thead>
                  <tr>
                    <th>Product Model</th>
                    <th>Target Qty</th>
                    <th>Assignee Machine</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentBuilds.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '10px' }}>No build jobs created yet.</td></tr>
                  ) : (
                    stats.recentBuilds.map(job => (
                      <tr key={job._id}>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{job.productName}</td>
                        <td style={{ fontWeight: 700 }}>{job.orderQuantity} pcs</td>
                        <td style={{ fontSize: '0.8rem' }}>{job.machineId?.name || job.machineName || 'Allocating...'}</td>
                        <td>
                          <span className={`azure-badge ${
                            job.status === 'pending' ? 'warning' :
                            job.status === 'processing' ? 'running' :
                            job.status === 'shortage_reported' ? 'danger' : 'success'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
