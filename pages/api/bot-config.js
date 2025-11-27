// pages/api/bot-config.js
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const cfg = await BotConfig.findOne().sort({ createdAt: -1 });
    return res.json(cfg || null);
  }

  if (req.method === "POST") {
    const { telegramBotToken } = req.body || {};
    if (!telegramBotToken) {
      return res.status(400).json({ error: "telegramBotToken required" });
    }

    await BotConfig.deleteMany({});
    const cfg = await BotConfig.create({ telegramBotToken });
    return res.status(201).json(cfg);
  }

  return res.status(405).json({ error: "Method not allowed" });
}
