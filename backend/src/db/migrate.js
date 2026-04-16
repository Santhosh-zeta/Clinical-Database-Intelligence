'use strict';

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

            const check = await pool.query(
                'SELECT 1 FROM schema_migrations WHERE filename = $1', [file]
            );

            const isFunction = dirLabel === 'functions';

            if (check.rowCount && !isFunction) {
                console.log(`  ⏭  Skipped (already applied): ${file}`);
                continue;
            }

            const filePath = path.join(dir, file);
            const sqlContent = readFileSync(filePath, 'utf8');
            console.log(`  ▶  Applying: ${path.relative(process.cwd(), filePath)}`);

            try {

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

                    await pool.query(sqlContent);
                }

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
