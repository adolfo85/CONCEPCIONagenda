import { getPool, headers } from './db.js';

export async function handler(event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const pool = getPool();

    if (event.httpMethod === 'GET') {
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
                    installationDebit: parseFloat(p.installation_debit || 0),
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

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(patientsWithRecords)
            };
        } catch (err) {
            console.error(err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    } else if (event.httpMethod === 'POST') {
        const { id, dentistId, name, phone, email, startDate, installationTotal, installationDebit } = JSON.parse(event.body);
        try {
            await pool.query(
                'INSERT INTO patients (id, dentist_id, name, phone, email, start_date, installation_total, installation_debit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [id, dentistId, name, phone, email, startDate, installationTotal || 0, installationDebit || 0]
            );
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    } else if (event.httpMethod === 'PUT') {
        const { name, phone, email, installationTotal, installationDebit, records } = JSON.parse(event.body);
        const patientId = event.path.split('/').pop();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update patient info
            await client.query(
                'UPDATE patients SET name = $1, phone = $2, email = $3, installation_total = $4, installation_debit = $5 WHERE id = $6',
                [name, phone, email, installationTotal || 0, installationDebit || 0, patientId]
            );

            // Replace records
            await client.query('DELETE FROM clinical_records WHERE patient_id = $1', [patientId]);

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
                            r.id, patientId, r.date,
                            r.upperArch, r.lowerArch, r.upperMonths, r.lowerMonths, r.monthsActive,
                            r.serviceType, JSON.stringify(r.toothNumbers), JSON.stringify(r.toothSurfaces), JSON.stringify(r.toothDetails),
                            r.notes, r.paymentAmount, r.installationPayment, r.isInstallation
                        ]
                    );
                }
            }

            await client.query('COMMIT');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(err);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        } finally {
            client.release();
        }
    } else if (event.httpMethod === 'DELETE') {
        const patientId = event.path.split('/').pop();
        try {
            await pool.query('DELETE FROM patients WHERE id = $1', [patientId]);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true })
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
}
