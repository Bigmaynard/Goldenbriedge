const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// User registration
const registerUser = async (req, res) => {
  const { full_name, phone_number, email, date_of_birth, password } = req.body;

  try {
    // Check if user already exists
    const userExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (full_name, phone_number, email, date_of_birth, password_hash) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, status, balance, is_frozen`,
      [full_name, phone_number, email, date_of_birth, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'User registered successfully. Waiting for admin approval.',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        status: user.status,
        balance: user.balance,
        is_frozen: user.is_frozen
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// User login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT id, full_name, email, password_hash, balance, status, is_frozen FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is approved
    if (user.status !== 'approved') {
      return res.status(400).json({ error: 'Your account is pending approval' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'bank_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        balance: user.balance,
        is_frozen: user.is_frozen
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin login
const loginAdmin = async (req, res) => {
  console.log("1. Login Admin function started");
  const { username, password } = req.body;
  console.log("2. Received:", username, password);

  try {
    console.log("3. Starting database query...");
    
    // Find admin by username
    const result = await pool.query(
      'SELECT id, username, full_name, password_hash FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log("3a. Admin not found");
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const admin = result.rows[0];
    console.log("4. Query finished, admin found:", admin.username);

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      console.log("4a. Password does not match");
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_SECRET || 'bank_secret_key',
      { expiresIn: '24h' }
    );

    console.log("5. Login successful");
    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name
      }
    });
  } catch (err) {
    console.log("6. Entered catch block with error:", err);
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = req.user; // from middleware

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      balance: user.balance,
      is_frozen: user.is_frozen,
      status: user.status
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  const { full_name, email, phone_number, address } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET full_name = $1, email = $2, phone_number = $3, address = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING id, full_name, email, phone_number, address, balance, status, is_frozen`,
      [full_name, email, phone_number, address, userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  try {
    // Get user's current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check current password
    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  getUserProfile,
  updateUserProfile,
  changePassword
};