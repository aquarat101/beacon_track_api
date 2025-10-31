const { ROLES } = require("../../constants/role");
const { db, admin } = require("../../firebase");
const FieldValue = admin.firestore.FieldValue;

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

const historyTrack = async (req, res) => {
  try {
    const { schoolId, studentId } = req.params;
    const { uid, role } = req.user;

    if (!schoolId || !studentId) {
      return res
        .status(422)
        .json({ success: false, message: "Missing schoolId or studentId" });
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
          message: "Access denied: cannot view students from another school",
        });
      }
    }

    const schoolDoc = await db.collection("schools").doc(schoolId).get();
    if (!schoolDoc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "School not found" });
    }

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

    const studentData = studentDoc.data();
    const { beaconId, parentId: userId } = studentData;

    if (!beaconId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Missing beaconId or userId in student data",
      });
    }

    const kidSnapshot = await db
      .collection("kids")
      .where("beaconId", "==", beaconId)
      .limit(1)
      .get();

    if (kidSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: `No kid found for beaconId "${beaconId}"`,
      });
    }

    const kidData = kidSnapshot.docs[0].data();

    if (kidData.schoolId && kidData.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: "This kid does not belong to the specified school",
      });
    }

    const [hitsSnap, exitsSnap] = await Promise.all([
      db
        .collection("beacon_zone_hits")
        .where("beaconId", "==", beaconId)
        .where("userId", "==", userId)
        .get(),
      db
        .collection("beacon_zone_exits")
        .where("beaconId", "==", beaconId)
        .where("userId", "==", userId)
        .get(),
    ]);

    const results = [];

    hitsSnap.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        type: data.type || "",
        eventType: "hit",
        timestamp: data.timestamp || null,
      });
    });

    exitsSnap.forEach((doc) => {
      const data = doc.data();
      results.push({
        id: doc.id,
        type: data.type || "",
        eventType: "exit",
        timestamp: data.timestamp || null,
      });
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No history records found for this student",
      });
    }

    // 🔹 เรียงตามเวลาใหม่ก่อนเก่า
    results.sort((a, b) => {
      const timeA = a.timestamp?._seconds || 0;
      const timeB = b.timestamp?._seconds || 0;
      return timeB - timeA;
    });

    // 🔹 แปลง timestamp ให้อ่านง่าย
    const formattedResults = results.map((r) => ({
      type: r.type,
      eventType: r.eventType,
      timestamp: r.timestamp
        ? new Date(r.timestamp._seconds * 1000).toISOString()
        : null,
    }));

    return res.status(200).json({
      success: true,
      count: formattedResults.length,
      data: formattedResults,
    });
  } catch (error) {
    console.error("🔥 Error tracking student history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error (Error tracking student history)",
    });
  }
};

module.exports = {
  createStudent,
  getAllStudents,
  getSchoolStudents,
  getStudentById,
  deleteStudent,
  historyTrack,
};
