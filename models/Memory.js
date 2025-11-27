// models/Memory.js
import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
  },
  history: {
    type: Array,
    default: [], // array of { role: "user" | "yuki", text: "..." }
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Prevent model overwrite errors in Next.js hot reload
export default mongoose.models.Memory ||
  mongoose.model("Memory", MemorySchema);
