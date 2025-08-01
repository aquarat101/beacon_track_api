const { db } = require('../firebase');

const getUsers = async (req, res) => {
    console.log("INTO GETUSERS")
    try {
        const snapshot = await db.collection('users').get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

module.exports = { getUsers };
