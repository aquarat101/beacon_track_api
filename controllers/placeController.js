const { db } = require('../firebase')

const getPlacesByUserId = async (req, res) => {
    console.log("INTO GET PLACES BY USER ID")

    const userId = req.params.userId

    try {
        const snapshot = await db.collection('places').where('userId', '==', userId).get()

        if (snapshot.empty) {
            return res.status(404).json({ message: 'ไม่พบสถานที่ของผู้ใช้คนนี้' })
        }

        const places = []
        snapshot.forEach(doc => {
            places.push({ id: doc.id, ...doc.data() })
        })

        res.json(places)
    } catch (error) {
        console.error('เกิดข้อผิดพลาด:', error)
        res.status(500).json({ message: 'เกิดข้อผิดพลาดขณะดึงข้อมูล', error: error.message })
    }
}

const addPlace = async (req, res) => {
    console.log("INTO ADD PLACE")

    try {
        const { userId, name, address, type, remark, lat, lng } = req.body;

        const missingFields = []

        if (!userId) missingFields.push('userId')
        if (!name) missingFields.push('name')
        if (!address) missingFields.push('address')
        if (!type) missingFields.push('type')

        if (missingFields.length > 0) {
            console.log(missingFields)
            return res.status(400).json({
                message: 'Missing required fields',
            })
        } else {
            console.log("All passed")
        }

        const newPlace = {
            userId,
            name,
            address,
            type,
            remark: remark || '-',
            lat: lat,
            lng: lng,
            createdAt: new Date(),
        };

        const docRef = await db.collection('places').add(newPlace);

        res.status(201).json({
            message: 'Place added successfully',
            id: docRef.id,
            data: newPlace,
        });
    } catch (error) {
        console.error('Error adding place:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const updatePlace = async (req, res) => {
    console.log("INTO UPDATE PLACE");

    const placeId = req.params.placeId;

    try {
        const updates = req.body;

        if (!placeId) {
            return res.status(400).json({ message: 'Place ID is required' });
        }

        const docRef = db.collection('places').doc(placeId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'ไม่พบสถานที่ที่ต้องการอัปเดต' });
        }

        await docRef.update({
            ...updates,
            updatedAt: new Date()
        });

        res.json({ message: 'อัปเดตสถานที่เรียบร้อยแล้ว' });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตสถานที่:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดขณะอัปเดตข้อมูล', error: error.message });
    }
};

const deletePlace = async (req, res) => {
    console.log("INTO DELETE PLACE")

    const placeId = req.params.placeId;

    try {
        const docRef = db.collection('places').doc(placeId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'ไม่พบสถานที่ที่ต้องการลบ' });
        }

        await docRef.delete();

        res.json({ message: 'ลบสถานที่เรียบร้อยแล้ว' });
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการลบสถานที่:', error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดขณะลบข้อมูล', error: error.message });
    }
};


module.exports = {
    getPlacesByUserId,
    addPlace,
    updatePlace,
    deletePlace
}