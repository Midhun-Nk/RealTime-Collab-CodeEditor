const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    docId: { type: String, unique: true },
    content: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
