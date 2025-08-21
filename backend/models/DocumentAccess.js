const mongoose = require("mongoose");

const DocumentAccessSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, ref: "Document" },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    permission: {
      type: String,
      enum: ["read", "edit"], // readonly or editor
      default: "read",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentAccess", DocumentAccessSchema);
