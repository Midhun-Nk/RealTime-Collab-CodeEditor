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

export default function CodeEditor() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [code, setCode] = useState("// Loading...");
  const [title, setTitle] = useState("Untitled Document");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const codeRef = useRef(code);
  const titleRef = useRef(title);
  const ws = useRef(null);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Fetch doc
  useEffect(() => {
    if (!token) return;
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
  }, [docId, token]);

  // WebSocket
  useEffect(() => {
    if (!token) return;
    ws.current = new WebSocket("ws://localhost:4000");
    ws.current.onopen = () =>
      ws.current.send(JSON.stringify({ type: "join", docId }));
    ws.current.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      if (msg.type === "init") setCode(msg.code);
      if (msg.type === "code-change" && msg.code !== codeRef.current)
        setCode(msg.code);
      if (msg.type === "title-change" && msg.title !== titleRef.current)
        setTitle(msg.title);
    };
    ws.current.onerror = (err) => console.error("WS error:", err);
    ws.current.onclose = () => console.log("WS disconnected");
    return () => ws.current?.close();
  }, [docId, token]);

  const saveDocument = useMemo(
    () =>
      debounce(async (value) => {
        if (!token) return;
        try {
          await axios.put(
            `http://localhost:4000/api/docs/${docId}`,
            { content: value, title: titleRef.current },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error(err);
        }
      }, 1000),
    [docId, token]
  );

  const saveTitle = useMemo(
    () =>
      debounce(async (newTitle) => {
        if (!token) return;
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
      }, 500),
    [docId, token]
  );

  const handleChange = (value) => {
    setCode(value);
    ws.current?.send(
      JSON.stringify({ type: "code-change", docId, code: value })
    );
    saveDocument(value);
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

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") runCode();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [code, language]);

  if (loading)
    return <div className="text-center mt-10 text-gray-400">Loading...</div>;

  return (
    <div className="w-screen h-screen p-6 space-y-4 bg-gray-900 text-gray-100 flex flex-col">
      {/* Title */}
      <input
        className="text-2xl font-bold w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
        value={title}
        onChange={handleTitleChange}
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
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
      </div>

      {/* Editor */}
      <div className="flex-1 rounded-lg overflow-hidden border border-gray-700">
        <CodeMirror
          value={code}
          height="100%"
          extensions={[getLanguageExtension()]}
          theme={oneDark}
          onChange={handleChange}
        />
      </div>

      {/* Output */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 font-mono text-green-400 min-h-[100px]">
        {output}
      </div>
    </div>
  );
}
