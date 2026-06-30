import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineShieldCheck, HiOutlineCube, HiOutlineCog, HiOutlineClipboardCheck,
  HiOutlineTruck, HiOutlineShoppingCart
} from 'react-icons/hi';
import { FaArrowRight } from 'react-icons/fa';
import { useOrg } from '../context/OrgContext';
import { supportAPI } from '../services/api';
import toast from 'react-hot-toast';

const Landing = () => {
  const { settings } = useOrg();
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    mobile: '',
    concern: ''
  });
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportForm.name || !supportForm.email || !supportForm.mobile || !supportForm.concern) {
      toast.error('Please fill in all fields');
      return;
    }
    setSupportLoading(true);
    try {
      await supportAPI.createTicket(supportForm);
      toast.success('Your concern has been submitted! Support email has been sent.');
      setSupportForm({ name: '', email: '', mobile: '', concern: '' });
      setIsSupportOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit concern');
    } finally {
      setSupportLoading(false);
    }
  };

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
    <div style={{ background: 'var(--bg-primary, #f8fafc)', minHeight: '100vh', overflow: 'hidden', color: 'var(--text-primary, #0f172a)' }}>

      {/* ===== HEADER / NAVBAR ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        padding: '16px 40px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border, #e2e8f0)',
        display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {settings?.logo?.includes('logo.png') ? (
            <>
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 0, flexShrink: 0 }}>
                <img src="/logo_icon.png" alt="TrackBells Icon" style={{ maxHeight: '48px', maxWidth: '48px', objectFit: 'contain' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0, lineHeight: 1.2 }}>TrackBells</h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--primary, #f97316)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, lineHeight: 1.2 }}>ERP Automation</span>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg, var(--primary, #f97316), var(--primary-light, #fdba74))',
                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px'
              }}>
                {settings?.logo && (settings.logo.startsWith('http') || settings.logo.startsWith('/') || settings.logo.startsWith('data:')) ? (
                  <img src={getImageUrl(settings.logo)} alt="Logo" style={{ maxHeight: '24px', maxWidth: '24px', borderRadius: '2px' }} />
                ) : (
                  settings?.logo || '🏭'
                )}
              </div>
              <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary, #0f172a)', letterSpacing: '0.5px' }}>
                {settings?.brandName || 'TrackBells ERP'}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ border: '1px solid var(--border, #e2e8f0)', color: 'var(--text-primary)' }}>Sign In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm" style={{ background: 'var(--primary, #f97316)', borderColor: 'var(--primary, #f97316)' }}>Get Started</Link>
          <button onClick={() => setIsSupportOpen(true)} className="btn btn-secondary btn-sm" style={{ border: '1px solid var(--primary, #f97316)', color: 'var(--primary, #f97316)', background: 'transparent', fontWeight: 600 }}>Support</button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section style={{
        minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', position: 'relative', padding: '140px 20px 60px',
        backgroundImage: 'linear-gradient(rgba(248, 250, 252, 0.88), rgba(248, 250, 252, 0.95)), url("/factory_bg.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        {/* Azure Gradient Background Effect */}
        <div style={{
          position: 'absolute', top: '15%', left: '30%', width: '450px', height: '450px',
          background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '20%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.05) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: '900px' }} className="fade-in-up">
          <div style={{
            display: 'inline-block', padding: '6px 20px',
            background: 'var(--primary-glow, rgba(249, 115, 22, 0.08))',
            border: '1px solid var(--border-primary, rgba(249, 115, 22, 0.3))', borderRadius: '4px',
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary, #f97316)',
            letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '24px'
          }}>
            ☁️ Enterprise Sourcing & Production Engine
          </div>
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontSize: 'clamp(2.5rem, 5vw, 4.2rem)',
            fontWeight: 800, lineHeight: 1.1, marginBottom: '24px',
            background: 'linear-gradient(135deg, var(--text-primary, #0f172a) 0%, var(--primary, #f97316) 60%, var(--primary-dark, #ea580c) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Real-Time Factory<br />Automation Dashboard
          </h1>
          <p style={{
            fontSize: '1.1rem', color: 'var(--text-secondary, #334155)', maxWidth: '650px',
            margin: '0 auto 40px', lineHeight: 1.8
          }}>
            Consolidated 6-role workflow with unified inventory stock directories, customized specification building, and real-time handshake tracking logs.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg" style={{ background: 'var(--primary, #f97316)', borderColor: 'var(--primary, #f97316)' }}>
              Deploy Workspace <FaArrowRight size={12} />
            </Link>
            <a href="#workflow" className="btn btn-secondary btn-lg" style={{ border: '1px solid var(--border, #e2e8f0)', color: 'var(--text-primary)' }}>
              Explore Pipeline
            </a>
          </div>
        </div>
      </section>

      {/* ===== ENTERPRISE ROLES CONFIG ===== */}
      <section style={{ padding: '60px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            Role-Based Enterprise Workspaces
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted, #475569)', marginTop: '6px' }}>Consolidated workspace directories mapped to user profiles</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {roles.map((r, i) => (
            <div key={i} className="azure-card" style={{
              padding: '28px', borderTopColor: r.color, background: 'var(--bg-card, #ffffff)',
              boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0,0,0,0.08))', border: '1px solid var(--border)'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '6px',
                background: `${r.color}18`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.4rem', color: r.color, marginBottom: '20px'
              }}>{r.icon}</div>
              <h3 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>{r.title}</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== MANUFACTURING FLOW PIPELINE ===== */}
      <section id="workflow" style={{ padding: '80px 40px', background: 'var(--bg-secondary, #ffffff)', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              The Live Pipeline Lifecycle
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '6px' }}>Real-time updates broadcast to dashboard nodes</p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '12px 24px',
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border, #e2e8f0)',
                  borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)',
                  fontWeight: 500, display: 'flex', alignItems: 'center', gap: '12px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <span style={{
                    width: '24px', height: '24px', borderRadius: '4px',
                    background: 'var(--primary, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                  }}>{i + 1}</span>
                  {step}
                </div>
                {i < steps.length - 1 && <span style={{ color: 'var(--text-ghost)' }}>&rarr;</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        textAlign: 'center', padding: '40px 20px',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-muted)', fontSize: '0.8rem',
        background: 'var(--bg-primary, #f8fafc)'
      }}>
        <p><span style={{ color: 'var(--primary, #f97316)', fontWeight: 600 }}>{settings?.brandName || 'TrackBells'} </span> — Enterprise Factory Management System — © 2026</p>
        <p style={{ marginTop: '4px' }}>{settings?.footerText || 'Powered by Cyberbells ITES services pvt ltd'}</p>
      </footer>

      {/* ===== SUPPORT MODAL ===== */}
      {isSupportOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '20px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <h3 style={{
              fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem',
              fontWeight: 700, color: '#0f172a', marginBottom: '6px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <span style={{ color: '#f97316' }}>💬</span> Help & Support
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '24px' }}>
              Have a concern? Fill out the details below and we will get back to you shortly.
            </p>

            <form onSubmit={handleSupportSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={supportForm.name}
                    onChange={(e) => setSupportForm({ ...supportForm, name: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                      color: '#0f172a', transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={supportForm.email}
                    onChange={(e) => setSupportForm({ ...supportForm, email: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Enter 10-digit mobile number"
                    value={supportForm.mobile}
                    onChange={(e) => setSupportForm({ ...supportForm, mobile: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Your Concern *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your issue or query..."
                    value={supportForm.concern}
                    onChange={(e) => setSupportForm({ ...supportForm, concern: e.target.value })}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                      color: '#0f172a', resize: 'vertical', fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSupportOpen(false);
                      setSupportForm({ name: '', email: '', mobile: '', concern: '' });
                    }}
                    style={{
                      padding: '12px 24px', borderRadius: '10px', border: '1px solid #cbd5e1',
                      background: 'transparent', color: '#475569', fontSize: '0.9rem',
                      fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={supportLoading}
                    style={{
                      padding: '12px 24px', borderRadius: '10px', border: 'none',
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      color: '#ffffff', fontSize: '0.9rem', fontWeight: 600,
                      cursor: 'pointer', transition: 'opacity 0.2s',
                      display: 'flex', alignItems: 'center', gap: '8px'
                    }}
                  >
                    {supportLoading ? 'Sending...' : 'Send Concern'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Landing;
