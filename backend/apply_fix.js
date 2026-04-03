'use strict';
require('dotenv').config();
const { readFileSync } = require('fs');
const path = require('path');
const { pool } = require('./src/config/db');

async function apply() {
    const filePath = path.join(__dirname, 'src', 'db', 'functions', '003_icu_escalation.sql');
    const sql = readFileSync(filePath, 'utf8');
    console.log(`Applying: ${filePath}`);
    try {
        await pool.query(sql);
        console.log('✓ Successfully re-applied ICU escalation function.');
    } catch (err) {
        console.error('✗ Failed to apply fix:');
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

apply();
