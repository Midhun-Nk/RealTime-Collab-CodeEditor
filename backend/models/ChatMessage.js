const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true },
    user: { type: String, required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
