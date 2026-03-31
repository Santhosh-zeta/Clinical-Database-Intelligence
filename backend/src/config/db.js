'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL / TimescaleDB');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error', err);
});

/**
 * Execute a query on the pool.
 * @param {string} text  SQL query
 * @param {Array}  params Parameterized values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
