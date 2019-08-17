'use strict';
require('dotenv').config();
const BootBot = require('bootbot');

const bot = new BootBot({
  accessToken: process.env.FB_ACCESS_TOKEN,
  verifyToken: 'VERIFY_TOKEN',
  appSecret: process.env.FB_APP_SECRET
});

bot.start(process.env.PORT || 3000);
