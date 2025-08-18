const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  docId: { type: String, unique: true },
  title: { type: String, default: "Untitled Document" },
  content: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional if you want per-user docs
});

module.exports = mongoose.model("Document", DocumentSchema);
