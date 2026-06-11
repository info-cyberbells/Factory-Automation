import React, { useState } from 'react';
import { aiAPI } from '../../services/api';
import { HiOutlineChat, HiOutlineX, HiOutlinePaperAirplane } from 'react-icons/hi';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'system', text: 'Hello! I am the STR-DRG AI Assistant. How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chatWithAI({ message: userMsg });
      setMessages(prev => [...prev, { role: 'system', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to AI Server.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px',
            borderRadius: '30px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)',
            color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
            cursor: 'pointer', zIndex: 9999, transition: 'transform 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <HiOutlineChat />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '350px', height: '500px',
          background: '#111827', borderRadius: '16px', border: '1px solid rgba(59,130,246,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden', animation: 'fadeInUp 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(90deg, #1e293b, #0f172a)', padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
              <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem' }}>AI Support</h4>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#8892b0', fontSize: '1.2rem', cursor: 'pointer' }}><HiOutlineX /></button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  background: msg.role === 'user' ? '#3b82f6' : 'rgba(59,130,246,0.1)',
                  color: msg.role === 'user' ? '#fff' : '#e0e6f0',
                  padding: '10px 14px', borderRadius: '12px', fontSize: '0.9rem',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(59,130,246,0.15)',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius: msg.role === 'system' ? '4px' : '12px',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#8892b0', fontSize: '0.8rem', padding: '4px' }}>AI is typing...</div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{
            padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', background: '#0f172a'
          }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)} 
              placeholder="Ask anything..." 
              style={{
                flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', padding: '10px 14px', borderRadius: '20px', outline: 'none', fontSize: '0.9rem'
              }}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: '#3b82f6', color: '#fff', border: 'none', width: '40px', height: '40px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1
            }}>
              <HiOutlinePaperAirplane style={{ transform: 'rotate(90deg)' }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
