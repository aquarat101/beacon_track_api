const { db, bucket } = require('../firebase');

// GET user profile
const getProfile = async (req, res) => {
    console.log("INTO GET PROFILE")

    try {
        const userId = req.params.userId;
        console.log("Searching userId:", userId)

        const snapshot = await db.collection('users')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        const doc = snapshot.docs[0];
        res.json({ id: doc.id, ...doc.data() });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
    }
};


// ✅ PUT: update user profile
const updateProfile = async (req, res) => {
    console.log("INTO UPDATE PROFILE");

    try {
        const userId = req.params.id; // ค่านี้จะเป็น userId field ใน Firestore
        const updates = req.body;

        // 🔍 ค้นหา document ด้วย field userId
        const snapshot = await db.collection('users')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        const docRef = snapshot.docs[0].ref; // อ้างอิง doc เพื่อใช้ update
        // const docData = snapshot.docs[0].data();

        // ✅ ถ้ามี avatar file แนบมา
        if (req.file) {
            const file = req.file;
            const fileName = `avatars/${userId}_${Date.now()}_${file.originalname}`;
            const fileUpload = bucket.file(fileName);

            const stream = fileUpload.createWriteStream({
                metadata: {
                    contentType: file.mimetype,
                },
            });

            stream.on('error', (err) => {
                console.error('Upload error:', err);
                return res.status(500).json({ message: 'Upload failed', error: err.message });
            });

            stream.on('finish', async () => {
                // ✅ ตั้งค่าการเข้าถึงเป็น public
                await fileUpload.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

                updates.avatarUrl = publicUrl;

                await docRef.update(updates);

                const updatedDoc = await docRef.get();
                res.json({
                    message: 'Profile updated',
                    user: { id: docRef.id, ...updatedDoc.data() }
                });
            });

            stream.end(file.buffer);
        } else {
            await docRef.update(updates);
            const updatedDoc = await docRef.get();
            res.json({
                message: 'Profile updated',
                user: { id: docRef.id, ...updatedDoc.data() }
            });
        }

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};


const findUserByUserId = async (userId) => {
    console.log("INTO FIND USER BT USER ID")

    try {
        const snapshot = await db.collection('users')
            .where('userId', '==', userId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return null; // ไม่พบผู้ใช้
        }

        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('Error in findUserByUserId:', error);
        throw error;
    }
};

module.exports = { getProfile, updateProfile, findUserByUserId };
