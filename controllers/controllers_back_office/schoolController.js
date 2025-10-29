// controllers/schoolController.js
const {
  SCHOOL_TYPES,
  EDUCATION_LEVELS,
  SCHOOL_STATUSES,
} = require("../../constants/enums");
const { ROLES } = require("../../constants/role");
const { db } = require("../../firebase");

// controllers/schoolController.js
const createSchool = async (req, res) => {
  try {
    const { schoolName, schoolType, educationLevel, initialStudents, status } =
      req.body;
    if (!schoolName || !schoolType || !educationLevel) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!SCHOOL_TYPES.includes(schoolType)) {
      return res.status(400).json({
        message: `Invalid schoolType. Allowed: ${SCHOOL_TYPES.join(", ")}`,
      });
    }

    if (!EDUCATION_LEVELS.includes(educationLevel)) {
      return res.status(400).json({
        message: `Invalid educationLevel. Allowed: ${EDUCATION_LEVELS.join(
          ", "
        )}`,
      });
    }

    const schoolStatus = Object.values(SCHOOL_STATUSES).includes(status)
      ? status
      : SCHOOL_STATUSES.ACTIVE;

    const newSchool = {
      schoolName,
      schoolType,
      educationLevel,
      devices: 0,
      status: schoolStatus,
      address: "",
      city: "",
      province: "",
      latitude: "",
      longtitude: "",
      postalCode: "",
      contactNumber: "",
      schoolEmail: "",
      website: "",
      createdAt: new Date(),
    };

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

const getSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, role } = req.user;

    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Missing school id" });

    let userSchoolId = null;
    if (role === ROLES.SCHOOL_ADMIN) {
      const userDoc = await db.collection("school_users").doc(uid).get();
      if (!userDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      userSchoolId = userDoc.data().schoolId;
      if (userSchoolId !== id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied to this school" });
      }
    }
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

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      const { passwordHash, ...safeData } = data;
      return { id: doc.id, ...safeData };
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("🔥 Error fetching users:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchoolUsersBySchoolId = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (!schoolId)
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId" });

    const snapshot = await db
      .collection("school_users")
      .where("schoolId", "==", schoolId)
      .get();
    if (snapshot.empty)
      return res.status(200).json({ success: true, data: [] });

    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error("Error fetching users by schoolId:", err);
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
    const { role, uid } = req.user;

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

    if (role === ROLES.SCHOOL_ADMIN) {
      const userDoc = await db.collection("school_users").doc(uid).get();
      if (!userDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const userSchoolId = userDoc.data().schoolId;
      if (userSchoolId !== id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied to this school" });
      }
    }

    // ตรวจสอบ status ก่อนอัพเดท
    if (
      updateData.status &&
      !Object.values(SCHOOL_STATUSES).includes(updateData.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${Object.values(
          SCHOOL_STATUSES
        ).join(", ")}`,
      });
    }

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

// DELETE school by id (with users)
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

    // 1️⃣ ลบ school_users ของโรงเรียนนี้
    const usersSnapshot = await db
      .collection("school_users")
      .where("schoolId", "==", id)
      .get();

    const batch = db.batch();

    usersSnapshot.forEach((userDoc) => {
      batch.delete(userDoc.ref);
    });

    // 2️⃣ ลบโรงเรียน
    batch.delete(docRef);

    // 3️⃣ commit ทั้ง batch
    await batch.commit();

    res
      .status(200)
      .json({
        success: true,
        message: "School and its users deleted successfully",
      });
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

  getSchoolUser,
  getSchoolUsers,
  getSchoolUsersBySchoolId,
  updateSchoolUser,
  deleteSchoolUser,
};
