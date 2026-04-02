const nodemailer = require('nodemailer');
require('dotenv').config();

async function testMail() {
  console.log('--- SMTP Connection Test ---');
  console.log(`Host: ${process.env.SMTP_HOST}`);
  console.log(`Port: ${process.env.SMTP_PORT}`);
  console.log(`User: ${process.env.SMTP_USER}`);
  console.log(`Pass: ${process.env.SMTP_PASS ? '****** (length: ' + process.env.SMTP_PASS.length + ')' : 'MISSING'}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('[SUCCESS] SMTP connection is valid!');
  } catch (error) {
    console.error('[FAILED] SMTP connection failed:', error.message);
  }
}

testMail();
