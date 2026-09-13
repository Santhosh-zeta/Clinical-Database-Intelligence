'use strict';

const { randomUUID } = require('crypto');

// Attach a unique request ID to every request; emit structured JSON log on completion.
function requestLogger(req, res, next) {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);

    const started = Date.now();

    res.on('finish', () => {
        const entry = {
            ts: new Date().toISOString(),
            rid: req.requestId,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            ms: Date.now() - started,
            org: req.user?.org_id ?? null,
            uid: req.user?.id ?? null,
            ip: req.ip,
        };
        // Single JSON line per request — parseable by any log aggregator
        process.stdout.write(JSON.stringify(entry) + '\n');
    });

    next();
}

module.exports = { requestLogger };
