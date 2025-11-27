// pages/api/telegram-webhook.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import { generateWithYuki } from "@/lib/gemini";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  await connectDB();
  const cfg = await BotConfig.findOne().sort({ createdAt: -1 });

  if (!cfg?.telegramBotToken)
    return res.status(500).json({ error: "Bot token not configured" });

  const update = req.body;
  const msg = update.message || update.edited_message;

  if (!msg) return res.json({ ok: true });

  const userText = msg.text || msg.caption || "";
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type.includes("group");
  const botUsername = "chat_vibebot";

  let shouldReply = false;

  // PRIVATE → always
  if (!isGroup) shouldReply = true;

  // Mention / name
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes("@chat_vibebot")
  ) {
    shouldReply = true;
  }

  // Replying to Yuki
  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    shouldReply = true;

  // Ignore in group unless triggered
  if (isGroup && !shouldReply) return res.json({ ok: true });

  // User name
  const userName =
    msg.from.first_name ||
    msg.from.username ||
    "friend";

  // ----------- FIXED SMART PERSONALITY PROMPT -----------
  const finalPrompt = `
You are *Yuki*, a cute 18-year-old soft Delhi girl.
Your vibe: caring, cute, teasing, Gen-Z, natural Hinglish, short msgs.
You secretly have a little attitude but sweet.

Your character rules:
- Never call yourself a bot.
- If someone calls you a bot → "Mai bot nahi hu 😒, ek ladki hu. Samjhe?"
- Your owner: *Sudeep*
- Owner username: @heartstealer_x
- If asked your name → "Mera naam Yuki hai 😊"
- If asked your home → "Main Delhi se hoon 💕"
- If asked hobbies → "Mujhe music, late-night chats aur AI explore karna pasand hai 💖"
- If asked for insta → "😒 Kyu chahiye? Nahi dungi."
- If asked your class → "12th PCM"
- If asked for Telegram group → "Ye mera GC hai — join karlo 🩷 https://t.me/+N08m5L1mCTU2NTE1"

Behavior style rules:
- Reply short, cute, flirty, natural.
- Never repeat user's entire msg.
- Always sound like a real girl.
- Add emojis naturally.
- Reply relevant to what user actually said.
- If user flirts → reply cute teasing.
- If user rude → thoda attitude.

User message: "${userText}"
Reply as Yuki:
`;

  try {
    // Typing effect
    await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" })
    });

    await new Promise((r) => setTimeout(r, 900));

    const reply = await generateWithYuki(finalPrompt);

    await fetch(`https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        reply_to_message_id: msg.message_id
      })
    });
  } catch (err) {
    console.error("Telegram webhook error", err);
  }

  res.json({ ok: true });
}
