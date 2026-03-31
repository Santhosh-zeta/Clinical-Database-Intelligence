'use strict';

/**
 * Centralized error handler.
 * Pass errors via next(err) from any route or middleware.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message || err);

    res.status(status).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * Helper to create HTTP errors conveniently.
 * @param {string} message
 * @param {number} statusCode
 */
const createError = (message, statusCode = 500) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { errorHandler, createError };
