const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  docId: { type: String, required: true, unique: true },
  content: { type: String, default: "" },
});

module.exports = mongoose.model("Document", DocumentSchema);
