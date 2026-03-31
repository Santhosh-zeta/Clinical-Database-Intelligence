'use strict';

/**
 * Role-based access control middleware.
 * Usage: router.get('/admin-only', requireRole('admin'), handler)
 * req.user must already be set by authenticate middleware.
 *
 * @param {...string} roles  Allowed roles
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            error: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    }
    next();
};

module.exports = { requireRole };
