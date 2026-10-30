const nodemailer = require('nodemailer');
require('dotenv').config();

// Create SMTP transporter with strict connection timeouts to prevent hanging
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  },
  connectionTimeout: 5000, // 5 seconds max
  greetingTimeout: 5000,
  socketTimeout: 5000
});

/**
 * Sends an email using Brevo (Sendinblue) Transactional REST API over HTTPS (Port 443).
 * This completely avoids Render's port 25/465/587 outbound blocking on Free tier.
 * 
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
async function sendViaBrevo(to, subject, html) {
  if (!process.env.BREVO_API_KEY) {
    return false;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_EMAIL || 'nstpconnect@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || process.env.SMTP_FROM_NAME || 'CWTSConnect';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY.trim(),
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail.trim()
        },
        to: [{ email: to.trim() }],
        subject: subject,
        htmlContent: html
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ [EmailService] Email sent successfully via Brevo HTTPS API!');
      console.log('📨 [Brevo] Message ID:', data.messageId);
      return true;
    } else {
      console.error('❌ [EmailService] Brevo API returned an error:', data.message || data.code || data);
      if (data.code === 'unauthorized') {
        console.error('👉 Tip: Check your BREVO_API_KEY in Render/Environment variables.');
      } else if (data.message && data.message.toLowerCase().includes('sender')) {
        console.error(`👉 Tip: Verify that "${senderEmail}" is registered and confirmed as a sender in your Brevo account (Senders & IP).`);
      }
      return false;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('❌ [EmailService] Failed to reach Brevo API:', err.message || err);
    return false;
  }
}

/**
 * Sends an OTP verification email to a student.
 * @param {string} recipientEmail - The student's institutional email
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOtpEmail(recipientEmail, otpCode) {
  // Always log OTP to server console (visible in Render logs)
  console.log('🔐 [CWTSConnect] STUDENT REGISTRATION OTP CODE:');
  console.log('📧 Email:', recipientEmail);
  console.log('🔢 OTP Code:', otpCode);
  console.log('⏰ Time:', new Date().toLocaleString());
  console.log('─'.repeat(50));

  const subject = 'CWTSConnect - Your Email Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f9fafb; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0B3D2E; margin: 0;">CWTSConnect</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Student Portal &bull; LSPU Siniloan Campus</p>
      </div>

      <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
        <h3 style="color: #111827; margin-top: 0;">Email Verification Code</h3>
        <p style="color: #374151; font-size: 15px;">
          Use the verification code below to complete your CWTSConnect account registration.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <span style="
            display: inline-block;
            background-color: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 16px 32px;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0B3D2E;
          ">${otpCode}</span>
        </div>

        <p style="color: #6b7280; font-size: 13px;">
          This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
        &copy; ${new Date().getFullYear()} CWTSConnect. All rights reserved.
      </p>
    </div>
  `;

  // 1. Try Brevo HTTPS API first (Works 100% on Render Free tier via port 443)
  const sentViaBrevo = await sendViaBrevo(recipientEmail, subject, html);
  if (sentViaBrevo) {
    return;
  }

  // 2. Fallback to SMTP (Works locally on localhost)
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ [EmailService] No Brevo API key or SMTP credentials found. OTP is logged in console above.');
    return;
  }

  const mailOptions = {
    from: {
      name: process.env.SMTP_FROM_NAME || 'CWTSConnect',
      address: process.env.SMTP_EMAIL
    },
    to: recipientEmail,
    subject: subject,
    html: html
  };

  try {
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timed out (5s). If on Render free tier, configure BREVO_API_KEY instead.')), 5000)
      )
    ]);
    console.log('✅ [EmailService] Email sent successfully via SMTP fallback');
  } catch (err) {
    console.error('❌ [EmailService] SMTP error:', err.message || err);
    console.log('ℹ️ [EmailService] You can retrieve the OTP code from your console/Render logs above.');
  }
}

/**
 * Sends a Password Reset OTP email.
 * @param {string} recipientEmail - User email
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendPasswordResetOtpEmail(recipientEmail, otpCode) {
  console.log('🔐 [CWTSConnect] PASSWORD RESET OTP CODE:');
  console.log('📧 Email:', recipientEmail);
  console.log('🔢 OTP Code:', otpCode);
  console.log('⏰ Time:', new Date().toLocaleString());
  console.log('─'.repeat(50));

  const subject = 'CWTSConnect - Password Reset Verification Code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f9fafb; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0B3D2E; margin: 0;">CWTSConnect</h2>
        <p style="color: #596773; font-size: 14px; margin: 4px 0 0;">Account Recovery & Security</p>
      </div>

      <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
        <h3 style="color: #111827; margin-top: 0;">Password Reset Request</h3>
        <p style="color: #374151; font-size: 15px;">
          We received a request to reset your CWTSConnect password. Use the verification code below to authorize the change:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <span style="
            display: inline-block;
            background-color: #F0FDF4;
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 16px 32px;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #0B3D2E;
          ">${otpCode}</span>
        </div>

        <p style="color: #6b7280; font-size: 13px;">
          This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
        <p style="color: #6b7280; font-size: 13px;">
          If you did not request a password reset, you can safely ignore this email. Your account remains secure.
        </p>
      </div>

      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
        &copy; ${new Date().getFullYear()} CWTSConnect. All rights reserved.
      </p>
    </div>
  `;

  // 1. Try Brevo HTTPS API first
  const sentViaBrevo = await sendViaBrevo(recipientEmail, subject, html);
  if (sentViaBrevo) {
    return;
  }

  // 2. Fallback to SMTP
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ [EmailService] No Brevo API key or SMTP credentials found. OTP is logged in console above.');
    return;
  }

  const mailOptions = {
    from: {
      name: process.env.SMTP_FROM_NAME || 'CWTSConnect',
      address: process.env.SMTP_EMAIL
    },
    to: recipientEmail,
    subject: subject,
    html: html
  };

  try {
    await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP connection timed out (5s). If on Render free tier, configure BREVO_API_KEY instead.')), 5000)
      )
    ]);
    console.log('✅ [EmailService] Password reset email sent successfully via SMTP fallback');
  } catch (err) {
    console.error('❌ [EmailService] SMTP error:', err.message || err);
    console.log('ℹ️ [EmailService] You can retrieve the OTP code from your console/Render logs above.');
  }
}

module.exports = { sendOtpEmail, sendPasswordResetOtpEmail };
