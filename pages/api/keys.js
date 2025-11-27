// pages/api/keys.js
import { connectDB } from "@/lib/db";
import ApiKey from "@/models/ApiKey";

export default async function handler(req, res) {
  await connectDB();

  if (req.method === "GET") {
    const keys = await ApiKey.find().sort({ createdAt: -1 });
    return res.json(keys);
  }

  if (req.method === "POST") {
    const { key, label } = req.body || {};
    if (!key) {
      return res.status(400).json({ error: "Key is required" });
    }

    const doc = await ApiKey.create({
      key,
      label: label || "Untitled",
      active: true
    });

    return res.status(201).json(doc);
  }

  if (req.method === "PATCH") {
    const { id, active } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });

    const doc = await ApiKey.findByIdAndUpdate(
      id,
      { active },
      { new: true }
    );
    return res.json(doc);
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });
    await ApiKey.findByIdAndDelete(id);
    return res.json({ status: "deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
