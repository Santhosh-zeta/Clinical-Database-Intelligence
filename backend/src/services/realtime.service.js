'use strict';

const { Server } = require('socket.io');
const { pool } = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

let io;
const RECONNECT_DELAY_MS = 5000;

function init(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
            methods: ['GET', 'POST']
        }
    });

    io.use((socket, next) => {
        // Authenticate socket connections using the same JWT
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.data.user = decoded;
            next();
        } catch {
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const user = socket.data.user;
        const metrics = io.httpServer?._events?.request?.locals?.metrics;

        if (metrics) metrics.ws_connections++;

        // Join org room using org_id from the verified JWT, not client input
        const room = `org_${user.org_id}`;
        socket.join(room);
        console.log(`[Realtime] Socket ${socket.id} connected: user=${user.id} room=${room}`);

        socket.on('disconnect', () => {
            if (metrics) metrics.ws_connections = Math.max(0, metrics.ws_connections - 1);
            console.log(`[Realtime] Socket disconnected: ${socket.id}`);
        });
    });

    connectPgListener();
}

async function connectPgListener() {
    try {
        const client = await pool.connect();
        await client.query('LISTEN clinical_alerts');
        await client.query('LISTEN clinical_notifications');
        console.log('[Realtime] PG LISTEN active: clinical_alerts, clinical_notifications');

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
                console.error('[Realtime] Failed to parse PG notification payload:', e.message);
            }
        });

        client.on('error', (err) => {
            console.error('[Realtime] PG listener error — reconnecting in', RECONNECT_DELAY_MS / 1000, 's:', err.message);
            client.release();
            setTimeout(connectPgListener, RECONNECT_DELAY_MS);
        });

        // Handle unexpected disconnection
        client.connection?.on('end', () => {
            console.warn('[Realtime] PG listener connection ended — reconnecting in', RECONNECT_DELAY_MS / 1000, 's');
            setTimeout(connectPgListener, RECONNECT_DELAY_MS);
        });

    } catch (err) {
        console.error('[Realtime] Failed to set up PG listeners:', err.message, '— retrying in', RECONNECT_DELAY_MS / 1000, 's');
        setTimeout(connectPgListener, RECONNECT_DELAY_MS);
    }
}

function sendNotification(orgId, event, data) {
    if (io) {
        io.to(`org_${orgId}`).emit(event, data);
    }
}

module.exports = { init, sendNotification };
