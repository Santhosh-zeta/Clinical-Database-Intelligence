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
        // 1. Fast path: check JWT injected permissions
        if (req.user.permissions && Array.isArray(req.user.permissions) && req.user.permissions.length > 0) {
            if (req.user.permissions.includes(permissionCode)) {
                return next();
            }
        } 
        // 2. Fallback: Role-based heuristics if exact permission mapping is missing
        else {
            const role = req.user.role?.toLowerCase() || '';
            let fallbackGranted = false;
            
            if (role === 'admin' || role === 'ultra_admin' || role === 'hospital_admin') {
                fallbackGranted = true;
            } else if (role === 'doctor' && ['VIEW_PATIENT','VIEW_ALL_PATIENTS','PRESCRIBE_MEDICATION','VIEW_ALERTS','DISCHARGE_PATIENT'].includes(permissionCode)) {
                fallbackGranted = true;
            } else if (role === 'nurse' && ['VIEW_PATIENT','VIEW_ALL_PATIENTS','RECORD_VITALS','VIEW_ALERTS'].includes(permissionCode)) {
                fallbackGranted = true;
            } else if (role === 'patient' && ['VIEW_OWN_PATIENT'].includes(permissionCode)) {
                fallbackGranted = true;
            }
            
            if (fallbackGranted) {
                return next();
            }
        }

        return res.status(403).json({
            error: `Access denied. Required permission: ${permissionCode}`,
        });
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
