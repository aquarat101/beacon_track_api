const { db, bucket } = require("../firebase");

const LINE_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

// ✅ ฟังก์ชันแปลงวันที่โดยใช้ toLocaleString
const formatDate = (isoString) => {
  if (!isoString) return null;
  const date = new Date(isoString);
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getAllKids = async (req, res) => {
  console.log("INTO GET ALL KIDS");

  try {
    const kidsSnapshot = await db.collection("kids").get();

    if (kidsSnapshot.empty) {
      return res.status(404).json({ message: "No kids found" });
    }

    const kids = [];
    kidsSnapshot.forEach((doc) => {
      const data = doc.data();
      kids.push({
        id: doc.id,
        ...data,
        updated: formatDate(data.updated),
        createdAt: formatDate(data.createdAt),
      });
    });

    res.json({ kids });
  } catch (error) {
    console.error("Error fetching all kids:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch kids", error: error.message });
  }
};

const getKidsByUserId = async (req, res) => {
  console.log("INTO GET KIDS BY USER ID");

  try {
    const userId = req.params.id;
    const kidsSnapshot = await db
      .collection("kids")
      .where("userId", "==", userId)
      .get();

    if (kidsSnapshot.empty) {
      return res.status(404).json({ message: "No kids found for this user" });
    }

    const kids = [];
    kidsSnapshot.forEach((doc) => {
      const data = doc.data();
      kids.push({
        id: doc.id,
        ...data,
        updated: formatDate(data.updated),
        createdAt: formatDate(data.createdAt),
      });
    });

    res.json({ kids });
  } catch (error) {
    console.error("Error fetching kids by user:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch kids", error: error.message });
  }
};

const getKidByUserIdAndKidId = async (req, res) => {
  console.log("INTO GET KID BY USER ID AND KID ID");

  try {
    const { userId, kidId } = req.params;

    const kidRef = db.collection("kids").doc(kidId);
    const kidDoc = await kidRef.get();

    if (!kidDoc.exists) {
      return res.status(404).json({ message: "Kid not found" });
    }

    const kidData = kidDoc.data();

    if (kidData.userId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to this kid" });
    }

    res.json({
      id: kidDoc.id,
      ...kidData,
      updated: formatDate(kidData.updated),
      createdAt: formatDate(kidData.createdAt),
    });
  } catch (error) {
    console.error("Error fetching kid by userId and kidId:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch kid", error: error.message });
  }
};

const createKid = async (req, res) => {
  console.log("INTO CREATE KID");

  try {
    const userId = req.params.id;

    // กรณีส่งแบบ multipart/form-data ผ่าน multer:
    // req.body จะมี fields แบบ string, req.file จะมีไฟล์ avatar
    const { profileName, beaconId, remark } = req.body;

    if (!profileName || !beaconId) {
      return res
        .status(400)
        .json({ message: "profileName and beaconId are required" });
    }

    const now = new Date().toISOString();

    // ข้อมูลพื้นฐานก่อนอัปโหลดไฟล์
    const kidData = {
      userId,
      name: profileName,
      status: "offline",
      updated: now,
      avatarUrl: "/images/profile.png", // ค่า default avatarUrl
      beaconId,
      remark: remark || "",
      createdAt: now,
    };

    // ถ้าไม่มีไฟล์ avatar ให้บันทึกข้อมูลทันที
    if (!req.file) {
      const kidRef = await db.collection("kids").add(kidData);
      const createdKid = await kidRef.get();
      const createdData = createdKid.data();

       const response  = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            to: userId,
            messages: [
              {
                type: "flex",
                altText: "Child's registration is complete!",
                contents: {
                  type: "bubble",
                  size: "mega",
                  body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "text",
                        text: "Piyo! Child's registration is complete! 🎉",
                        weight: "bold",
                        size: "sm",
                      },
                      {
                        type: "text",
                        text: `${profileName} has been successfully registered in our system with ID: ${createdKid.id}`,
                        wrap: true,
                        size: "sm",
                        color: "#666666",
                      },
                    ],
                  },
                },
              },
            ],
          }),
        });


      return res.status(201).json({
        message: "Kid profile created",
        kid: {
          id: createdKid.id,
          ...createdData,
          updated: formatDate(createdData.updated),
          createdAt: formatDate(createdData.createdAt),
        },
      });
    }

    // ถ้ามีไฟล์ avatar ให้ upload ก่อน
    const file = req.file;
    const kidRef = db.collection("kids").doc(); // สร้าง doc id ก่อน
    const kidId = kidRef.id;
    const fileName = `avatars/kids/${kidId}_${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(fileName);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on("error", (err) => {
      console.error("Upload error:", err);
      return res
        .status(500)
        .json({ message: "Upload failed", error: err.message });
    });

    stream.on("finish", async () => {
      try {
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        kidData.avatarUrl = publicUrl; // ใช้ URL รูปที่อัปโหลดแทน

        await kidRef.set(kidData);

        const createdKid = await kidRef.get();
        const createdData = createdKid.data();

        
       

        console.log("LINE push response:", data);

        res.status(201).json({
          message: "Kid profile created",
          kid: {
            id: kidId,
            ...createdData,
            updated: formatDate(createdData.updated),
            createdAt: formatDate(createdData.createdAt),
          },
        });
      } catch (e) {
        console.error("Error saving kid after upload:", e);
        res.status(500).json({
          message: "Failed to save kid after upload",
          error: e.message,
        });
      }
    });

    stream.end(file.buffer);
  } catch (error) {
    console.error("Error creating kid profile:", error);
    res
      .status(500)
      .json({ message: "Failed to create kid profile", error: error.message });
  }
};

const updateKid = async (req, res) => {
  console.log("INTO UPDATE KID");

  try {
    const { userId, kidId } = req.params;
    const updates = req.body; // รับข้อมูลทั่วไปจาก body (name, beaconId, remark)
    // console.log('updates:', updates);

    const kidRef = db.collection("kids").doc(kidId);
    const kidDoc = await kidRef.get();

    if (!kidDoc.exists) {
      return res.status(404).json({ message: "Kid not found" });
    }

    const kidData = kidDoc.data();
    // ตรวจสอบสิทธิ์ userId
    if (kidData.userId !== userId) {
      // console.log(kidData.userId)
      // console.log(userId)
      return res
        .status(403)
        .json({ message: "Unauthorized to update this kid" });
    }

    // ถ้ามีไฟล์ avatar แนบมา (เช่น multer ตั้ง req.file)
    if (req.file) {
      const file = req.file;
      const fileName = `avatars/kids/${kidId}_${Date.now()}_${
        file.originalname
      }`;
      const fileUpload = bucket.file(fileName);

      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      stream.on("error", (err) => {
        console.error("Upload error:", err);
        return res
          .status(500)
          .json({ message: "Upload failed", error: err.message });
      });

      stream.on("finish", async () => {
        try {
          await fileUpload.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

          updates.avatarUrl = publicUrl;
          updates.updated = new Date().toISOString();

          await kidRef.update(updates);

          const updatedDoc = await kidRef.get();
          res.json({
            message: "Kid updated successfully",
            kid: { id: kidId, ...updatedDoc.data() },
          });
        } catch (e) {
          console.error("Error updating Firestore after upload:", e);
          res.status(500).json({
            message: "Failed to update kid after upload",
            error: e.message,
          });
        }
      });

      stream.end(file.buffer);
    } else {
      // ไม่มีไฟล์ avatar
      updates.updated = new Date().toISOString();
      await kidRef.update(updates);
      const updatedDoc = await kidRef.get();
      res.json({
        message: "Kid updated successfully",
        kid: { id: kidId, ...updatedDoc.data() },
      });
    }
  } catch (error) {
    console.error("Error updating kid:", error);
    res
      .status(500)
      .json({ message: "Failed to update kid", error: error.message });
  }
};

const deleteKid = async (req, res) => {
  console.log("INTO DELETE KID");

  try {
    const kidId = req.params.id;

    if (!kidId) {
      return res.status(400).json({ message: "Kid ID is required" });
    }

    const kidRef = db.collection("kids").doc(kidId);
    const doc = await kidRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Kid not found" });
    }

    await kidRef.delete();
    res.json({ message: "Kid deleted successfully" });
  } catch (error) {
    console.error("Error deleting kid:", error);
    res
      .status(500)
      .json({ message: "Failed to delete kid", error: error.message });
  }
};

module.exports = {
  getAllKids,
  getKidsByUserId,
  getKidByUserIdAndKidId,
  createKid,
  updateKid,
  deleteKid,
};
