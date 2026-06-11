import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlinePhone, HiEye, HiEyeOff, HiOutlineOfficeBuilding, HiOutlineLocationMarker, HiOutlineBriefcase, HiOutlineKey } from 'react-icons/hi';
import toast from 'react-hot-toast';

const Signup = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // We don't use useAuth.signup anymore because we do a custom flow, but we can use login to set token
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    orgName: '', industry: 'Manufacturing', orgAddress: '',
    otpCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const getPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) return 'medium';
    return 'strong';
  };
  const strength = getPasswordStrength(formData.password);

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      return toast.error('Please fill in all required fields');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setStep(2);
  };

  const handleNextStep2 = async (e) => {
    e.preventDefault();
    if (!formData.orgName) return toast.error('Please enter an Organization Name');

    setLoading(true);
    try {
      await authAPI.onboardSendOTP({ email: formData.email });
      toast.success('Verification code sent to your email!');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP. Email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();
    if (!formData.otpCode || formData.otpCode.length !== 6) return toast.error('Please enter a valid 6-digit OTP');

    setLoading(true);
    try {
      const res = await authAPI.onboardVerifyOrg({
        personalDetails: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        },
        orgDetails: {
          name: formData.orgName,
          industry: formData.industry,
          address: formData.orgAddress
        },
        otpCode: formData.otpCode
      });
      
      toast.success(res.data.message || 'Application submitted successfully!');
      
      // Navigate to login (user cannot login until approved anyway, but this is the right place to send them)
      navigate('/login');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left - Branding */}
      <div className="auth-left">
        <div className="auth-branding">
          <div className="logo-icon">🏭</div>
          <h1>STR-DRG SaaS</h1>
          <p>Join the digital transformation. Start your own cloud workspace to automate production tracking, quality control, and inventory.</p>
          <div className="tagline">Next-Gen Factory Platform</div>
          
          <div style={{ marginTop: '40px', display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 1 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 2 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }} />
            <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step >= 3 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }} />
          </div>
          <p style={{ marginTop: '12px', color: '#8892b0', fontSize: '0.9rem' }}>
            Step {step} of 3: {step === 1 ? 'Admin Profile' : step === 2 ? 'Organization Details' : 'Verify Email'}
          </p>
        </div>
      </div>

      {/* Right - Signup Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          
          {step === 1 && (
            <>
              <h2>Create Admin Account</h2>
              <p className="subtitle">You will be the Super Admin of your new Organization</p>
              <form onSubmit={handleNextStep1}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <div className="form-input-icon">
                    <HiOutlineUser className="icon" />
                    <input type="text" name="name" className="form-input" placeholder="Enter your full name" value={formData.name} onChange={handleChange} autoFocus />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <div className="form-input-icon">
                    <HiOutlineMail className="icon" />
                    <input type="email" name="email" className="form-input" placeholder="Enter your email" value={formData.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div className="form-input-icon">
                    <HiOutlinePhone className="icon" />
                    <input type="tel" name="phone" className="form-input" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="form-input-icon">
                    <HiOutlineLockClosed className="icon" />
                    <input type={showPassword ? 'text' : 'password'} name="password" className="form-input" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} />
                    <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <HiEyeOff /> : <HiEye />}</button>
                  </div>
                  {formData.password && (
                    <>
                      <div className={`password-strength ${strength}`}>
                        <div className="bar" />
                        <div className="bar" />
                        <div className="bar" />
                      </div>
                    </>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <div className="form-input-icon">
                    <HiOutlineLockClosed className="icon" />
                    <input type={showConfirm ? 'text' : 'password'} name="confirmPassword" className="form-input" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} />
                    <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <HiEyeOff /> : <HiEye />}</button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" style={{ marginTop: '8px' }}>Continue to Organization &rarr;</button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Setup Organization</h2>
              <p className="subtitle">Tell us about your factory or company</p>
              <form onSubmit={handleNextStep2}>
                <div className="form-group">
                  <label className="form-label">Organization Name *</label>
                  <div className="form-input-icon">
                    <HiOutlineOfficeBuilding className="icon" />
                    <input type="text" name="orgName" className="form-input" placeholder="e.g. Acme Manufacturing" value={formData.orgName} onChange={handleChange} autoFocus />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <div className="form-input-icon">
                    <HiOutlineBriefcase className="icon" />
                    <select name="industry" className="form-input" value={formData.industry} onChange={handleChange} style={{ paddingLeft: '45px', appearance: 'none' }}>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Logistics">Logistics & Supply Chain</option>
                      <option value="Retail">Retail & Distribution</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address / Location</label>
                  <div className="form-input-icon">
                    <HiOutlineLocationMarker className="icon" />
                    <input type="text" name="orgAddress" className="form-input" placeholder="City, Country" value={formData.orgAddress} onChange={handleChange} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep(1)}>Back</button>
                  <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                    {loading ? 'Sending Code...' : 'Send Verification Code'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h2>Verify Your Email</h2>
              <p className="subtitle">We've sent a 6-digit verification code to <strong>{formData.email}</strong></p>
              <form onSubmit={handleSubmitFinal}>
                <div className="form-group">
                  <label className="form-label">Enter 6-Digit OTP *</label>
                  <div className="form-input-icon">
                    <HiOutlineKey className="icon" />
                    <input type="text" name="otpCode" className="form-input" placeholder="000000" maxLength={6} style={{ fontSize: '1.5rem', letterSpacing: '4px', textAlign: 'center', paddingLeft: '20px' }} value={formData.otpCode} onChange={handleChange} autoFocus />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary btn-lg" onClick={() => setStep(2)}>Back</button>
                  <button type="submit" className="btn btn-accent btn-lg" style={{ flex: 1 }} disabled={loading}>
                    {loading ? 'Creating Workspace...' : 'Verify & Launch Workspace'}
                  </button>
                </div>
              </form>
            </>
          )}

          <div className="auth-link" style={{ marginTop: '30px' }}>
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
