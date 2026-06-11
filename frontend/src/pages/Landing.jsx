import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShieldCheck, HiOutlineCube, HiOutlineCog, HiOutlineClipboardCheck,
  HiOutlineTruck, HiOutlineShoppingCart
} from 'react-icons/hi';
import { FaArrowRight } from 'react-icons/fa';

const Landing = () => {
  const roles = [
    { icon: <HiOutlineTruck />, title: 'Gate Guard', desc: 'Log inward materials in real-time. Instantly dispatches entries to supervisor approvals queue.', color: '#00b7c3' },
    { icon: <HiOutlineCog />, title: 'Supervisor', desc: 'Approves gate logs, tracks factory machine modules status, and processes flexible build tasks.', color: '#107c41' },
    { icon: <HiOutlineClipboardCheck />, title: 'Quality Checker', desc: 'Inspects goods, records damaged or missing inventory, and uploads simulated invoice OCRs.', color: '#c43e1c' },
    { icon: <HiOutlineCube />, title: 'Store Manager', desc: 'CRUD on Unified Stock inventory, assigns tasks to roles, and verifies finished products handshake.', color: '#f2c811' },
    { icon: <HiOutlineShoppingCart />, title: 'Sales Officer', desc: 'Analyzes store stock limits, reports shortage buy remarks, and submits manufacturing build orders.', color: '#a855f7' },
    { icon: <HiOutlineShieldCheck />, title: 'Org Admin', desc: 'Monitors the entire manufacturing pipeline and role assignments in real-time.', color: '#8660a9' }
  ];

  const steps = [
    'Material Inward Logged',
    'QC Checked & Invoice Uploaded',
    'Build Job Order Placed',
    'Supervisor Custom Specs Run',
    'Product Dispatch to Godown',
    'Store Manager Handshake Recieved'
  ];

  return (
    <div style={{ background: '#0b0f19', minHeight: '100vh', overflow: 'hidden', color: '#f1f5f9' }}>
      
      {/* ===== HEADER / NAVBAR ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '16px 40px',
        background: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #0078d4, #00b7c3)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px'
          }}>🏭</div>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: '#fff', letterSpacing: '0.5px' }}>
            STR-DRG <span style={{ color: '#00b7c3', fontWeight: 500 }}>AzurePortal</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>Sign In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm" style={{ background: '#0078d4', borderColor: '#0078d4' }}>Get Started</Link>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', position: 'relative', padding: '140px 20px 60px'
      }}>
        {/* Azure Gradient Background Effect */}
        <div style={{
          position: 'absolute', top: '15%', left: '30%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(0, 120, 212, 0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(0, 183, 195, 0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px' }} className="fade-in-up">
          <div style={{
            display: 'inline-block', padding: '6px 20px',
            background: 'rgba(0, 120, 212, 0.1)',
            border: '1px solid rgba(0, 120, 212, 0.3)', borderRadius: '4px',
            fontSize: '0.75rem', fontWeight: 600, color: '#60cdff',
            letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px'
          }}>
            ☁️ Enterprise Sourcing & Production Engine
          </div>
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            fontWeight: 800, lineHeight: 1.1, marginBottom: '24px',
            background: 'linear-gradient(135deg, #ffffff 0%, #a0c3ff 60%, #60cdff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Real-Time Factory<br />Automation Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem', color: '#8a9ab0', maxWidth: '650px',
            margin: '0 auto 40px', lineHeight: 1.8
          }}>
            Consolidated 6-role workflow with unified inventory stock directories, customized specification building, and real-time handshake tracking logs.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg" style={{ background: '#0078d4', borderColor: '#0078d4' }}>
              Deploy Workspace <FaArrowRight size={12} />
            </Link>
            <a href="#workflow" className="btn btn-secondary btn-lg" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Explore Pipeline
            </a>
          </div>
        </div>
      </section>

      {/* ===== ENTERPRISE ROLES CONFIG ===== */}
      <section style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: '#fff' }}>
            Role-Based Enterprise Workspaces
          </h2>
          <p style={{ fontSize: '1rem', color: '#6b7a99', marginTop: '6px' }}>Consolidated workspace directories mapped to user profiles</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {roles.map((r, i) => (
            <div key={i} className="azure-card" style={{
              padding: '28px', borderTopColor: r.color, background: 'rgba(26, 31, 58, 0.4)'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '6px',
                background: `${r.color}18`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.4rem', color: r.color, marginBottom: '20px'
              }}>{r.icon}</div>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.2rem', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>{r.title}</h3>
              <p style={{ fontSize: '0.88rem', color: '#8a9ab0', lineHeight: 1.6 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MANUFACTURING FLOW PIPELINE ===== */}
      <section id="workflow" style={{ padding: '80px 40px', background: 'rgba(15, 20, 40, 0.3)', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: '#fff' }}>
              The Live Pipeline Lifecycle
            </h2>
            <p style={{ fontSize: '1rem', color: '#6b7a99', marginTop: '6px' }}>Real-time updates broadcast to dashboard nodes</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '12px 24px',
                  background: 'rgba(26,31,58,0.6)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '6px', fontSize: '0.9rem', color: '#e0e6f0',
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '4px',
                    background: '#0078d4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                  }}>{i + 1}</span>
                  {step}
                </div>
                {i < steps.length - 1 && <span style={{ color: '#4a5578' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        textAlign: 'center', padding: '40px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        color: '#4a5578', fontSize: '0.8rem'
      }}>
        <p><span style={{ color: '#00b7c3', fontWeight: 600 }}>STR-DRG AzurePortal</span> — Enterprise Factory Management System — © 2026</p>
        <p style={{ marginTop: '4px' }}>Powered by <span style={{ color: '#0078d4', fontWeight: 600 }}>BizSol Technologies</span></p>
      </footer>

    </div>
  );
};

export default Landing;
