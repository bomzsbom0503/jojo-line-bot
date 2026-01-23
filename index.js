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

// ✅ Render/一般健康檢查：同時提供 / 與 /health，避免 Deploy timed out
app.get("/", (req, res) => res.send("OK"));
app.get("/health", (req, res) => res.send("OK"));

// ✅ 啟動時檢查環境變數（不阻擋啟動，但會在 log 明確提示）
if (!process.env.LINE_TOKEN || !process.env.LINE_SECRET) {
  console.error("Missing LINE_TOKEN or LINE_SECRET in environment variables.");
}

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
    好: `${baseUrl}/img/yesyesyes.png`,
    舔: `${baseUrl}/img/zerozero.png`,
    暫停: `${baseUrl}/img/za-warudo.jpg`,

    達比開場: `${baseUrl}/img/darby_opening.png`,
    達比對戰: `${baseUrl}/img/darby_mid.png`,
    達比勝利: `${baseUrl}/img/darby_got_you.png`,
    達比崩潰: `${baseUrl}/img/darby_lose.png`,
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

/**
 * ✅ 關鍵修正：YES / ALL IN 常常「按了沒反應」其實是 replyMessage 內的某張圖 URL 壞掉，
 * LINE 會整包 400，導致看起來像按鈕失效。
 * 下面做「安全圖片訊息」：URL 不存在/不是 https 就跳過那張，至少文字+按鈕會回。
 */
function makeImageMessage(jojoImages, key) {
  const url = jojoImages[key];
  if (!url || !/^https:\/\//i.test(url)) return null;
  return {
    type: "image",
    originalContentUrl: url,
    previewImageUrl: url,
  };
}
function safeMessages(arr) {
  return arr.filter(Boolean);
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

/* ========= 達比賭局 quick reply ========= */
function darbyChoiceQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "postback", label: "YES", data: "act=darby_yes" } },
      { type: "action", action: { type: "postback", label: "NO", data: "act=darby_no" } },
      { type: "action", action: { type: "postback", label: "ALL IN", data: "act=darby_allin" } },
    ],
  };
}

/* ========= 達比賭局選單（星塵鬥士） ========= */
function darbyMenu() {
  return {
    type: "text",
    text: "🎰 達比的賭局開始了。\n用生命開始下注!!。",
    quickReply: darbyChoiceQuickReply(),
  };
}

/* ========= Postback 處理 ========= */
async function handlePostback(event, jojoImages) {
  const act = new URLSearchParams(event.postback.data).get("act");
  console.log("[postback]", event.postback.data, "=> act:", act); // ✅ debug 用

  // ===== 達比賭局 =====
if (act === "darby_yes") {
  return client.replyMessage(event.replyToken, [
    { type: "image", originalContentUrl: jojoImages["達比對戰"], previewImageUrl: jojoImages["達比對戰"] },

    // ✅ 合併成一則文字（原本 3 則）
    { type: "text", text: "YES……\nYES……\n你先動搖了。" },

    { type: "image", originalContentUrl: jojoImages["達比勝利"], previewImageUrl: jojoImages["達比勝利"] },

    // ✅ 第 4 則帶 quickReply（總共 4 則）
    { type: "text", text: "下一手呢？", quickReply: darbyChoiceQuickReply() },
  ]);
}

if (act === "darby_no") {
  return client.replyMessage(event.replyToken, [
    { type: "image", originalContentUrl: jojoImages["達比對戰"], previewImageUrl: jojoImages["達比對戰"] },
    { type: "text", text: "NO……" },
    { type: "text", text: "STAND.exe 無法讀取你的內心。" },
    { type: "text", text: "賭局繼續。" },

    // ✅ 第 5 則帶 quickReply（總共 5 則）
    { type: "text", text: "選吧。", quickReply: darbyChoiceQuickReply() },
  ]);
}

if (act === "darby_allin") {
  return client.replyMessage(event.replyToken, [
    { type: "image", originalContentUrl: jojoImages["達比對戰"], previewImageUrl: jojoImages["達比對戰"] },

    // ✅ 合併成一則文字（原本 3 則）
    { type: "text", text: "……你確定？\n我還沒翻牌。\n但你已經流汗了。" },

    { type: "image", originalContentUrl: jojoImages["達比崩潰"], previewImageUrl: jojoImages["達比崩潰"] },

    // ✅ 第 4 則帶 quickReply（總共 4 則）
    { type: "text", text: "再選一次。", quickReply: darbyChoiceQuickReply() },
  ]);
}

  // ===== 杜王町 =====
  if (act === "hair") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "你剛剛是在說我髮型？" },
      makeImageMessage(jojoImages, "揍你") || { type: "text", text: "(揍你圖載入失敗)" },
    ]);
  }

  if (act === "koichi") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "欸欸欸欸欸！？" },
      makeImageMessage(jojoImages, "質疑") || { type: "text", text: "(質疑圖載入失敗)" },
    ]);
  }

  if (act === "rohan") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "我拒絕。" },
      makeImageMessage(jojoImages, "拒絕") || { type: "text", text: "(拒絕圖載入失敗)" },
    ]);
  }

  if (act === "kira") {
    return client.replyMessage(event.replyToken, [
      { type: "text", text: "我只是想過平靜的生活。" },
      makeImageMessage(jojoImages, "等我") || { type: "text", text: "(等我圖載入失敗)" },
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

  console.log("[baseUrl]", baseUrl); // ✅ debug 用

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
              "▍互動模式\n" +
              "杜王町：輸入「杜王町」或「menu」\n" +
              "達比／賭局：輸入「達比」或「賭局」\n\n" +
              "▍隨機 → 輸入「抽」\n\n" +
              "▍關鍵字\n" +
              "上車、不准、不能、反胃、快來、\n" +
              "拒絕、知道了、揍你、等我、認同、\n" +
              "說謊、廢話、質疑、變態、\n" +
              "好、舔、暫停",
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

