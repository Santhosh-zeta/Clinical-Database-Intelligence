'use strict';

const db = require('../config/db');

async function getInvoice(admissionId, orgId) {
    let invoice = await db.query(
        'SELECT * FROM billing_invoices WHERE admission_id = $1 AND organization_id = $2',
        [admissionId, orgId]
    );

    if (!invoice.rowCount) {

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

async function generateInvoice(admissionId, orgId) {
    const { rows: [adm] } = await db.query(`
        SELECT a.*, w.base_price_per_day, w.name as ward_name
        FROM admissions a
        JOIN beds b ON b.id = a.bed_id
        JOIN wards w ON w.id = b.ward_id
        WHERE a.id = $1 AND a.organization_id = $2
    `, [admissionId, orgId]);

    if (!adm) throw new Error('Admission not found');

    const inv = await getInvoice(admissionId, orgId);
    const invoiceId = inv.id;


    const stayEnd = adm.discharged_at || new Date();
    const days = Math.max(1, Math.ceil((new Date(stayEnd) - new Date(adm.admitted_at)) / (1000 * 60 * 60 * 24)));
    await addItem(invoiceId, orgId, {
        item_type: 'accommodation',
        item_name: `Room Charge - ${adm.ward_name} (${days} days)`,
        unit_price: adm.base_price_per_day,
        quantity: days
    });


    const labs = await db.query(`
        SELECT lo.*, lt.name as test_name, lt.base_price
        FROM lab_orders lo
        JOIN lab_tests lt ON lt.id = lo.test_id
        WHERE lo.admission_id = $1 AND lo.status = 'completed'
    `, [admissionId]);

    for (const lab of labs.rows) {
        await addItem(invoiceId, orgId, {
            item_type: 'laboratory',
            item_name: `Lab: ${lab.test_name}`,
            unit_price: lab.base_price || 50.00,
            quantity: 1
        });
    }


    const meds = await db.query(`
        SELECT p.*, m.name as med_name, m.price_per_unit
        FROM prescriptions p
        JOIN medications m ON m.id = p.medication_id
        WHERE p.admission_id = $1 AND p.status IN ('active', 'completed')
    `, [admissionId]);

    for (const med of meds.rows) {
        await addItem(invoiceId, orgId, {
            item_type: 'medication',
            item_name: `RX: ${med.med_name}`,
            unit_price: med.price_per_unit || 10.00,
            quantity: 1
        });
    }

    return getInvoice(admissionId, orgId);
}

module.exports = { getInvoice, addItem, payInvoice, generateInvoice };
