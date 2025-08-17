import { useState } from "react";
import "./App.css";
import CodeEditor from "./components/CodeEditor";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/editor/:docId" element={<CodeEditor />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
