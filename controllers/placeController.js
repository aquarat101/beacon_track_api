let places = []  // ใช้ array ชั่วคราวก่อนมี DB

const getPlaces = (req, res) => {
    res.json(places)
}

const addPlace = (req, res) => {
    const { name, lat, lng } = req.body
    const newPlace = { id: Date.now(), name, lat, lng }
    places.push(newPlace)
    res.status(201).json(newPlace)
}

module.exports = { getPlaces, addPlace };