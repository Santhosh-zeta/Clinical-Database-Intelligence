'use strict';

process.env.JWT_SECRET = 'test_secret_for_unit_tests';

const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

function mockReq(token) {
    return { headers: { authorization: token ? `Bearer ${token}` : undefined } };
}
function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('authenticate middleware', () => {
    const payload = { id: 1, role: 'doctor', org_id: 1 };

    test('valid token → sets req.user and calls next', () => {
        const token = jwt.sign(payload, 'test_secret_for_unit_tests');
        const req = mockReq(token);
        const res = mockRes();
        const next = jest.fn();
        authenticate(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(req.user.id).toBe(1);
    });

    test('missing token → 401', () => {
        const req = mockReq(null);
        const res = mockRes();
        authenticate(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('invalid token → 401', () => {
        const req = mockReq('bad.token.here');
        const res = mockRes();
        authenticate(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('expired token → 401', () => {
        const token = jwt.sign(payload, 'test_secret_for_unit_tests', { expiresIn: '-1s' });
        const req = mockReq(token);
        const res = mockRes();
        authenticate(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });
});
