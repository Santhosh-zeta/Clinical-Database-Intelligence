'use strict';

require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
        process.env.DATABASE_URL = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:5432/${process.env.PGDATABASE}`;
    } else {
        console.error('[DB] FATAL ERROR: DATABASE_URL environment variable is missing.');
        console.error('Please ensure you have a .env file in the backend directory with DATABASE_URL.');
        process.exit(1);
    }
}

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
