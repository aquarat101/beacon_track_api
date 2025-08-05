const { db } = require('../firebase');

// GET user profile
const getProfile = async (req, res) => {
    console.log("INTO GET PROFILE")

    try {
        const userId = req.params.id;
        const doc = await db.collection('users').doc(userId).get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
};

// ✅ PUT: update user profile
const updateProfile = async (req, res) => {
    console.log("INTO UPDATE PROFILE")

    try {
        const userId = req.params.id;
        const updates = req.body;

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log("userRef : ", userRef)
        await userRef.update(updates);
        console.log("updates : ", updates)

        const updatedDoc = await userRef.get();
        res.json({ message: 'Profile updated', user: { id: userId, ...updatedDoc.data() } });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};

module.exports = { getProfile, updateProfile };
