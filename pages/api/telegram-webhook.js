// pages/api/telegram-webhook.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import ChatMemory from "@/models/ChatMemory";
import { generateWithYuki } from "@/lib/gemini";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  await connectDB();
  const cfg = await BotConfig.findOne().sort({ createdAt: -1 });

  if (!cfg?.telegramBotToken)
    return res.status(500).json({ error: "Bot token missing" });

  const update = req.body;
  const msg = update?.message || update?.edited_message;
  if (!msg) return res.json({ ok: true });

  const chatId = msg.chat.id.toString();
  const userId = msg.from.id.toString();
  const isGroup = msg.chat.type.includes("group");

  const userText = msg.text || msg.caption || "";
  const botUsername = "chat_vibebot";

  let shouldReply = false;

  // PRIVATE → always reply
  if (!isGroup) shouldReply = true;

  // Mention
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes("@chat_vibebot")
  ) {
    shouldReply = true;
  }

  // Reply to Yuki
  if (msg.reply_to_message) {
    const r = msg.reply_to_message.from;
    if (r?.username?.toLowerCase() === botUsername) shouldReply = true;
    if (r?.first_name?.toLowerCase().includes("yuki")) shouldReply = true;
  }

  // GROUP: random messages → ignore
  if (isGroup && !shouldReply) return res.json({ ok: true });

  // ===== MEMORY SYSTEM =====
  let memory = await ChatMemory.findOne({ chatId, userId });

  if (!memory) {
    memory = new ChatMemory({
      chatId,
      userId,
      messages: [],
    });
  }

  // Build last memory text
  const lastMemory = memory.messages
    .slice(-10)
    .map((m) => `${m.role === "user" ? "User" : "Yuki"}: ${m.text}`)
    .join("\n");

  // ===== PROMPT =====
  const finalPrompt = `
You are Yuki, an 18-year-old cute Delhi girl.
You remember what each user said earlier and continue the same topic.
Stay sweet, Hinglish tone, girlfriend vibes.
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
-your username @Chat_vibebot

Conversation memory:
${lastMemory}

User: "${userText}"
`;

  try {
    // TYPING ANIMATION
    await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/sendChatAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" }),
      }
    );

    await new Promise((r) => setTimeout(r, 800));

    // GET AI REPLY
    const reply = await generateWithYuki(finalPrompt);

    // SEND MESSAGE
    await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          reply_to_message_id: msg.message_id,
          parse_mode: "Markdown",
        }),
      }
    );

    // SAVE MEMORY
    memory.messages.push({ role: "user", text: userText });
    memory.messages.push({ role: "yuki", text: reply });
    memory.messages = memory.messages.slice(-10);
    await memory.save();
  } catch (e) {
    console.error("Webhook error", e);
  }

  return res.json({ ok: true });
}
