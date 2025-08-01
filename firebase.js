// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://beacon-track-app.firebaseio.com", // ถ้าใช้ Realtime DB
});

const db = admin.firestore();

module.exports = { admin, db };
