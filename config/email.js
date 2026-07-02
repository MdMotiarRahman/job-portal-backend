/**
 * Email Configuration
 * Supports multiple providers: Mailtrap (free), Gmail SMTP, or Console logging
 * 
 * SETUP INSTRUCTIONS:
 * 
 * Option 1: MAILTRAP (Recommended for Testing - FREE)
 * ─────────────────────────────────────────────────
 * 1. Go to https://mailtrap.io
 * 2. Sign up (free account, no credit card required)
 * 3. Create a test inbox
 * 4. Go to Integrations → Nodemailer
 * 5. Copy the credentials and add to .env:
 *    MAILTRAP_HOST=smtp.mailtrap.io
 *    MAILTRAP_PORT=2525
 *    MAILTRAP_USER=your_user_id
 *    MAILTRAP_PASS=your_password
 *    EMAIL_FROM=noreply@jobland.com
 * 
 * Option 2: GMAIL SMTP (FREE - For Production)
 * ──────────────────────────────────────────────
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Generate an app-specific password (16 characters)
 * 3. Add to .env:
 *    GMAIL_USER=your-email@gmail.com
 *    GMAIL_PASS=your-app-password (16 char)
 *    EMAIL_FROM=your-email@gmail.com
 * 
 * Option 3: CONSOLE (Development Only)
 * ──────────────────────────────────────
 * Logs emails to console. Set:
 *    EMAIL_PROVIDER=console
 */

const nodeMailer = require('nodemailer');

// Determine which email provider to use
const provider = process.env.EMAIL_PROVIDER || 'mailtrap';

let transporter = null;

if (provider === 'mailtrap') {
  // ============ MAILTRAP CONFIGURATION ============
  transporter = nodeMailer.createTransport({
    host: process.env.MAILTRAP_HOST || 'smtp.mailtrap.io',
    port: process.env.MAILTRAP_PORT || 2525,
    auth: {
      user: process.env.MAILTRAP_USER || '',
      pass: process.env.MAILTRAP_PASS || '',
    },
    secure: false,
  });
} else if (provider === 'gmail') {
  // ============ GMAIL SMTP CONFIGURATION ============
  transporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_PASS || '',
    },
  });
} else if (provider === 'console') {
  // ============ CONSOLE CONFIGURATION (Development) ============
  transporter = nodeMailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

/**
 * Test email configuration
 */
const testEmailConfig = async () => {
  try {
    if (provider === 'console') {
      console.log('✅ Email provider: CONSOLE (Development mode)');
      return true;
    }

    await transporter.verify();
    console.log(`✅ Email service ready (Provider: ${provider.toUpperCase()})`);
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.log('\n📝 Please configure email in .env file:');
    if (provider === 'mailtrap') {
      console.log('   MAILTRAP_HOST=smtp.mailtrap.io');
      console.log('   MAILTRAP_PORT=2525');
      console.log('   MAILTRAP_USER=your_user_id');
      console.log('   MAILTRAP_PASS=your_password');
    }
    return false;
  }
};

module.exports = {
  transporter,
  provider,
  testEmailConfig,
  emailFrom: process.env.EMAIL_FROM || 'noreply@jobland.com',
};
