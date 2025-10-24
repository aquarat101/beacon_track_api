const line = require("@line/bot-sdk");
const config = require("../config/config");

const client = new line.Client({
  channelAccessToken: config.CHANNEL_ACCESS_TOKEN,
  channelSecret: config.CHANNEL_SECRET,
});

const handleWebhook = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { handleWebhook };
