import { getPool, headers } from './db.js';

export async function handler(event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const pool = getPool();

    if (event.httpMethod === 'GET') {
        try {
            const result = await pool.query('SELECT * FROM dentists');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.rows)
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    } else if (event.httpMethod === 'POST') {
        const { id, name, specialty } = JSON.parse(event.body);
        try {
            await pool.query(
                'INSERT INTO dentists (id, name, specialty) VALUES ($1, $2, $3)',
                [id, name, specialty]
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
        const { id, name, specialty } = JSON.parse(event.body);
        const dentistId = event.path.split('/').pop();
        try {
            await pool.query(
                'UPDATE dentists SET name = $1, specialty = $2 WHERE id = $3',
                [name, specialty, dentistId]
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
        const dentistId = event.path.split('/').pop();
        try {
            await pool.query('DELETE FROM dentists WHERE id = $1', [dentistId]);
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
