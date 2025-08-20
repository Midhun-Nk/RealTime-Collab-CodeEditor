import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:4000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDocs(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  const createNewDoc = async () => {
    try {
      const res = await axios.post(
        "http://localhost:4000/api/docs",
        { title: "Untitled Document", content: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newDoc = res.data;
      setDocs((prev) => [...prev, newDoc]);
      navigate(`/editor/${newDoc.docId}`);
    } catch (err) {
      console.error("Error creating doc:", err);
    }
  };

  const openDoc = (docId) => {
    navigate(`/editor/${docId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="w-screen min-h-screen bg-gray-900 text-gray-100 p-6 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome Back!</h1>
          <p className="text-gray-400">
            Here are your code documents. Start coding or create a new editor.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 sm:mt-0 px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Create New Button */}
      <div className="mb-8">
        <button
          onClick={createNewDoc}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow transition-all transform hover:-translate-y-1 hover:scale-105"
        >
          + Create New Code Editor
        </button>
      </div>

      {/* Documents Section */}
      <h2 className="text-2xl font-semibold mb-4">Your Documents</h2>
      {docs.length === 0 ? (
        <p className="text-gray-400">
          No documents yet. Click "Create New Code Editor" to get started!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <div
              key={doc.docId}
              onClick={() => openDoc(doc.docId)}
              className="bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer hover:bg-gray-700 transform hover:-translate-y-1 transition-all"
            >
              <h3 className="text-lg font-semibold mb-2">{doc.title}</h3>
              <p className="text-gray-400 text-sm">
                Created on: {new Date(doc.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-2 text-gray-300 text-sm line-clamp-2">
                {doc.content || "No content yet. Click to start coding!"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
