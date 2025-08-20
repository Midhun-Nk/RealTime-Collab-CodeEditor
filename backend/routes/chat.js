const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const { authMiddleware } = require("./auth");

// Get all chat messages for a doc
router.get("/:docId", authMiddleware, async (req, res) => {
  try {
    const messages = await ChatMessage.find({ docId: req.params.docId }).sort({
      createdAt: 1,
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

// Add a new chat message
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { docId, user, text } = req.body;
    const message = await ChatMessage.create({ docId, user, text });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: "Failed to save chat message" });
  }
});

module.exports = router;
