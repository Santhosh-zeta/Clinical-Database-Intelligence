'use strict';

const tenancy = (req, res, next) => {
    req.orgId = req.user?.org_id ?? 1;
    next();
};

module.exports = { tenancy };
