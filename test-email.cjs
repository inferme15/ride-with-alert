// Simple test script to verify email configuration
require('dotenv').config();

// Since we're using TypeScript, we need to compile or use a different approach
const nodemailer = require('nodemailer');

async function testEmailConnection() {
  console.log('🧪 Testing email service...');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
  
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    
    // Send test email
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself
      subject: '🧪 RideWithAlert Email Test',
      html: `
        <h2>✅ Email Service Test Successful!</h2>
        <p>Your email configuration is working correctly.</p>
        <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>You can now receive trip assignments and emergency alerts!</p>
      `
    };
    
    await transporter.sendMail(testEmail);
    console.log('📧 Test email sent successfully to:', process.env.EMAIL_USER);
    
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check EMAIL_USER is correct Gmail address');
    console.log('2. Check EMAIL_APP_PASSWORD is valid Gmail app password');
    console.log('3. Ensure 2FA is enabled on Gmail account');
  }
}

testEmailConnection();