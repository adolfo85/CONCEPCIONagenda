import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Dentists ---

app.get('/api/dentists', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM dentists');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dentists', async (req, res) => {
    const { id, name, specialty } = req.body;
    try {
        await pool.query(
            'INSERT INTO dentists (id, name, specialty) VALUES ($1, $2, $3)',
            [id, name, specialty]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/dentists/:id', async (req, res) => {
    const { id } = req.params;
    const { name, specialty } = req.body;
    try {
        await pool.query(
            'UPDATE dentists SET name = $1, specialty = $2 WHERE id = $3',
            [name, specialty, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/dentists/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM dentists WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Patients ---

app.get('/api/patients', async (req, res) => {
    try {
        // Fetch patients
        const patientsResult = await pool.query('SELECT * FROM patients');
        const patients = patientsResult.rows;

        // Fetch all records (optimized: could be per patient, but for now fetch all)
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
                    .map(r => ({
                        id: r.id,
                        date: r.date,
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
                    }))
            };
        });

        res.json(patientsWithRecords);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/patients', async (req, res) => {
    const { id, dentistId, name, phone, email, startDate, installationTotal } = req.body;
    try {
        await pool.query(
            'INSERT INTO patients (id, dentist_id, name, phone, email, start_date, installation_total) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, dentistId, name, phone, email, startDate, installationTotal || 0]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, phone, email, installationTotal, records } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update patient info
        await client.query(
            'UPDATE patients SET name = $1, phone = $2, email = $3, installation_total = $4 WHERE id = $5',
            [name, phone, email, installationTotal || 0, id]
        );

        // Replace records (Delete all and insert new) - Simple strategy for consistency
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
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM patients WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Appointments ---

app.get('/api/appointments', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT a.*, p.name as patient_name 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
    `);

        const appointments = result.rows.map(r => ({
            id: r.id,
            dentistId: r.dentist_id,
            patientId: r.patient_id,
            patientName: r.patient_name,
            date: r.date, // Postgres might return Date object, might need formatting
            time: r.time, // Postgres returns '09:00:00'
            duration: r.duration
        }));

        // Format date/time if needed (simple approach)
        const formatted = appointments.map(a => ({
            ...a,
            date: new Date(a.date).toISOString().split('T')[0],
            time: a.time.substring(0, 5) // HH:mm
        }));

        res.json(formatted);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    const { id, dentistId, patientId, date, time, duration } = req.body;
    try {
        await pool.query(
            'INSERT INTO appointments (id, dentist_id, patient_id, date, time, duration) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, dentistId, patientId, date, time, duration]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM appointments WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Service Types ---

app.get('/api/service-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT name FROM service_types');
        res.json(result.rows.map(r => r.name));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/service-types', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.query('INSERT INTO service_types (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
