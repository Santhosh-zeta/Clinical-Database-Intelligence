'use strict';

const db = require('../config/db');

/**
 * Permission-based RBAC middleware.
 *
 * Checks the user_roles + role_permissions tables to verify the
 * authenticated user holds the required permission within their org.
 *
 * Usage:
 *   router.put('/discharge', requirePermission('DISCHARGE_PATIENT'), controller.discharge);
 *
 * @param {string} permissionCode  The permission code from the permissions table
 */
const requirePermission = (permissionCode) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthenticated' });
    }

    try {
        const result = await db.query(
            `SELECT 1
             FROM user_roles ur
             JOIN role_permissions rp ON rp.role_id    = ur.role_id
             JOIN permissions p       ON p.id          = rp.permission_id
             WHERE ur.doctor_id = $1
               AND p.code       = $2
               AND ur.org_id    = $3
             LIMIT 1`,
            [req.user.id, permissionCode, req.orgId || req.user.org_id || 1]
        );

        if (!result.rowCount) {
            return res.status(403).json({
                error: `Access denied. Required permission: ${permissionCode}`,
            });
        }
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * Legacy role name check (kept for backward compatibility during transition).
 * Prefer requirePermission() for new routes.
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            error: `Access denied. Required role(s): ${roles.join(', ')}`,
        });
    }
    next();
};

module.exports = { requirePermission, requireRole };
