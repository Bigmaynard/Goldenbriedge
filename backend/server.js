require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg'); // Move Pool import here

const app = express();
const PORT = process.env.PORT || 3006;

// ✅ CORRECT Database Configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.set('trust proxy', 1);

// ✅ PROPER CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://127.0.0.1:5500',
      'http://localhost:3006',
      'http://localhost:5500',
      'https://goldenbriedge.netlify.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Add this test route before your other routes
app.get('/debug-password', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const testPassword = 'admin123';
    const storedHash = '$2a$10$8K1p/a0dRL1SzdiKJ.3ZJ.6O.7b2p6c8q2QkZc8b5nY9vV1mX6OaK';
    
    const isMatch = await bcrypt.compare(testPassword, storedHash);
    
    res.json({
      test_password: testPassword,
      stored_hash: storedHash,
      bcrypt_match: isMatch,
      message: isMatch ? '✅ Password should work!' : '❌ Password comparison failed',
      bcrypt_version: 'using bcryptjs'
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'GoldenBridge Bank API is running!',
    api_documentation: 'Use /api endpoints to access banking services'
  });
});

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/transactions/support', require('./routes/support'));
app.use('/api/support', require('./routes/support'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Bank API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const client = await pool.connect();
    console.log('Database connected successfully');
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
});