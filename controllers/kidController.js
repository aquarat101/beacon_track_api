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

const getKidByKidId = async (req, res) => {
  console.log("INTO GET KID BY KID ID");

  try {
    const { kidId } = req.params;

    if (!kidId) {
      return res.status(400).json({ message: "Kid ID is required" });
    }

    const kidRef = db.collection("kids").doc(kidId);
    const kidDoc = await kidRef.get();

    if (!kidDoc.exists) {
      return res.status(404).json({ message: "Kid not found" });
    }

    const kidData = kidDoc.data();

    res.json({
      id: kidDoc.id,
      ...kidData,
      updated: formatDate(kidData.updated),
      createdAt: formatDate(kidData.createdAt),
    });
    
  } catch (error) {
    console.error("Error fetching kid by kidId:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch kid", error: error.message });
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

const getMultipleKids = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: "No ids provided" })

    const promises = ids.map(id => db.collection("kids").doc(id).get())
    const snapshots = await Promise.all(promises)

    const kids = snapshots
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }))

    res.status(200).json({ success: true, data: kids })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: "Internal server error" })
  }
}


const createKid = async (req, res) => {
  console.log("INTO CREATE KID");

  try {
    const userId = req.params.id;
    const { profileName, beaconId, remark, avatarUrl } = req.body; // ✅ รับ avatarUrl เป็น string path

    // ✅ ตรวจสอบ input เบื้องต้น
    if (!profileName || !beaconId) {
      return res.status(400).json({
        success: false,
        errorCode: "INVALID_INPUT",
        message: "Both profileName and beaconId are required.",
      });
    }

    // ✅ ตรวจสอบ beaconId ซ้ำ
    const beaconQuery = await db
      .collection("kids")
      .where("beaconId", "==", beaconId)
      .get();

    if (!beaconQuery.empty) {
      return res.status(409).json({ // ใช้ 409 Conflict จะสื่อว่าข้อมูลซ้ำ
        success: false,
        errorCode: "BEACON_ID_DUPLICATE",
        message: "This beaconId is already in use. Please choose another one.",
      });
    }

    const now = new Date().toISOString();

    // ✅ เก็บ avatarUrl เป็น path string (ไม่ใช่ไฟล์)
    const kidData = {
      userId,
      name: profileName,
      status: "offline",
      updated: now,
      avatarUrl: avatarUrl || "/image-avatars/1.png", // default ถ้าไม่ส่งมา
      beaconId,
      remark: remark || "-",
      createdAt: now,

      lastLat: null,
      lastLng: null,
      lastSeenAt: null,
      lastOfflineAt: null,
      lastZoneId: "",

      alertCounter: 3,
    };

    // ✅ เพิ่มข้อมูลเข้า Firestore
    const kidRef = await db.collection("kids").add(kidData);
    const createdKid = await kidRef.get();
    const createdData = createdKid.data();

    // ✅ แจ้งเตือนผ่าน LINE (optional)
    await fetch("https://api.line.me/v2/bot/message/push", {
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
              size: "giga",
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
                    text: `${profileName} has been successfully registered with ID: ${createdData.beaconId}`,
                    wrap: true,
                    size: "sm",
                    color: "#626262",
                  },
                ],
              },
            },
          },
        ],
      }),
    });

    // ✅ ตอบกลับ client
    return res.status(201).json({
      success: true,
      message: "Kid profile created successfully.",
      kid: {
        id: createdKid.id,
        ...createdData,
        updated: formatDate(createdData.updated),
        createdAt: formatDate(createdData.createdAt),
      },
    });
  } catch (error) {
    console.error("Error creating kid:", error);
    return res.status(500).json({
      success: false,
      errorCode: "SERVER_ERROR",
      message: "Internal server error. Please try again later.",
    });
  }
};



// const createKid = async (req, res) => {
//   console.log("INTO CREATE KID");

//   try {
//     const userId = req.params.id;

//     // กรณีส่งแบบ multipart/form-data ผ่าน multer:
//     // req.body จะมี fields แบบ string, req.file จะมีไฟล์ avatar
//     const { profileName, beaconId, remark } = req.body;

//     if (!profileName || !beaconId) {
//       return res
//         .status(400)
//         .json({ message: "profileName and beaconId are required" });
//     }

//     // ✅ ตรวจสอบว่า beaconId ซ้ำหรือไม่
//     const beaconQuery = await db
//       .collection("kids")
//       .where("beaconId", "==", beaconId)
//       .get();

//     if (!beaconQuery.empty) {
//       return res
//         .status(400)
//         .json({ message: "This beaconId is already in use" });
//     }

//     const now = new Date().toISOString();

//     // ข้อมูลพื้นฐานก่อนอัปโหลดไฟล์

//     const kidData = {
//       userId: userId, // string
//       name: profileName, // string
//       status: "offline", // default status
//       updated: now.toISOString(), // string timestamp
//       avatarUrl: avatarUrl || "/images/profile.png", // string, default avatar
//       beaconId: beaconId, // string
//       remark: remark || "-", // string, default "-"
//       createdAt: now.toISOString(), // string timestamp

//       lastLat: null, // number, default null
//       lastLng: null, // number, default null
//       lastSeenAt: null, // timestamp (Firestore Timestamp if needed)
//       lastOfflineAt: null, // timestamp (Firestore Timestamp if needed)
//       lastZoneId: "", // string, default empty

//       alertCounter: 0
//     };

//     // ถ้าไม่มีไฟล์ avatar ให้บันทึกข้อมูลทันที
//     if (!req.file) {
//       const kidRef = await db.collection("kids").add(kidData);
//       const createdKid = await kidRef.get();
//       const createdData = createdKid.data();

//       const response = await fetch("https://api.line.me/v2/bot/message/push", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
//         },
//         body: JSON.stringify({
//           to: userId,
//           messages: [
//             {
//               type: "flex",
//               altText: "Child's registration is complete!",
//               contents: {
//                 type: "bubble",
//                 size: "giga",
//                 body: {
//                   type: "box",
//                   layout: "vertical",
//                   contents: [
//                     {
//                       type: "text",
//                       text: "Piyo! Child's registration is complete! 🎉",
//                       weight: "bold",
//                       size: "sm",
//                     },
//                     {
//                       type: "text",
//                       text: `${profileName} has been successfully registered in our system with ID: ${createdData.beaconId}`,
//                       wrap: true,
//                       size: "sm",
//                       color: "#626262",
//                     },
//                   ],
//                 },
//               },
//             },
//           ],
//         }),
//       });

//       return res.status(201).json({
//         message: "Kid profile created",
//         kid: {
//           id: createdKid.id,
//           ...createdData,
//           updated: formatDate(createdData.updated),
//           createdAt: formatDate(createdData.createdAt),
//         },
//       });
//     }

//     // ถ้ามีไฟล์ avatar ให้ upload ก่อน
//     const file = req.file;
//     const kidRef = db.collection("kids").doc(); // สร้าง doc id ก่อน
//     const kidId = kidRef.id;
//     const fileName = `avatars/kids/${kidId}_${Date.now()}_${file.originalname}`;
//     const fileUpload = bucket.file(fileName);

//     const stream = fileUpload.createWriteStream({
//       metadata: {
//         contentType: file.mimetype,
//       },
//     });

//     stream.on("error", (err) => {
//       console.error("Upload error:", err);
//       return res
//         .status(500)
//         .json({ message: "Upload failed", error: err.message });
//     });

//     stream.on("finish", async () => {
//       try {
//         await fileUpload.makePublic();
//         const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

//         kidData.avatarUrl = publicUrl; // ใช้ URL รูปที่อัปโหลดแทน

//         await kidRef.set(kidData);

//         const createdKid = await kidRef.get();
//         const createdData = createdKid.data();

//         const response = await fetch("https://api.line.me/v2/bot/message/push", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
//           },
//           body: JSON.stringify({
//             to: userId,
//             messages: [
//               {
//                 type: "flex",
//                 altText: "Child's registration is complete!",
//                 contents: {
//                   type: "bubble",
//                   size: "mega",
//                   body: {
//                     type: "box",
//                     layout: "vertical",
//                     contents: [
//                       {
//                         type: "text",
//                         text: "Piyo! Child's registration is complete! 🎉",
//                         weight: "bold",
//                         size: "sm",
//                       },
//                       {
//                         type: "text",
//                         text: `${profileName} has been successfully registered in our system with ID: ${createdData.beaconId}`,
//                         wrap: true,
//                         size: "sm",
//                         color: "#626262",
//                       },
//                     ],
//                   },
//                 },
//               },
//             ],
//           }),
//         });

//         res.status(201).json({
//           message: "Kid profile created",
//           kid: {
//             id: kidId,
//             ...createdData,
//             updated: formatDate(createdData.updated),
//             createdAt: formatDate(createdData.createdAt),
//           },
//         });
//       } catch (e) {
//         console.error("Error saving kid after upload:", e);
//         res.status(500).json({
//           message: "Failed to save kid after upload",
//           error: e.message,
//         });
//       }
//     });

//     stream.end(file.buffer);
//   } catch (error) {
//     console.error("Error creating kid profile:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to create kid profile", error: error.message });
//   }
// };



// async function addDeviceForStudent() {
//   if (!form.value.beaconId || !form.value.deviceName || !form.value.userId || !form.value.school) {
//     alert("Please fill all required fields")
//     return
//   }

//   try {
//     isLoading.value = true

//     // POST ไปยัง endpoint student/device
//     const res = await fetch(`${config.apiDomain}/schools/${form.value.school}/students`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         beaconId: form.value.beaconId,
//         deviceName: form.value.deviceName,
//         studentId: form.value.userId,
//         status: form.value.status
//       })
//     })

//     const data = await res.json()

//     if (res.ok && data.success) {
//       emit("created", data.data)
//       closeModal()
//     } else {
//       alert(data.message || "Failed to create device")
//     }
//   } catch (err) {
//     console.error("❌ Error creating device:", err)
//     alert("Error creating device")
//   } finally {
//     isLoading.value = false
//   }
// }


const updateKid = async (req, res) => {
  console.log("INTO UPDATE KID");

  try {
    const { userId, kidId } = req.params;
    const updates = req.body; // รับข้อมูลทั้งหมดจาก body
    const kidRef = db.collection("kids").doc(kidId);
    const kidDoc = await kidRef.get();

    if (!kidDoc.exists) {
      return res.status(404).json({ message: "Kid not found" });
    }

    const kidData = kidDoc.data();

    // ตรวจสอบสิทธิ์ userId
    if (kidData.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to update this kid" });
    }

    // ตรวจสอบ beaconId ซ้ำ
    if (updates.beaconId && updates.beaconId !== kidData.beaconId) {
      const beaconQuery = await db.collection("kids")
        .where("beaconId", "==", updates.beaconId)
        .get();

      if (!beaconQuery.empty) {
        return res.status(400).json({ message: "This beaconId is already in use" });
      }
    }

    // ✅ ใช้ avatarUrl เป็น string เท่านั้น (ไม่อัปโหลด)
    if (updates.avatarUrl) {
      updates.avatarUrl = String(updates.avatarUrl);
    }

    // อัปเดตเวลา
    updates.updated = new Date().toISOString();

    // ✅ อัปเดตข้อมูล Firestore
    await kidRef.update(updates);

    const updatedDoc = await kidRef.get();

    res.json({
      message: "Kid updated successfully",
      kid: { id: kidId, ...updatedDoc.data() },
    });

  } catch (error) {
    console.error("Error updating kid:", error);
    res.status(500).json({ message: "Failed to update kid", error: error.message });
  }
};


// const updateKid = async (req, res) => {
//   console.log("INTO UPDATE KID");

//   try {
//     const { userId, kidId } = req.params;
//     const updates = req.body; // รับข้อมูลทั่วไปจาก body (name, beaconId, remark)
//     // console.log('updates:', updates);

//     const kidRef = db.collection("kids").doc(kidId);
//     const kidDoc = await kidRef.get();

//     if (!kidDoc.exists) {
//       return res.status(404).json({ message: "Kid not found" });
//     }

//     const kidData = kidDoc.data();
//     // ตรวจสอบสิทธิ์ userId
//     if (kidData.userId !== userId) {
//       // console.log(kidData.userId)
//       // console.log(userId)
//       return res
//         .status(403)
//         .json({ message: "Unauthorized to update this kid" });
//     }

//     // ✅ ถ้ามีการอัปเดต beaconId ต้องตรวจสอบว่าไม่ซ้ำ
//     if (updates.beaconId && updates.beaconId !== kidData.beaconId) {
//       const beaconQuery = await db
//         .collection("kids")
//         .where("beaconId", "==", updates.beaconId)
//         .get();

//       if (!beaconQuery.empty) {
//         return res
//           .status(400)
//           .json({ message: "This beaconId is already in use" });
//       }
//     }

//     // ถ้ามีไฟล์ avatar แนบมา (เช่น multer ตั้ง req.file)
//     if (req.file) {
//       const file = req.file;
//       const fileName = `avatars/kids/${kidId}_${Date.now()}_${file.originalname
//         }`;
//       const fileUpload = bucket.file(fileName);

//       const stream = fileUpload.createWriteStream({
//         metadata: {
//           contentType: file.mimetype,
//         },
//       });

//       stream.on("error", (err) => {
//         console.error("Upload error:", err);
//         return res
//           .status(500)
//           .json({ message: "Upload failed", error: err.message });
//       });

//       stream.on("finish", async () => {
//         try {
//           await fileUpload.makePublic();
//           const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

//           updates.avatarUrl = publicUrl;
//           updates.updated = new Date().toISOString();

//           await kidRef.update(updates);

//           const updatedDoc = await kidRef.get();
//           res.json({
//             message: "Kid updated successfully",
//             kid: { id: kidId, ...updatedDoc.data() },
//           });
//         } catch (e) {
//           console.error("Error updating Firestore after upload:", e);
//           res.status(500).json({
//             message: "Failed to update kid after upload",
//             error: e.message,
//           });
//         }
//       });

//       stream.end(file.buffer);
//     } else {
//       // ไม่มีไฟล์ avatar
//       updates.updated = new Date().toISOString();
//       await kidRef.update(updates);
//       const updatedDoc = await kidRef.get();
//       res.json({
//         message: "Kid updated successfully",
//         kid: { id: kidId, ...updatedDoc.data() },
//       });
//     }
//   } catch (error) {
//     console.error("Error updating kid:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to update kid", error: error.message });
//   }
// };

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
  getKidByKidId,
  getKidsByUserId,
  getKidByUserIdAndKidId,
  getMultipleKids,
  createKid,

  // addDeviceForStudent,

  updateKid,
  deleteKid,
};
