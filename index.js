const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");

// Routes
const beaconRoutes = require("./routes/beaconRoutes");
const registerRoutes = require("./routes/registerRoutes");
const userRoutes = require("./routes/userRoutes");
const kidRoutes = require("./routes/kidRoutes");
const placeRoutes = require("./routes/placeRoutes");
const authRoute = require("./routes/routes_back_office/authRoutes");
const schoolRoute = require("./routes/routes_back_office/schoolRoutes");
const lineRoute = require("./routes/lineRoutes");

const config = require("./config/config");

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.use("/beacons", beaconRoutes);
app.use("/register", registerRoutes);
app.use("/users", userRoutes);
app.use("/kids", kidRoutes);
app.use("/places", placeRoutes);

app.use("/auth", authRoute);
app.use("/schools", schoolRoute);

app.use("/", lineRoute);

app.listen(config.API_DOMAIN, () => {
  console.log(`Server running on port: ${config.API_DOMAIN}`);
});
