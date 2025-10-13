const { pool } = require('../config/database');

// Get all users (for admin)
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, email, phone_number, date_of_birth, balance, status, is_frozen, created_at 
       FROM users ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve user
const approveUser = async (req, res) => {
  const userId = req.params.id;
  const adminId = req.admin.id;

  try {
    // Update user status
    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING *',
      ['approved', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'approve_user', 'user', userId, `Approved user: ${result.rows[0].email}`]
    );

    res.json({ message: 'User approved successfully', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject user (delete)
const rejectUser = async (req, res) => {
  const userId = req.params.id;
  const adminId = req.admin.id;

  try {
    // Get user email for activity log
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'reject_user', 'user', userId, `Rejected user: ${userResult.rows[0].email}`]
    );

    res.json({ message: 'User rejected and deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Freeze/unfreeze user account
const toggleFreezeUser = async (req, res) => {
  const userId = req.params.id;
  const { is_frozen } = req.body;
  const adminId = req.admin.id;

  try {
    const result = await pool.query(
      'UPDATE users SET is_frozen = $1 WHERE id = $2 RETURNING *',
      [is_frozen, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const action = is_frozen ? 'freeze_user' : 'unfreeze_user';
    const details = `${is_frozen ? 'Froze' : 'Unfroze'} user: ${result.rows[0].email}`;

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, action, 'user', userId, details]
    );

    res.json({ 
      message: `User account ${is_frozen ? 'frozen' : 'unfrozen'} successfully`,
      user: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user balance
const updateUserBalance = async (req, res) => {
  const userId = req.params.id;
  const { balance } = req.body;
  const adminId = req.admin.id;

  try {
    const result = await pool.query(
      'UPDATE users SET balance = $1 WHERE id = $2 RETURNING *',
      [balance, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'update_balance', 'user', userId, `Updated balance to $${balance} for user: ${result.rows[0].email}`]
    );

    res.json({ message: 'Balance updated successfully', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all transactions (admin)
const getAllTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.full_name as user_name 
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create transaction (admin)
const createTransaction = async (req, res) => {
  const { user_id, type, amount, description, recipient_account, recipient_name } = req.body;
  const adminId = req.admin.id;

  try {
    // Generate unique ID
    const uniqueId = 'T' + Date.now() + Math.random().toString(36).substr(2, 9);

    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, description, recipient_account, recipient_name, status, unique_id) 
       VALUES ($1, $2, $3, $4, $5, $6, 'approved', $7) RETURNING *`,
      [user_id, type, amount, description, recipient_account, recipient_name, uniqueId]
    );

    // Update user balance if transaction is approved
    if (type === 'deposit') {
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [amount, user_id]
      );
    } else if (type === 'withdrawal' || type === 'transfer') {
      await pool.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount, user_id]
      );
    }

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'create_transaction', 'transaction', result.rows[0].id, `Created ${type} transaction for user ID: ${user_id}, Amount: $${amount}`]
    );

    res.json({ 
      message: 'Transaction created successfully',
      transactionId: result.rows[0].id,
      uniqueId: result.rows[0].unique_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve transaction
const approveTransaction = async (req, res) => {
  const transactionId = req.params.id;
  const adminId = req.admin.id;

  try {
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Update transaction status
    await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['approved', transactionId]
    );

    // Update user balance
    if (transaction.type === 'deposit') {
      await pool.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [transaction.amount, transaction.user_id]
      );
    } else if (transaction.type === 'withdrawal' || transaction.type === 'transfer') {
      await pool.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [transaction.amount, transaction.user_id]
      );
    }

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'approve_transaction', 'transaction', transactionId, `Approved transaction: ${transaction.unique_id}`]
    );

    res.json({ message: 'Transaction approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject transaction
const rejectTransaction = async (req, res) => {
  const transactionId = req.params.id;
  const adminId = req.admin.id;

  try {
    const transactionResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactionResult.rows[0];

    // Update transaction status
    await pool.query(
      'UPDATE transactions SET status = $1 WHERE id = $2',
      ['rejected', transactionId]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'reject_transaction', 'transaction', transactionId, `Rejected transaction: ${transaction.unique_id}`]
    );

    res.json({ message: 'Transaction rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get pending loans
const getPendingLoans = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.full_name as user_name 
       FROM loans l 
       JOIN users u ON l.user_id = u.id 
       WHERE l.status = 'pending' 
       ORDER BY l.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Approve loan
const approveLoan = async (req, res) => {
  const loanId = req.params.id;
  const adminId = req.admin.id;

  try {
    const loanResult = await pool.query(
      'SELECT * FROM loans WHERE id = $1',
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Update loan status
    await pool.query(
      'UPDATE loans SET status = $1 WHERE id = $2',
      ['approved', loanId]
    );

    // Add loan amount to user balance
    await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [loan.amount, loan.user_id]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'approve_loan', 'loan', loanId, `Approved loan: $${loan.amount} for user ID: ${loan.user_id}`]
    );

    res.json({ message: 'Loan approved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reject loan
const rejectLoan = async (req, res) => {
  const loanId = req.params.id;
  const adminId = req.admin.id;

  try {
    const loanResult = await pool.query(
      'SELECT * FROM loans WHERE id = $1',
      [loanId]
    );

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Update loan status
    await pool.query(
      'UPDATE loans SET status = $1 WHERE id = $2',
      ['rejected', loanId]
    );

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'reject_loan', 'loan', loanId, `Rejected loan: $${loan.amount} for user ID: ${loan.user_id}`]
    );

    res.json({ message: 'Loan rejected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get support tickets
const getSupportTickets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.full_name as user_name 
       FROM support_tickets s 
       JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get support ticket by ID
const getSupportTicket = async (req, res) => {
  const ticketId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT s.*, u.full_name as user_name 
       FROM support_tickets s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ticket conversation for admin - USING TICKET_MESSAGES TABLE
const getTicketConversation = async (req, res) => {
  const ticketId = req.params.id;

  try {
    // Get all messages from ticket_messages table
    const messagesResult = await pool.query(
      `SELECT tm.*, 
              CASE 
                WHEN tm.sender_type = 'user' THEN u.full_name 
                ELSE 'Support Team' 
              END as user_name
       FROM ticket_messages tm
       LEFT JOIN users u ON u.id = (
         SELECT user_id FROM support_tickets WHERE id = $1
       )
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    console.log(`Found ${messagesResult.rows.length} messages for ticket ${ticketId}`);
    
    res.json(messagesResult.rows);
  } catch (err) {
    console.error('Error in getTicketConversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Respond to support ticket - UPDATED TO USE TICKET_MESSAGES TABLE
const respondToTicket = async (req, res) => {
  const ticketId = req.params.id;
  const { response, status } = req.body;
  const adminId = req.admin.id;

  try {
    // Insert admin response into ticket_messages table
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, message, admin_id) 
       VALUES ($1, 'admin', $2, $3)`,
      [ticketId, response, adminId]
    );

    // Update ticket status and timestamp
    const result = await pool.query(
      'UPDATE support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Log activity
    await pool.query(
      'INSERT INTO activities (admin_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
      [adminId, 'respond_ticket', 'support_ticket', ticketId, `Responded to ticket: ${result.rows[0].subject}`]
    );

    res.json({ 
      message: 'Response sent successfully', 
      ticket: result.rows[0] 
    });
  } catch (err) {
    console.error('Error in respondToTicket:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get activities log
const getActivities = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, au.full_name as admin_name 
       FROM activities a 
       JOIN admin_users au ON a.admin_id = au.id 
       ORDER BY a.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUsers,
  approveUser,
  rejectUser,
  toggleFreezeUser,
  updateUserBalance,
  getAllTransactions,
  createTransaction,
  approveTransaction,
  rejectTransaction,
  getPendingLoans,
  approveLoan,
  rejectLoan,
  getSupportTickets,
  getSupportTicket,
  getTicketConversation,
  respondToTicket,
  getActivities
};