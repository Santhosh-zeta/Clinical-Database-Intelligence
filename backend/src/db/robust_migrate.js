'use strict';
require('dotenv').config();
const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
    console.log('[Migrate] Starting database migration (Robust Version)...\n');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    const DIRS = [
        path.join(__dirname, 'migrations'),
        path.join(__dirname, 'functions'),
    ];

    for (const dir of DIRS) {
        const dirLabel = path.basename(dir);
        const files = readdirSync(dir)
            .filter((f) => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const check = await pool.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]
            );

            const isFunction = dirLabel === 'functions';
            if (check.rowCount && !isFunction) {
                console.log(`  ⏭  Skipped: ${file}`);
                continue;
            }

            const filePath = path.join(dir, file);
            const sql = readFileSync(filePath, 'utf8');
            console.log(`  ▶  Applying: ${file}`);

            try {
                // Try applying the whole file first
                await pool.query(sql);
                await pool.query(
                    'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                    [file]
                );
                console.log(`  ✓  Done: ${file}`);
            } catch (err) {
                // If it fails with transaction error or relation already exists, try splitting if appropriate
                // or just skip if it's "already exists"
                if (err.code === '42P07' || err.code === '42710') {
                    console.log(`     ⚠  Warning: ${err.message} (Recording as applied anyway)`);
                    await pool.query(
                        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                        [file]
                    );
                } else if (err.message.includes('transaction block')) {
                    console.log(`     ▶  Retrying by splitting statements...`);
                    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
                    for (const s of statements) {
                        try {
                            await pool.query(s);
                        } catch (subErr) {
                            if (subErr.code === '42P07' || subErr.code === '42710') continue;
                            throw subErr;
                        }
                    }
                    await pool.query(
                        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
                        [file]
                    );
                    console.log(`  ✓  Done (via split): ${file}`);
                } else {
                    console.error(`  ✗  Failed: ${file}`);
                    console.error(`     Error: ${err.message}`);
                    process.exit(1);
                }
            }
        }
    }

    console.log('\n[Migrate] All migrations applied successfully.');
    await pool.end();
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
