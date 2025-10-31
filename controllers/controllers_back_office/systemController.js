const { db } = require("../../firebase");

const systemLog = async (req, res) => {
  try {
    const { uid, role } = req.user;
    let query = db
      .collection("system_logs")
      .where("actorId", "==", uid)
      .where("actorRole", "==", role);

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.json({ success: true, logs: [] });
    }

    const logs = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let targetName = null;

        if (data.targetUserId) {
          const targetDoc = await db
            .collection("school_users")
            .doc(data.targetUserId)
            .get();
          if (targetDoc.exists) targetName = targetDoc.data().name || null;
        }

        return {
          action: data.action,
          actorRole: data.actorRole,
          targetName,
          timestamp: data.timestamp.toDate
            ? data.timestamp.toDate()
            : data.timestamp,
        };
      })
    );

    res.json({ success: true, logs });
  } catch (err) {
    console.error("🔥 systemLog error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = { systemLog };
