// pages/api/chat.js
import { generateWithYuki } from "@/lib/gemini";
import ApiKey from "@/models/ApiKey";
import { connectDB } from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, tgName } = req.body;

  if (!message || !tgName) {
    return res
      .status(400)
      .json({ error: "Message and Telegram name are required." });
  }

  try {
    await connectDB();

    // Check if any key exists
    const keys = await ApiKey.find({ active: true });
    if (!keys.length) {
      return res
        .status(500)
        .json({ error: "No active Gemini API keys configured." });
    }

    // Generate reply using Gemini + Yuki personality
    const reply = await generateWithYuki(message, tgName);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("CHAT API ERROR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
