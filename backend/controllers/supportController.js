const { pool } = require('../config/database');

// Create support ticket
const createSupportTicket = async (req, res) => {
  const userId = req.user.id;
  const { subject, message, priority, category } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, subject, message, priority, category) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, subject, message, priority, category]
    );

    res.json({
      message: 'Support ticket created successfully',
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user support tickets
const getUserSupportTickets = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Add response to support ticket (user)
const addTicketResponse = async (req, res) => {
  const ticketId = req.params.id;
  const userId = req.user.id;
  const { message } = req.body;

  try {
    // Verify ticket belongs to user
    const ticketResult = await pool.query(
      'SELECT * FROM support_tickets WHERE id = $1 AND user_id = $2',
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update ticket message and status
    await pool.query(
  'INSERT INTO ticket_messages (ticket_id, sender_type, message) VALUES ($1, $2, $3)',
  [ticketId, 'user', message]
);

// 2. Only update the ticket status, NOT the message field
const result = await pool.query(
  'UPDATE support_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
  ['open', ticketId]
);
    res.json({
      message: 'Response added successfully',
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get ticket conversation (for admin modal)
// Get ticket conversation for admin - FIXED VERSION
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
module.exports = {
  createSupportTicket,
  getUserSupportTickets,
  addTicketResponse,
  getTicketConversation
};