const { Pool } = require('pg');
require('dotenv').config();

// ✅ FIXED: Use let instead of const so we can reassign in production
let pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
}

module.exports = { pool };