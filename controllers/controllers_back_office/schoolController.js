// controllers/schoolController.js
const { db } = require("../../firebase");

// controllers/schoolController.js
const createSchool = async (req, res) => {
  try {
    const { schoolName, schoolType, educationLevel, initialStudents } =
      req.body;
    if (!schoolName || !schoolType || !educationLevel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // เตรียมข้อมูล school
    const newSchool = {
      schoolName,
      schoolType,
      educationLevel,
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

    // ถ้ามี initialStudents (array) ให้เพิ่มเข้า subcollection students
    if (Array.isArray(initialStudents) && initialStudents.length > 0) {
      const batch = db.batch();
      initialStudents.forEach((student) => {
        const studentRef = docRef.collection("students").doc(); // auto id
        batch.set(studentRef, { ...student, createdAt: new Date() });
      });
      await batch.commit();
    }

    // ดึงข้อมูลกลับมาพร้อม id
    const savedData = { id: docRef.id, ...newSchool };
    res.status(201).json({ success: true, data: savedData });
  } catch (error) {
    console.error("🔥 Error creating school:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createStudent = async (req, res) => {
  try {
    const { schoolId, userId } = req.params; // ดึง schoolId จาก route
    const { beaconId, profileName, status } = req.body;
    const deviceName = profileName;

    if (!schoolId || !beaconId || !deviceName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // ตรวจสอบว่า school มีอยู่จริง
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // เพิ่ม student ใน subcollection students
    const studentData = {
      beaconId,
      deviceName,
      userId,
      status: status || "offline",
      createdAt: new Date(),
    };

    const studentRef = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .add(studentData);

    res.status(201).json({
      success: true,
      data: { id: studentRef.id, ...studentData },
    });
  } catch (error) {
    console.error("🔥 Error creating student:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const createSchoolUser = async (req, res) => {
  try {
    const { name, email, phone_number, role, school, status } = req.body;
    if (!name || !email || !phone_number || !role || !school || !status) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newUser = {
      name,
      email,
      password: "123",
      phone_number,
      role,
      school,
      status,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection("school_users").add(newUser);
    const savedData = { id: docRef.id, ...newUser };

    res.status(201).json({ success: true, data: savedData });
  } catch (error) {
    console.error("🔥 Error creating user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchool = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing school id" });

    const docRef = db.collection("schools").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    res
      .status(200)
      .json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("🔥 Error fetching school:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchools = async (req, res) => {
  try {
    const snapshot = await db
      .collection("schools")
      .orderBy("createdAt", "asc")
      .get();
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
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });

    const docRef = db.collection("school_users").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School user not found" });
    }

    res
      .status(200)
      .json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("🔥 Error fetching school user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchoolUsers = async (req, res) => {
  console.log("GET SCHOOL USERS");

  try {
    const snapshot = await db
      .collection("school_users")
      .orderBy("createdAt", "desc")
      .get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("🔥 Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchoolUsersBySchoolId = async (req, res) => {
  console.log("GET SCHOOL USERS BY SCHOOL ID (via name)");

  try {
    const { schoolId } = req.params;
    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId" });
    }

    // ✅ 1) ดึงชื่อโรงเรียนจาก schools collection
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const schoolData = schoolDoc.data();
    const schoolName = schoolData.schoolName;
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, message: "School name missing in document" });
    }

    // ✅ 2) ใช้ schoolName ไปหาผู้ใช้ใน school_users
    const snapshot = await db
      .collection("school_users")
      .where("school", "==", schoolName)
      // .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("🔥 Error fetching users by schoolId via name:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ดึง students ของโรงเรียนตาม schoolId
const getSchoolStudents = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId" });

    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists)
      return res
        .status(404)
        .json({ success: false, message: "School not found" });

    const snapshot = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .get();
    const students = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error("🔥 Error fetching students:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchoolIdByName = async (req, res) => {
  try {
    const { schoolName } = req.params;
    if (!schoolName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolName" });
    }

    // 🔍 ค้นหาโรงเรียนที่ชื่อเท่ากับ schoolName
    const snapshot = await db
      .collection("schools")
      .where("schoolName", "==", schoolName)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const doc = snapshot.docs[0];
    const schoolId = doc.id;
    const schoolData = doc.data();

    return res.status(200).json({
      success: true,
      schoolId,
      schoolName: schoolData.schoolName || "",
      data: schoolData,
    });
  } catch (error) {
    console.error("🔥 Error fetching schoolId by name:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// UPDATE school by id
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing school id" });
    }

    const docRef = db.collection("schools").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // ป้องกันไม่ให้ timestamp เดิมโดนทับ
    updateData.updatedAt = new Date();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.status(200).json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error("🔥 Error updating school:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// UPDATE school user by id
const updateSchoolUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    }

    const docRef = db.collection("school_users").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School user not found" });
    }

    updateData.updatedAt = new Date();

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    res.status(200).json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error("🔥 Error updating school user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE school by id
const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = db.collection("schools").doc(id);

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    await docRef.delete();
    res
      .status(200)
      .json({ success: true, message: "School deleted successfully" });
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
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await docRef.delete();
    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("🔥 Error deleting user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createSchool,
  createStudent,
  getSchool,
  getSchools,
  getSchoolStudents,
  getSchoolIdByName,
  updateSchool,
  deleteSchool,

  createSchoolUser,
  getSchoolUser,
  getSchoolUsers,
  getSchoolUsersBySchoolId,
  updateSchoolUser,
  deleteSchoolUser,
};
