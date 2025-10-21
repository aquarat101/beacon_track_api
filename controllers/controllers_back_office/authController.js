// --- controllers/controllers_back_office/authController.js ---
const { db } = require('../../firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersCollection = db.collection('back_office_users');

const findUserByEmail = async (email) => {
    const q = await usersCollection.where('email', '==', email).limit(1).get();
    if (q.empty) return null;
    const doc = q.docs[0];
    return { id: doc.id, ...doc.data() };
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const existing = await findUserByEmail(email.toLowerCase());
        if (existing) return res.status(400).json({ message: 'Email already in use' });

        const passwordHash = await bcrypt.hash(password, 10);

        const newUserRef = await usersCollection.add({
            name: name || '',
            email: email.toLowerCase(),
            passwordHash,
            createdAt: new Date().toISOString(),
        });

        const userDoc = await newUserRef.get();
        const user = { id: newUserRef.id, ...userDoc.data() };
        delete user.passwordHash;

        res.status(201).json({ message: 'User created', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

        const user = await findUserByEmail(email.toLowerCase());
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.passwordHash || '');
        if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

        const payload = { uid: user.id, email: user.email };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        delete user.passwordHash;

        res.json({ message: 'Logged in', token, user: { id: user.id, ...user } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login };
