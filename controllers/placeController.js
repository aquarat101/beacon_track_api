// controllers/placeController.js
const db = require('../firebase')

const getPlacesByUserId = async (req, res) => {
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

module.exports = {
    getPlacesByUserId
}