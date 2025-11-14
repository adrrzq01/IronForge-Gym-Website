const db = require('../database/init');
let Parser = null;
try {
    // Try to load json2csv if available. In some dev environments npm install may be skipped,
    // so provide a lightweight fallback CSV generator so the server can still start and
    // return CSVs in a reasonable format.
    ({ Parser } = require('json2csv'));
} catch (e) {
    console.warn('json2csv not available: using fallback CSV generator');
    Parser = null;
}

function fallbackToCsv(rows) {
    if (!rows || rows.length === 0) return '';
    const keys = Object.keys(rows[0]);
    const escape = (val) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        // If contains quote, comma or newline, wrap in quotes and escape existing quotes
        if (/[",\n]/.test(s)) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    };
    const header = keys.join(',');
    const body = rows.map(r => keys.map(k => escape(r[k])).join(',')).join('\n');
    return header + '\n' + body;
}

const exportPayments = (req, res) => {
    const { format = 'json' } = req.query;
    db.all('SELECT p.*, m.name as member_name FROM payments p JOIN members m ON p.member_id = m.id ORDER BY p.payment_date DESC LIMIT 1000', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (format === 'csv') {
                try {
                    let csv;
                    if (Parser) {
                        const parser = new Parser();
                        csv = parser.parse(rows);
                    } else {
                        csv = fallbackToCsv(rows);
                    }
                    res.header('Content-Type', 'text/csv');
                    return res.send(csv);
                } catch (e) {
                    return res.status(500).json({ message: 'CSV generation error' });
                }
            }
        res.json({ payments: rows });
    });
};

const exportMembers = (req, res) => {
    const { format = 'json' } = req.query;
    db.all('SELECT id, name, email, phone, plan_id, is_active, created_at FROM members ORDER BY created_at DESC LIMIT 1000', [], (err, rows) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (format === 'csv') {
            try {
                let csv;
                if (Parser) {
                    const parser = new Parser();
                    csv = parser.parse(rows);
                } else {
                    csv = fallbackToCsv(rows);
                }
                res.header('Content-Type', 'text/csv');
                return res.send(csv);
            } catch (e) {
                return res.status(500).json({ message: 'CSV generation error' });
            }
        }
        res.json({ members: rows });
    });
};

module.exports = { exportPayments, exportMembers };
