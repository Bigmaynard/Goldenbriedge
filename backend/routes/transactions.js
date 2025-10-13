const express = require('express');
const {
  getUserTransactions,
  getRecentTransactions,
  createTransaction,
  verifyOTP,
  getTransactionReceipt,
  getTransactionSummary
} = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getUserTransactions);
router.get('/recent', authenticateToken, getRecentTransactions);
router.get('/summary', authenticateToken, getTransactionSummary);
router.get('/:id/receipt', authenticateToken, getTransactionReceipt);
router.post('/', authenticateToken, createTransaction);
router.post('/:id/verify-otp', authenticateToken, verifyOTP);

module.exports = router;