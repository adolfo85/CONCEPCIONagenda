import { getPool } from '../db.js';

export default async function handler(req, res) {
    const pool = getPool();

    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            // Fetch patients
            const patientsResult = await pool.query('SELECT * FROM patients');
            const patients = patientsResult.rows;

            // Fetch all records
            const recordsResult = await pool.query('SELECT * FROM clinical_records ORDER BY date DESC');
            const records = recordsResult.rows;

            // Map records to patients
            const patientsWithRecords = patients.map(p => {
                return {
                    id: p.id,
                    dentistId: p.dentist_id,
                    name: p.name,
                    phone: p.phone,
                    email: p.email,
                    startDate: p.start_date,
                    installationTotal: parseFloat(p.installation_total || 0),
                    records: records
                        .filter(r => r.patient_id === p.id)
                        .map(r => {
                            // Format date as YYYY-MM-DD string
                            let dateStr = r.date;
                            if (r.date instanceof Date) {
                                dateStr = r.date.toISOString().split('T')[0];
                            } else if (typeof r.date === 'string' && r.date.includes('T')) {
                                dateStr = r.date.split('T')[0];
                            }

                            return {
                                id: r.id,
                                date: dateStr,
                                upperArch: r.upper_arch,
                                lowerArch: r.lower_arch,
                                upperMonths: r.upper_months ? parseFloat(r.upper_months) : undefined,
                                lowerMonths: r.lower_months ? parseFloat(r.lower_months) : undefined,
                                monthsActive: r.months_active ? parseFloat(r.months_active) : undefined,
                                serviceType: r.service_type,
                                toothNumbers: r.tooth_numbers,
                                toothSurfaces: r.tooth_surfaces,
                                toothDetails: r.tooth_details,
                                notes: r.notes,
                                paymentAmount: parseFloat(r.payment_amount || 0),
                                installationPayment: parseFloat(r.installation_payment || 0),
                                isInstallation: r.is_installation
                            };
                        })
                };
            });

            res.status(200).json(patientsWithRecords);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    } else if (req.method === 'POST') {
        const { id, dentistId, name, phone, email, startDate, installationTotal } = req.body;
        try {
            await pool.query(
                'INSERT INTO patients (id, dentist_id, name, phone, email, start_date, installation_total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [id, dentistId, name, phone, email, startDate, installationTotal || 0]
            );
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
