const express = require("express");
const { authMiddleware } = require("./auth");
const DocumentAccess = require("../models/DocumentAccess");
const Document = require("../models/Document");
const User = require("../models/User");

const router = express.Router();

// Get all users with access for a document
router.get("/:docId", authMiddleware, async (req, res) => {
  const { docId } = req.params;
  try {
    const accessList = await DocumentAccess.find({ docId }).populate(
      "userId",
      "username email"
    );
    res.json(accessList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add/update access for a user
router.post("/:docId", authMiddleware, async (req, res) => {
  const { docId } = req.params;
  const { userId, permission } = req.body;

  try {
    const access = await DocumentAccess.findOneAndUpdate(
      { docId, userId },
      { permission },
      { upsert: true, new: true }
    );
    res.json(access);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove access
router.delete("/:docId/:userId", authMiddleware, async (req, res) => {
  try {
    await DocumentAccess.findOneAndDelete({
      docId: req.params.docId,
      userId: req.params.userId,
    });
    res.json({ message: "Access removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check my permission
router.get("/:docId/my-permission", authMiddleware, async (req, res) => {
  const { docId } = req.params;
  const userId = req.user.id;

  try {
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Owner always has "edit" access
    if (doc.owner.toString() === userId) {
      return res.json({ permission: "edit" });
    }

    const access = await DocumentAccess.findOne({ docId, userId });
    if (!access) return res.json({ permission: "none" });

    return res.json({ permission: access.permission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
