// --- FILE: middleware/authMiddleware.js ---
const jwt = require('jsonwebtoken');
const config = require('../config/config')

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });


    const parts = authHeader.split(' ');
    if (parts.length !== 2) return res.status(401).json({ message: 'Token error' });


    const scheme = parts[0];
    const token = parts[1];


    if (!/^Bearer$/i.test(scheme)) return res.status(401).json({ message: 'Malformed token' });


    jwt.verify(token, config.JWT_SECRET || 'secret', (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Invalid token' });
        req.user = decoded; // { uid, email }
        return next();
    });
}


module.exports = { verifyToken };

