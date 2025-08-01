const { db } = require('../firebase');

exports.getProfile = async (req, res) => {
    console.log("INTO GETUSERSID")
    try {
        const userId = req.params.id;
        console.log(userId)
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

// module.exports = { getUsers };
