// Create a new doc
await fetch("http://localhost:4000/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ docId: "abc123" }),
});

// Fetch existing doc
const res = await fetch("http://localhost:4000/docs/abc123");
const doc = await res.json();
console.log("Loaded content:", doc.content);

// Connect WebSocket
ws.send(JSON.stringify({ type: "join", docId: "abc123" }));
