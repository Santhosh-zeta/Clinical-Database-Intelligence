'use strict';

const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    const entry = {
        ts: new Date().toISOString(),
        rid: req.requestId,
        level: 'error',
        method: req.method,
        path: req.path,
        status,
        message: err.message || 'Internal Server Error',
    };
    process.stderr.write(JSON.stringify(entry) + '\n');

    res.status(status).json({
        error: err.message || 'Internal Server Error',
        request_id: req.requestId,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const createError = (message, statusCode = 500) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { errorHandler, createError };
