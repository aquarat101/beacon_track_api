// controllers/kidController.js
const { db } = require("../firebase");

exports.getKids = async (req, res) => {
    try {
        const snapshot = await db.collection("kids").get();
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(data);
    } catch (error) {
        res.status(500).send("Error getting documents: " + error);
    }
};

exports.addKid = async (req, res) => {
    try {
        const { name, status } = req.body;
        const docRef = await db.collection("kids").add({ name, status });
        res.json({ id: docRef.id });
    } catch (error) {
        res.status(500).send("Error adding document: " + error);
    }
};
