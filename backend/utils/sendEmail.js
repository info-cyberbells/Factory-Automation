const nodemailer = require('nodemailer');
const Organization = require('../models/Organization');
const User = require('../models/User');

const sendEmail = async ({ to, subject, html, orgId }) => {
  // 1. Fetch organization settings
  let settings = {
    brandName: 'TrackBells ERP',
    brandSubtitle: 'Factory Automation',
    themeColor: '#f97316',
    footerText: 'Powered by Cyberbells ITES services pvt ltd',
    logo: '🏭'
  };

  try {
    let targetOrgId = orgId;
    if (!targetOrgId && to) {
      // Find user by email to determine organization
      const user = await User.findOne({ email: to.toLowerCase() });
      if (user && user.organizationId) {
        targetOrgId = user.organizationId;
      }
    }

    if (targetOrgId) {
      const org = await Organization.findById(targetOrgId);
      if (org && org.settings) {
        settings = {
          brandName: org.settings.brandName || settings.brandName,
          brandSubtitle: org.settings.brandSubtitle || settings.brandSubtitle,
          themeColor: org.settings.themeColor || settings.themeColor,
          footerText: org.settings.footerText || settings.footerText,
          logo: org.settings.logo || settings.logo
        };
      }
    }
  } catch (err) {
    console.error('Failed to resolve dynamic email branding, using default.', err);
  }

  // Replace default branding elements in the HTML template dynamically
  let formattedHtml = html;
  if (formattedHtml) {
    formattedHtml = formattedHtml.replace(/Welcome to TrackBells ERP/g, `Welcome to ${settings.brandName}`);
    formattedHtml = formattedHtml.replace(/TrackBells ERP —/g, `${settings.brandName} —`);
    formattedHtml = formattedHtml.replace(/TrackBells ERP/g, settings.brandName);
    formattedHtml = formattedHtml.replace(/Factory Automation System/g, settings.brandSubtitle);
    formattedHtml = formattedHtml.replace(/TrackBells ERP System/g, settings.brandSubtitle);
    
    // Replace logo emoji and its container
    let logoHtml = '<span style="font-size:32px;">🏭</span>';
    let logoContainerStyle = 'width:70px;height:70px;background:linear-gradient(135deg,#3b82f6,#a855f7);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;';

    if (settings.logo && (settings.logo.startsWith('/') || settings.logo.startsWith('http'))) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const absoluteLogoUrl = settings.logo.startsWith('/') ? `${frontendUrl}${settings.logo}` : settings.logo;
      logoHtml = `<img src="${absoluteLogoUrl}" alt="Logo" style="max-height:48px;max-width:180px;object-fit:contain;" />`;
      logoContainerStyle = 'margin:0 auto 24px;display:flex;align-items:center;justify-content:center;min-height:50px;';
    }

    formattedHtml = formattedHtml.replace(/width:70px;height:70px;background:linear-gradient\(135deg,#3b82f6,#a855f7\);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;/g, logoContainerStyle);
    formattedHtml = formattedHtml.replace(/<span style="font-size:32px;">🏭<\/span>/g, logoHtml);

    // Replace footer
    formattedHtml = formattedHtml.replace(/Powered by Cyberbells ITES services pvt ltd/g, settings.footerText);

    // Replace colors (e.g. #3b82f6, #2563eb, #f97316, #ea580c) with settings.themeColor
    formattedHtml = formattedHtml.replace(/#3b82f6/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#2563eb/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#f97316/g, settings.themeColor);
    formattedHtml = formattedHtml.replace(/#ea580c/g, settings.themeColor);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"${settings.brandName}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: subject.replace(/TrackBells ERP/g, settings.brandName),
    html: formattedHtml
  };

  await transporter.sendMail(mailOptions);
};

// Beautiful HTML email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to TrackBells ERP — Factory Automation',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(59,130,246,0.2);border-radius:20px;padding:40px;text-align:center;">
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#3b82f6,#a855f7);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">🏭</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome to TrackBells ERP</h1>
            <p style="color:#3b82f6;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">Factory Automation System</p>
            <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:24px;margin-bottom:30px;text-align:left;">
              <p style="color:#e0e6f0;font-size:16px;margin:0 0 10px;">Hello <strong style="color:#93b4f5;">${name}</strong>,</p>
              <p style="color:#8892b0;font-size:14px;line-height:1.8;margin:0;">
                Your account has been created successfully! You can now access the TrackBells ERP system to manage production, track inventory, monitor quality control, and much more.
              </p>
            </div>
            <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:1px;">
              LOGIN TO DASHBOARD →
            </a>
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Powered by Cyberbells ITES services pvt ltd</p>
              <p style="color:#4a5578;font-size:11px;margin:4px 0 0;">Integrated. Intelligent. Reliable.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'TrackBells ERP — Password Reset Request',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0a0e1a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:linear-gradient(145deg,#1a1f3a,#0d1525);border:1px solid rgba(249,115,22,0.2);border-radius:20px;padding:40px;text-align:center;">
            <div style="width:70px;height:70px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:18px;margin:0 auto 24px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:32px;">🔐</span>
            </div>
            <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Password Reset</h1>
            <p style="color:#f97316;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">TrackBells ERP System</p>
            <div style="background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.15);border-radius:12px;padding:24px;margin-bottom:30px;text-align:left;">
              <p style="color:#e0e6f0;font-size:16px;margin:0 0 10px;">Hello <strong style="color:#fb923c;">${name}</strong>,</p>
              <p style="color:#8892b0;font-size:14px;line-height:1.8;margin:0 0 15px;">
                We received a request to reset your password. Click the button below to set a new password. This link is valid for <strong style="color:#fb923c;">15 minutes</strong>.
              </p>
              <p style="color:#6b7a99;font-size:13px;line-height:1.6;margin:0;">
                If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </div>
            <a href="${resetUrl}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:1px;">
              RESET MY PASSWORD →
            </a>
            <p style="color:#4a5578;font-size:12px;margin:20px 0 0;">
              Or copy this link: <br/>
              <span style="color:#6b7a99;word-break:break-all;font-size:11px;">${resetUrl}</span>
            </p>
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a5578;font-size:12px;margin:0;">TrackBells ERP — Powered by Cyberbells ITES services pvt ltd</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
