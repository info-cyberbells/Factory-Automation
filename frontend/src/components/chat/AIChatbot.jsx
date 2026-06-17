import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../../services/api';
import { HiOutlineChat, HiOutlineX, HiOutlinePaperAirplane } from 'react-icons/hi';

const parseMarkdownToHTML = (text) => {
  if (!text) return '';
  
  // Convert markdown **bold** to <strong>bold</strong>
  let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert line breaks and bullet lists
  const lines = html.split('\n');
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      return `<div style="display: flex; gap: 8px; margin: 4px 0; align-items: flex-start; padding-left: 4px;">
        <span style="color: #f97316; font-size: 1rem; line-height: 1.25;">•</span>
        <div style="flex: 1;">${trimmed.substring(2)}</div>
      </div>`;
    }
    if (trimmed.startsWith('• ')) {
      return `<div style="display: flex; gap: 8px; margin: 4px 0; align-items: flex-start; padding-left: 4px;">
        <span style="color: #f97316; font-size: 1rem; line-height: 1.25;">•</span>
        <div style="flex: 1;">${trimmed.substring(2)}</div>
      </div>`;
    }
    return line ? `<div style="margin-bottom: 4px; min-height: 1.2em;">${line}</div>` : '<div style="height: 6px;"></div>';
  });

  return formattedLines.join('');
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hello! I am the TrackBells AI Assistant. How can I assist you with factory inventory, build orders, or sourcing queries today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      setMessages([]);
    }, 5 * 60 * 1000); // 5 minutes
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [messages]);

  const handleSend = async (queryText) => {
    const userMsg = queryText || input.trim();
    if (!userMsg) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chatWithAI({ message: userMsg });
      setMessages(prev => [...prev, { role: 'system', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'system', text: 'Error connecting to AI Server. Please check if the service is running.' }]);
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
            borderRadius: '30px', background: 'linear-gradient(135deg, #f97316, #ea580c)',
            color: '#fff', border: 'none', boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
            cursor: 'pointer', zIndex: 9999, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <HiOutlineChat />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', width: '380px', height: '560px',
          background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)', display: 'flex', flexDirection: 'column',
          zIndex: 9999, overflow: 'hidden', animation: 'fadeInUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #f97316, #ea580c)', padding: '18px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            boxShadow: '0 4px 12px rgba(249,115,22,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>🤖</div>
                <div style={{ position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', background: '#22c55e', border: '2px solid #ffffff', borderRadius: '50%' }} />
              </div>
              <div>
                <h4 style={{ color: '#ffffff', margin: 0, fontSize: '0.95rem', fontWeight: 700, fontFamily: 'Poppins, sans-serif' }}>TrackBells AI Copilot</h4>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500 }}>Technical Operations Support</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.3rem', cursor: 'pointer', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.8}><HiOutlineX /></button>
          </div>

          {/* Messages Container */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                {/* Role label */}
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                  {msg.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                
                {/* Bubble content */}
                <div style={{
                  background: msg.role === 'user' ? '#f97316' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#334155',
                  padding: '12px 16px', borderRadius: '16px', fontSize: '0.88rem',
                  border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                  boxShadow: '0 2px 4px -1px rgba(0,0,0,0.03)',
                  borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: msg.role === 'system' ? '4px' : '16px',
                  lineHeight: 1.5
                }}>
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(msg.text) }} />
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>AI Assistant</span>
                <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid #e2e8f0', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div className="dot" style={{ width: '6px', height: '6px', background: '#f97316', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out' }} />
                  <div className="dot" style={{ width: '6px', height: '6px', background: '#f97316', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                  <div className="dot" style={{ width: '6px', height: '6px', background: '#f97316', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>



          {/* Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{
            padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', background: '#ffffff'
          }}>
            <input 
              value={input} onChange={e => { setInput(e.target.value); resetInactivityTimer(); }} 
              placeholder="Ask operations co-pilot..." 
              style={{
                flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1',
                color: '#334155', padding: '10px 16px', borderRadius: '24px', outline: 'none', fontSize: '0.88rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#f97316'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#ffffff', border: 'none', width: '40px', height: '40px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1,
              boxShadow: '0 4px 10px rgba(249,115,22,0.2)'
            }}>
              <HiOutlinePaperAirplane style={{ transform: 'rotate(90deg)', fontSize: '1.1rem' }} />
            </button>
          </form>
        </div>
      )}

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default AIChatbot;
