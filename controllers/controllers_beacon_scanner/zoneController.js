// zonesController.js
const { db } = require('../../firebase');

const getZones = async (req, res) => {
  try {
    const snap = await db.collection('places').get();
    const zones = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId || '',
        lat: Number(data.lat) || 0,
        lng: Number(data.lng) || 0,
        name: data.name || '',
        type: data.type || '',
        radius: data.radius || 500
      };
    });
    return res.json({ success: true, data: zones });
  } catch (e) {
    console.error('getZones error', e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getZones };
