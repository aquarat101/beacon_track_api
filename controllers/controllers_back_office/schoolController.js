// controllers/schoolController.js
const { db } = require("../../firebase");

const createSchool = async (req, res) => {
    try {
        const { schoolName, schoolType, educationLevel } = req.body;
        if (!schoolName || !schoolType || !educationLevel) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // เตรียมข้อมูล
        const newSchool = {
            schoolName: schoolName,
            schoolType: schoolType,
            educationLevel: educationLevel,
            devices: 0,
            status: "Active",
            address: "100/1 Piyo Piyo School",
            city: "Ladprao",
            province: "Bangkok",
            latitude: "00.00000",
            longtitude: "00.00000",
            postalCode: "10230",
            contactNumber: "0123456789",
            schoolEmail: "piyopiyoschool@mail.com",
            website: "http://www.piyopiyo.ac.th/",
            createdAt: new Date(),
        };

        // เพิ่มเข้า Firestore
        const docRef = await db.collection("schools").add(newSchool);

        // ดึงข้อมูลกลับมาพร้อม id
        const savedData = { id: docRef.id, ...newSchool };

        res.status(201).json({ success: true, data: savedData });
    } catch (error) {
        console.error("🔥 Error creating school:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const createSchoolUser = async (req, res) => {
    try {
        const { name, email, phone_number, role, school } = req.body
        if (!name || !email || !phone_number || !role || !school) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const newUser = {
            name,
            email,
            phone_number,
            role,
            school,
            createdAt: new Date(),
        }

        const docRef = await db.collection("school_users").add(newUser)
        const savedData = { id: docRef.id, ...newUser }

        res.status(201).json({ success: true, data: savedData })
    } catch (error) {
        console.error("🔥 Error creating user:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const getSchool = async (req, res) => {
    try {
        const { id } = req.params
        if (!id) return res.status(400).json({ success: false, message: "Missing school id" })

        const docRef = db.collection("schools").doc(id)
        const doc = await docRef.get()

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "School not found" })
        }

        res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } })
    } catch (error) {
        console.error("🔥 Error fetching school:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const getSchools = async (req, res) => {
    try {
        const snapshot = await db.collection("schools").orderBy("createdAt", "asc").get();
        const schools = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).json({ success: true, data: schools });
    } catch (error) {
        console.error("Error fetching schools:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ดึงผู้ใช้โรงเรียนตาม id
const getSchoolUser = async (req, res) => {
    try {
        const { id } = req.params
        if (!id) return res.status(400).json({ success: false, message: "Missing user id" })

        const docRef = db.collection("school_users").doc(id)
        const doc = await docRef.get()

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: "School user not found" })
        }

        res.status(200).json({ success: true, data: { id: doc.id, ...doc.data() } })
    } catch (error) {
        console.error("🔥 Error fetching school user:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

const getSchoolUsers = async (req, res) => {
    console.log("GET SCHOOL USERS")
    try {
        const snapshot = await db.collection("school_users").orderBy("createdAt", "desc").get()
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        res.status(200).json({ success: true, data: users })
    } catch (error) {
        console.error("🔥 Error fetching users:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}

// UPDATE school by id
const updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Missing school id" });
        }

        const docRef = db.collection("schools").doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        // ป้องกันไม่ให้ timestamp เดิมโดนทับ
        updateData.updatedAt = new Date();

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        res.status(200).json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } });
    } catch (error) {
        console.error("🔥 Error updating school:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// UPDATE school user by id
const updateSchoolUser = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        if (!id) {
            return res.status(400).json({ success: false, message: "Missing user id" })
        }

        const docRef = db.collection("school_users").doc(id)
        const docSnap = await docRef.get()

        if (!docSnap.exists) {
            return res.status(404).json({ success: false, message: "School user not found" })
        }

        updateData.updatedAt = new Date()

        await docRef.update(updateData)

        const updatedDoc = await docRef.get()
        res.status(200).json({ success: true, data: { id: updatedDoc.id, ...updatedDoc.data() } })
    } catch (error) {
        console.error("🔥 Error updating school user:", error)
        res.status(500).json({ success: false, message: "Internal server error" })
    }
}


// DELETE school by id
const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection("schools").doc(id);

        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        await docRef.delete();
        res.status(200).json({ success: true, message: "School deleted successfully" });
    } catch (error) {
        console.error("🔥 Error deleting school:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// DELETE school user by id
const deleteSchoolUser = async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection("school_users").doc(id);

        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await docRef.delete();
        res.status(200).json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.error("🔥 Error deleting user:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = {
    createSchool,
    getSchool,
    getSchools,
    updateSchool,
    deleteSchool,

    createSchoolUser,
    getSchoolUser,
    getSchoolUsers,
    updateSchoolUser,
    deleteSchoolUser
};