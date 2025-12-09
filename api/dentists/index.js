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
            const result = await pool.query('SELECT * FROM dentists');
            res.status(200).json(result.rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else if (req.method === 'POST') {
        const { id, name, specialty } = req.body;
        try {
            await pool.query(
                'INSERT INTO dentists (id, name, specialty) VALUES ($1, $2, $3)',
                [id, name, specialty]
            );
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
