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
import OAuthCallback from "./pages/OAuthCallback";

// Protected route
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

// Wrapper to handle OAuth token from URL (except /oauth/callback)
function OAuthHandler({ children }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!location.pathname.startsWith("/oauth/callback")) {
      const params = new URLSearchParams(location.search);
      const token = params.get("token");

      if (token) {
        localStorage.setItem("token", token);
        window.history.replaceState({}, document.title, location.pathname);
      }
    }
    setReady(true);
  }, [location]);

  if (!ready) return null;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <OAuthHandler>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

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
