'use strict';

jest.mock('../config/db', () => ({ query: jest.fn() }));

const { requirePermission, requireRole } = require('../middleware/rbac');

function mockReq(user) { return { user }; }
function mockRes() {
    const r = {};
    r.status = jest.fn().mockReturnValue(r);
    r.json = jest.fn().mockReturnValue(r);
    return r;
}

describe('requirePermission', () => {
    test('user with exact permission passes', () => {
        const req = mockReq({ role: 'nurse', permissions: ['VIEW_VITALS'] });
        const next = jest.fn();
        requirePermission('VIEW_VITALS')(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('user with wildcard permission passes', () => {
        const req = mockReq({ role: 'admin', permissions: ['*'] });
        const next = jest.fn();
        requirePermission('ANYTHING')(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('user without permission gets 403', () => {
        const req = mockReq({ role: 'patient', permissions: [] });
        const res = mockRes();
        requirePermission('MANAGE_STAFF')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('unauthenticated user gets 401', () => {
        const req = { user: null };
        const res = mockRes();
        requirePermission('VIEW_PATIENT')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe('requireRole', () => {
    test('matching role passes', () => {
        const req = mockReq({ role: 'doctor', permissions: [] });
        const next = jest.fn();
        requireRole('doctor', 'nurse')(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('non-matching role gets 403', () => {
        const req = mockReq({ role: 'patient', permissions: [] });
        const res = mockRes();
        requireRole('doctor')(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('admin role passes when admin roles required (bug fix verification)', () => {
        const req = mockReq({ role: 'admin', permissions: [] });
        const next = jest.fn();
        requireRole('admin', 'hospital_admin')(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
