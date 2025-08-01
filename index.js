const cors = require('cors')
const dotenv = require('dotenv')
const express = require('express')
const bodyParser = require('body-parser')

const kidController = require('./controllers/kidController')
const placeRoutes = require('./routes/placeRoutes')
const registerRoutes = require('./routes/registerRoutes')
const usersRoutes = require('./routes/userRoutes');
const beaconRoutes = require('./routes/beaconRoutes');

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(bodyParser.json())

app.use('/api/beacon-hit', beaconRoutes);

app.use('/places', placeRoutes)
app.use('/register', registerRoutes)
app.use('/users', usersRoutes)

app.get('/kids', kidController.getKids)
app.post('/kids', kidController.addKid)

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
