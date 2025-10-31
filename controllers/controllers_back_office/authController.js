const { db } = require("../../firebase");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../../config/config");
const { ROLES, ROLE_HIERARCHY } = require("../../constants/role");

const usersCollection = db.collection("school_users");

const findUserByEmail = async (email) => {
  const q = await usersCollection.where("email", "==", email).limit(1).get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, ...doc.data() };
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, schoolId, phone_number } = req.body;
    const creatorRole = req.user?.role;
    const creatorUid = req.user?.uid;

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required",
      });
    }

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (!creatorRole) {
      return res.status(403).json({
        success: false,
        message: "Only logged-in users can create accounts",
      });
    }

    // 🔹 Role hierarchy check
    const allowedRoles = ROLE_HIERARCHY[creatorRole] || [];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${creatorRole}' cannot create role '${role}'`,
      });
    }

    let finalSchoolId = schoolId || null;

    // Inherit schoolId if creator is SCHOOL_ADMIN
    if (creatorRole === ROLES.SCHOOL_ADMIN) {
      const creatorDoc = await usersCollection.doc(creatorUid).get();
      if (!creatorDoc.exists)
        return res
          .status(404)
          .json({ success: false, message: "Creator user not found" });
      const creatorSchoolId = creatorDoc.data().schoolId;
      if (!creatorSchoolId)
        return res.status(403).json({
          success: false,
          message: "Your account is not associated with any school",
        });
      finalSchoolId = creatorSchoolId;
    }

    // SUPER_ADMIN creating SCHOOL_ADMIN must provide schoolId
    if (creatorRole === ROLES.SUPER_ADMIN && role === ROLES.SCHOOL_ADMIN) {
      if (!schoolId)
        return res.status(400).json({
          success: false,
          message: "schoolId is required to create school_admin",
        });
      const schoolDoc = await db.collection("schools").doc(schoolId).get();
      if (!schoolDoc.exists)
        return res
          .status(404)
          .json({ success: false, message: "School not found" });
      finalSchoolId = schoolId;
    }

    // Transaction to prevent race conditions
    const userResult = await db.runTransaction(async (t) => {
      const emailLower = email.toLowerCase();

      // Check duplicate email
      const existingSnapshot = await t.get(
        usersCollection.where("email", "==", emailLower).limit(1)
      );
      if (!existingSnapshot.empty) throw new Error("Email already in use");

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Add new user
      const newUserRef = usersCollection.doc();
      const newUserData = {
        name: name || "",
        email: emailLower,
        passwordHash,
        phone_number: phone_number || null,
        role,
        schoolId: finalSchoolId,
        status: "Active",
        lastLogin: null,
        createdAt: new Date().toISOString(),
      };
      t.set(newUserRef, newUserData);

      // Log system event
      const logRef = db.collection("system_logs").doc();
      t.set(logRef, {
        action: "Add user",
        actorId: creatorUid,
        actorRole: creatorRole,
        targetUserId: newUserRef.id,
        timestamp: new Date(),
      });

      return { id: newUserRef.id, ...newUserData };
    });

    // 🔹 Success response
    const { passwordHash, ...safeUserData } = userResult;
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: safeUserData,
    });
  } catch (err) {
    // 🔹 Handle duplicate email gracefully
    if (err.message === "Email already in use") {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    // 🔹 Unexpected errors
    console.error("🔥 Unexpected register error:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await findUserByEmail(email.toLowerCase());
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const payload = { uid: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET || "secret", {
      expiresIn: config.JWT_EXPIRES_IN,
    });

    await usersCollection.doc(user.id).update({
      status: "Active",
      lastLogin: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const freshDoc = await usersCollection.doc(user.id).get();
    const freshUser = { id: user.id, ...freshDoc.data() };
    const { passwordHash, ...userWithoutPassword } = freshUser;

    res.json({ message: "Logged in", token, user: userWithoutPassword });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const logout = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const q = await usersCollection
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (q.empty) return res.status(404).json({ message: "User not found" });

    const doc = q.docs[0];
    await usersCollection
      .doc(doc.id)
      .update({ status: "Inactive", updatedAt: new Date().toISOString() });

    res.clearCookie("token");
    res.clearCookie("schoolName");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { register, login, logout };
