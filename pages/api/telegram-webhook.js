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
  const userId = msg.from.id?.toString();
  const userText = msg.text || msg.caption || "";
  const isGroup = msg.chat.type.includes("group");

  const botUsername = "chat_vibebot";
  let shouldReply = false;

  // -------------------------------------------------------
  // SMART REPLY CONTROL
  // -------------------------------------------------------

  // PRIVATE chat → always reply
  if (!isGroup) shouldReply = true;

  // @mention or name calling
  if (
    userText.toLowerCase().includes("yuki") ||
    userText.toLowerCase().includes("@chat_vibebot")
  ) shouldReply = true;

  // If user replies to yuki message
  if (msg.reply_to_message?.from?.username?.toLowerCase() === botUsername)
    shouldReply = true;

  if (isGroup && !shouldReply) return res.json({ ok: true });

  // -------------------------------------------------------
  // MEMORY LOAD / CREATE
  // -------------------------------------------------------

  let memory = await Memory.findOne({ chatId, userId });

  if (!memory) {
    memory = await Memory.create({
      chatId,
      userId,
      mode: "normal",
      history: []
    });
  }

  // Add user message to memory
  memory.history.push({ role: "user", text: userText });

  // Limit memory to last 10 interactions
  if (memory.history.length > 10)
    memory.history = memory.history.slice(-10);

  await memory.save();

  const historyText = memory.history
    .map((m) => `${m.role === "user" ? "User" : "Yuki"}: ${m.text}`)
    .join("\n");

  // -------------------------------------------------------
  // MODE SYSTEM
  // -------------------------------------------------------

  let tone = "";

  if (memory.mode === "normal") {
    tone = "soft cute hinglish, sweet, caring, small messages";
  } else if (memory.mode === "flirty") {
    tone =
      "flirty cute genz girl, teasing tone, emojis, playful, sweet-genz energy";
  } else if (memory.mode === "professional") {
    tone =
      "calm, polite, professional tone but still soft hinglish, short replies";
  }

  // -------------------------------------------------------
  // FINAL PROMPT WITH MEMORY + MODE
  // -------------------------------------------------------

  const finalPrompt = `

You are Yuki, an 18-year-old cute Delhi girl.

Tone:
- soft cute Hinglish
- short, natural, real-girl feel
- emotional but controlled
- teasing but not overdone
- NO robotic tone

Owner Rules:
- Tumhara owner Sudeep hai, username @heartstealer_x.
- Par normal baat me Sudeep ka naam bilkul mat lena.
- Owner ka naam sirf tab lo jab koi specifically owner ke baare me pooche.
- Apne aap se “Sudeep mera hai” type lines mat repeat karna.

Behavior Rules:
- "kya hua?" ya "batao?" jaise lines sirf tabhi use karna jab user confused lage.
- Har message me same pattern repeat mat karna.
- User ke message ko repeat mat karna.
- Short, cute, clean replies (max 1–2 lines).
- Emojis natural rakhna, overload mat karna.
- Real girl ki tarah context yaad rakh kar baat chalana.
- Insta id jab koi mange → “😒 kyuu chahiye.. nahi dungi.”
- Never say you're a bot.
${historyText}

Now user said: "${userText}"

continuing the conversation naturally.
`;

  try {
    // typing animation
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

    // save AI reply to memory
    memory.history.push({ role: "yuki", text: reply });
    if (memory.history.length > 10)
      memory.history = memory.history.slice(-10);
    await memory.save();

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
  } catch (e) {
    console.error("YUKI ERROR:", e);
  }

  return res.json({ ok: true });
}
