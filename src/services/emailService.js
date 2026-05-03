const nodemailer = require('nodemailer');
require('dotenv').config();

// Create SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * Sends an OTP verification email to a student using SMTP.
 * @param {string} recipientEmail - The student's institutional email
 * @param {string} otpCode - The 6-digit OTP code
 * @returns {Promise<void>}
 */
async function sendOtpEmail(recipientEmail, otpCode) {
  // TEMPORARY: Log OTP to console for testing
  console.log('🔐 OTP CODE FOR TESTING:');
  console.log('📧 Email:', recipientEmail);
  console.log('🔢 OTP Code:', otpCode);
  console.log('⏰ Time:', new Date().toLocaleString());
  console.log('─'.repeat(50));

  const mailOptions = {
    from: {
      name: process.env.SMTP_FROM_NAME || 'NSTPConnect',
      address: process.env.SMTP_EMAIL
    },
    to: recipientEmail,
    subject: 'NSTPConnect - Your Email Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background-color: #f9fafb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #166534; margin: 0;">NSTPConnect</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Student Portal</p>
        </div>

        <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
          <h3 style="color: #111827; margin-top: 0;">Email Verification Code</h3>
          <p style="color: #374151; font-size: 15px;">
            Use the verification code below to complete your NSTPConnect account registration.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <span style="
              display: inline-block;
              background-color: #f0fdf4;
              border: 2px solid #16a34a;
              border-radius: 8px;
              padding: 16px 32px;
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #166534;
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
          &copy; ${new Date().getFullYear()} NSTPConnect. All rights reserved.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully via SMTP');
    console.log('📨 Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ SMTP email send error:', err.message || err);
    console.log('⚠️  Email failed to send, but OTP is logged above for testing');
    
    // Don't throw error - let the user continue with console OTP
    // throw new Error('Failed to send OTP email. Please try again later.');
  }
}

module.exports = { sendOtpEmail };
