const { db } = require("../../firebase");

const overview = async (req, res) => {
  try {
    let totalUser = 0;
    let totalStudents = 0;
    let totalSchoolUsers = 0;
    let totalActiveStudents = 0;
    let totalNewStudentsToday = 0;
    let totalNewUsersToday = 0;
    let totalAlertsToday = 0;

    const now = new Date();
    const bangkokNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
    );
    const startOfDay = new Date(bangkokNow.setHours(0, 0, 0, 0));
    const endOfDay = new Date(bangkokNow.setHours(23, 59, 59, 999));

    const schoolsSnapshot = await db.collection("schools").get();

    if (!schoolsSnapshot.empty) {
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;

        const studentsSnapshot = await db
          .collection("schools")
          .doc(schoolId)
          .collection("students")
          .get();

        totalStudents += studentsSnapshot.size;

        const newStudentsToday = studentsSnapshot.docs.filter((doc) => {
          const createdAtRaw = doc.data().createdAt;
          if (!createdAtRaw) return false;

          let createdAtDate;
          if (createdAtRaw.toDate) {
            // Firestore Timestamp
            createdAtDate = createdAtRaw.toDate();
          } else {
            // string
            createdAtDate = new Date(createdAtRaw);
          }

          return createdAtDate >= startOfDay && createdAtDate <= endOfDay;
        });

        totalNewStudentsToday += newStudentsToday.length;

        const beaconIds = studentsSnapshot.docs
          .map((doc) => doc.data().beaconId)
          .filter(Boolean);

        const chunkSize = 10;
        for (let i = 0; i < beaconIds.length; i += chunkSize) {
          const chunk = beaconIds.slice(i, i + chunkSize);
          const kidsSnapshot = await db
            .collection("kids")
            .where("beaconId", "in", chunk)
            .get();

          kidsSnapshot.forEach((kidDoc) => {
            const kidData = kidDoc.data();
            if (kidData.status && kidData.status.toLowerCase() === "online") {
              totalActiveStudents += 1;
            }
          });
        }
      }
    }

    const schoolUsersSnapshot = await db.collection("school_users").get();
    totalSchoolUsers = schoolUsersSnapshot.size;

    // school_users ที่สร้างวันนี้ (รองรับ string หรือ Timestamp)
    const newSchoolUsersToday = schoolUsersSnapshot.docs.filter((doc) => {
      const createdAtRaw = doc.data().createdAt;
      if (!createdAtRaw) return false;

      let createdAtDate;
      if (createdAtRaw.toDate) {
        createdAtDate = createdAtRaw.toDate();
      } else {
        createdAtDate = new Date(createdAtRaw);
      }

      return createdAtDate >= startOfDay && createdAtDate <= endOfDay;
    });

    totalNewUsersToday = newSchoolUsersToday.length;
    totalUser = totalStudents + totalSchoolUsers;

    const alertsHitsSnapshot = await db.collection("beacon_zone_hits").get();
    const alertsExitsSnapshot = await db.collection("beacon_zone_exits").get();

    const allAlertsToday = [
      ...alertsHitsSnapshot.docs,
      ...alertsExitsSnapshot.docs,
    ].filter((doc) => {
      const tsRaw = doc.data().timestamp;
      if (!tsRaw) return false;
      
      const alertDate = tsRaw.toDate ? tsRaw.toDate() : new Date(tsRaw);

      return alertDate >= startOfDay && alertDate <= endOfDay;
    });

    totalAlertsToday = allAlertsToday.length;

    return res.json({
      success: true,
      totalUser,
      totalStudents,
      totalActiveStudents,
      totalNewStudentsToday,
      totalNewUsersToday,
      totalAlertsToday,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { overview };
