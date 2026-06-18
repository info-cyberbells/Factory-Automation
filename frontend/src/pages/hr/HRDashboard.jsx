import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { hrAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineUserGroup, HiOutlineClock, HiOutlineCurrencyRupee, HiOutlinePlus,
  HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineRefresh, HiOutlineX,
  HiOutlinePencil, HiOutlineTrash
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const HRDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('attendance'); // 'employees', 'attendance', 'payroll'
  
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Forms & State
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [empForm, setEmpForm] = useState({ empId: '', name: '', department: 'Production', basicSalary: '', overtimeRate: '', esiApplicable: true, pfApplicable: true });
  
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0,10));
  
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  const isHR = ['super_admin', 'admin', 'hr_manager'].includes(user?.role);
  const canPunch = ['super_admin', 'admin', 'hr_manager', 'guard'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, attRes, statRes, payRes] = await Promise.all([
        hrAPI.getEmployees(),
        hrAPI.getAttendance(attendanceDate),
        hrAPI.getStats(),
        hrAPI.getPayroll(payrollMonth, payrollYear)
      ]);
      setEmployees(empRes.data.data);
      setAttendance(attRes.data.data);
      setStats(statRes.data.data);
      setPayroll(payRes.data.data);
    } catch (err) {
      toast.error('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, payrollMonth, payrollYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add Employee
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await hrAPI.addEmployee(empForm);
      toast.success('Employee added successfully');
      setShowEmpModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    }
  };

  // Punch Attendance
  const handlePunch = async (employeeId, type) => {
    try {
      const timestamp = new Date();
      await hrAPI.punchAttendance({ employeeId, type, timestamp });
      toast.success(`Successfully Punched ${type.toUpperCase()}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Punch failed');
    }
  };

  // Generate Payroll
  const handleGeneratePayroll = async () => {
    try {
      setLoading(true);
      const res = await hrAPI.generatePayroll({ month: payrollMonth, year: payrollYear });
      toast.success(`Generated Payroll for ${res.data.count} employees`);
      fetchData();
    } catch (err) {
      toast.error('Failed to generate payroll');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get attendance status of an employee today
  const getAttRecord = (empId) => attendance.find(a => a.employeeId?._id === empId);

  return (
    <DashboardLayout pageTitle="HR Management & Payroll">
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Total Active Workers', value: stats?.totalEmployees ?? '--', color: 'blue', icon: <HiOutlineUserGroup /> },
          { label: 'Present Today', value: stats?.presentToday ?? '--', color: 'green', icon: <HiOutlineCheckCircle /> },
          { label: 'Absent Today', value: stats?.absentToday ?? '--', color: 'red', icon: <HiOutlineXCircle /> }
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
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', overflowX: 'auto' }}>
        <TabBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')} icon={<HiOutlineClock />}>Biometric Attendance</TabBtn>
        <TabBtn active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} icon={<HiOutlineCurrencyRupee />}>Monthly Payroll</TabBtn>
        <TabBtn active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} icon={<HiOutlineUserGroup />}>Worker Roster</TabBtn>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={fetchData}><HiOutlineRefresh /> Refresh</button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} /> Processing data...
        </div>
      ) : activeTab === 'attendance' ? (
        /* ATTENDANCE VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Daily Punch Register</h3>
            <input type="date" className="form-input" style={{ width: '200px' }} value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Emp ID', 'Name', 'Department', 'Status', 'Punch In', 'Punch Out', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const att = getAttRecord(emp._id);
                const isToday = attendanceDate === new Date().toISOString().slice(0,10);
                return (
                  <tr key={emp._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={tdStyle}>{emp.empId}</td>
                    <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{emp.name}</span></td>
                    <td style={tdStyle}>{emp.department}</td>
                    <td style={tdStyle}>
                      <span className={`status-badge ${att ? 'verified' : 'rejected'}`}>{att ? 'PRESENT' : 'ABSENT'}</span>
                    </td>
                    <td style={tdStyle}>{att?.punchIn ? new Date(att.punchIn).toLocaleTimeString() : '--'}</td>
                    <td style={tdStyle}>{att?.punchOut ? new Date(att.punchOut).toLocaleTimeString() : '--'}</td>
                    <td style={tdStyle}>
                      {isToday && canPunch && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-primary btn-sm" disabled={att?.punchIn} onClick={() => handlePunch(emp._id, 'in')}>Punch IN</button>
                          <button className="btn btn-accent btn-sm" disabled={!att?.punchIn || att?.punchOut} onClick={() => handlePunch(emp._id, 'out')}>Punch OUT</button>
                          {user?.role === 'super_admin' && (
                            <>
                              <ActionBtn icon={<HiOutlinePencil />} title="Edit Attendance" color="#f97316" onClick={() => toast('Edit feature coming soon')} />
                              <ActionBtn icon={<HiOutlineTrash />} title="Delete Punch" color="#ef4444" onClick={() => toast('Delete feature coming soon')} />
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'payroll' ? (
        /* PAYROLL VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Salary & Overtime Calculations</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <select className="form-input" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}>
                {Array.from({length:12}).map((_,i) => <option key={i} value={i+1}>Month {i+1}</option>)}
              </select>
              <input type="number" className="form-input" style={{ width: '100px' }} value={payrollYear} onChange={e => setPayrollYear(e.target.value)} />
              {isHR && <button className="btn btn-primary" onClick={handleGeneratePayroll}><HiOutlineCurrencyRupee /> Generate Salary</button>}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Emp', 'Basic', 'Days', 'Basic Pay', 'OT Pay', 'ESI (0.75%)', 'PF (12%)', 'Net Salary', 'Status'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payroll.length === 0 ? <tr><td colSpan={9} style={{ padding: '20px', textAlign: 'center' }}>No payroll data for this month. Click Generate.</td></tr> : payroll.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{p.employeeId?.name}</span><br/><small>{p.employeeId?.empId}</small></td>
                  <td style={tdStyle}>₹{p.employeeId?.basicSalary}</td>
                  <td style={tdStyle}>{p.presentDays}/{p.totalDays}</td>
                  <td style={{ ...tdStyle, color: 'var(--success)', fontWeight: 600 }}>₹{Math.round(p.earnings.basic)}</td>
                  <td style={{ ...tdStyle, color: 'var(--primary)', fontWeight: 600 }}>₹{Math.round(p.earnings.overtimePay)}</td>
                  <td style={{ ...tdStyle, color: 'var(--danger)' }}>- ₹{Math.round(p.deductions.esi)}</td>
                  <td style={{ ...tdStyle, color: 'var(--danger)' }}>- ₹{Math.round(p.deductions.pf)}</td>
                  <td style={{ ...tdStyle, color: 'var(--warning)', fontWeight: 700, fontSize: '1rem' }}>₹{Math.round(p.netSalary)}</td>
                  <td style={tdStyle}>
                    <span className={`status-badge ${p.paymentStatus === 'Paid' ? 'verified' : 'pending'}`}>{p.paymentStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* EMPLOYEES VIEW */
        <div className="glass-card" style={{ padding: '0' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem' }}>Factory Workers</h3>
            {isHR && <button className="btn btn-primary" onClick={() => setShowEmpModal(true)}><HiOutlinePlus /> Add Worker</button>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border)' }}>
                {['Emp ID', 'Name', 'Department', 'Basic Salary', 'OT Rate/Hr', 'Benefits', 'Status', 'Actions'].map((h, i) => (
                  <th key={i} style={{ padding: '14px 20px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No workers found.</td></tr> : employees.map(emp => (
                <tr key={emp._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={tdStyle}>{emp.empId}</td>
                  <td style={tdStyle}><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{emp.name}</span></td>
                  <td style={tdStyle}>{emp.department}</td>
                  <td style={tdStyle}>₹{emp.basicSalary}</td>
                  <td style={tdStyle}>₹{emp.overtimeRate}</td>
                  <td style={tdStyle}>
                    {emp.esiApplicable && <span className="status-badge verified" style={{ marginRight: '4px' }}>ESI</span>}
                    {emp.pfApplicable && <span className="status-badge verified">PF</span>}
                  </td>
                  <td style={tdStyle}><span className="status-badge verified">ACTIVE</span></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {user?.role === 'super_admin' && (
                        <>
                          <ActionBtn icon={<HiOutlinePencil />} title="Edit Employee" color="#f97316" onClick={() => toast('Edit feature coming soon')} />
                          <ActionBtn icon={<HiOutlineTrash />} title="Delete Employee" color="#ef4444" onClick={() => toast('Delete feature coming soon')} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showEmpModal && (
        <ModalOverlay onClose={() => setShowEmpModal(false)} title="Add Factory Worker">
          <form onSubmit={handleAddEmployee}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Employee ID *</label>
                <input className="form-input" required placeholder="e.g. EMP-101" value={empForm.empId} onChange={e => setEmpForm({ ...empForm, empId: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" required value={empForm.name} onChange={e => setEmpForm({ ...empForm, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Department *</label>
                <select className="form-input" value={empForm.department} onChange={e => setEmpForm({ ...empForm, department: e.target.value })}>
                  {['Production', 'Store', 'Assembly', 'Maintenance', 'Security', 'General'].map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Basic Salary (₹) *</label>
                <input type="number" className="form-input" required value={empForm.basicSalary} onChange={e => setEmpForm({ ...empForm, basicSalary: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Overtime Rate / Hr (₹) *</label>
                <input type="number" className="form-input" required value={empForm.overtimeRate} onChange={e => setEmpForm({ ...empForm, overtimeRate: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={empForm.esiApplicable} onChange={e => setEmpForm({ ...empForm, esiApplicable: e.target.checked })} /> Apply ESI (0.75%)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={empForm.pfApplicable} onChange={e => setEmpForm({ ...empForm, pfApplicable: e.target.checked })} /> Apply PF (12%)
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowEmpModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Worker</button>
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
    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
  }} onMouseOver={e => !active && (e.currentTarget.style.color = 'var(--text-primary)')} onMouseOut={e => !active && (e.currentTarget.style.color = 'var(--text-dim)')}>
    {icon} {children}
  </button>
);

const ModalOverlay = ({ children, onClose, title }) => (
  <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease'
  }}>
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '600px', animation: 'fadeInUp 0.3s ease', maxHeight: '90vh', overflowY: 'auto' }}>
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

export default HRDashboard;
