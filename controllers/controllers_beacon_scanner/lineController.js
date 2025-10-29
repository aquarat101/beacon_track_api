// lineController.js
const fetch = require('node-fetch');

const notify = async (req, res) => {
    try {
        const { to, messages } = req.body;
        if (!to || !messages) return res.status(400).json({ success: false, message: 'to & messages required' });

        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!token) return res.status(500).json({ success: false, message: 'LINE token not configured' });

        const resp = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, messages })
        });

        const text = await resp.text();
        return res.status(200).json({ success: true, lineStatus: resp.status, body: text });
    } catch (e) {
        console.error('line notify error', e);
        return res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = { notify };
