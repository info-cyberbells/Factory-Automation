import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useOrg } from '../../context/OrgContext';
import { uploadAPI } from '../../services/api';
import { compressImage } from '../../services/compress';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const apiURL = process.env.REACT_APP_API_URL;
    if (apiURL) {
      const base = apiURL.endsWith('/api') ? apiURL : (apiURL.endsWith('/api/') ? apiURL.slice(0, -1) : `${apiURL}/api`);
      return `${base}${url}`;
    }
    if (window.location.port) {
      return `${window.location.protocol}//${window.location.hostname}:9898${url}`;
    } else {
      return `${window.location.origin}/api${url}`;
    }
  }
  return url;
};


const OptionalFeature = () => {
  const { settings, updateSettings, reloadSettings } = useOrg();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // local states for settings
  const [brandName, setBrandName] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');

  useEffect(() => {
    if (settings) {
      setLogoPreview(settings.logo || '');
      setBrandName(settings.brandName || '');
      setBrandSubtitle(settings.brandSubtitle || '');
    }
  }, [settings]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveLogo = async (e) => {
    e.preventDefault();
    if (!logoFile && logoPreview === settings.logo) {
      toast.error('No changes to save');
      return;
    }

    setSaving(true);
    let uploadedLogoUrl = settings.logo;

    try {
      if (logoFile) {
        setUploading(true);
        const compressedFile = await compressImage(logoFile);
        const formData = new FormData();
        formData.append('file', compressedFile);
        
        const uploadRes = await uploadAPI.uploadFile(formData);
        if (uploadRes.data && uploadRes.data.success) {
          uploadedLogoUrl = uploadRes.data.fileUrl;
        } else {
          throw new Error('Upload failed');
        }
        setUploading(false);
      }

      await updateSettings({
        ...settings,
        brandName,
        brandSubtitle,
        logo: uploadedLogoUrl
      });

      toast.success('Organization branding settings updated successfully!');
      reloadSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update organization logo');
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Optional Feature">
      <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }} className="fade-in-up">
        <div className="glass-card" style={{ padding: '32px', border: '1px solid var(--border)', borderRadius: '20px' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            ⚙️ Optional Feature — Organization Settings
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Customize your organization's logo and details dynamically. The uploaded logo will display instantly in the top navigation bar.
          </p>

          <form onSubmit={handleSaveLogo} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px' }}>
              
              {/* Form Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>ORGANIZATION NAME</label>
                  <input 
                    className="form-input" 
                    value={brandName} 
                    onChange={e => setBrandName(e.target.value)} 
                    placeholder="Enter Organization name" 
                    required 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>SUBTITLE / SLOGAN</label>
                  <input 
                    className="form-input" 
                    value={brandSubtitle} 
                    onChange={e => setBrandSubtitle(e.target.value)} 
                    placeholder="Enter subtitle" 
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>UPLOAD LOGO</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px dashed var(--border)',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Logo Preview Panel */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px dashed var(--border)',
                borderRadius: '16px',
                padding: '24px'
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
                  Logo Preview
                </span>
                
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                  marginBottom: '16px'
                }}>
                  {logoPreview ? (
                    logoPreview.startsWith('http') || logoPreview.startsWith('/') || logoPreview.startsWith('data:') || logoPreview.startsWith('blob:') ? (
                      <img src={getImageUrl(logoPreview)} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}>{logoPreview}</span>
                    )
                  ) : (
                    <span style={{ fontSize: '3.5rem' }}>🏭</span>
                  )}
                </div>
                
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  {logoFile ? logoFile.name : 'Using current logo'}
                </span>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={saving || uploading}
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  padding: '12px 28px',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                {uploading ? 'Uploading Logo...' : saving ? 'Saving changes...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OptionalFeature;
