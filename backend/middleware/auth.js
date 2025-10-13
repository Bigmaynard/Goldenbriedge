const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bank_secret_key');
    
    // Check if user exists and is approved
    const userResult = await pool.query(
      'SELECT id, full_name, email, balance, status, is_frozen FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (userResult.rows[0].status !== 'approved') {
      return res.status(403).json({ error: 'Account not approved' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };