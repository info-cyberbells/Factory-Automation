import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { orderAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlinePlus, HiOutlineShoppingCart, HiOutlineExclamationCircle, HiOutlineRefresh,
  HiOutlineCheckCircle, HiOutlineTruck, HiOutlineDocumentReport, HiOutlineX, HiOutlineLightningBolt,
  HiOutlinePencil, HiOutlineTrash
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const OrderDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'shortages'
  
  const [orders, setOrders] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // Forms
  const todayStr = new Date().toISOString().split('T')[0];
  const [orderForm, setOrderForm] = useState({ clientName: '', modelNumber: '', orderQuantity: '', deliveryDate: todayStr });
  const [planForm, setPlanForm] = useState({ plannedShots: '' });
  
  const [selectedShortage, setSelectedShortage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const isSales = ['super_admin', 'admin', 'sales'].includes(user?.role);
  const isSupervisor = ['super_admin', 'admin', 'supervisor'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, shortRes, statsRes] = await Promise.all([
        orderAPI.getOrders(),
        orderAPI.getShortages(),
        orderAPI.getStats()
      ]);
      setOrders(ordRes.data.data);
      setShortages(shortRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to load order data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await orderAPI.createOrder(orderForm);
      if (res.data.shortage > 0) {
        toast.error(`Shortage Detected: ${res.data.shortage} meters short!`, { duration: 5000 });
      } else {
        toast.success('Order created successfully. Stock is available!');
      }
      setShowOrderModal(false);
      setOrderForm({ clientName: '', modelNumber: '', orderQuantity: '', deliveryDate: todayStr });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlanShortage = async (e) => {
    e.preventDefault();
    if (!selectedShortage) return;
    setSubmitting(true);
    try {
      await orderAPI.planShortage(selectedShortage._id, planForm);
      toast.success('Production Plan generated successfully');
      setShowPlanModal(false);
      setPlanForm({ plannedShots: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to plan production');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (orderId) => {
    if (!window.confirm('Are you sure you want to dispatch this order? This will permanently deduct stock.')) return;
    try {
      await orderAPI.dispatchOrder(orderId);
      toast.success('Order dispatched & stock deducted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch order');
    }
  };

  const handleAskAI = async () => {
    if (!selectedShortage) return;
    setAiLoading(true);
    try {
      const res = await aiAPI.predictShots({
        modelNumber: selectedShortage.modelNumber,
        shortageMeters: selectedShortage.shortageMeters
      });
      const data = res.data.data;
      setPlanForm({ plannedShots: data.shots_needed });
      toast.success(`AI calculated ${data.shots_needed} shots needed. Requires ${data.nylon_kg}kg Nylon and ~${data.time_hrs}hrs.`);
    } catch (err) {
      toast.error('AI Calculation Failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Order & Shortage Management">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Orders', value: stats?.totalOrders ?? '--', color: 'blue', icon: <HiOutlineShoppingCart /> },
          { label: 'Pending / Ready', value: stats?.pendingOrders ?? '--', color: 'green', icon: <HiOutlineCheckCircle /> },
          { label: 'Shortage (Difference)', value: stats?.shortageOrders ?? '--', color: 'red', icon: <HiOutlineExclamationCircle /> },
          { label: 'Dispatched', value: stats?.dispatchedOrders ?? '--', color: 'purple', icon: <HiOutlineTruck /> }
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
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <TabBtn active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={<HiOutlineShoppingCart />}>
          Sales Orders
        </TabBtn>
        <TabBtn active={activeTab === 'shortages'} onClick={() => setActiveTab('shortages')} icon={<HiOutlineDocumentReport />}>
          Difference / Shortage Reports
        </TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
        {isSales && activeTab === 'orders' && (
          <button className="btn btn-primary" onClick={() => setShowOrderModal(true)}><HiOutlinePlus /> Create Order</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Loading data...
        </div>
      ) : activeTab === 'orders' ? (
        /* ORDERS VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Order ID', 'Client', 'Model', 'Qty (Meters)', 'Delivery By', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No orders found.</td></tr> : orders.map(ord => (
                <tr key={ord._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ord.orderNumber}</span></td>
                  <td style={tdStyle}>{ord.clientName}</td>
                  <td style={tdStyle}>{ord.modelNumber}</td>
                  <td style={tdStyle}>{ord.orderQuantity}m</td>
                  <td style={tdStyle}>{new Date(ord.deliveryDate).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <span className={`status-badge ${ord.status === 'dispatched' ? 'verified' : ord.status === 'shortage' ? 'rejected' : 'pending'}`}>
                      {ord.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {ord.status === 'ready' && (
                        <button className="btn btn-accent btn-sm" onClick={() => handleDispatch(ord._id)}>Dispatch</button>
                      )}
                      {user?.role === 'super_admin' && (
                        <>
                          <ActionBtn icon={<HiOutlinePencil />} title="Edit Order" color="#f97316" onClick={() => toast('Edit feature coming soon')} />
                          <ActionBtn icon={<HiOutlineTrash />} title="Delete Order" color="#ef4444" onClick={() => toast('Delete feature coming soon')} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* SHORTAGES VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--danger-glow)' }}>
            <h3 style={{ color: 'var(--danger)', fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineExclamationCircle /> Production Shortage Alerts (Difference Report)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Orders that exceed Godown inventory. Supervisors must plan shots for these.</p>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Ref Order', 'Model', 'Shortage', 'Status', 'Planned Shots', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shortages.length === 0 ? <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No active shortages.</td></tr> : shortages.map(s => (
                <tr key={s._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}>{s.orderId?.orderNumber}</td>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.modelNumber}</span></td>
                  <td style={tdStyle}><span style={{ color: 'var(--danger)', fontWeight: 700 }}>{s.shortageMeters}m</span></td>
                  <td style={tdStyle}>
                    <span className={`status-badge ${s.status === 'pending_planning' ? 'rejected' : 'verified'}`}>
                      {s.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>{s.plannedShots > 0 ? s.plannedShots : '--'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {s.status === 'pending_planning' && isSupervisor && (
                        <button className="btn btn-primary btn-sm" onClick={() => {
                          setSelectedShortage(s);
                          setShowPlanModal(true);
                        }}>Plan Production</button>
                      )}
                      {user?.role === 'super_admin' && (
                        <ActionBtn icon={<HiOutlineTrash />} title="Delete Shortage" color="#ef4444" onClick={() => toast('Delete feature coming soon')} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE ORDER MODAL */}
      {showOrderModal && (
        <ModalOverlay onClose={() => setShowOrderModal(false)} title="Create Sales Order">
          <form onSubmit={handleCreateOrder}>
            <div className="form-group">
              <label className="form-label">Client Name *</label>
              <input className="form-input" required placeholder="e.g. Acme Corp" value={orderForm.clientName} onChange={e => setOrderForm({ ...orderForm, clientName: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Model Number *</label>
              <input className="form-input" required placeholder="e.g. STR-DRG-2627.35..." value={orderForm.modelNumber} onChange={e => setOrderForm({ ...orderForm, modelNumber: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Quantity (Meters) *</label>
                <input type="number" className="form-input" required value={orderForm.orderQuantity} onChange={e => setOrderForm({ ...orderForm, orderQuantity: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery Date *</label>
                <input type="date" className="form-input" required value={orderForm.deliveryDate} onChange={e => setOrderForm({ ...orderForm, deliveryDate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Checking Stock...' : 'Create Order'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* PLAN PRODUCTION MODAL */}
      {showPlanModal && selectedShortage && (
        <ModalOverlay onClose={() => setShowPlanModal(false)} title="Plan Production for Shortage">
          <div style={{ background: 'var(--danger-glow)', padding: '12px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--danger)' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedShortage.modelNumber}</div>
            <div style={{ color: 'var(--danger)', fontWeight: 600 }}>Shortage: {selectedShortage.shortageMeters} meters</div>
          </div>
          <form onSubmit={handlePlanShortage}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Convert Meters to Shots (Target Shots) *
                <button type="button" onClick={handleAskAI} disabled={aiLoading} style={{
                  background: 'linear-gradient(90deg, #a855f7, #3b82f6)', border: 'none', borderRadius: '6px',
                  color: '#fff', padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <HiOutlineLightningBolt /> {aiLoading ? 'Thinking...' : 'Ask AI'}
                </button>
              </label>
              <input type="number" className="form-input" required placeholder="Calculate required shots for this shortage" value={planForm.plannedShots} onChange={e => setPlanForm({ ...planForm, plannedShots: e.target.value })} />
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '6px' }}>
                Note: This will instantly generate a new Production Plan in the Production Module for the factory floor to execute.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-accent" disabled={submitting}>{submitting ? 'Planning...' : 'Generate Plan'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

const tdStyle = { padding: '14px 20px', color: 'var(--text-secondary)', verticalAlign: 'middle', fontSize: '0.85rem' };

const TabBtn = ({ children, active, onClick, icon }) => (
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
    fontSize: '0.9rem', fontWeight: 600, background: active ? 'var(--primary-glow)' : 'transparent',
    color: active ? 'var(--primary)' : 'var(--text-dim)', border: `1px solid ${active ? 'var(--border-primary)' : 'transparent'}`,
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
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '520px', animation: 'fadeInUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '1.4rem', cursor: 'pointer' }}><HiOutlineX /></button>
      </div>
      {children}
    </div>
  </div>
);

const ActionBtn = ({ icon, title, color, onClick }) => (
  <button onClick={onClick} title={title} style={{
    background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.2rem',
    cursor: 'pointer', transition: 'all 0.2s', padding: '4px', borderRadius: '6px'
  }} onMouseOver={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'var(--bg-input)'; }} onMouseOut={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent'; }}>
    {icon}
  </button>
);

export default OrderDashboard;
