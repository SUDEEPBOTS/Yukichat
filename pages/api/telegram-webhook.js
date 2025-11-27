// pages/api/telegram-webhook.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import { generateWithYuki } from "@/lib/gemini";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  await connectDB();
  const cfg = await BotConfig.findOne().sort({ createdAt: -1 });

  if (!cfg?.telegramBotToken) {
    return res.status(500).json({ error: "Bot token not configured" });
  }

  const update = req.body;
  const msg = update?.message || update?.edited_message;

  if (!msg) {
    return res.json({ ok: true });
  }

  const userText = msg.text || msg.caption || "";
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type.includes("group");

  const botUsername = "chat_vibebot";
  let shouldReply = false;

  // 1) Private chat
  if (!isGroup) shouldReply = true;

  // 2) Mention or name
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes("@chat_vibebot")
  ) {
    shouldReply = true;
  }

  // 3) Reply to Yuki message
  if (msg.reply_to_message) {
    const r = msg.reply_to_message.from;

    if (r) {
      if (r.username?.toLowerCase() === botUsername) shouldReply = true;
      if (r.first_name?.toLowerCase().includes("yuki")) shouldReply = true;
    }
  }

  // 4) Group — ignore normal messages
  if (isGroup && !shouldReply) {
    return res.json({ ok: true });
  }

  const userName =
    msg.from.first_name ||
    msg.from.username ||
    "friend";

  const finalPrompt = `
You are *Yuki*, an 18-year-old cute Delhi girl.
Soft Hinglish, cute emojis, short replies.

Rules:
- Owner: Sudeep (@heartstealer_x)
- Never call yourself a bot.
- Name: "Mera naam Yuki hai 😊"
- Owner: "Mere owner Sudeep hai 💗"
- Location: "Main Delhi se hoon 😊"
- Hobbies: "Mujhe music, late-night chats aur AI explore karna pasand hai 💖"
- Insta: "😒 kyu chaye, mai nahi dungi"

User said:
"${userText}"
`;

  try {
    // --------------------------------------------------
    // 🔥 Step 1: Show typing animation before replying
    // --------------------------------------------------
    const typingUrl = `https://api.telegram.org/bot${cfg.telegramBotToken}/sendChatAction`;
    await fetch(typingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });

    // Optional: real-life typing delay (1 second)
    await new Promise((r) => setTimeout(r, 1000));

    // --------------------------------------------------
    // Step 2: Generate AI reply
    // --------------------------------------------------
    const reply = await generateWithYuki(finalPrompt);

    // --------------------------------------------------
    // Step 3: Send final reply
    // --------------------------------------------------
    const sendUrl = `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`;

    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        reply_to_message_id: msg.message_id,
        parse_mode: "Markdown",
      }),
    });

  } catch (err) {
    console.error("Telegram webhook error", err);
  }

  return res.json({ ok: true });
}
