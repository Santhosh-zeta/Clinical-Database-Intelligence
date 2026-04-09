
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
});

async function test() {
    try {
        console.log('Testing connection to:', process.env.DATABASE_URL);
        const res = await pool.query('SELECT NOW()');
        console.log('Connection successful!', res.rows[0]);
    } catch (err) {
        console.error('Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

test();
