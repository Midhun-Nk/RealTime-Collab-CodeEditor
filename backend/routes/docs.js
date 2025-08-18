const express = require("express");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const { authMiddleware } = require("./auth");

const router = express.Router();

// Get all user documents
router.get("/", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new document with title
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;
    const newDoc = new Document({
      docId: new mongoose.Types.ObjectId().toString(),
      title: title || "Untitled Document",
      content: content || "// Start coding here...",
      owner: req.user.id,
    });
    await newDoc.save();
    res.json(newDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single document by docId
router.get("/:docId", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({
      docId: req.params.docId,
      owner: req.user.id, // ensure user owns this doc
    });
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update document title/content
// Update document title/content
router.put("/:docId", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    // Find the document by docId and owner
    const doc = await Document.findOneAndUpdate(
      { docId: req.params.docId, owner: req.user.id },
      { title, content },
      { new: true }
    );

    if (!doc) return res.status(404).json({ message: "Document not found" });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
