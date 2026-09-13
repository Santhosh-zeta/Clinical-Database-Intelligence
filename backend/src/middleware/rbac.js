'use strict';

const db = require('../config/db');

const requirePermission = (permissionCode) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    const userPerms = req.user.permissions || [];
    const role = (req.user.role || '').toLowerCase();

    if (userPerms.includes('*') || userPerms.includes(permissionCode)) {
        return next();
    }

    if (['admin', 'ultra_admin', 'hospital_admin', 'super admin'].includes(role)) {
        return next();
    }

    if (role === 'doctor' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'VIEW_ALERTS'].includes(permissionCode)) return next();
    if (role === 'nurse' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'VIEW_ALERTS'].includes(permissionCode)) return next();

    return res.status(403).json({ error: `Access denied. Required permission: ${permissionCode}` });
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });

    const userRole = (req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (normalizedRoles.includes(userRole) || (userRole.includes('admin') && normalizedRoles.some(r => r.includes('admin')))) {
        return next();
    }

    return res.status(403).json({ error: `Access denied. Required role(s): ${roles.join(', ')}` });
};

module.exports = { requirePermission, requireRole };
