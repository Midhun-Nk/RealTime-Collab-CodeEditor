const express = require("express");
const mongoose = require("mongoose");
const WebSocket = require("ws");
const cors = require("cors");

const { router: authRouter } = require("./routes/auth");
const { authMiddleware } = require("./routes/auth");
const docRouter = require("./routes/docs");
const executeRouter = require("./routes/execute");
const Document = require("./models/Document");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/realtimeDocs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// API routes
app.use("/api/execute", executeRouter);
app.use("/api/auth", authRouter);
app.use("/api/docs", docRouter);

// Start HTTP server
const server = app.listen(4000, () =>
  console.log("✅ Server running on http://localhost:4000")
);

// WebSocket setup
const clients = {};
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("⚡ New WebSocket connection");
  let currentDocId = null;

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "join") {
        currentDocId = data.docId;
        console.log(`Client joined doc: ${currentDocId}`);

        if (!clients[currentDocId]) clients[currentDocId] = new Set();
        clients[currentDocId].add(ws);

        let doc = await Document.findOne({ docId: currentDocId });
        if (!doc) {
          doc = new Document({
            docId: currentDocId,
            content: "// Start coding here...",
          });
          await doc.save();
        }

        ws.send(JSON.stringify({ type: "init", code: doc.content }));
      }

      if (data.type === "code-change" && currentDocId) {
        await Document.findOneAndUpdate(
          { docId: currentDocId },
          { content: data.code }
        );

        clients[currentDocId].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "code-change", code: data.code })
            );
          }
        });
      }

      if (data.type === "title-change" && currentDocId) {
        clients[currentDocId].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "title-change", title: data.title })
            );
          }
        });
      }
    } catch (err) {
      console.error("WS message error:", err);
    }
  });

  ws.on("close", () => {
    console.log("⚡ WebSocket disconnected");
    if (currentDocId && clients[currentDocId]) clients[currentDocId].delete(ws);
  });

  ws.on("error", (err) => console.error("⚡ WS error:", err));
});
