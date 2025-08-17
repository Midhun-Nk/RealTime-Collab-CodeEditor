import React, { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { debounce } from "lodash";

export default function CodeEditor() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState("// Loading...");
  const ws = useRef(null);

  const token = localStorage.getItem("token"); // JWT token

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Fetch document when opened
  useEffect(() => {
    if (!token) return;

    async function fetchDocument() {
      try {
        const res = await axios.get(`http://localhost:5000/api/docs/${docId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.content) setCode(res.data.content);
      } catch (err) {
        console.error("Error fetching document:", err);
      }
    }
    fetchDocument();
  }, [docId, token]);

  // WebSocket for realtime sync
  useEffect(() => {
    if (!token) return;

    ws.current = new WebSocket("ws://localhost:4000");

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: "join", docId }));
    };

    ws.current.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === "init") setCode(msg.code);
      if (msg.type === "code-change" && msg.code !== code) setCode(msg.code);
    };

    return () => ws.current.close();
  }, [docId, code, token]);

  // Debounced save function
  const saveDocument = debounce(async (value) => {
    if (!token) return;

    try {
      await axios.put(
        `http://localhost:5000/api/docs/${docId}`,
        { content: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("Error saving document:", err);
    }
  }, 1000);

  // Handle editor changes
  const handleChange = (value) => {
    setCode(value);

    if (ws.current) {
      ws.current.send(
        JSON.stringify({ type: "code-change", docId, code: value })
      );
    }

    saveDocument(value);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Document: {docId}</h2>
      <CodeMirror
        value={code}
        height="300px"
        extensions={[javascript()]}
        onChange={handleChange}
      />
    </div>
  );
}
