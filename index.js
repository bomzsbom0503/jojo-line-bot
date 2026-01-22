require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const app = express();
const client = new line.Client(config);

// JOJO 梗圖對應表
const jojoImages = {
  知道了: "https://drive.google.com/uc?export=download&id=1AbtpzJgugADry9fn995pX4efLeJc5DOS",
  說謊: "https://drive.google.com/uc?export=download&id=1Xr6URwR0XcvSIKMLZRzWCQwRG078aOSG",
  揍你: "https://drive.google.com/uc?export=download&id=1I9M0bkA7nOzW1P8TO8SmE01rYPyGeUZU",
  不准: "https://drive.google.com/uc?export=download&id=11-dR8ex7zrkidkIAShCcYSLlkRdBFApj",
  拒絕: "https://drive.google.com/uc?export=download&id=1oN8Z8ZAluBYrAKqUIyDGsQ3tuMsNkf0r"
};

// webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return null;

  const text = event.message.text.trim();

  // 指令說明
  if (text === "help" || text === "指令") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "可用指令：\n知道了 / 說謊 / 揍你 / 不准 / 拒絕\n或輸入 random 隨機"
    });
  }

  // 隨機
  if (text.toLowerCase() === "random") {
    const keys = Object.keys(jojoImages);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const url = jojoImages[key];
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url
    });
  }

  // 關鍵字回圖
  if (jojoImages[text]) {
    const url = jojoImages[text];
    return client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url
    });
  }

  // 沒對到就不回（避免群組洗版）
  return null;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JOJO bot running on port ${PORT}`);
});
