'use strict';

const db = require('../config/db');

/**
 * Permission-based RBAC middleware.
 */
const requirePermission = (permissionCode) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    const userPerms = req.user.permissions || [];
    const role = (req.user.role || '').toLowerCase();

    // Wildcard or exact permission
    if (userPerms.includes('*') || userPerms.includes(permissionCode)) {
        return next();
    }

    // Role-based fallbacks (case-insensitive for 'admin')
    if (['admin', 'ultra_admin', 'hospital_admin', 'super admin'].includes(role)) {
        return next();
    }

    // Contextual fallbacks
    if (role === 'doctor' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'VIEW_ALERTS'].includes(permissionCode)) return next();
    if (role === 'nurse' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'VIEW_ALERTS'].includes(permissionCode)) return next();

    return res.status(403).json({ error: `Access denied. Required permission: ${permissionCode}` });
};

/**
 * Legacy role name check.
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (normalizedRoles.includes(userRole) || normalizedRoles.includes('admin' && userRole.includes('admin'))) {
        return next();
    }

    return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
};

module.exports = { requirePermission, requireRole };
