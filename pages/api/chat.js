// pages/api/chat.js
import { generateWithYuki } from "@/lib/gemini";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { message } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: "message required" });
  }

  try {
    const prompt = `You are Yuki, a friendly AI assistant. Reply conversationally.\nUser: ${message}`;
    const reply = await generateWithYuki(prompt);
    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chat failed" });
  }
}
