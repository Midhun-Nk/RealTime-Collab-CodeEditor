import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ManageAccess({ docId }) {
  const token = localStorage.getItem("token");
  const [users, setUsers] = useState([]);
  const [accessList, setAccessList] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [permission, setPermission] = useState("read");

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get("http://localhost:4000/api/users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Users fetched:", res.data); // debug
        setUsers(res.data);
      } catch (err) {
        console.error(
          "Error fetching users:",
          err.response?.data || err.message
        );
      }
    };

    fetchUsers();
  }, [token]);

  // Fetch access list
  useEffect(() => {
    axios
      .get(`http://localhost:4000/api/access/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAccessList(res.data))
      .catch((err) => console.error(err));
  }, [docId, token]);

  const addAccess = async () => {
    if (!selectedUser) return;
    await axios.post(
      `http://localhost:4000/api/access/${docId}`,
      { userId: selectedUser, permission },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    // refresh list
    const res = await axios.get(`http://localhost:4000/api/access/${docId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setAccessList(res.data);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-white">
      <h2 className="text-lg font-semibold mb-2">Manage Access</h2>
      <div className="flex gap-2 mb-4">
        <select
          onChange={(e) => setSelectedUser(e.target.value)}
          className="bg-gray-700 p-2 rounded"
        >
          <option value="">Select User</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.username || u.email}
            </option>
          ))}
        </select>
        <select
          onChange={(e) => setPermission(e.target.value)}
          className="bg-gray-700 p-2 rounded"
        >
          <option value="read">Read Only</option>
          <option value="edit">Editor</option>
        </select>
        <button onClick={addAccess} className="px-4 py-2 bg-blue-600 rounded">
          Add
        </button>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Current Access</h3>
        <ul>
          {accessList.map((a) => (
            <li key={a._id}>
              {a.userId.username || a.userId.email} - {a.permission}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
