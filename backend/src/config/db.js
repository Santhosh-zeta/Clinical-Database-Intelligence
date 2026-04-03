'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: parseInt(process.env.DB_POOL_MAX  || '20'),
    min: parseInt(process.env.DB_POOL_MIN  || '5'),
    idleTimeoutMillis:      30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
    console.log('[DB] Client connected to PostgreSQL / TimescaleDB');
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error — process will exit', err.message);
    process.exit(-1);
});

const query     = (text, params) => pool.query(text, params);
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
