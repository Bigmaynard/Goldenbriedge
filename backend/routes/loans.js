const express = require('express');
const {
  applyForLoan,
  getUserLoans,
  getActiveLoans,
  verifyLoanOTP
} = require('../controllers/loanController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, getUserLoans);
router.get('/active', authenticateToken, getActiveLoans);
router.post('/apply', authenticateToken, applyForLoan);
router.post('/verify-otp', authenticateToken, verifyLoanOTP);

module.exports = router;