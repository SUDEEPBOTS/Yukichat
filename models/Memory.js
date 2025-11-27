import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  userId: { type: String, required: true },
  mode: { type: String, default: "normal" }, // normal | flirty | professional
  history: [
    {
      role: String,
      text: String,
      time: { type: Date, default: Date.now }
    }
  ]
});

export default mongoose.models.Memory ||
  mongoose.model("Memory", MemorySchema);
