// Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);

  const token = localStorage.getItem("token"); // JWT token from login

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  // Load saved documents from backend
  useEffect(() => {
    if (!token) return;

    axios
      .get("http://localhost:4000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setDocs(res.data))
      .catch((err) => console.error(err));
  }, [token]);

  // Create a new document in backend
  const createNewDoc = async () => {
    if (!token) return;

    try {
      const res = await axios.post(
        "http://localhost:4000/api/docs",
        { content: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newDoc = res.data;
      setDocs((prev) => [...prev, newDoc]); // Add immediately to list
      navigate(`/editor/${newDoc._id}`);
    } catch (err) {
      console.error("Error creating doc:", err);
    }
  };

  // Open existing doc
  const openDoc = (id) => {
    navigate(`/editor/${id}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Button to create new doc */}
      <button
        onClick={createNewDoc}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg mb-6"
      >
        Create New Code Editor
      </button>

      {/* List of saved documents */}
      <h2 className="text-xl font-semibold mb-2">Your Documents</h2>
      {docs.length === 0 ? (
        <p className="text-gray-500">No documents yet</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc._id}
              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-100"
              onClick={() => openDoc(doc._id)}
            >
              Document: {doc._id}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
