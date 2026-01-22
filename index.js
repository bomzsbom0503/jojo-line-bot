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

// 靜態圖片
app.use("/img", express.static(path.join(__dirname, "public", "img")));

// health check
app.get("/health", (req, res) => res.send("OK"));

function getBaseUrlFromReq(req) {
  let base = process.env.BASE_URL;
  if (base && !base.startsWith("http")) base = "https://" + base;
  if (!base) {
    const host = req.get("host");
    const proto = req.get("x-forwarded-proto") || "https";
    base = `${proto}://${host}`;
  }
  return base;
}

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

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function replyImage(event, url) {
  return client.replyMessage(event.replyToken, {
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url
  });
}

/* ========= 達比賭局選單 ========= */
function darbyMenu() {
  return {
    type: "text",
    text: "🎰 達比的賭局開始了。\n你要怎麼做？",
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "YES YES YES", data: "act=yes" } },
        { type: "action", action: { type: "postback", label: "NO NO NO", data: "act=no" } },
        { type: "action", action: { type: "postback", label: "ALL IN", data: "act=allin" } }
      ]
    }
  };
}

/* ========= 達比心理戰 ========= */
async function handlePostback(event, jojoImages) {
  const act = new URLSearchParams(event.postback.data).get("act");

  if (act === "yes") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "YES" },
      { type: "text", text: "YES" },
      { type: "text", text: "YES YES YES" },
      {
        type: "image",
        originalContentUrl: jojoImages["認同"],
        previewImageUrl: jojoImages["認同"]
      }
    ]);
  }

  if (act === "no") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "NO" },
      { type: "text", text: "NO" },
      { type: "text", text: "NO NO NO" },
      {
        type: "image",
        originalContentUrl: jojoImages["拒絕"],
        previewImageUrl: jojoImages["拒絕"]
      }
    ]);
  }

  if (act === "allin") {
    const key = pick(Object.keys(jojoImages));
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "……你確定要梭哈嗎？" },
      { type: "text", text: "（對方的手在顫抖。）" },
      {
        type: "image",
        originalContentUrl: jojoImages[key],
        previewImageUrl: jojoImages[key]
      }
    ]);
  }

  return null;
}

/* ========= webhook ========= */
app.post("/webhook", line.middleware(config), async (req, res) => {
  const baseUrl = getBaseUrlFromReq(req);
  const imageMap = buildImageMap(baseUrl);

  await Promise.all(
    req.body.events.map(async (event) => {
      if (event.type === "postback") {
        return handlePostback(event, imageMap);
      }

      if (event.type !== "message" || event.message.type !== "text") return;

      const text = event.message.text.trim();

      if (text === "賭局" || text === "達比") {
        return client.replyMessage(event.replyToken, darbyMenu());
      }

      if (imageMap[text]) {
        return replyImage(event, imageMap[text]);
      }

      if (text === "抽") {
        const key = pick(Object.keys(imageMap));
        return replyImage(event, imageMap[key]);
      }
    })
  );

  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("JOJO Darby Bot running on", PORT);
});

