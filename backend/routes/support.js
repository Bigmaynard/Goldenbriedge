const express = require('express');
const {
  createSupportTicket,
  getUserSupportTickets,
  addTicketResponse,
  getTicketConversation
} = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getUserSupportTickets);
router.post('/', authenticateToken, createSupportTicket);
router.post('/:id/response', authenticateToken, addTicketResponse);

router.get('/:id/conversation', authenticateToken, getTicketConversation);
module.exports = router;