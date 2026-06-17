import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { productionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlinePlus, HiOutlineViewGrid, HiOutlineViewList, HiOutlineRefresh,
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineCube, HiOutlineCog,
  HiOutlineX, HiOutlineFire, HiOutlineBeaker, HiOutlineArchive
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const STAGES = {
  shot_production: { label: 'Shot Production', color: '#3b82f6', icon: <HiOutlineCog /> },
  inhaling: { label: 'Inhaling Process', color: '#a855f7', icon: <HiOutlineBeaker /> },
  boiling: { label: 'Boiling Process', color: '#ef4444', icon: <HiOutlineFire /> },
  ready_for_assembly: { label: 'Ready (Prepared Shots)', color: '#22c55e', icon: <HiOutlineArchive /> },
};

const emptyPlan = { modelNumber: '', plannedShots: '' };
const emptyWip = { planId: '', materialIssued: '' };
const emptyStage = { processedQty: '', rejectedQty: '', qcStatus: 'passed', remarks: '' };

const ProductionDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('wip'); // 'planning' or 'wip'
  
  const [plans, setPlans] = useState([]);
  const [wipBatches, setWipBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  
  // Forms
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [wipForm, setWipForm] = useState(emptyWip);
  const [stageForm, setStageForm] = useState(emptyStage);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isSupervisor = ['super_admin', 'admin', 'supervisor'].includes(user?.role);
  const isProduction = ['super_admin', 'admin', 'supervisor', 'production'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, wipRes, statsRes] = await Promise.all([
        productionAPI.getPlans(),
        productionAPI.getWipBatches(),
        productionAPI.getStats()
      ]);
      setPlans(plansRes.data.data);
      setWipBatches(wipRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to load production data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Plan Creation
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planForm.modelNumber || !planForm.plannedShots) {
      toast.error('Fill required fields'); return;
    }
    setSubmitting(true);
    try {
      await productionAPI.createPlan(planForm);
      toast.success('Production plan created');
      setShowPlanModal(false);
      setPlanForm(emptyPlan);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Material Issue (Create WIP Batch)
  const handleIssueMaterial = async (e) => {
    e.preventDefault();
    if (!wipForm.planId || !wipForm.materialIssued) {
      toast.error('Select plan and enter material quantity'); return;
    }
    setSubmitting(true);
    try {
      await productionAPI.createWipBatch(wipForm);
      toast.success('Material issued & WIP batch created');
      setShowIssueModal(false);
      setWipForm(emptyWip);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue material');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Stage Update
  const handleUpdateStage = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setSubmitting(true);
    try {
      await productionAPI.updateWipStage(selectedBatch._id, stageForm);
      toast.success('Stage updated successfully');
      setShowStageModal(false);
      setSelectedBatch(null);
      setStageForm(emptyStage);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  const openStageModal = (batch) => {
    setSelectedBatch(batch);
    setStageForm(emptyStage);
    setShowStageModal(true);
  };

  return (
    <DashboardLayout pageTitle="Production Dashboard">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Active Plans', value: stats?.activePlans ?? '--', color: 'blue', icon: <HiOutlineViewList /> },
          { label: 'WIP Batches', value: stats?.activeBatches ?? '--', color: 'purple', icon: <HiOutlineCube /> },
          { label: 'Nylon Issued Today (kg)', value: stats?.todayMaterialIssued ?? '--', color: 'orange', icon: <HiOutlineCog /> },
          { label: 'Completed Batches', value: wipBatches.filter(b => b.status === 'completed').length, color: 'green', icon: <HiOutlineCheckCircle /> }
        ].map((s, i) => (
          <div key={i} className={`stat-card ${s.color} fade-in-up`} style={{ animationDelay: `${i * 0.08}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
              <div style={{ fontSize: '2rem', opacity: 0.2 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'wip'} onClick={() => setActiveTab('wip')} icon={<HiOutlineViewGrid />}>
          WIP Tracking (Kanban)
        </TabBtn>
        <TabBtn active={activeTab === 'planning'} onClick={() => setActiveTab('planning')} icon={<HiOutlineViewList />}>
          Production Plans
        </TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
        {isSupervisor && (
          <>
            <button className="btn btn-primary" onClick={() => setShowPlanModal(true)}><HiOutlinePlus /> Create Plan</button>
            <button className="btn btn-accent" onClick={() => setShowIssueModal(true)}><HiOutlineCube /> Issue Material</button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7a99' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading data...
        </div>
      ) : activeTab === 'planning' ? (
        /* PLANNING VIEW */
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                {['Model No', 'Status', 'Progress', 'Created By', 'Date'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No plans found.</td></tr>
              ) : plans.map(p => {
                const percent = Math.min(100, Math.round((p.completedShots / p.plannedShots) * 100));
                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.modelNumber}</span></td>
                    <td style={tdStyle}>
                      <span className={`status-badge ${p.status === 'completed' ? 'verified' : p.status === 'in_progress' ? 'pending' : ''}`}>
                        {p.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: percent === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '50px' }}>{p.completedShots} / {p.plannedShots}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{p.createdBy?.name || '--'}</td>
                    <td style={tdStyle}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* WIP KANBAN VIEW */
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '20px' }}>
          {Object.entries(STAGES).map(([stageKey, stageInfo]) => {
            const stageBatches = wipBatches.filter(b => b.currentStage === stageKey && b.status !== 'qc_failed');
            return (
              <div key={stageKey} style={{
                flex: '0 0 320px', background: 'var(--bg-input)', border: `1px solid ${stageInfo.color}30`,
                borderRadius: '16px', display: 'flex', flexDirection: 'column', maxHeight: '70vh'
              }}>
                <div style={{
                  padding: '16px', borderBottom: `1px solid ${stageInfo.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: `linear-gradient(to right, ${stageInfo.color}15, transparent)`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: stageInfo.color, fontWeight: 600 }}>
                    {stageInfo.icon} {stageInfo.label}
                  </div>
                  <span style={{ background: `${stageInfo.color}25`, color: stageInfo.color, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {stageBatches.length}
                  </span>
                </div>
                <div style={{ padding: '16px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stageBatches.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: '20px 0' }}>No batches here</div>
                  ) : stageBatches.map(b => (
                    <div key={b._id} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '14px', transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer'
                    }} className="kanban-card" onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                       onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{b.batchNumber}</span>
                        {b.status === 'completed' && <HiOutlineCheckCircle style={{ color: 'var(--success)' }} />}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '12px' }}>
                        {b.planId?.modelNumber || 'Unknown Model'}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Nylon Issued: {b.materialIssued}kg</span>
                      </div>
                      
                      {isProduction && b.status === 'active' && stageKey !== 'ready_for_assembly' && (
                        <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '12px' }} onClick={() => openStageModal(b)}>
                          Log Output & QC
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== CREATE PLAN MODAL ===== */}
      {showPlanModal && (
        <ModalOverlay onClose={() => setShowPlanModal(false)} title="Create Production Plan">
          <form onSubmit={handleCreatePlan}>
            <div className="form-group">
              <label className="form-label">Model Number *</label>
              <input className="form-input" placeholder="e.g. TRACKBELLS-2627.35..." value={planForm.modelNumber}
                onChange={e => setPlanForm({ ...planForm, modelNumber: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Planned Shots *</label>
              <input className="form-input" type="number" placeholder="Target shots quantity" value={planForm.plannedShots}
                onChange={e => setPlanForm({ ...planForm, plannedShots: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Plan'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ===== ISSUE MATERIAL MODAL ===== */}
      {showIssueModal && (
        <ModalOverlay onClose={() => setShowIssueModal(false)} title="Issue Material (Create WIP Batch)">
          <form onSubmit={handleIssueMaterial}>
            <div className="form-group">
              <label className="form-label">Select Production Plan *</label>
              <select className="form-input" value={wipForm.planId} onChange={e => setWipForm({ ...wipForm, planId: e.target.value })} style={{ cursor: 'pointer' }}>
                <option value="">-- Select Plan --</option>
                {plans.filter(p => p.status !== 'completed').map(p => (
                  <option key={p._id} value={p._id}>{p.modelNumber} ({p.plannedShots - p.completedShots} shots remaining)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Nylon Issued (kg) *</label>
              <input className="form-input" type="number" step="0.01" placeholder="Enter amount in kg" value={wipForm.materialIssued}
                onChange={e => setWipForm({ ...wipForm, materialIssued: e.target.value })} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                <HiOutlineClock /> This will instantly deduct from Store Inventory and create a new WIP Batch.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={submitting}>{submitting ? 'Issuing...' : 'Issue Material'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ===== UPDATE STAGE MODAL (QC & LOGGING) ===== */}
      {showStageModal && selectedBatch && (
        <ModalOverlay onClose={() => setShowStageModal(false)} title={`Log Output: ${STAGES[selectedBatch.currentStage].label}`}>
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>
            <div style={{ color: '#6b7a99', fontSize: '0.8rem' }}>Batch: {selectedBatch.batchNumber}</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>{selectedBatch.planId?.modelNumber}</div>
          </div>
          
          <form onSubmit={handleUpdateStage}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Produced Qty (Passed) *</label>
                <input className="form-input" type="number" required value={stageForm.processedQty}
                  onChange={e => setStageForm({ ...stageForm, processedQty: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Rejected Qty *</label>
                <input className="form-input" type="number" required value={stageForm.rejectedQty}
                  onChange={e => setStageForm({ ...stageForm, rejectedQty: e.target.value })} />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">QC Status *</label>
              <select className="form-input" value={stageForm.qcStatus} onChange={e => setStageForm({ ...stageForm, qcStatus: e.target.value })}>
                <option value="passed">Passed (Move to next stage)</option>
                <option value="partial">Partial Pass</option>
                <option value="failed">Failed (Lock batch)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Remarks</label>
              <input className="form-input" placeholder="Optional notes" value={stageForm.remarks}
                onChange={e => setStageForm({ ...stageForm, remarks: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowStageModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save & Continue'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

    </DashboardLayout>
  );
};

// ===== Helpers =====
const tdStyle = { padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', verticalAlign: 'middle' };

const TabBtn = ({ children, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 16px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600,
    background: active ? 'var(--primary-glow)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)',
    border: `1px solid ${active ? 'var(--border-primary)' : 'transparent'}`,
    cursor: 'pointer', transition: 'all 0.2s'
  }} onMouseOver={e => !active && (e.currentTarget.style.color = 'var(--text-primary)')} onMouseOut={e => !active && (e.currentTarget.style.color = 'var(--text-dim)')}>
    {icon} {children}
  </button>
);

const ModalOverlay = ({ children, onClose, title }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
  }}>
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', animation: 'fadeInUp 0.3s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
      </div>
      {children}
    </div>
  </div>
);

export default ProductionDashboard;
