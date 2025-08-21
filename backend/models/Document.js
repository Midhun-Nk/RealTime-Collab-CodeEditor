const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    docId: {
      type: String,
      unique: true,
      required: true,
    },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", DocumentSchema);
