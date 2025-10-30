// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const config = require("./config/config");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: config.STORAGE_BUCKET,
});

if (!admin.apps.length) {
  const encodedKey = config.GOOGLE_APPLICATION_CREDENTIALS_ENCODED;
  if (!encodedKey) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS_ENCODED environment variable is not set."
    );
  }
  const decodedKey = Buffer.from(encodedKey, "base64").toString("utf8");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(decodedKey)),
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
