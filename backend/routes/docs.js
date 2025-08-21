const express = require("express");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const DocumentAccess = require("../models/DocumentAccess");
const { authMiddleware } = require("./auth");

const router = express.Router();

// -------------------------
// Get all documents user can access
// -------------------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Owned documents
    const ownedDocs = await Document.find({ owner: req.user.id }).sort({
      createdAt: -1,
    });

    // Shared documents
    const accessDocs = await DocumentAccess.find({
      userId: req.user.id,
    });

    const sharedDocIds = accessDocs.map((d) => d.docId);
    const sharedDocs = await Document.find({
      docId: { $in: sharedDocIds },
      owner: { $ne: req.user.id },
    });

    const allDocs = [...ownedDocs, ...sharedDocs];
    res.json(allDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Create new document
// -------------------------
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

    // Give creator edit access
    const ownerAccess = new DocumentAccess({
      docId: newDoc.docId,
      userId: req.user.id,
      permission: "edit",
    });
    await ownerAccess.save();

    res.json(newDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Get single document by docId with access check
// -------------------------
router.get("/:docId", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ docId: req.params.docId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Owner always has access
    if (doc.owner.toString() !== req.user.id) {
      const access = await DocumentAccess.findOne({
        docId: doc.docId,
        userId: req.user.id,
      });
      if (!access) return res.status(403).json({ message: "Access denied" });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Update document (only if user has "edit")
// -------------------------
router.put("/:docId", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    const doc = await Document.findOne({ docId: req.params.docId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Check if user has edit permission
    let permission = "none";
    if (doc.owner.toString() === req.user.id) permission = "edit";
    else {
      const access = await DocumentAccess.findOne({
        docId: doc.docId,
        userId: req.user.id,
      });
      if (access) permission = access.permission;
    }

    if (permission !== "edit")
      return res
        .status(403)
        .json({ message: "You do not have edit permission" });

    doc.title = title;
    doc.content = content;
    await doc.save();

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Get my permission for a doc
// -------------------------
router.get("/access/:docId/my-permission", authMiddleware, async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await Document.findOne({ docId });
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner.toString() === req.user.id) {
      return res.json({ permission: "edit" });
    }

    const access = await DocumentAccess.findOne({
      docId,
      userId: req.user.id,
    });

    if (!access) return res.json({ permission: "none" });

    res.json({ permission: access.permission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
