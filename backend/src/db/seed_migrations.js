'use strict';

require('dotenv').config();
const { pool } = require('../config/db');
const fs   = require('fs');
const path = require('path');

async function seed() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename   VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    const migDir = path.join(__dirname, 'migrations');
    const files  = fs.readdirSync(migDir)
        .filter(f => f.endsWith('.sql') && /^0/.test(f))
        .sort();

    for (const f of files) {
        await pool.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
            [f]
        );
        console.log('  ✓ Seeded:', f);
    }

    console.log('\n[Bootstrap] Done. Old migrations marked as applied. Now run: npm run migrate');
    await pool.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });
