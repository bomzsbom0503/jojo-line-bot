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
    const host = req.get("host");
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

function pickRandomKey(obj) {
  const keys = Object.keys(obj);
  return keys[Math.floor(Math.random() * keys.length)];
}

// 回圖（含除錯）
async function replyImage(event, url, note = "") {
  console.log("[Reply image]", note, url);
  try {
    return await client.replyMessage(event.replyToken, {
      type: "image",
      originalContentUrl: url,
      previewImageUrl: url
    });
  } catch (e) {
    console.error("Reply image failed:", e?.originalError || e);
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `圖片回傳失敗。\n請用瀏覽器開這個網址確認：\n${url}`
    });
  }
}

/** 不滅鑽石風格 Quick Reply 選單 */
function quickMenuMessage() {
  return {
    type: "text",
    text: "杜王町今日行程？（點一下）",
    quickReply: {
      items: [
        { type: "action", action: { type: "postback", label: "護髮警報", data: "act=hair" } },
        { type: "action", action: { type: "postback", label: "康一吐槽", data: "act=koichi" } },
        { type: "action", action: { type: "postback", label: "露伴嫌棄", data: "act=rohan" } },
        { type: "action", action: { type: "postback", label: "平靜生活", data: "act=kira" } },
        { type: "action", action: { type: "postback", label: "杜王町抽卡", data: "act=morioh_draw" } }
      ]
    }
  };
}

/** 不滅鑽石互動劇情（postback） */
async function handlePostback(event, jojoImages) {
  const data = event.postback?.data || "";
  const act = new URLSearchParams(data).get("act");

  const img = (key) => ({
    type: "image",
    originalContentUrl: jojoImages[key],
    previewImageUrl: jojoImages[key]
  });

  const say = (text) => ({ type: "text", text });
  const pick = (...arr) => arr[Math.floor(Math.random() * arr.length)];

  if (act === "hair") {
    // 仗助護髮梗：有人嘴髮型 -> 進入護髮模式
    const lines = [
      "你剛剛…是在說我髮型怎樣？",
      "等一下，你那句話再說一次？",
      "我最討厭別人拿我的頭髮開玩笑。"
    ];
    const end = pick("揍你", "不准", "不能");
    return client.replyMessage(event.replyToken, [
      say(pick(...lines)),
      say("（空氣瞬間變冷，杜王町的午後不再和平。）"),
      img(end)
    ]);
  }

  if (act === "koichi") {
    // 康一的日常吐槽
    const lines = [
      "欸欸欸欸欸——這也太誇張了吧！？",
      "等等…這種事在杜王町不是日常嗎？",
      "我只是個高中生，為什麼每天都像在解事件…"
    ];
    const end = pick("質疑", "廢話", "反胃");
    return client.replyMessage(event.replyToken, [
      say(pick(...lines)),
      say("（康一默默把吐槽吞回去。）"),
      img(end)
    ]);
  }

  if (act === "rohan") {
    // 露伴：嫌棄、挑剔、素材感
    const lines = [
      "不行。這不夠『真實』。",
      "你這段發言…我可以拿去當素材嗎？",
      "我拒絕。因為我已經看穿你了。"
    ];
    const end = pick("拒絕", "不准", "知道了");
    return client.replyMessage(event.replyToken, [
      say("岸邊露伴："),
      say(pick(...lines)),
      img(end)
    ]);
  }

  if (act === "kira") {
    // 吉良：平靜生活梗化（不涉血腥）
    const lines = [
      "我只是想過平靜的生活。",
      "我不追求勝利…也不追求失敗。",
      "只要能在杜王町安穩度日就好。"
    ];
    const end = pick("等我", "知道了", "不准");
    return client.replyMessage(event.replyToken, [
      say(pick(...lines)),
      say("（你覺得他講得很有道理…但哪裡怪怪的。）"),
      img(end)
    ]);
  }

  if (act === "morioh_draw") {
    // 杜王町抽卡：抽到梗圖＋一句第四部旁白
    const key = pickRandomKey(jojoImages);
    const flavor = [
      "杜王町日常判定：今天適合用這張回。",
      "替身反應：你講的這句…需要圖解。",
      "旁白：在杜王町，這叫做『很合理』。",
      "康一：欸欸欸欸欸——又來了！？"
    ];
    return client.replyMessage(event.replyToken, [
      say(pick(...flavor)),
      img(key)
    ]);
  }

  // 沒命中就回選單
  return client.replyMessage(event.replyToken, quickMenuMessage());
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

async function handleEvent(event, jojoImages) {
  // 先接 postback（按鈕互動）
  if (event.type === "postback") {
    return handlePostback(event, jojoImages);
  }

  // 一般文字訊息
  if (event.type !== "message" || event.message.type !== "text") return null;

  const text = event.message.text.trim();

  // 呼叫互動選單
  if (text === "menu" || text === "杜王町" || text === "劇情" || text === "互動") {
    return client.replyMessage(event.replyToken, quickMenuMessage());
  }

  // 指令說明
  if (text === "help" || text === "指令") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
        "可用指令：\n" +
        "廢話 / 認同 / 反胃 / 不能 / 不准 / 拒絕 / 知道了 / 說謊 / 揍你 / 變態 / 上車 / 快來 / 等我 / 質疑\n" +
        "抽（隨機回圖）\n" +
        "menu / 杜王町（不滅鑽石互動按鈕）"
    });
  }

  // 隨機回圖（你原本的「抽」）
  if (text === "抽") {
    const key = pickRandomKey(jojoImages);
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
