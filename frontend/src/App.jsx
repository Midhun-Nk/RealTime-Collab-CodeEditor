// App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Dashboard from "./Dashboard";
import CodeEditor from "./components/CodeEditor";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Protected route
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

// Wrapper to handle OAuth token from URL before rendering routes
function OAuthHandler({ children }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);

      // Clean URL
      window.history.replaceState({}, document.title, location.pathname);
    }

    setReady(true); // Signal that routes can render now
  }, [location]);

  if (!ready) return null; // Don’t render routes until token is handled
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <OAuthHandler>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/editor/:docId"
            element={
              <PrivateRoute>
                <CodeEditor />
              </PrivateRoute>
            }
          />
        </Routes>
      </OAuthHandler>
    </BrowserRouter>
  );
}

export default App;
