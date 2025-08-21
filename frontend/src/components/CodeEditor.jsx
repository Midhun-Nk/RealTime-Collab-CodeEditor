import React, { useEffect, useRef, useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";

import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { oneDark } from "@codemirror/theme-one-dark";

import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { debounce } from "lodash";
import { EditorView, Decoration, WidgetType } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";
import ManageAccess from "../components/ManageAccess";

export default function CodeEditor() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // -------------------------
  // State
  // -------------------------
  const [permission, setPermission] = useState(null); // null = loading, "read", "edit", "none"
  const [showAccess, setShowAccess] = useState(false);
  const [code, setCode] = useState("// Loading...");
  const [title, setTitle] = useState("Untitled Document");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [remoteCursors, setRemoteCursors] = useState({});

  const codeRef = useRef(code);
  const titleRef = useRef(title);
  const ws = useRef(null);
  const chatEndRef = useRef(null);
  const editorViewRef = useRef(null);

  const myId = useRef(Math.random().toString(36).substr(2, 9));
  const myColor = useRef(
    "#" + Math.floor(Math.random() * 16777215).toString(16)
  );
  const myName = useRef(
    localStorage.getItem("username") || `Guest-${myId.current.slice(0, 4)}`
  );

  // -------------------------
  // Redirect if not logged in
  // -------------------------
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // -------------------------
  // Fetch user permission
  // -------------------------
  useEffect(() => {
    if (!token) return;

    const fetchPermission = async () => {
      try {
        const res = await axios.get(
          `http://localhost:4000/api/access/${docId}/my-permission`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setPermission(res.data.permission); // "read", "edit", or "none"
      } catch (err) {
        console.error(err);
        setPermission("none");
      }
    };

    fetchPermission();
  }, [docId, token]);

  // -------------------------
  // Fetch document content
  // -------------------------
  useEffect(() => {
    if (!token || permission === "none") return;

    axios
      .get(`http://localhost:4000/api/docs/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data) {
          setCode(res.data.content);
          setTitle(res.data.title || "Untitled Document");
        }
      })
      .finally(() => setLoading(false));
  }, [docId, token, permission]);

  // -------------------------
  // WebSocket setup
  // -------------------------
  useEffect(() => {
    if (!token || permission === "none") return;

    ws.current = new WebSocket("ws://localhost:4000");

    ws.current.onopen = () => {
      ws.current?.send(
        JSON.stringify({
          type: "join",
          docId,
          userId: myId.current,
          name: myName.current,
        })
      );
    };

    ws.current.onmessage = ({ data }) => {
      const msg = JSON.parse(data);

      if (msg.type === "init") setCode(msg.code);
      if (msg.type === "code-change" && msg.code !== codeRef.current)
        setCode(msg.code);
      if (msg.type === "title-change" && msg.title !== titleRef.current)
        setTitle(msg.title);

      if (msg.type === "chat") setMessages((prev) => [...prev, msg.message]);

      if (msg.type === "cursor" && msg.userId !== myId.current) {
        setRemoteCursors((prev) => ({
          ...prev,
          [msg.userId]: {
            pos: msg.pos,
            name: msg.name || `User-${String(msg.userId).slice(0, 4)}`,
            color: msg.color,
            ts: Date.now(),
          },
        }));
      }
    };

    ws.current.onerror = (err) => console.error("WS error:", err);
    ws.current.onclose = () => console.log("WS disconnected");

    return () => ws.current?.close();
  }, [docId, token, permission]);

  // -------------------------
  // Prune stale cursors
  // -------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next = {};
        Object.entries(prev).forEach(([uid, c]) => {
          if (now - (c.ts || 0) < 8000) next[uid] = c;
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // -------------------------
  // Save document/title
  // -------------------------
  const saveDocument = useMemo(
    () =>
      debounce(async (value) => {
        if (!token || permission !== "edit") return;
        try {
          await axios.put(
            `http://localhost:4000/api/docs/${docId}`,
            { content: value, title: titleRef.current },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error(err);
        }
      }, 800),
    [docId, token, permission]
  );

  const saveTitle = useMemo(
    () =>
      debounce(async (newTitle) => {
        if (!token || permission !== "edit") return;
        try {
          await axios.put(
            `http://localhost:4000/api/docs/${docId}`,
            { content: codeRef.current, title: newTitle },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          ws.current?.send(
            JSON.stringify({ type: "title-change", docId, title: newTitle })
          );
        } catch (err) {
          console.error(err);
        }
      }, 400),
    [docId, token, permission]
  );

  // -------------------------
  // Execute code
  // -------------------------
  const runCode = async () => {
    if (!code.trim()) return;
    setRunning(true);
    setOutput("Running...");
    try {
      const res = await axios.post(
        "http://localhost:4000/api/execute",
        { script: code, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOutput(res.data.output || "No output");
    } catch (err) {
      console.error("Execute error:", err.response?.data || err.message);
      setOutput(err.response?.data?.error || "Error running code");
    }
    setRunning(false);
  };

  // -------------------------
  // Chat
  // -------------------------
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const message = { user: myName.current, text: chatInput };
    ws.current?.send(JSON.stringify({ type: "chat", docId, message }));
    setChatInput("");
  };

  // -------------------------
  // Cursor decorations
  // -------------------------
  const setRemoteCursorsEffect = useMemo(() => StateEffect.define(), []);

  const toRGBA = (hex, alpha = 0.75) => {
    if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex))
      return `rgba(34,211,238,${alpha})`;
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const remoteCursorTheme = useMemo(
    () =>
      EditorView.baseTheme({
        ".cm-remote-cursor": {
          position: "relative",
          display: "inline-block",
          width: "0px",
          height: "1.2em",
          verticalAlign: "text-top",
          pointerEvents: "none",
          zIndex: 10,
        },
        ".cm-remote-cursor .cm-remote-caret": {
          position: "absolute",
          left: "-1px",
          top: "0",
          width: "2px",
          height: "100%",
        },
        ".cm-remote-cursor .cm-remote-label": {
          position: "absolute",
          top: "-1.4em",
          left: "4px",
          padding: "2px 6px",
          fontSize: "0.7em",
          fontWeight: "700",
          borderRadius: "4px",
          whiteSpace: "nowrap",
          color: "white",
          pointerEvents: "none",
          opacity: 0.75,
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        },
      }),
    []
  );

  const cursorField = useMemo(() => {
    return StateField.define({
      create() {
        return Decoration.none;
      },
      update(deco, tr) {
        for (const e of tr.effects) {
          if (e.is(setRemoteCursorsEffect)) {
            const cursors = e.value;
            const widgets = [];
            Object.values(cursors).forEach((cursor) => {
              if (typeof cursor?.pos !== "number") return;
              const color = cursor.color || "#22d3ee";
              widgets.push(
                Decoration.widget({
                  widget: new (class extends WidgetType {
                    toDOM() {
                      const root = document.createElement("span");
                      root.className = "cm-remote-cursor";

                      const caret = document.createElement("div");
                      caret.className = "cm-remote-caret";
                      caret.style.background = color;
                      root.appendChild(caret);

                      const label = document.createElement("div");
                      label.className = "cm-remote-label";
                      label.textContent = cursor.name || "User";
                      label.style.background = toRGBA(color, 0.72);
                      label.style.textShadow = "0 1px 1px rgba(0,0,0,0.25)";
                      root.appendChild(label);

                      return root;
                    }
                  })(),
                  side: 1,
                }).range(cursor.pos)
              );
            });
            return Decoration.set(widgets, true);
          }
        }
        return deco;
      },
      provide: (f) => EditorView.decorations.from(f),
    });
  }, [setRemoteCursorsEffect]);

  useEffect(() => {
    if (editorViewRef.current) {
      editorViewRef.current.dispatch({
        effects: setRemoteCursorsEffect.of(remoteCursors),
      });
    }
  }, [remoteCursors, setRemoteCursorsEffect]);

  const sendCursorThrottled = useMemo(
    () =>
      debounce((pos) => {
        ws.current?.send(
          JSON.stringify({
            type: "cursor",
            docId,
            userId: myId.current,
            pos,
            name: myName.current,
            color: myColor.current,
          })
        );
      }, 60),
    [docId]
  );

  useEffect(() => () => sendCursorThrottled.cancel(), [sendCursorThrottled]);

  // -------------------------
  // Editor handlers
  // -------------------------
  const handleChange = (value, viewUpdate) => {
    if (!editorViewRef.current && viewUpdate?.view)
      editorViewRef.current = viewUpdate.view;
    setCode(value);
    saveDocument(value);

    const head = viewUpdate?.state?.selection?.main?.head;
    if (typeof head === "number") sendCursorThrottled(head);

    ws.current?.send(
      JSON.stringify({ type: "code-change", docId, code: value })
    );
  };

  const handleUpdate = (vu) => {
    if (!editorViewRef.current) editorViewRef.current = vu.view;
    if (vu.selectionSet) {
      const head = vu.state.selection.main.head;
      if (typeof head === "number") sendCursorThrottled(head);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    saveTitle(e.target.value);
  };

  const getLanguageExtension = () => {
    switch (language) {
      case "javascript":
        return javascript();
      case "python":
        return python();
      case "java":
        return java();
      case "cpp":
        return cpp();
      default:
        return javascript();
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runCode();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [code, language]);

  if (loading || permission === null)
    return <div className="text-center mt-10 text-gray-400">Loading...</div>;

  if (permission === "none")
    return (
      <div className="text-center mt-10 text-red-500 text-lg">
        You do not have permission to access this document.
      </div>
    );

  const displayName = (m) =>
    typeof m?.user === "string"
      ? m.user
      : typeof m?.user?.name === "string"
      ? m.user.name
      : String(m?.user || "User");

  return (
    <div className="w-screen h-screen p-4 bg-gray-900 text-gray-100 flex relative">
      {/* Left: Editor */}
      <div className="flex-1 flex flex-col space-y-4">
        <input
          className="text-2xl font-bold w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          value={title}
          onChange={handleTitleChange}
          readOnly={permission !== "edit"}
        />
        <div className="flex flex-wrap gap-4 items-center mb-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <button
            onClick={runCode}
            disabled={running}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200
          ${
            running
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
          >
            {running ? "Running..." : "Run Code"}
          </button>

          <button
            onClick={() => setShowAccess(!showAccess)}
            className="px-3 py-2 bg-gray-700 rounded ml-auto"
          >
            Manage Access
          </button>
        </div>

        <div className="flex-1 rounded-lg overflow-hidden border border-gray-700">
          <CodeMirror
            value={code}
            height="100%"
            extensions={[
              getLanguageExtension(),
              remoteCursorTheme,
              cursorField,
            ]}
            theme={oneDark}
            onChange={permission === "edit" ? handleChange : undefined}
            onUpdate={permission === "edit" ? handleUpdate : undefined}
            editable={permission === "edit"}
          />
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 font-mono text-green-400 min-h-[100px]">
          {output}
        </div>
      </div>

      {/* Right: Chat */}
      <div className="w-80 ml-4 flex flex-col bg-gray-800 rounded-lg border border-gray-700 p-3">
        <h2 className="text-lg font-semibold mb-2">Chat</h2>
        <div className="flex-1 overflow-y-auto mb-2 space-y-2">
          {messages.map((msg, idx) => {
            const name = displayName(msg);
            const mine = name === myName.current;
            return (
              <div
                key={idx}
                className={`p-2 rounded ${
                  mine
                    ? "bg-blue-600 text-white self-end"
                    : "bg-gray-700 text-gray-200 self-start"
                }`}
              >
                <span className="font-semibold">{name}: </span>
                {msg.text}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Send
          </button>
        </div>
      </div>

      {/* Manage Access overlay */}
      {showAccess && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-96 z-50">
          <ManageAccess docId={docId} onClose={() => setShowAccess(false)} />
        </div>
      )}
    </div>
  );
}
