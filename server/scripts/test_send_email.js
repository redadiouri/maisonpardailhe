require('dotenv').config();
const { sendMail } = require('../utils/email');
async function run() {
  try {
    const to = process.env.TEST_EMAIL_TO || process.env.SMTP_USER || 'test@example.com';
    console.log('Testing sendMail to', to);
    const res = await sendMail(
      { to, subject: 'Test email from MaisonPardailhe', text: 'This is a test.' },
      { retries: 1 }
    );
    console.log('sendMail result:', res);
    if (res && res.previewUrl) console.log('Preview URL:', res.previewUrl);
  } catch (e) {
    console.error('Error sending test email:', (e && e.stack) || e);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
