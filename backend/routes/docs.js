const express = require("express");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const { authMiddleware } = require("./auth");

const router = express.Router();

// Get documents of logged-in user
router.get("/", authMiddleware, async (req, res) => {
  const docs = await Document.find({ owner: req.user.id }).sort({
    createdAt: -1,
  });
  res.json(docs);
});

// Create new document for logged-in user
router.post("/", authMiddleware, async (req, res) => {
  const newDoc = new Document({
    docId: new mongoose.Types.ObjectId().toString(),
    content: req.body.content || "// Start coding here...",
    owner: req.user.id,
  });
  await newDoc.save();
  res.json(newDoc);
});

// Get document by docId (anyone with link can open)
router.get("/:docId", async (req, res) => {
  const doc = await Document.findOne({ docId: req.params.docId });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json(doc);
});

module.exports = router;
