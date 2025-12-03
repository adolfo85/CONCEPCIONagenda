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
                date: r.date,
                time: r.time,
                duration: r.duration
            }));

            // Format date/time
            const formatted = appointments.map(a => ({
                ...a,
                date: new Date(a.date).toISOString().split('T')[0],
                time: a.time.substring(0, 5) // HH:mm
            }));

            res.status(200).json(formatted);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else if (req.method === 'POST') {
        const { id, dentistId, patientId, date, time, duration } = req.body;
        try {
            await pool.query(
                'INSERT INTO appointments (id, dentist_id, patient_id, date, time, duration) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, dentistId, patientId, date, time, duration]
            );
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
