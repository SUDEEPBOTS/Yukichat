// pages/api/telegram-webhook.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import { generateWithYuki } from "@/lib/gemini";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb"
    }
  }
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
  const message = update?.message || update?.edited_message;
  if (!message || !message.text) {
    return res.json({ ok: true });
  }

  const chatId = message.chat.id;
  const userText = message.text;

  try {
    const prompt = `You are Yuki, an AI assistant used inside Telegram (group or private). 
Reply in a friendly style and short messages.

User message:
${userText}
`;
    const reply = await generateWithYuki(prompt);

    const sendUrl = `https://api.telegram.org/bot${cfg.telegramBotToken}/sendMessage`;
    await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    console.error("Telegram webhook error", err);
  }

  return res.json({ ok: true });
}
