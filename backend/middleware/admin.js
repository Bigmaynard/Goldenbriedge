const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bank_secret_key');
    
    // Check if admin user exists
    const adminResult = await pool.query(
      'SELECT id, username, full_name FROM admin_users WHERE id = $1',
      [decoded.adminId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    req.admin = adminResult.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }
};

module.exports = { authenticateAdmin };