'use strict';

/**
 * Migration runner — idempotent with applied-file tracking.
 * Tracks which files have been applied in a `schema_migrations` table.
 * Re-running is safe: already-applied files are skipped.
 *
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

    // Create tracking table if not exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    for (const dir of DIRS) {
        const dirLabel = path.basename(dir);
        const files = readdirSync(dir)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            // Check if already applied
            const check = await pool.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]
            );

            // Functions always re-apply (CREATE OR REPLACE is idempotent)
            const isFunction = dirLabel === 'functions';

            if (check.rowCount && !isFunction) {
                console.log(`  ⏭  Skipped (already applied): ${file}`);
                continue;
            }

            const filePath = path.join(dir, file);
            const sqlContent = readFileSync(filePath, 'utf8');
            console.log(`  ▶  Applying: ${path.relative(process.cwd(), filePath)}`);
            
            try {
                // Determine if we should split by semicolon.
                // Naive split breaks PL/pgSQL functions (which have ; inside $$ blocks)
                // If it's a function or trigger file, run it as a single block.
                const shouldSplit = !isFunction && 
                                   !sqlContent.includes('CREATE OR REPLACE FUNCTION') &&
                                   !sqlContent.includes('CREATE TRIGGER');

                if (shouldSplit) {
                    const statements = sqlContent
                        .split(';')
                        .map(s => s.trim())
                        .filter(s => s.length > 0);

                    for (const sql of statements) {
                        try {
                            await pool.query(sql);
                        } catch (err) {
                            if (err.code === '42P07' || err.code === '42710') {
                                console.log(`     (Skipped existing relation: ${err.message.split('"')[1] || 'unknown'})`);
                                continue;
                            }
                            throw err;
                        }
                    }
                } else {
                    // Execute entire file as one statement
                    await pool.query(sqlContent);
                }

                // Record migration as applied
                await pool.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                    [file]
                );
                console.log(`  ✓  Done: ${file}\n`);
            } catch (err) {
                console.error(`  ✗  Failed: ${file}`);
                console.error(`     ${err.message}\n`);
                await pool.end();
                process.exit(1);
            }
        }
    }

    console.log('[Migrate] All migrations applied successfully.');
    await pool.end();
}

run();
