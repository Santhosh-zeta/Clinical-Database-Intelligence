'use strict';

const db = require('../config/db');

async function getInvoice(admissionId, orgId) {
    let invoice = await db.query(
        'SELECT * FROM billing_invoices WHERE admission_id = $1 AND organization_id = $2',
        [admissionId, orgId]
    );

    if (!invoice.rowCount) {
        // Create draft invoice if none exists
        invoice = await db.query(
            `INSERT INTO billing_invoices (admission_id, organization_id, status)
             VALUES ($1, $2, 'draft') RETURNING *`,
            [admissionId, orgId]
        );
    }

    const items = await db.query(
        'SELECT * FROM billing_items WHERE invoice_id = $1 ORDER BY recorded_at DESC',
        [invoice.rows[0].id]
    );

    return { ...invoice.rows[0], items: items.rows };
}

async function addItem(invoiceId, orgId, { item_type, item_name, unit_price, quantity = 1 }) {
    const total_price = unit_price * quantity;
    const result = await db.query(
        `INSERT INTO billing_items (invoice_id, item_type, item_name, unit_price, quantity, total_price)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [invoiceId, item_type, item_name, unit_price, quantity, total_price]
    );

    // Update invoice total
    await db.query(
        `UPDATE billing_invoices 
         SET total_amount = (SELECT SUM(total_price) FROM billing_items WHERE invoice_id = $1)
         WHERE id = $1`,
        [invoiceId]
    );

    return result.rows[0];
}

async function payInvoice(admissionId, orgId) {
    const result = await db.query(
        `UPDATE billing_invoices 
         SET status = 'paid', issued_at = NOW()
         WHERE admission_id = $1 AND organization_id = $2 RETURNING *`,
        [admissionId, orgId]
    );
    return result.rows[0];
}

module.exports = { getInvoice, addItem, payInvoice };
