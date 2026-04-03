'use strict';

/**
 * generateAlert — Alert construction helper (JS layer)
 * Builds a standardized alert payload for insertion.
 * Called by services before persisting to DB.
 *
 * @param {object} opts
 * @returns {{ alert_type, severity, message, status, response_deadline }}
 */
function generateAlert({ admissionId, orgId, type, severity, message, cooldownMinutes = 15 }) {
    const severityMap = {
        critical: { responseMinutes: 5  },
        high:     { responseMinutes: 10 },
        medium:   { responseMinutes: 30 },
        low:      { responseMinutes: 60 },
    };

    const mins     = severityMap[severity]?.responseMinutes ?? 30;
    const deadline = new Date(Date.now() + mins * 60 * 1000).toISOString();

    return {
        admission_id:      admissionId,
        organization_id:   orgId,
        alert_type:        type,
        severity,
        message,
        status:            'active',
        response_deadline: deadline,
        cooldown_minutes:  cooldownMinutes,
    };
}

/**
 * Severity label helpers for frontend display
 */
const SEVERITY_LABELS = {
    critical: { color: '#ef4444', label: '🔴 Critical', priority: 1 },
    high:     { color: '#f97316', label: '🟠 High',     priority: 2 },
    medium:   { color: '#eab308', label: '🟡 Medium',   priority: 3 },
    low:      { color: '#22c55e', label: '🟢 Low',      priority: 4 },
};

function getSeverityMeta(severity) {
    return SEVERITY_LABELS[severity] ?? SEVERITY_LABELS.low;
}

module.exports = { generateAlert, getSeverityMeta, SEVERITY_LABELS };
