const express = require("express");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const app = express();
const client = new line.Client(config);

app.post("/webhook", line.middleware(config), (req, res) => {
  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("JOJO bot running on port 3000");
});
