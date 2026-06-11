import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineMail, HiArrowLeft } from 'react-icons/hi';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
      toast.success('Password reset link sent to your email!');
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to send reset email';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ justifyContent: 'center' }}>
      <div style={{
        width: '100%', maxWidth: '460px', padding: '40px',
        margin: '0 auto', animation: 'fadeInUp 0.6s ease'
      }}>
        {/* Back Link */}
        <Link to="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: '#6b7a99', fontSize: '0.85rem', marginBottom: '32px',
          transition: 'color 0.2s'
        }}>
          <HiArrowLeft /> Back to Login
        </Link>

        {!sent ? (
          <>
            {/* Header */}
            <div style={{
              width: '70px', height: '70px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              borderRadius: '18px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '32px', marginBottom: '24px',
              boxShadow: '0 10px 40px rgba(249,115,22,0.3)'
            }}>🔐</div>

            <h2 style={{
              fontFamily: 'Poppins, sans-serif', fontSize: '1.8rem',
              fontWeight: 700, color: '#fff', marginBottom: '8px'
            }}>Forgot Password?</h2>
            <p style={{ color: '#8892b0', fontSize: '0.95rem', marginBottom: '32px', lineHeight: 1.7 }}>
              No worries! Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="form-input-icon">
                  <HiOutlineMail className="icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  boxShadow: '0 4px 15px rgba(249,115,22,0.3)'
                }}
              >
                {loading ? (
                  <>
                    <div className="spinner spinner-sm" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        ) : (
          /* Success State */
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '80px', height: '80px',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '36px', margin: '0 auto 24px',
              border: '2px solid rgba(34,197,94,0.2)'
            }}>✉️</div>

            <h2 style={{
              fontFamily: 'Poppins, sans-serif', fontSize: '1.6rem',
              fontWeight: 700, color: '#fff', marginBottom: '12px'
            }}>Check Your Email</h2>
            <p style={{ color: '#8892b0', fontSize: '0.95rem', lineHeight: 1.8, marginBottom: '8px' }}>
              We've sent a password reset link to:
            </p>
            <p style={{
              color: '#60a5fa', fontWeight: 600, fontSize: '1rem', marginBottom: '24px'
            }}>{email}</p>
            <p style={{ color: '#6b7a99', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '28px' }}>
              The link will expire in 15 minutes. If you don't see the email, check your spam folder.
            </p>

            <button
              className="btn btn-secondary btn-block"
              onClick={() => { setSent(false); setEmail(''); }}
            >
              Try a different email
            </button>
          </div>
        )}

        <div className="auth-link" style={{ marginTop: '28px' }}>
          Remember your password? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
