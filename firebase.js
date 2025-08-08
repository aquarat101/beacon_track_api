// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
require('dotenv').config()

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL, // ถ้าใช้ Realtime DB
    storageBucket: process.env.STORAGE_BUCKET
});

if (!admin.apps.length) {
    const encodedKey = process.env.GOOGLE_APPLICATION_CREDENTIALS_ENCODED;
    if (!encodedKey) {
        throw new Error("GOOGLE_APPLICATION_CREDENTIALS_ENCODED environment variable is not set.");
    }
    const decodedKey = Buffer.from(encodedKey, 'base64').toString('utf8');
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(decodedKey))
    });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
