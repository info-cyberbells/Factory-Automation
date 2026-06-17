import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supportAPI } from '../../services/api';
import { 
  HiOutlineMail, HiOutlinePhone, HiOutlineClock, 
  HiOutlineCheckCircle, HiOutlineReply, HiOutlineChatAlt 
} from 'react-icons/hi';
import toast from 'react-hot-toast';

const SupportDashboard = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reply Modal/Inline State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportAPI.getTickets();
      setTickets(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error('Please enter a response content');
      return;
    }

    setSubmitting(true);
    try {
      await supportAPI.replyTicket(activeTicket._id, replyText);
      toast.success('Reply email sent successfully!');
      setReplyText('');
      setActiveTicket(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Help & Support Operations">
      <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        
        {/* Header Block */}
        <div style={{ 
          background: 'linear-gradient(135deg, #ffffff, #fff7ed)',
          border: '1px solid #e2e8f0',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '28px',
          boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.05)'
        }}>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.4rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
            User Inquiries & Support Tickets
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px' }}>
            Review issues, concerns, and questions logged by users, and reply to their email address directly using SMTP.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <div className="spinner" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="azure-card" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✔️</div>
            <h3>No Support Tickets Found</h3>
            <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>All customer queries and support issues have been resolved.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {tickets.map((ticket) => (
              <div key={ticket._id} className="azure-card" style={{ 
                padding: '24px',
                borderLeft: ticket.status === 'pending' ? '4px solid #f97316' : '4px solid #107c41',
                background: '#ffffff',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  
                  {/* Sender Meta Details */}
                  <div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {ticket.name}
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600,
                        background: ticket.status === 'pending' ? '#fff7ed' : '#f0fdf4',
                        color: ticket.status === 'pending' ? '#c2410c' : '#15803d',
                        border: ticket.status === 'pending' ? '1px solid #ffedd5' : '1px solid #dcfce7'
                      }}>
                        {ticket.status === 'pending' ? 'Pending Reply' : 'Replied'}
                      </span>
                    </h4>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '8px', fontSize: '0.82rem', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineMail style={{ color: '#f97316' }} />
                        <a href={`mailto:${ticket.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{ticket.email}</a>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlinePhone style={{ color: '#f97316' }} />
                        {ticket.mobile}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HiOutlineClock />
                        {new Date(ticket.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Reply Button Trigger */}
                  {ticket.status === 'pending' && (
                    <button 
                      onClick={() => {
                        setActiveTicket(ticket);
                        setReplyText('');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ 
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        borderColor: '#f97316',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <HiOutlineReply /> Write Reply
                    </button>
                  )}
                </div>

                {/* Concern Bubble */}
                <div style={{ 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  marginTop: '16px',
                  position: 'relative'
                }}>
                  <div style={{ 
                    position: 'absolute', top: '-10px', left: '20px', 
                    width: '0', height: '0', 
                    borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                    borderBottom: '10px solid #e2e8f0'
                  }} />
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    User Concern Details:
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                    "{ticket.concern}"
                  </p>
                </div>

                {/* Already Replied Block */}
                {ticket.status === 'replied' && (
                  <div style={{ 
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '10px',
                    padding: '16px',
                    marginTop: '16px'
                  }}>
                    <p style={{ 
                      fontSize: '0.75rem', fontWeight: 700, color: '#166534', 
                      textTransform: 'uppercase', letterSpacing: '0.5px', 
                      display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' 
                    }}>
                      <HiOutlineCheckCircle /> Support Replied (at {new Date(ticket.repliedAt).toLocaleString()}):
                    </p>
                    <p style={{ fontSize: '0.88rem', color: '#14532d', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {ticket.replyText}
                    </p>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        {/* Reply Modal */}
        {activeTicket && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999,
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{
              background: '#ffffff',
              width: '100%',
              maxWidth: '550px',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
            }}>
              <h3 style={{
                fontFamily: 'Poppins, sans-serif', fontSize: '1.25rem',
                fontWeight: 700, color: '#0f172a', marginBottom: '6px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span style={{ color: '#f97316' }}>✉️</span> Reply to {activeTicket.name}
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
                Your reply will be sent immediately to <strong>{activeTicket.email}</strong> using SMTP.
              </p>

              <div style={{ 
                background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', 
                border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', 
                marginBottom: '20px', fontStyle: 'italic'
              }}>
                <strong>Original Message:</strong> "{activeTicket.concern}"
              </div>

              <form onSubmit={handleReplySubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Your Response *</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Type your response here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: '10px',
                      border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem',
                      color: '#0f172a', resize: 'vertical', fontFamily: 'inherit'
                    }}
                  />

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTicket(null)}
                      style={{
                        padding: '12px 24px', borderRadius: '10px', border: '1px solid #cbd5e1',
                        background: 'transparent', color: '#475569', fontSize: '0.9rem',
                        fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        padding: '12px 24px', borderRadius: '10px', border: 'none',
                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                        color: '#ffffff', fontSize: '0.9rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'opacity 0.2s',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      {submitting ? 'Sending...' : 'Send Back'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default SupportDashboard;
