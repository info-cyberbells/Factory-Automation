import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { aiAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { HiOutlineChartBar, HiOutlineRefresh, HiOutlineLightningBolt } from 'react-icons/hi';
import toast from 'react-hot-toast';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];

const ReportsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await aiAPI.getReports();
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load AI Analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DashboardLayout pageTitle="AI Analytics & Reports">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <HiOutlineLightningBolt style={{ color: '#a855f7' }} /> Factory Health Dashboard
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <HiOutlineRefresh /> Refresh Data
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading AI models...
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>No data available</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Production Output Chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineChartBar /> Production Output (Last 7 Days)
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.output}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="output" name="Output (Meters)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* QC Ratio Chart */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineChartBar /> QC Pass vs Reject Ratio
            </h3>
            <div style={{ height: '300px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data.qc.every(d => d.value === 0) ? (
                <span style={{ color: 'var(--text-dim)' }}>No QC data yet</span>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.qc} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                      {data.qc.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Passed' ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Models Chart */}
          <div className="glass-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineChartBar /> Top Models in Demand (Order Volume)
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topModels}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="model" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip cursor={{ fill: 'var(--bg-card-hover)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="quantity" name="Total Ordered (m)" fill="#a855f7" radius={[4, 4, 0, 0]}>
                    {data.topModels.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </DashboardLayout>
  );
};

export default ReportsDashboard;
