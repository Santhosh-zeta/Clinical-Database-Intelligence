'use strict';

const { Server } = require('socket.io');
const { pool } = require('../config/db');

let io;

/**
 * Initializes the Socket.io server and PostgreSQL listeners.
 * @param {import('http').Server} httpServer 
 */
function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Realtime] Socket connected: ${socket.id}`);

        // Rooms are based on organization ID to ensure multi-tenant isolation
        socket.on('join-org', (orgId) => {
            if (!orgId) return;
            const room = `org_${orgId}`;
            socket.join(room);
            console.log(`[Realtime] Socket ${socket.id} joined room: ${room}`);
        });

        socket.on('disconnect', () => {
            console.log(`[Realtime] Socket disconnected: ${socket.id}`);
        });
    });


    setupPostgresListeners();
}

/**
 * Connects to PostgreSQL using a dedicated client for LISTEN/NOTIFY.
 */
async function setupPostgresListeners() {
    try {
        const client = await pool.connect();
        await client.query('LISTEN clinical_alerts');
        console.log('[Realtime] Listening for PostgreSQL notifications: clinical_alerts');

        client.on('notification', (msg) => {
            if (msg.channel === 'clinical_alerts') {
                try {
                    const payload = JSON.parse(msg.payload);
                    const room = `org_${payload.organization_id}`;
                    
                    console.log(`[Realtime] Alert received for Org ${payload.organization_id}: ${payload.message}`);
                    

                    io.to(room).emit('new-alert', payload);
                    

                    io.to('org_admin').emit('new-alert', payload);
                } catch (e) {
                    console.error('[Realtime] Failed to parse PG notification payload:', e);
                }
            }
        });

        client.on('error', (err) => {
            console.error('[Realtime] PG listener client error:', err);

        });

    } catch (err) {
        console.error('[Realtime] Failed to setup PG listeners:', err);
    }
}

module.exports = { init };
