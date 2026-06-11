const nodemailer = require('nodemailer');

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

// Beautiful HTML email templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to STR-DRG ERP — Factory Automation',
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
            <h1 style="color:#ffffff;font-size:24px;margin:0 0 8px;">Welcome to STR-DRG ERP</h1>
            <p style="color:#3b82f6;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">Factory Automation System</p>
            <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:12px;padding:24px;margin-bottom:30px;text-align:left;">
              <p style="color:#e0e6f0;font-size:16px;margin:0 0 10px;">Hello <strong style="color:#93b4f5;">${name}</strong>,</p>
              <p style="color:#8892b0;font-size:14px;line-height:1.8;margin:0;">
                Your account has been created successfully! You can now access the STR-DRG ERP system to manage production, track inventory, monitor quality control, and much more.
              </p>
            </div>
            <a href="${process.env.FRONTEND_URL}/login" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#ffffff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:1px;">
              LOGIN TO DASHBOARD →
            </a>
            <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#4a5578;font-size:12px;margin:0;">STR-DRG ERP — Powered by BizSol Technologies</p>
              <p style="color:#4a5578;font-size:11px;margin:4px 0 0;">Integrated. Intelligent. Reliable.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  resetPassword: (name, resetUrl) => ({
    subject: 'STR-DRG ERP — Password Reset Request',
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
            <p style="color:#f97316;font-size:14px;margin:0 0 30px;letter-spacing:2px;text-transform:uppercase;">STR-DRG ERP System</p>
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
              <p style="color:#4a5578;font-size:12px;margin:0;">STR-DRG ERP — Powered by BizSol Technologies</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  })
};

module.exports = { sendEmail, emailTemplates };
