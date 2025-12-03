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
        const { name, specialty } = req.body;
        try {
            await pool.query(
                'UPDATE dentists SET name = $1, specialty = $2 WHERE id = $3',
                [name, specialty, id]
            );
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else if (req.method === 'DELETE') {
        try {
            await pool.query('DELETE FROM dentists WHERE id = $1', [id]);
            res.status(200).json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
