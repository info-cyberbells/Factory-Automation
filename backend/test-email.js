const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

console.log('Using SMTP Host:', process.env.SMTP_HOST);
console.log('Using SMTP Port:', process.env.SMTP_PORT);
console.log('Using SMTP Email:', process.env.SMTP_EMAIL);

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
  from: `"${process.env.FROM_NAME || 'STR-DRG ERP'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
  to: 'apps.cyberbells@gmail.com', // sender email from screenshot
  subject: 'Test Email from STR-DRG ERP',
  text: 'Hello, this is a test email.'
};

transporter.sendMail(mailOptions)
  .then(info => {
    console.log('Email sent successfully!');
    console.log(info);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error sending email:');
    console.error(err);
    process.exit(1);
  });
