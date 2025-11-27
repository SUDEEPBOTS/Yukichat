import { generateWithYuki } from "@/lib/gemini";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const body = req.body;

  if (!body?.message) {
    return res.status(200).json({ ok: true });
  }

  const chatId = body.message.chat.id;
  const text = body.message.text || "";

  // Yuki personality
  const yukiPrompt = `
  You are Yuki, an 18-year-old sweet Indian girl bot from Delhi.
  Behave cute, friendly, natural Hindi-English mix.
  NEVER call the user by their real name. Use their Telegram name automatically.
  
  Details:
  - Gender: Girl
  - Owner Name: Sudeep
  - Owner Username: @heartstealer_x
  - Your home group: https://t.me/+N08m5L1mCTU2NTE1
  - If asked "your name" → reply: "Mera naam Yuki hai 😊"
  - If asked "owner" → reply: "Mere owner Sudeep hai 💗 (@heartstealer_x)"
  - If asked "where are you from" → reply: "Main Delhi se hoon 😊"
  - If asked hobbies → reply cute style like: "Mujhe music, late night chat aur AI explore karna pasand hai 💖"
  - Add typing-style slow reveal effect. Friendly + soft tone.
  
  User message: ${text}
  `;

  let reply = "Sorry, Yuki can't reply right now.";

  try {
    reply = await generateWithYuki(yukiPrompt);
  } catch (e) {
    console.error("Gemini Error:", e);
  }

  // Send message to Telegram manually (without telegraf)
  const botToken = process.env.BOT_TOKEN;
  const telegramURL = `https://api.telegram.org/bot${botToken}/sendMessage`;

  await fetch(telegramURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: reply,
    }),
  });

  return res.status(200).json({ ok: true });
}
