require("dotenv").config();
const express = require("express");
const path = require("path");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET
};

const app = express();
const client = new line.Client(config);

// 用絕對路徑提供靜態圖片（Render/LINE 最穩）
app.use("/img", express.static(path.join(__dirname, "public", "img")));

// 健康檢查
app.get("/health", (req, res) => res.status(200).send("OK"));

// 取得 BASE_URL：
// 1) 優先用環境變數
// 2) 沒設就用 request 的 host 自動推導（避免 undefined）
function getBaseUrlFromReq(req) {
  let base = process.env.BASE_URL;

  if (base && !base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }

  if (!base) {
    const host = req.get("host"); // e.g. jojo-line-bot.onrender.com
    const proto = req.get("x-forwarded-proto") || "https";
    base = `${proto}://${host}`;
  }

  return base;
}

// 依 baseUrl 生成圖片對應表
function buildImageMap(baseUrl) {
  return {
    上車: `${baseUrl}/img/shangche.png`,
    不准: `${baseUrl}/img/buzhun.png`,
    不能: `${baseUrl}/img/buneng.png`,
    反胃: `${baseUrl}/img/fanwei.png`,
    快來: `${baseUrl}/img/kuailai.png`,
    拒絕: `${baseUrl}/img/jujue.png`,
    知道了: `${baseUrl}/img/zhidaole.png`,
    揍你: `${baseUrl}/img/zouni.png`,
    等我: `${baseUrl}/img/dengwo.png`,
    認同: `${baseUrl}/img/rentong.png`,
    說謊: `${baseUrl}/img/shuohuang.png`,
    廢話: `${baseUrl}/img/feihua.png`,
    質疑: `${baseUrl}/img/zhiyi.png`,
    變態: `${baseUrl}/img/biantai.png`
  };
}

// webhook
app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    const baseUrl = getBaseUrlFromReq(req);
    const imageMap = buildImageMap(baseUrl);

    await Promise.all(req.body.events.map((ev) => handleEvent(ev, imageMap)));
    res.status(200).end();
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).end();
  }
});

async function replyImage(event, url, note = "") {
  console.log("[Reply image]", note, url);

  try {
    return await client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url
    });
  } catch (e) {
    // LINE SDK 的錯誤資訊有時在 originalError
    console.error("Reply image failed:", e?.originalError || e);

    // 把實際 URL 回給你，方便你直接點開驗證
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `圖片回傳失敗。\n請用瀏覽器開這個網址確認：\n${url}`
    });
  }
}

async function handleEvent(event, jojoImages) {
  if (event.type !== "message" || event.message.type !== "text") return null;

  const text = event.message.text.trim();

  // 指令說明
  if (text === "help" || text === "指令") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        "可用指令：\n" +
        "廢話 / 認同 / 反胃 / 不能 / 不准 / 拒絕 / 知道了 / 說謊 / 揍你 / 變態 / 上車 / 快來 / 等我 / 質疑\n" +
        "或輸入 抽 隨機"
    });
  }

  // 隨機
  if (text.toLowerCase() === "抽") {
    const keys = Object.keys(jojoImages);
    const key = keys[Math.floor(Math.random() * keys.length)];
    const url = jojoImages[key];
    return replyImage(event, url, `random:${key}`);
  }

  // 關鍵字回圖
  if (jojoImages[text]) {
    return replyImage(event, jojoImages[text], `keyword:${text}`);
  }

  // 沒對到就不回（避免群組洗版）
  return null;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JOJO bot running on port ${PORT}`);
});
