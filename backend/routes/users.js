// routes/users.js
const express = require("express");
const User = require("../models/User");
const { authMiddleware } = require("./auth");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, "username email");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
