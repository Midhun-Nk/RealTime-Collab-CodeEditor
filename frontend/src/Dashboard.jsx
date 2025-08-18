import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const token = localStorage.getItem("token");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Load user documents
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
        "http://localhost:4000/api/docs", // make sure this is the correct port
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      <button
        onClick={createNewDoc}
        className="px-5 py-3 bg-blue-600 text-white font-semibold rounded-lg mb-6 hover:bg-blue-700"
      >
        + Create New Code Editor
      </button>

      <h2 className="text-2xl font-semibold mb-3">Your Documents</h2>
      {docs.length === 0 ? (
        <p className="text-gray-500">No documents yet. Create one!</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.docId}
              className="p-3 border rounded-lg cursor-pointer hover:bg-gray-100 flex justify-between items-center"
              onClick={() => openDoc(doc.docId)}
            >
              <span>{doc.title}</span>
              <span className="text-sm text-gray-400">
                {new Date(doc.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
