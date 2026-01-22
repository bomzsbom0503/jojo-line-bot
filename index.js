require("dotenv").config();
const express = require("express");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const app = express();
const client = new line.Client(config);

// 讓 Render/LINE 可以直接抓到圖片：
// https://你的網域/img/xxx.png
app.use("/img", express.static("public/img"));

// 健康檢查（可用來測服務是否在線）
app.get("/health", (req, res) => res.status(200).send("OK"));

// 你的 Render 網址（一定要在 Render 的 Environment Variables 設定 BASE_URL）
// 例如：https://jojo-line-bot.onrender.com
const BASE_URL = process.env.BASE_URL;

// 小保護：如果你忘了設 BASE_URL，直接在 log 提醒你
if (!BASE_URL) {
  console.warn(
    "[WARN] BASE_URL is not set. Please set BASE_URL in Render Environment Variables."
  );
}

// JOJO 梗圖對應表（使用 Render 專案內的圖片檔）
const jojoImages = {
  上車: `${BASE_URL}/img/shangche.png`,
  不准: `${BASE_URL}/img/buzhun.png`,
  不能: `${BASE_URL}/img/buneng.png`,
  反胃: `${BASE_URL}/img/fanwei.png`,
  快來: `${BASE_URL}/img/kuailai.png`,
  拒絕: `${BASE_URL}/img/jujue.png`,
  知道了: `${BASE_URL}/img/zhidaole.png`,
  揍你: `${BASE_URL}/img/zouni.png`,
  等我: `${BASE_URL}/img/dengwo.png`,
  認同: `${BASE_URL}/img/rentong.png`,
  說謊: `${BASE_URL}/img/shuohuang.png`,
  廢話: `${BASE_URL}/img/feihua.png`,
  質疑: `${BASE_URL}/img/zhiyi.png`,
  變態: `${BASE_URL}/img/biantai.png`
};

// webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error("Webhook error:", err);
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
      text:
        "可用指令：\n" +
        "廢話 / 認同 / 反胃 / 不能 / 不准 / 拒絕 / 知道了 / 說謊 / 揍你 / 退後(用「等我」先頂著) / 變態 / 上車 / 快來 / 等我 / 質疑\n" +
        "或輸入 random 隨機"
    });
  }

  // 隨機
  if (text.toLowerCase() === "random") {
    const keys = Object.keys(jojoImages);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const url = jojoImages[key];

    try {
      return await client.replyMessage(event.replyToken, {
        type: "image",
        originalContentUrl: url,
        previewImageUrl: url
      });
    } catch (e) {
      console.error("Reply random image failed:", e);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "圖片回傳失敗（可能是 BASE_URL 或圖片檔名/路徑有誤）。"
      });
    }
  }

  // 關鍵字回圖
  if (jojoImages[text]) {
    const url = jojoImages[text];

    try {
      return await client.replyMessage(event.replyToken, {
        type: "image",
        originalContentUrl: url,
        previewImageUrl: url
      });
    } catch (e) {
      console.error(`Reply image failed for keyword "${text}":`, e);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "圖片回傳失敗（請確認圖片能用瀏覽器直接打開）。"
      });
    }
  }

  // 沒對到就不回（避免群組洗版）
  return null;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JOJO bot running on port ${PORT}`);
});

