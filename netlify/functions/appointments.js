import { getPool, headers } from './db.js';

export async function handler(event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const pool = getPool();

    if (event.httpMethod === 'GET') {
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

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(formatted)
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    } else if (event.httpMethod === 'POST') {
        const { id, dentistId, patientId, date, time, duration } = JSON.parse(event.body);
        try {
            await pool.query(
                'INSERT INTO appointments (id, dentist_id, patient_id, date, time, duration) VALUES ($1, $2, $3, $4, $5, $6)',
                [id, dentistId, patientId, date, time, duration]
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
    } else if (event.httpMethod === 'DELETE') {
        const appointmentId = event.path.split('/').pop();
        try {
            await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
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
