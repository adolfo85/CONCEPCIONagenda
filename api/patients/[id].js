import { getPool } from '../db.js';

export default async function handler(req, res) {
    const pool = getPool();
    const { id } = req.query;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'PUT') {
        const { name, phone, email, installationTotal, records } = req.body;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update patient info
            await client.query(
                'UPDATE patients SET name = $1, phone = $2, email = $3, installation_total = $4 WHERE id = $5',
                [name, phone, email, installationTotal || 0, id]
            );

            // Replace records
            await client.query('DELETE FROM clinical_records WHERE patient_id = $1', [id]);

            if (records && records.length > 0) {
                for (const r of records) {
                    await client.query(
                        `INSERT INTO clinical_records (
              id, patient_id, date, 
              upper_arch, lower_arch, upper_months, lower_months, months_active,
              service_type, tooth_numbers, tooth_surfaces, tooth_details,
              notes, payment_amount, installation_payment, is_installation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
                        [
                            r.id, id, r.date,
                            r.upperArch, r.lowerArch, r.upperMonths, r.lowerMonths, r.monthsActive,
                            r.serviceType, JSON.stringify(r.toothNumbers), JSON.stringify(r.toothSurfaces), JSON.stringify(r.toothDetails),
                            r.notes, r.paymentAmount, r.installationPayment, r.isInstallation
                        ]
                    );
                }
            }

            await client.query('COMMIT');
            res.status(200).json({ success: true });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            res.status(500).json({ error: err.message });
        } finally {
            client.release();
        }
    } else if (req.method === 'DELETE') {
        try {
            await pool.query('DELETE FROM patients WHERE id = $1', [id]);
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
