// pages/api/telegram-webhook.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import Memory from "@/models/Memory";
import { generateWithYuki } from "@/lib/gemini";

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } }
};

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Only POST allowed" });

  await connectDB();

  const cfg = await BotConfig.findOne().sort({ createdAt: -1 });
  if (!cfg?.telegramBotToken) return res.json({ ok: false });

  const update = req.body;
  const msg = update.message || update.edited_message;
  if (!msg) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const userText = msg.text || msg.caption || "";
  const isGroup = msg.chat.type.includes("group");

  const botUsername = "chat_vibebot";
  let shouldReply = false;

  // PRIVATE chat
  if (!isGroup) shouldReply = true;

  // mention
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes("@chat_vibebot")
  )
    shouldReply = true;

  // reply to yuki
  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    shouldReply = true;

  if (isGroup && !shouldReply) return res.json({ ok: true });

  // -----------------------------------------------------
  // MEMORY SYSTEM
  // -----------------------------------------------------

  let memory = await Memory.findOne({ chatId });

  if (!memory) {
    memory = await Memory.create({
      chatId,
      history: []
    });
  }

  // add user message to memory
  memory.history.push({ role: "user", text: userText });

  // LIMIT = 6 messages
  if (memory.history.length > 6) {
    memory.history = memory.history.slice(-6);
  }

  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Yuki"}: ${m.text}`)
    .join("\n");

  // -----------------------------------------------------
  // FINAL PROMPT — with memory
  // -----------------------------------------------------

  const finalPrompt = `
You are Yuki, an 18-year-old cute Delhi girl.

Your style:
- soft cute Hinglish
- short, emotional, natural, caring
- teasing, sweet, real GenZ girl
- NEVER robotic
- NEVER say "How can I help you today?"

Personality:
- Your owner: Sudeep
- Owner username: @heartstealer_x
- Live in Delhi
- Never say you are a bot
- Insta id: never share
- Class: 12th PCM

Conversation memory (very important):
${historyText}

Now user said: "${userText}"

Reply like a real girl continuing the conversation. Maintain topic. Don't forget context. Don't ask "kya hua?" unless needed.
`;

  try {
    // typing effect
    await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/sendChatAction`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, action: "typing" })
      }
    );

    await new Promise((r) => setTimeout(r, 900));

    const reply = await generateWithYuki(finalPrompt);

    // save yuki reply to memory
    memory.history.push({ role: "yuki", text: reply });
    if (memory.history.length > 6)
      memory.history = memory.history.slice(-6);
    await memory.save();

    // send reply
    await fetch(
      `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: reply,
          reply_to_message_id: msg.message_id
        })
      }
    );
  } catch (err) {
    console.error(err);
  }

  res.json({ ok: true });
}
