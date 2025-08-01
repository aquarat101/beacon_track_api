const { db } = require('../firebase'); // สมมติว่าคุณแยก firebase init ไว้ไฟล์นี้

const getBeaconHits = async (req, res) => {
    try {
        const { beaconName, serial, zoneId, zoneName } = req.query;

        const missingFields = [];
        if (!beaconName) missingFields.push('beaconName');
        if (!serial) missingFields.push('serial');
        if (!zoneId) missingFields.push('zoneId');
        if (!zoneName) missingFields.push('zoneName');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields.',
                missingFields
            });
        }

        let query = db.collection('beacon_zone_hits')
            .where('beaconName', '==', beaconName)
            .where('serial', '==', serial)
            .where('zoneId', '==', zoneId)
            .where('zoneName', '==', zoneName);

        const snapshot = await query.get();

        if (snapshot.empty) {
            return res.status(404).json({
                success: false,
                message: 'No matching documents found.'
            });
        }

        const results = [];
        snapshot.forEach(doc => {
            results.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        console.error('Error fetching beacon hits:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch beacon hits.',
            error: error.message
        });
    }
};

module.exports = { getBeaconHits }