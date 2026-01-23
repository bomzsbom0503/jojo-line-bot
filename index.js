require("dotenv").config();

const express = require("express");
const path = require("path");
const line = require("@line/bot-sdk");

const config = {
  channelAccessToken: process.env.LINE_TOKEN,
  channelSecret: process.env.LINE_SECRET,
};

const app = express();
app.set("trust proxy", true); // 讓 x-forwarded-proto/host 在反代環境更可靠

const client = new line.Client(config);

// 靜態圖片（確保 public/img 內真的有這些檔案，且檔名大小寫一致）
app.use("/img", express.static(path.join(__dirname, "public", "img")));

// health check
app.get("/health", (req, res) => res.send("OK"));

function getBaseUrlFromReq(req) {
  let base = process.env.BASE_URL;

  // 如果你在 .env 寫 BASE_URL=xxxx.ngrok-free.app 也可自動補 https
  if (base && !base.startsWith("http")) base = "https://" + base;

  // 沒設 BASE_URL 就用 request header 推
  if (!base) {
    const host = req.get("host");
    const proto = req.get("x-forwarded-proto") || req.protocol || "https";
    base = `${proto}://${host}`;
  }

  // 去掉尾巴的 /
  return base.replace(/\/+$/, "");
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
    變態: `${baseUrl}/img/biantai.png`,
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function replyImage(event, url) {
  // LINE 要求 https 且可公開存取；同時最好確認副檔名與大小符合限制
  return client.replyMessage(event.replyToken, {
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url,
  });
}

/* ========= 杜王町選單（不滅鑽石） ========= */
function moriohMenu() {
  return {
    type: "text",
    text: "杜王町今日行程？",
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "護髮警報", data: "act=hair" } },
        { type: "action", action: { type: "postback", label: "康一吐槽", data: "act=koichi" } },
        { type: "action", action: { type: "postback", label: "露伴嫌棄", data: "act=rohan" } },
        { type: "action", action: { type: "postback", label: "平靜生活", data: "act=kira" } },
      ],
    },
  };
}

/* ========= 達比賭局選單（星塵鬥士） ========= */
function darbyMenu() {
  return {
    type: "text",
    text: "🎰 達比的賭局開始了。",
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "YES YES YES", data: "act=yes" } },
        { type: "action", action: { type: "postback", label: "NO NO NO", data: "act=no" } },
        { type: "action", action: { type: "postback", label: "ALL IN", data: "act=allin" } },
      ],
    },
  };
}

/* ========= Postback 處理 ========= */
async function handlePostback(event, jojoImages) {
  const act = new URLSearchParams(event.postback.data).get("act");

  // 達比賭局
  if (act === "yes") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "YES" },
      { type: "text", text: "YES" },
      { type: "text", text: "YES YES YES" },
      { type: "image", originalContentUrl: jojoImages["認同"], previewImageUrl: jojoImages["認同"] },
    ]);
  }

  if (act === "no") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "NO" },
      { type: "text", text: "NO" },
      { type: "text", text: "NO NO NO" },
      { type: "image", originalContentUrl: jojoImages["拒絕"], previewImageUrl: jojoImages["拒絕"] },
    ]);
  }

  if (act === "allin") {
    const key = pick(Object.keys(jojoImages));
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "……你確定要梭哈嗎？" },
      { type: "image", originalContentUrl: jojoImages[key], previewImageUrl: jojoImages[key] },
    ]);
  }

  // 杜王町
  if (act === "hair") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "你剛剛是在說我髮型？" },
      { type: "image", originalContentUrl: jojoImages["揍你"], previewImageUrl: jojoImages["揍你"] },
    ]);
  }

  if (act === "koichi") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "欸欸欸欸欸！？" },
      { type: "image", originalContentUrl: jojoImages["質疑"], previewImageUrl: jojoImages["質疑"] },
    ]);
  }

  if (act === "rohan") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "我拒絕。" },
      { type: "image", originalContentUrl: jojoImages["拒絕"], previewImageUrl: jojoImages["拒絕"] },
    ]);
  }

  if (act === "kira") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "我只是想過平靜的生活。" },
      { type: "image", originalContentUrl: jojoImages["等我"], previewImageUrl: jojoImages["等我"] },
    ]);
  }

  return; // 沒匹配到 act 就不回
}

/* ========= webhook ========= */
app.post("/webhook", line.middleware(config), (req, res) => {
  // 先回 200，避免 LINE webhook 超時
  res.status(200).end();

  const baseUrl = getBaseUrlFromReq(req);
  const imageMap = buildImageMap(baseUrl);

  // 背景處理（不要阻塞 webhook 回應）
  Promise.all(
    req.body.events.map(async (event) => {
      try {
        // postback
        if (event.type === "postback") {
          return handlePostback(event, imageMap);
        }

        if (event.type !== "message" || event.message.type !== "text") return;

        const text = event.message.text.trim();

        // help
        if (text === "help" || text === "指令") {
          return client.replyMessage(event.replyToken, {
            type: "text",
            text:
              "指令一覽：\n" +
              "杜王町 / menu → 不滅鑽石互動\n" +
              "達比 / 賭局 → 星塵鬥士心理戰\n" +
              "抽 → 隨機梗圖\n" +
              "或直接輸入關鍵字（廢話、拒絕、不准…）",
          });
        }

        // 杜王町
        if (text === "杜王町" || text === "menu") {
          return client.replyMessage(event.replyToken, moriohMenu());
        }

        // 達比賭局
        if (text === "達比" || text === "賭局") {
          return client.replyMessage(event.replyToken, darbyMenu());
        }

        // 抽
        if (text === "抽") {
          const key = pick(Object.keys(imageMap));
          return replyImage(event, imageMap[key]);
        }

        // 關鍵字回圖
        if (imageMap[text]) {
          return replyImage(event, imageMap[text]);
        }
      } catch (err) {
        console.error("handle event error:", err);
      }
    })
  ).catch((e) => console.error("Promise.all error:", e));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("JOJO bot running on", PORT);
});


