const { db, bucket } = require('../firebase');

const DEFAULT_AVATAR_URL = '/images/profile.png';

const registerUser = async (req, res) => {
    console.log("INTO REGISTER USER");
    // console.log(req.body)
    const { userId, firstName, lastName, email, phone } = req.body;  // avatar ไม่ต้องรับจาก client

    if (!firstName || !lastName || !email || !phone) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const docRef = await db.collection("users").add({
            userId,
            firstName,
            lastName,
            email,
            phone,
            avatarUrl: DEFAULT_AVATAR_URL,  // กำหนด default avatarUrl ที่นี่
            createdAt: new Date(),
        });

        res.status(201).json({ message: "User registered", id: docRef.id });
    } catch (error) {
        console.error("Error saving user:", error);
        res.status(500).json({ error: "Failed to save user" });
    }
};

module.exports = { registerUser };
