require("dotenv").config();
const { db } = require("./firebase");
const bcrypt = require("bcrypt");

const superAdminData = {
    name: "Super Admin",
    email: "sun@gmail.com",
    role: "super_admin",
    status: "Active",
    schoolId: null,
    phone_number: "0888483267",
};

const createSuperAdmin = async () => {
    try {
        const usersCollection = db.collection("school_users");

        // เช็คว่ามี super admin อยู่แล้วหรือยัง
        const q = await usersCollection
            .where("email", "==", superAdminData.email.toLowerCase())
            .limit(1)
            .get();
        if (!q.empty) {
            console.log("Super admin already exists.");
            return;
        }

        // Hash password
        const passwordHash = await bcrypt.hash("123", 10);

        // บันทึกลง Firestore
        const docRef = await usersCollection.add({
            ...superAdminData,
            passwordHash,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            updatedAt: new Date().toISOString(),
        });

        console.log("✅ Super admin created successfully:", docRef.id);
    } catch (err) {
        console.error("🔥 Error creating super admin:", err);
    } finally {
        process.exit();
    }
};

createSuperAdmin();