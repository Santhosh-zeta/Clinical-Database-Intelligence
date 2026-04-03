'use strict';

/**
 * Tenancy middleware.
 * Reads the organization_id from the authenticated JWT (req.user)
 * and attaches it to req.orgId for use in all services.
 *
 * Must be applied AFTER the authenticate middleware.
 *
 * Usage in server.js:
 *   app.use('/api/patients', authenticate, tenancy, patientRoutes);
 */
const tenancy = (req, res, next) => {
    req.orgId = req.user?.org_id ?? 1;  // Default to org 1 for backward compat
    next();
};

module.exports = { tenancy };
