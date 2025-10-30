const {
  SCHOOL_TYPES,
  EDUCATION_LEVELS,
  SCHOOL_STATUSES,
} = require("../../constants/enums");
const { ROLES } = require("../../constants/role");
const { db, admin } = require("../../firebase");
const FieldValue = admin.firestore.FieldValue;

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
    const { schoolId, userId } = req.params;
    const { beaconId, deviceName } = req.body;
    const { uid, role } = req.user;

    if (!schoolId || !beaconId || !deviceName) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const userSnapshot = await db
      .collection("users")
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (userSnapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;
      if (currentSchoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot create student in another school",
        });
      }
    }

    const kidSnapshot = await db
      .collection("kids")
      .where("beaconId", "==", beaconId)
      .limit(1)
      .get();
    if (kidSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `BeaconId "${beaconId}" not found in kids collection`,
      });
    }

    // เพิ่ม student ใน subcollection students
    const studentData = {
      beaconId,
      deviceName,
      parentId: userId,
      createdAt: new Date(),
    };

    const studentRef = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .add(studentData);

    // หลังจากเพิ่ม student สำเร็จ
    await db
      .collection("schools")
      .doc(schoolId)
      .update({
        devices: FieldValue.increment(1),
      });

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

const getSchoolUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid, role } = req.user;

    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user id" });
    }

    const docRef = db.collection("school_users").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School user not found" });
    }

    const userData = doc.data();

    if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;
      if (userData.schoolId !== currentSchoolId) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied to this user" });
      }
    }

    const { passwordHash, ...safeData } = userData;

    res.status(200).json({ success: true, data: { id: doc.id, ...safeData } });
  } catch (error) {
    console.error("🔥 Error fetching school user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getSchoolUsers = async (req, res) => {
  console.log("GET SCHOOL USERS");
  const { uid, role } = req.user;

  try {
    const snapshot = await db
      .collection("school_users")
      .orderBy("createdAt", "desc")
      .get();

    let filteredUsers = [];

    if (role === ROLES.SUPER_ADMIN) {
      filteredUsers = snapshot.docs;
    } else if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const userDoc = await db.collection("school_users").doc(uid).get();

      if (!userDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const currentSchoolId = userDoc.data().schoolId;

      filteredUsers = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return (
          [ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(data.role) &&
          data.schoolId === currentSchoolId
        );
      });
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const users = filteredUsers.map((doc) => {
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
    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId" });
    }

    const schoolRef = db.collection("schools").doc(schoolId);
    const schoolDoc = await schoolRef.get();

    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const snapshot = await db
      .collection("school_users")
      .where("schoolId", "==", schoolId)
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "No users found for this school" });
    }

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      const { passwordHash, ...safeData } = data;
      return { id: doc.id, ...safeData };
    });

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error("Error fetching users by schoolId:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only SUPER_ADMIN can view all students",
      });
    }

    // 1️⃣ ดึงโรงเรียนทั้งหมด
    const schoolsSnapshot = await db.collection("schools").get();
    if (schoolsSnapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "No schools found" });
    }

    let allStudents = [];

    // 2️⃣ ดึง students ของทุกโรงเรียน
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      const schoolData = schoolDoc.data();

      const studentsSnapshot = await db
        .collection("schools")
        .doc(schoolId)
        .collection("students")
        .get();

      const students = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        schoolId,
        schoolName: schoolData.schoolName || "",
        ...doc.data(),
      }));

      allStudents.push(...students);
    }

    // 3️⃣ รวม parentId ทั้งหมด
    const parentIds = [
      ...new Set(allStudents.map((s) => s.parentId).filter(Boolean)),
    ];

    // 4️⃣ ดึงข้อมูลผู้ปกครองแบบ chunk
    const chunkSize = 10;
    let allParents = {};
    for (let i = 0; i < parentIds.length; i += chunkSize) {
      const chunk = parentIds.slice(i, i + chunkSize);
      const parentSnapshot = await db
        .collection("users")
        .where("userId", "in", chunk)
        .get();

      parentSnapshot.forEach((doc) => {
        const data = doc.data();
        allParents[data.userId] = {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
        };
      });
    }

    // 5️⃣ รวม beaconId ทั้งหมด
    const beaconIds = [
      ...new Set(allStudents.map((s) => s.beaconId).filter(Boolean)),
    ];

    // 6️⃣ ดึงข้อมูล kids แบบ chunk
    let allKids = {};
    for (let i = 0; i < beaconIds.length; i += chunkSize) {
      const chunk = beaconIds.slice(i, i + chunkSize);
      const kidsSnapshot = await db
        .collection("kids")
        .where("beaconId", "in", chunk)
        .get();

      kidsSnapshot.forEach((doc) => {
        const data = doc.data();
        allKids[data.beaconId] = {
          kidId: doc.id,
          status: data.status || "unknown",
          name: data.name || "",
          lastZoneId: data.lastZoneId || null,
          updated: data.updated || null,
        };
      });
    }

    // 7️⃣ รวม lastZoneId ทั้งหมดจาก kids
    const zoneIds = [
      ...new Set(
        Object.values(allKids)
          .map((k) => k.lastZoneId)
          .filter((id) => id && id.trim() !== "")
      ),
    ];

    // 8️⃣ ดึงข้อมูล places โดย doc.id = lastZoneId
    let allPlaces = {};
    if (zoneIds.length > 0) {
      const placePromises = zoneIds.map(async (zoneId) => {
        const placeDoc = await db.collection("places").doc(zoneId).get();
        if (placeDoc.exists) {
          const data = placeDoc.data();
          allPlaces[zoneId] = { name: data.name || "" };
        }
      });
      await Promise.all(placePromises);
    }

    // 9️⃣ รวมข้อมูลทั้งหมด + กรองเฉพาะ field ที่ต้องการ
    const mergedStudents = allStudents.map((student) => {
      const kid = allKids[student.beaconId] || null;

      let zoneName = null;
      if (kid?.lastZoneId) {
        zoneName = allPlaces[kid.lastZoneId]?.name || null;
      }

      return {
        studentId: student.id,
        schoolId: student.schoolId,
        beaconId: student.beaconId,
        deviceName: student.deviceName,
        parent: student.parentId
          ? {
              firstName: allParents[student.parentId]?.firstName || "",
              lastName: allParents[student.parentId]?.lastName || "",
            }
          : null,
        schoolName: student.schoolName || "",
        kid: kid
          ? {
              status: kid.status || "unknown",
              lastZoneName: zoneName,
              updated: kid.updated || null,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: mergedStudents.length,
      data: mergedStudents,
    });
  } catch (error) {
    console.error(
      "🔥 Error fetching all students with parents, kids & places:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getSchoolStudents = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { uid, role } = req.user;

    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId" });
    }

    // ตรวจสอบสิทธิ์
    if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();

      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;

      if (currentSchoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot view students from another school",
        });
      }
    }
    // SUPER_ADMIN ไม่ถูกจำกัดโรงเรียน

    // ตรวจสอบว่ามีโรงเรียนนี้จริง
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    const schoolData = schoolDoc.data();

    // 1️⃣ ดึง students ของโรงเรียนนี้
    const studentsSnapshot = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .get();

    if (studentsSnapshot.empty) {
      return res
        .status(404)
        .json({ success: false, message: "No students found" });
    }

    const allStudents = studentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      schoolId,
      schoolName: schoolData.schoolName || "",
      ...doc.data(),
    }));

    // 2️⃣ ดึง parent info แบบ chunk
    const parentIds = [
      ...new Set(allStudents.map((s) => s.parentId).filter(Boolean)),
    ];
    const chunkSize = 10;
    let allParents = {};
    for (let i = 0; i < parentIds.length; i += chunkSize) {
      const chunk = parentIds.slice(i, i + chunkSize);
      const parentSnapshot = await db
        .collection("users")
        .where("userId", "in", chunk)
        .get();

      parentSnapshot.forEach((doc) => {
        const data = doc.data();
        allParents[data.userId] = {
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "",
          phone: data.phone || "",
        };
      });
    }

    // 3️⃣ ดึง kids info แบบ chunk
    const beaconIds = [
      ...new Set(allStudents.map((s) => s.beaconId).filter(Boolean)),
    ];
    let allKids = {};
    for (let i = 0; i < beaconIds.length; i += chunkSize) {
      const chunk = beaconIds.slice(i, i + chunkSize);
      const kidsSnapshot = await db
        .collection("kids")
        .where("beaconId", "in", chunk)
        .get();

      kidsSnapshot.forEach((doc) => {
        const data = doc.data();
        allKids[data.beaconId] = {
          kidId: doc.id,
          status: data.status || "unknown",
          name: data.name || "",
          lastZoneId: data.lastZoneId || null,
          updated: data.updated || null,
        };
      });
    }

    // 4️⃣ ดึง places info
    const zoneIds = [
      ...new Set(
        Object.values(allKids)
          .map((k) => k.lastZoneId)
          .filter((id) => id && id.trim() !== "")
      ),
    ];
    let allPlaces = {};
    if (zoneIds.length > 0) {
      const placePromises = zoneIds.map(async (zoneId) => {
        const placeDoc = await db.collection("places").doc(zoneId).get();
        if (placeDoc.exists) {
          const data = placeDoc.data();
          allPlaces[zoneId] = { name: data.name || "" };
        }
      });
      await Promise.all(placePromises);
    }

    // 5️⃣ รวมข้อมูล students + parent + kid + lastZoneName
    const mergedStudents = allStudents.map((student) => {
      const kid = allKids[student.beaconId] || null;

      let zoneName = null;
      if (kid?.lastZoneId) {
        zoneName = allPlaces[kid.lastZoneId]?.name || null;
      }

      return {
        studentId: student.id,
        schoolId: student.schoolId,
        beaconId: student.beaconId,
        deviceName: student.deviceName,
        parent: student.parentId
          ? {
              firstName: allParents[student.parentId]?.firstName || "",
              lastName: allParents[student.parentId]?.lastName || "",
            }
          : null,
        schoolName: student.schoolName || "",
        kid: kid
          ? {
              status: kid.status || "unknown",
              lastZoneName: zoneName,
              updated: kid.updated || null,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: mergedStudents.length,
      data: mergedStudents,
    });
  } catch (error) {
    console.error("🔥 Error fetching school students:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { schoolId, studentId } = req.params;
    const { uid, role } = req.user;

    if (!schoolId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId or studentId" });
    }

    // ตรวจสอบสิทธิ์ SCHOOL_ADMIN / SCHOOL_STAFF
    if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;
      if (currentSchoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot view students from another school",
        });
      }
    }

    // ตรวจสอบว่ามีโรงเรียนนี้จริง
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }
    const schoolData = schoolDoc.data();

    // ดึง student
    const studentDoc = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .doc(studentId)
      .get();

    if (!studentDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    const student = studentDoc.data();

    // ดึง parent info
    let parent = null;
    if (student.parentId) {
      const parentSnapshot = await db
        .collection("users")
        .where("userId", "==", student.parentId)
        .limit(1)
        .get();

      if (!parentSnapshot.empty) {
        const data = parentSnapshot.docs[0].data();
        parent = {
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phone: data.phone || "",
        };
      }
    }

    // ดึง kid info (เพื่อเอา remark)
    let remark = null;
    if (student.beaconId) {
      const kidSnapshot = await db
        .collection("kids")
        .where("beaconId", "==", student.beaconId)
        .limit(1)
        .get();

      if (!kidSnapshot.empty) {
        const kidData = kidSnapshot.docs[0].data();
        remark = kidData.remark || null;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        parent,
        schoolName: schoolData.schoolName || "",
        remark,
      },
    });
  } catch (error) {
    console.error("🔥 Error fetching student by id:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { schoolId, studentId } = req.params;
    const { uid, role } = req.user;

    if (!schoolId || !studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing schoolId or studentId" });
    }

    // ตรวจสอบสิทธิ์ SCHOOL_ADMIN / SCHOOL_STAFF
    if ([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(role)) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;
      if (currentSchoolId !== schoolId) {
        return res.status(403).json({
          success: false,
          message: "Access denied: cannot delete student from another school",
        });
      }
    }

    // ตรวจสอบว่ามีโรงเรียนนี้จริง
    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

    // ตรวจสอบว่ามีนักเรียนนี้จริง
    const studentDoc = await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .doc(studentId)
      .get();

    if (!studentDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // ลบ student
    await db
      .collection("schools")
      .doc(schoolId)
      .collection("students")
      .doc(studentId)
      .delete();

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("🔥 Error deleting student:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

const updateSchoolUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { uid, role } = req.user;

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

    const targetUser = docSnap.data();

    if (role === ROLES.SUPER_ADMIN) {
      if (targetUser.role !== ROLES.SCHOOL_ADMIN) {
        return res
          .status(403)
          .json({ success: false, message: "Can only update SCHOOL_ADMIN" });
      }
    } else if (role === ROLES.SCHOOL_ADMIN) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;

      if (
        targetUser.role !== ROLES.SCHOOL_STAFF ||
        targetUser.schoolId !== currentSchoolId
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied to update this user",
        });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    updateData.updatedAt = new Date();
    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    const { passwordHash, ...safeData } = updatedDoc.data();

    res.status(200).json({
      success: true,
      data: { id: updatedDoc.id, ...safeData },
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

    res.status(200).json({
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
    const { uid, role } = req.user;

    const docRef = db.collection("school_users").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const targetUser = docSnap.data();

    if (role === ROLES.SUPER_ADMIN) {
      if (![ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF].includes(targetUser.role)) {
        return res
          .status(403)
          .json({ success: false, message: "Cannot delete this user" });
      }
    } else if (role === ROLES.SCHOOL_ADMIN) {
      const currentUserDoc = await db.collection("school_users").doc(uid).get();
      if (!currentUserDoc.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Current user not found" });
      }

      const currentSchoolId = currentUserDoc.data().schoolId;
      if (
        targetUser.role !== ROLES.SCHOOL_STAFF ||
        targetUser.schoolId !== currentSchoolId
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied to delete this user",
        });
      }
    } else {
      return res.status(403).json({ success: false, message: "Access denied" });
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
  getStudentById,
  deleteStudent,

  updateSchool,
  deleteSchool,

  getSchoolUser,
  getAllStudents,
  getSchoolUsers,
  getSchoolUsersBySchoolId,
  updateSchoolUser,
  deleteSchoolUser,
};
