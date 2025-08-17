const express = require("express");
const mongoose = require("mongoose");
const WebSocket = require("ws");
const cors = require("cors");

// ==== Express App ====

const app = express();
app.use(cors());
app.use(express.json());

// ==== MongoDB Connection ====
mongoose.connect("mongodb://127.0.0.1:27017/realtimeDocs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Document = mongoose.model(
  "Document",
  new mongoose.Schema({
    docId: { type: String, unique: true },
    content: String,
  })
);

// ==== REST API ====
// Get all documents
app.get("/api/docs", async (req, res) => {
  const docs = await Document.find();
  res.json(docs);
});

// Create new document
app.post("/api/docs", async (req, res) => {
  const newDoc = new Document({
    docId: new mongoose.Types.ObjectId().toString(), // auto-generate docId
    content: req.body.content || "// Start coding here...",
  });
  await newDoc.save();
  res.json(newDoc);
});

// ==== WebSocket Server ====
const server = app.listen(4000, () =>
  console.log("✅ Server running on http://localhost:4000")
);

const wss = new WebSocket.Server({ server });
const clients = {}; // store ws clients per docId

wss.on("connection", (ws) => {
  let currentDocId = null;

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      currentDocId = data.docId;

      if (!clients[currentDocId]) {
        clients[currentDocId] = new Set();
      }
      clients[currentDocId].add(ws);

      // Fetch document from DB
      let doc = await Document.findOne({ docId: currentDocId });
      if (!doc) {
        doc = new Document({
          docId: currentDocId,
          content: "// Start coding here...",
        });
        await doc.save();
      }

      // Send document content to new client
      ws.send(JSON.stringify({ type: "init", code: doc.content }));
    }

    if (data.type === "code-change" && currentDocId) {
      // Update DB
      await Document.findOneAndUpdate(
        { docId: currentDocId },
        { content: data.code }
      );

      // Broadcast to all other clients
      clients[currentDocId].forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "code-change", code: data.code }));
        }
      });
    }
  });

  ws.on("close", () => {
    if (currentDocId && clients[currentDocId]) {
      clients[currentDocId].delete(ws);
    }
  });
});
