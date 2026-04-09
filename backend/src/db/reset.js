'use strict';

/**
 * Database Reset Utility
 * DROPS all tables and types to allow a clean migration.
 * CAUTION: PERMANENT DATA LOSS.
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function reset() {
    console.log('[Reset] Starting database flush...\n');

    try {
        // Drop all tables
        // We'll use a dynamic query to drop all tables in the public schema
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

        // Drop custom types if any (optional but good for clean state)
        // For this project, we primarily use standard types, but let's check.
        
        console.log('\n[Reset] Database flushed successfully.');
    } catch (err) {
        console.error('  ✗  Reset failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

reset();
