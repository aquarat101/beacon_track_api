const { db, bucket } = require('../firebase');

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
    console.log("INTO UPDATE PROFILE");

    try {
        const userId = req.params.id;
        const updates = req.body;

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

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

                // บันทึก URL รูปภาพใน Firestore
                updates.avatarUrl = publicUrl;

                await userRef.update(updates);

                const updatedDoc = await userRef.get();
                res.json({ message: 'Profile updated', user: { id: userId, ...updatedDoc.data() } });
            });

            stream.end(file.buffer);
        } else {
            // ไม่มีไฟล์ ก็แค่อัปเดตข้อมูลปกติ
            await userRef.update(updates);
            const updatedDoc = await userRef.get();
            res.json({ message: 'Profile updated', user: { id: userId, ...updatedDoc.data() } });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
};


module.exports = { getProfile, updateProfile };
