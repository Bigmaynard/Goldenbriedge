const express = require('express');
const {
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
  getTicketConversation,  // ADD THIS IMPORT
  respondToTicket,
  getActivities
} = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/admin');

const router = express.Router();

// User management
router.get('/users', authenticateAdmin, getUsers);
router.put('/users/:id/approve', authenticateAdmin, approveUser);
router.delete('/users/:id/reject', authenticateAdmin, rejectUser);
router.put('/users/:id/freeze', authenticateAdmin, toggleFreezeUser);
router.put('/users/:id/balance', authenticateAdmin, updateUserBalance);

// Transaction management
router.get('/transactions/all', authenticateAdmin, getAllTransactions);
router.post('/transactions/create', authenticateAdmin, createTransaction);
router.put('/transactions/:id/approve', authenticateAdmin, approveTransaction);
router.put('/transactions/:id/reject', authenticateAdmin, rejectTransaction);

// Loan management
router.get('/loans/pending', authenticateAdmin, getPendingLoans);
router.put('/loans/:id/approve', authenticateAdmin, approveLoan);
router.put('/loans/:id/reject', authenticateAdmin, rejectLoan);

// Support management
router.get('/support-tickets', authenticateAdmin, getSupportTickets);
router.get('/support-tickets/:id', authenticateAdmin, getSupportTicket);
router.get('/support-tickets/:id/conversation', authenticateAdmin, getTicketConversation); // USE IMPORTED FUNCTION
router.put('/support-tickets/:id/respond', authenticateAdmin, respondToTicket);

// Activities
router.get('/activities', authenticateAdmin, getActivities);

module.exports = router;