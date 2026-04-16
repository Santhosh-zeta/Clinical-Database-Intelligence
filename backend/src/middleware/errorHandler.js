'use strict';

const errorHandler = (err, req, res, next) => {
    const status = err.statusCode || err.status || 500;
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message || err);

    res.status(status).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

const createError = (message, statusCode = 500) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};

module.exports = { errorHandler, createError };
