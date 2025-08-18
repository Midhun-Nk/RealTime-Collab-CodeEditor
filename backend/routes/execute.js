// server/routes/execute.js
const express = require("express");
const axios = require("axios");
const router = express.Router();
const { authMiddleware } = require("./auth"); // optional if you want auth
require("dotenv").config();

// Map frontend language to JDoodle language
const jdoodleLangMap = {
  javascript: "nodejs",
  python: "python3",
  java: "java",
  cpp: "cpp14",
};

// POST /api/execute
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { script, language } = req.body;

    if (!script || !language) {
      return res.status(400).json({ error: "Missing script or language" });
    }

    const jdLang = jdoodleLangMap[language.toLowerCase()];
    if (!jdLang) {
      return res
        .status(400)
        .json({ error: `Language ${language} not supported` });
    }

    // Replace with your actual JDoodle credentials
    const clientId = process.env.JD_CLIENT_ID;
    const clientSecret = process.env.JD_CLIENT_SECRET;

    const payload = {
      script,
      language: jdLang,
      versionIndex: "0", // usually 0 works for all
      clientId,
      clientSecret,
    };

    const response = await axios.post(
      "https://api.jdoodle.com/v1/execute",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({ output: response.data.output });
  } catch (err) {
    console.error("JDoodle execute error:", err.response?.data || err.message);
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: "Code execution failed" });
  }
});

module.exports = router;
