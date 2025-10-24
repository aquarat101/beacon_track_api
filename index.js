const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const line = require("@line/bot-sdk");

// Routes
const beaconRoutes = require("./routes/beaconRoutes");
const registerRoutes = require("./routes/registerRoutes");
const userRoutes = require("./routes/userRoutes");
const kidRoutes = require("./routes/kidRoutes");
const placeRoutes = require("./routes/placeRoutes");
const authRoute = require("./routes/routes_back_office/authRoutes");
const schoolRoute = require("./routes/routes_back_office/schoolRoutes");

const config = require("./config/config");

// LINE Client
const client = new line.Client({
  channelAccessToken: config.CHANNEL_ACCESS_TOKEN,
  channelSecret: config.CHANNEL_SECRET,
});

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

app.post("/", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "follow") {
      await client.replyMessage(event.replyToken, [
        {
          type: "flex",
          altText: "Welcome to Beacon Piyo!👋",
          contents: {
            type: "bubble",
            size: "mega",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "Welcome to Beacon Piyo!👋",
                  weight: "bold",
                  size: "sm",
                  margin: "none",
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "Piyo Piyo are a dedicated service empowering parents with confidence in their child's safety, utilizing advanced, user-friendly, and reliable Beacon tracking technology.",
                          color: "#626262",
                          size: "sm",
                          flex: 1,
                          wrap: true,
                          weight: "regular",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          type: "flex",
          altText: "Welcome to Beacon Piyo!👋",
          contents: {
            type: "bubble",
            size: "mega",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  margin: "lg",
                  spacing: "sm",
                  contents: [
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: 'Start ensuring your child\'s peace of mind today! Please tap the "Register Now!" button below or click this link to create your member account and fully begin using our service.',
                          color: "#626262",
                          size: "sm",
                          flex: 1,
                          wrap: true,
                          weight: "regular",
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "Link for Registration",
                      size: "sm",
                      weight: "bold",
                      action: {
                        type: "uri",
                        label: "action",
                        uri: "https://beacon-cms.ksta.co/auth/register",
                      },
                      decoration: "underline",
                    },
                  ],
                  margin: "md",
                },
              ],
            },
          },
        },
      ]);
    }
  }
});

app.listen(config.API_DOMAIN, () => {
  console.log(`Server running on port: ${config.API_DOMAIN}`);
});
