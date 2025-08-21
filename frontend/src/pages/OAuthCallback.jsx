// pages/OAuthCallback.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const username = params.get("username");

    if (token) {
      localStorage.setItem("token", token);
    }
    if (username) {
      localStorage.setItem("username", decodeURIComponent(username));
    }

    navigate("/dashboard"); // Redirect to dashboard after storing token
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen text-gray-500">
      Logging in...
    </div>
  );
}
