'use strict';

/**
 * Migration runner.
 * Applies all SQL files in migrations/ then functions/ in alphabetical order.
 * Run with: node src/db/migrate.js
 */

require('dotenv').config();
const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const DIRS = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, 'functions'),
];

async function run() {
    console.log('[Migrate] Starting database migration...\n');

    for (const dir of DIRS) {
        const files = readdirSync(dir)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const filePath = path.join(dir, file);
            const sql = readFileSync(filePath, 'utf8');
            console.log(`  ▶ Applying: ${path.relative(process.cwd(), filePath)}`);
            try {
                await pool.query(sql);
                console.log(`  ✓ Done: ${file}\n`);
            } catch (err) {
                console.error(`  ✗ Failed: ${file}`);
                console.error(`    ${err.message}\n`);
                await pool.end();
                process.exit(1);
            }
        }
    }

    console.log('[Migrate] All migrations applied successfully.');
    await pool.end();
}

run();
