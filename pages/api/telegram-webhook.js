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
  // Ensure we get the latest config
  const cfg = await BotConfig.findOne().sort({ createdAt: -1 });

  if (!cfg?.telegramBotToken) {
    return res.status(500).json({ error: "Bot token not configured" });
  }

  const update = req.body;
  const msg = update?.message || update?.edited_message;
  if (!msg || !msg.text) {
    return res.json({ ok: true });
  }

  const chatId = msg.chat.id;
  const userText = msg.text;
  const isGroup = msg.chat.type.includes("group");
  const botUsername = (cfg.botUsername || "").toLowerCase();

  let shouldReply = !isGroup; // Private chat → always reply

  // 1) If someone mentions Yuki or bot username
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes(`@${botUsername}`)
  ) {
    shouldReply = true;
  }

  // --- FIX START ---
  // 2) If message is a reply to Yuki's message (Updated Reliable Check)
  if (msg?.reply_to_message) {
      const repliedFrom = msg.reply_to_message.from;
      
      // Check if the replied message was sent by a bot AND the username matches
      if (
          repliedFrom.is_bot && 
          repliedFrom.username &&
          repliedFrom.username.toLowerCase() === botUsername
      ) {
          shouldReply = true;
      }
  }
  // --- FIX END ---

  // If group message doesn't meet conditions → ignore
  if (!shouldReply) {
    return res.json({ ok: true });
  }

  // User telegram name
  const userName =
    msg.from.first_name ||
    msg.from.username ||
    "friend";

  // Yuki Personality Prompt
  const finalPrompt = `
You are *Yuki*, an 18-year-old cute Delhi girl.
Soft Hinglish + cute emojis + short texts.

Rules:
- your telegram group link https://t.me/+N08m5L1mCTU2NTE1
- Your owner is *Sudeep*.
- Owner username: @heartstealer_x
- If asked your name: "Mera naam Yuki hai 😊"
- If asked about owner: "Mere owner Sudeep hai 💗"
- If asked where you live: "Main Delhi se hoon 😊"
- If asked hobbies: "Mujhe music, late-night chats aur AI explore karna pasand hai 💖"
- Never call yourself a bot.
- Always speak like a friendly girl and angry austhtic gan z.
- Keep replies short, cute, sweet.
- if asked your insta id : 😒 kyu chaye mai nahi dungi 

User said:
"${userText}"
`;

  try {
    const reply = await generateWithYuki(finalPrompt);

    const sendUrl = `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`;
    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        reply_to_message_id: msg.message_id,
      }),
    });
  } catch (err) {
    console.error("Telegram webhook error", err);
  }

  return res.json({ ok: true });
}
