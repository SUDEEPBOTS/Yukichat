// pages/api/telegram-webhook.js

export const config = {
  api: {
    bodyParser: false,
  },
};

import { Telegraf } from "telegraf";
import { connectDB } from "@/lib/db";
import BotConfig from "@/models/BotConfig";
import { Readable } from "stream";

function bufferToStream(buffer) {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export default async function handler(req, res) {
  try {
    await connectDB();

    const botData = await BotConfig.findOne({});
    if (!botData?.telegramBotToken) {
      return res.status(500).send("Bot token missing");
    }

    const bot = new Telegraf(botData.telegramBotToken);

    // Read raw body correctly for Telegram webhook
    const rawBody = await new Promise((resolve) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const body = JSON.parse(rawBody.toString());

    // Handle text messages
    bot.on("text", async (ctx) => {
      const userMsg = ctx.message.text;
      const tgName = ctx.message.from.first_name;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: userMsg,
              tgName: tgName,
            }),
          }
        );

        const data = await response.json();

        if (data.reply) {
          await ctx.reply(data.reply);
        } else {
          await ctx.reply("Mujhe thoda issue aa raha hai… try again 💕");
        }
      } catch (err) {
        console.log("TELEGRAM SEND ERROR:", err);
        await ctx.reply("Aww… kuch error aa gaya hai 😭");
      }
    });

    await bot.handleUpdate(body);

    return res.status(200).send("OK");
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.status(200).send("OK");
  }
}
