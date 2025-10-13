const bcrypt = require('bcryptjs');
const { pool } = require('./config/database');

async function resetAdminPassword() {
  try {
    const newPassword = 'admin123'; // Choose any password you want
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE username = $2',
      [passwordHash, 'admin']
    );
    
    console.log('✅ Admin password reset successfully!');
    console.log('Username: admin');
    console.log('Password: ' + newPassword);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(1);
  }
}

resetAdminPassword();