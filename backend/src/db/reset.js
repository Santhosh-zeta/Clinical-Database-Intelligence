'use strict';

require('dotenv').config();
const { pool } = require('../config/db');

async function reset() {
    console.log('[Reset] Starting database flush...\n');

    try {

        const tablesResult = await pool.query(`
            SELECT tablename FROM pg_catalog.pg_tables
            WHERE schemaname = 'public'
        `);

        if (tablesResult.rowCount > 0) {
            console.log(`  ▶  Found ${tablesResult.rowCount} tables. Dropping...`);
            for (const row of tablesResult.rows) {
                await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
                console.log(`  ✓  Dropped: ${row.tablename}`);
            }
        } else {
            console.log('  ▶  No tables found.');
        }

        console.log('\n[Reset] Database flushed successfully.');
    } catch (err) {
        console.error('  ✗  Reset failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

reset();
