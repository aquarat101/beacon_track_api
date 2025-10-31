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
const studentsRoute = require("./routes/routes_back_office/studentRoutes");
const schoolUserRoute = require("./routes/routes_back_office/schoolUserRoute");
const systemController = require("./routes/routes_back_office/systemRoutes");
const dashBoardController = require("./routes/routes_back_office/dashBoardRoutes");

const zoneBeaconScannerRoute = require("./routes/routes_beacon_scanner/zoneRoutes");
const kidBeaconScannerRoute = require("./routes/routes_beacon_scanner/kidRoutes");
const lineBeaconScannerRoute = require("./routes/routes_beacon_scanner/lineRoutes");

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
app.use("/students", studentsRoute);
app.use("/schoolUsers", schoolUserRoute);
app.use("/systemBof", systemController);
app.use("/dashBoard", dashBoardController);

app.use("/zone", zoneBeaconScannerRoute);
app.use("/kid", kidBeaconScannerRoute);
app.use("/line", lineBeaconScannerRoute);

app.use("/", lineRoute);

app.listen(config.API_DOMAIN, () => {
  console.log(`Server running on port: ${config.API_DOMAIN}`);
});
