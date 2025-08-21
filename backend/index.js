// server.js
const express = require("express");
const mongoose = require("mongoose");
const WebSocket = require("ws");
const cors = require("cors");

const { router: authRouter } = require("./routes/auth");
const { authMiddleware } = require("./routes/auth");
const docRouter = require("./routes/docs");
const executeRouter = require("./routes/execute");
const Document = require("./models/Document");
const ChatMessage = require("./models/ChatMessage");
const accessRouter = require("./routes/access");
const userRouter = require("./routes/users");

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
app.use("/api/access", accessRouter);
app.use("/api/users", userRouter);
// Start HTTP server
const server = app.listen(4000, () =>
  console.log("✅ Server running on http://localhost:4000")
);

// WebSocket setup
const clients = {}; // { docId: Set(ws) }

const wss = new WebSocket.Server({ server });

// Utility: choose a color (fallback if client doesn't provide one)
const DEFAULT_COLORS = [
  "#e6194b",
  "#3cb44b",
  "#ffe119",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#46f0f0",
  "#f032e6",
  "#bcf60c",
];

function randomColor() {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
}

wss.on("connection", (ws) => {
  console.log("⚡ New WebSocket connection");
  let currentDocId = null;

  // Helper to broadcast to all clients in same doc (except optional exclude)
  function broadcastToDoc(docId, messageObj, exclude = ws) {
    if (!docId || !clients[docId]) return;
    const payload = JSON.stringify(messageObj);
    clients[docId].forEach((client) => {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  // Helper to build presence list for a doc
  function buildPresenceList(docId) {
    if (!docId || !clients[docId]) return [];
    const list = [];
    clients[docId].forEach((client) => {
      // only include clients that have joined and provided userId/name
      if (client.userId) {
        list.push({
          userId: client.userId,
          name: client.name || `User-${String(client.userId).slice(0, 4)}`,
          color: client.color || randomColor(),
        });
      }
    });
    return list;
  }

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      // ------------------------------
      // Joining a doc
      // ------------------------------
      if (data.type === "join") {
        currentDocId = data.docId;
        if (!clients[currentDocId]) clients[currentDocId] = new Set();
        clients[currentDocId].add(ws);

        // Save identifying info on the ws object (server-authoritative)
        ws.userId =
          data.userId || ws.userId || Math.random().toString(36).substr(2, 9);
        ws.name =
          data.name || ws.name || `Guest-${String(ws.userId).slice(0, 4)}`;
        ws.color = data.color || ws.color || randomColor();

        // Ensure document exists
        let doc = await Document.findOne({ docId: currentDocId });
        if (!doc) {
          doc = new Document({
            docId: currentDocId,
            content: "// Start coding here...",
          });
          await doc.save();
        }

        // Send initial document content to joining client
        ws.send(JSON.stringify({ type: "init", code: doc.content }));

        // Send current chat history for this doc to joining client
        const previousMessages = await ChatMessage.find({
          docId: currentDocId,
        }).sort({ createdAt: 1 });
        previousMessages.forEach((msg) => {
          ws.send(JSON.stringify({ type: "chat", message: msg }));
        });

        // Send presence list to the joining client
        ws.send(
          JSON.stringify({
            type: "presence",
            users: buildPresenceList(currentDocId),
          })
        );

        // Notify other clients that a user joined
        broadcastToDoc(
          currentDocId,
          {
            type: "user-joined",
            user: { userId: ws.userId, name: ws.name, color: ws.color },
          },
          ws
        );

        return;
      }

      // ------------------------------
      // Code change
      // ------------------------------
      if (data.type === "code-change" && currentDocId) {
        // persist latest content (overwrite)
        await Document.findOneAndUpdate(
          { docId: currentDocId },
          { content: data.code }
        );

        // broadcast to others in doc
        broadcastToDoc(
          currentDocId,
          { type: "code-change", code: data.code },
          ws
        );
        return;
      }

      // ------------------------------
      // Title change
      // ------------------------------
      if (data.type === "title-change" && currentDocId) {
        broadcastToDoc(
          currentDocId,
          { type: "title-change", title: data.title },
          ws
        );
        return;
      }

      // ------------------------------
      // Chat messages
      // ------------------------------
      if (data.type === "chat" && currentDocId) {
        // Save chat message to DB
        const saved = await ChatMessage.create({
          docId: currentDocId,
          user: data.message.user,
          text: data.message.text,
        });

        // Broadcast saved message to all (including sender)
        clients[currentDocId].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: "chat", message: saved }));
          }
        });
        return;
      }

      // ------------------------------
      // Cursor updates (use server-stored name/color)
      // ------------------------------
      if (data.type === "cursor" && currentDocId) {
        // pos must be a number
        const pos = typeof data.pos === "number" ? data.pos : null;
        if (pos == null) return; // ignore invalid

        // Use server-stored identity (safer)
        const payload = {
          type: "cursor",
          userId: ws.userId,
          pos,
          color: ws.color,
          name: ws.name,
        };

        broadcastToDoc(currentDocId, payload, ws);
        return;
      }

      // ------------------------------
      // (Optional) selection updates could be handled similarly:
      // if (data.type === 'selection' && currentDocId) { ... }
      // ------------------------------
    } catch (err) {
      console.error("WS message error:", err);
    }
  });

  ws.on("close", () => {
    // remove from clients set
    if (currentDocId && clients[currentDocId]) {
      clients[currentDocId].delete(ws);

      // notify others that this user left
      const leftPayload = {
        type: "user-left",
        userId: ws.userId,
        name: ws.name,
      };
      clients[currentDocId].forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(leftPayload));
        }
      });

      // cleanup empty doc sets
      if (clients[currentDocId].size === 0) {
        delete clients[currentDocId];
      }
    }
    console.log("⚡ WebSocket disconnected");
  });

  ws.on("error", (err) => console.error("⚡ WS error:", err));
});
