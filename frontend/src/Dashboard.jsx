import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);

  // Grab token and userId from localStorage
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  // Handle OAuth token from URL (if redirected)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromURL = params.get("token");
    const userIdFromURL = params.get("userId");

    if (tokenFromURL) localStorage.setItem("token", tokenFromURL);
    if (userIdFromURL) localStorage.setItem("userId", userIdFromURL);

    if (tokenFromURL || userIdFromURL) {
      window.history.replaceState({}, document.title, "/dashboard"); // Clean URL
    }
  }, []);

  // Redirect to login if no token
  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  // Fetch user documents
  useEffect(() => {
    const fetchDocs = async () => {
      if (!token) return;
      try {
        const res = await axios.get("http://localhost:4000/api/docs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDocs(res.data);
      } catch (err) {
        console.error("Error fetching docs:", err);
      }
    };
    fetchDocs();
  }, [token]);

  // Create a new document
  const createNewDoc = async () => {
    if (!token) {
      alert("You are not authenticated!");
      return;
    }
    try {
      const res = await axios.post(
        "http://localhost:4000/api/docs",
        { title: "Untitled Document", content: "" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDocs((prev) => [...prev, res.data]);
      navigate(`/editor/${res.data.docId}`);
    } catch (err) {
      console.error("Error creating doc:", err);
      alert("Failed to create document. Check console for details.");
    }
  };

  const openDoc = (docId) => navigate(`/editor/${docId}`);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    navigate("/login");
  };

  // Filter documents
  const ownedDocs = docs.filter((doc) => doc.owner === userId);
  const sharedDocs = docs.filter((doc) => doc.owner !== userId);

  return (
    <div className="w-screen min-h-screen bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 text-white">Welcome Back!</h1>
          <p className="text-gray-400">
            Manage your code documents efficiently. Start coding or create a new
            editor.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-4 sm:mt-0 px-5 py-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-all"
        >
          Logout
        </button>
      </header>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <button
          onClick={createNewDoc}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transform hover:-translate-y-1 hover:scale-105 transition-all"
        >
          + Create New Code Editor
        </button>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-40 text-center hover:bg-gray-700 transition-all">
            <h3 className="text-xl font-bold">{docs.length}</h3>
            <p className="text-gray-400 text-sm mt-1">Total Documents</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg w-40 text-center hover:bg-gray-700 transition-all">
            <h3 className="text-xl font-bold">
              {docs.filter((doc) => doc.content).length}
            </h3>
            <p className="text-gray-400 text-sm mt-1">Documents with Content</p>
          </div>
        </div>
      </div>

      {/* Owned Documents */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Owned Documents</h2>
        {ownedDocs.length === 0 ? (
          <p className="text-gray-400">You don't own any documents yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedDocs.map((doc) => (
              <div
                key={doc.docId}
                onClick={() => openDoc(doc.docId)}
                className="bg-gray-800 p-5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-700 transform hover:-translate-y-1 hover:scale-105 transition-all"
              >
                <h3 className="text-lg font-bold mb-2 text-white">
                  {doc.title}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  Created on: {new Date(doc.createdAt).toLocaleDateString()}
                </p>
                <p className="text-gray-300 text-sm line-clamp-3">
                  {doc.content || "No content yet. Click to start coding!"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shared Documents */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Shared With You</h2>
        {sharedDocs.length === 0 ? (
          <p className="text-gray-400">No shared documents yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedDocs.map((doc) => (
              <div
                key={doc.docId}
                onClick={() => openDoc(doc.docId)}
                className="bg-gray-800 p-5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-700 transform hover:-translate-y-1 hover:scale-105 transition-all"
              >
                <h3 className="text-lg font-bold mb-2 text-white">
                  {doc.title}
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  Owner: {doc.ownerName || doc.owner}
                </p>
                <p className="text-gray-300 text-sm line-clamp-3">
                  {doc.content || "No content yet. Click to start coding!"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
