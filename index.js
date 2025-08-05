const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const bodyParser = require('body-parser')

const beaconRoutes = require('./routes/beaconRoutes')
const registerRoutes = require('./routes/registerRoutes')
const userRoutes = require('./routes/userRoutes')
const kidRoutes = require('./routes/kidRoutes')
const placeRoutes = require('./routes/placeRoutes')

dotenv.config()

const app = express()
const PORT = process.env.API_DOMAIN || 3001

app.use(cors())
app.use(express.json())
app.use(bodyParser.json())

app.use('/api/beacon-hit', beaconRoutes);
app.use('/register', registerRoutes)
app.use('/users', userRoutes)
app.use('/kids', kidRoutes)
app.use('/places', placeRoutes)

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)
})
