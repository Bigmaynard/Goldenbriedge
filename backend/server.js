require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3006;
if (process.env.NODE_ENV === 'production') {
  const { Pool } = require('pg');
  // Override the pool with SSL configuration
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // This is REQUIRED for Render PostgreSQL
    }
  });
}
// ✅ PROPER CORS Configuration for Development & Production
const corsOptions = {
  origin: function (origin, callback) {
    // List of allowed origins
    const allowedOrigins = [
      'http://127.0.0.1:5500',      // Local development (Live Server)
      'http://localhost:3006',      // Local React/Vue development
      'http://localhost:5500',      // Alternative local port
      process.env.FRONTEND_URL      // Your production frontend URL
    ].filter(Boolean); // Remove any undefined values
    
    // Allow requests with no origin (like mobile apps, Postman)
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

// ... rest of your code remains the same

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

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