'use strict';

const { Server } = require('socket.io');
const { pool } = require('../config/db');

let io;

function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: ['https://intellicare.dropwinggroups.com', 'http://localhost:3000'],
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[Realtime] Socket connected: ${socket.id}`);

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

async function setupPostgresListeners() {
    try {
        const client = await pool.connect();
        await client.query('LISTEN clinical_alerts');
        await client.query('LISTEN clinical_notifications');
        console.log('[Realtime] Listening for PostgreSQL: clinical_alerts, clinical_notifications');

        client.on('notification', (msg) => {
            try {
                const payload = JSON.parse(msg.payload);
                const room = `org_${payload.organization_id}`;

                if (msg.channel === 'clinical_alerts') {
                    io.to(room).emit('new-alert', payload);
                } else if (msg.channel === 'clinical_notifications') {
                    io.to(room).emit('new-notification', payload);
                }
            } catch (e) {
                console.error('[Realtime] Failed to parse PG notification payload:', e);
            }
        });

        client.on('error', (err) => {
            console.error('[Realtime] PG listener client error:', err);

        });

    } catch (err) {
        console.error('[Realtime] Failed to setup PG listeners:', err);
    }
}

function sendNotification(orgId, event, data) {
    if (io) {
        const room = `org_${orgId}`;
        io.to(room).emit(event, data);
    }
}

module.exports = { init, sendNotification };
