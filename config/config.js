const dotenv = require("dotenv");

dotenv.config();

const settings = {
  API_DOMAIN: process.env.API_DOMAIN,
  CHANNEL_ACCESS_TOKEN: process.env.CHANNEL_ACCESS_TOKEN,
  CHANNEL_SECRET: process.env.CHANNEL_SECRET,

  DATABASE_URL: process.env.DATABASE_URL,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,

  GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS_ENCODED:
    process.env.GOOGLE_APPLICATION_CREDENTIALS_ENCODED,

  JWT_SECRET: process.env.JWT_SECRET,
};

module.exports = settings;
