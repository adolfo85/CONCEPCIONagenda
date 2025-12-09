import { getPool, headers } from './db.js';

export async function handler(event, context) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const pool = getPool();

    if (event.httpMethod === 'GET') {
        try {
            const result = await pool.query('SELECT name FROM service_types');
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(result.rows.map(r => r.name))
            };
        } catch (err) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: err.message })
            };
        }
    } else if (event.httpMethod === 'POST') {
        const { name } = JSON.parse(event.body);
        try {
            await pool.query('INSERT INTO service_types (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
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
