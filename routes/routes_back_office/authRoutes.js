// --- FILE: routes/auth.js ---
const express = require('express');
const router = express.Router();

// destructuring controller functions
const { register, login, logout } = require('../../controllers/controllers_back_office/authController');
const { verifyToken } = require('../../middleware/authMiddleware');

// Routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout)

// Protected route
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = req.app.get('db'); // สมมติคุณเก็บ Firestore db ใน app.locals/db หรือส่งผ่าน middleware
    const userRef = db.collection('users').doc(req.user.uid);
    const snap = await userRef.get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found' });

    const data = snap.data();
    if (data.passwordHash) delete data.passwordHash;

    res.json({ user: { id: snap.id, ...data } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
