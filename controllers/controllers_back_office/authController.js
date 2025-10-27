// --- controllers/controllers_back_office/authController.js ---
const { db } = require('../../firebase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usersCollection = db.collection('school_users');

const findUserByEmail = async (email) => {
    const q = await usersCollection.where('email', '==', email).limit(1).get();
    if (q.empty) return null;
    const doc = q.docs[0];
    console.log(doc)
    return { id: doc.id, ...doc.data() };
};

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required' });

        const existing = await findUserByEmail(email.toLowerCase());
        if (existing)
            return res.status(400).json({ message: 'Email already in use' });

        const passwordHash = await bcrypt.hash(password, 10);

        const newUserRef = await usersCollection.add({
            name: name || '',
            email: email.toLowerCase(),
            passwordHash,
            phone_number: '-',
            role: 'user ',
            school: 'school',
            status: 'Inactive',
            lastLogin: null,
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
    console.log('INTO LOGIN');

    try {   
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required' });

        const user = await findUserByEmail(email.toLowerCase());

        if (!user)
            return res.status(400).json({ message: 'Invalid credentials' });

        const ok = await bcrypt.compare(password, user.passwordHash || '');
        if (!ok)
            return res.status(400).json({ message: 'Invalid credentials' });

        const payload = { uid: user.id, email: user.email };
        // const token = "-";
        // const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
        //     expiresIn: '7d',
        // });

        // 🔹 อัปเดต status -> Active
        await usersCollection.doc(user.id).update({
            status: 'Active',
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        })

        // ✅ ดึงข้อมูลล่าสุดหลังอัปเดต
        const freshDoc = await usersCollection.doc(user.id).get()
        const freshUser = { id: user.id, ...freshDoc.data() }

        const { passwordHash, ...userWithoutPassword } = freshUser

        res.json({
            message: 'Logged in',
            // token,
            user: userWithoutPassword,
        })
    } catch (err) {
        console.error('🔥 Login error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

const logout = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });
        console.log("Email : ", email)
        // ค้นหาผู้ใช้ใน Firestore
        const q = await usersCollection.where('email', '==', email.toLowerCase()).limit(1).get();
        if (q.empty) return res.status(404).json({ message: 'User not found' });

        const doc = q.docs[0];
        const userRef = usersCollection.doc(doc.id);

        // ✅ อัปเดตสถานะเป็น Inactive
        await userRef.update({ status: 'Inactive', updatedAt: new Date().toISOString() });

        // ✅ เคลียร์ cookie (optional)
        res.clearCookie('token');
        res.clearCookie('schoolName');

        res.json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, logout };
