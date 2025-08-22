import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Local login
  const handleLogin = async () => {
    try {
      const res = await axios.post("http://localhost:4000/api/auth/login", {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("username", res.data.username);
      localStorage.setItem("userId", res.data.userId);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  // OAuth login
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:4000/api/auth/google";
  };

  const handleGithubLogin = () => {
    window.location.href = "http://localhost:4000/api/auth/github";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-gray-100 p-6">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          Login
        </h2>

        <input
          className="w-full mb-4 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className="w-full mb-6 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="w-full py-2 mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg transform hover:-translate-y-1 hover:scale-105 transition-all"
        >
          Login
        </button>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-700" />
          <span className="px-3 text-gray-400 text-sm">OR</span>
          <hr className="flex-grow border-gray-700" />
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-2 mb-3 bg-red-500 text-white rounded-lg font-semibold shadow-lg hover:bg-red-600 transform hover:-translate-y-1 hover:scale-105 transition-all"
        >
          Continue with Google
        </button>

        <button
          onClick={handleGithubLogin}
          className="w-full py-2 bg-gray-700 text-white rounded-lg font-semibold shadow-lg hover:bg-gray-600 transform hover:-translate-y-1 hover:scale-105 transition-all"
        >
          Continue with GitHub
        </button>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Don't have an account?{" "}
          <span
            className="text-blue-400 cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
