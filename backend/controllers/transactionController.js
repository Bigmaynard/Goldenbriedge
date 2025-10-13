const { pool } = require('../config/database');

// Get user transactions
const getUserTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recent transactions (for dashboard)
const getRecentTransactions = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create transaction (user)
const createTransaction = async (req, res) => {
  const userId = req.user.id;
  const { type, amount, recipient_name, recipient_account, description, bank_name, routing_number, swift_code } = req.body;

  try {
    // Check if user account is frozen
    const userResult = await pool.query(
      'SELECT is_frozen, balance FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].is_frozen) {
      return res.status(400).json({ error: 'Your account is frozen. Please contact support.' });
    }

    // Check balance for withdrawals/transfers
    if (type === 'withdrawal' || type === 'transfer') {
      if (userResult.rows[0].balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
    }

    // Generate unique ID
    const uniqueId = 'T' + Date.now() + Math.random().toString(36).substr(2, 9);
    
    // For demo, generate OTP (in real app, this would be sent via email/SMS)
    const otp = '123456';

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, description, recipient_name, recipient_account, bank_name, routing_number, swift_code, unique_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [userId, type, amount, description, recipient_name, recipient_account, bank_name, routing_number, swift_code, uniqueId]
    );

    res.json({
      message: 'Transaction created successfully. OTP verification required.',
      transactionId: result.rows[0].id,
      uniqueId: result.rows[0].unique_id,
      otp: otp // In production, this would not be sent in response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify OTP and complete transaction
const verifyOTP = async (req, res) => {
  const transactionId = req.params.id;
  const { otp } = req.body;
  const userId = req.user.id;

  try {
    // In a real app, you would verify OTP from database/email/SMS
    // For demo purposes, we'll accept any 6-digit OTP
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Update transaction status to approved
    await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['approved', transactionId]
    );

    // Update user balance
    if (transaction.type === 'deposit') {
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [transaction.amount, userId]
      );
    } else if (transaction.type === 'withdrawal' || transaction.type === 'transfer') {
      await pool.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [transaction.amount, userId]
      );
    }

    res.json({ 
      message: 'Transaction completed successfully',
      uniqueId: transaction.unique_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction receipt
const getTransactionReceipt = async (req, res) => {
  const transactionId = req.params.id;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get transaction summary (for profile page)
const getTransactionSummary = async (req, res) => {
  const userId = req.user.id;

  try {
    const depositsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_deposits 
       FROM transactions 
       WHERE user_id = $1 AND type = 'deposit' AND status = 'approved'`,
      [userId]
    );

    const withdrawalsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_withdrawals 
       FROM transactions 
       WHERE user_id = $1 AND type IN ('withdrawal', 'transfer') AND status = 'approved'`,
      [userId]
    );

    res.json({
      total_deposits: parseFloat(depositsResult.rows[0].total_deposits),
      total_withdrawals: parseFloat(withdrawalsResult.rows[0].total_withdrawals)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserTransactions,
  getRecentTransactions,
  createTransaction,
  verifyOTP,
  getTransactionReceipt,
  getTransactionSummary
};