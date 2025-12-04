import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { SocketProvider } from "./context/SocketContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Protected Route (check accessToken & expiry)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        // Token expire
        localStorage.clear();
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Invalid token in ProtectedRoute:", err);
      localStorage.clear();
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// MainLayout
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check Auth & Redirect
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          // Redirect if on login/register pages
          if (
            location.pathname === "/login" ||
            location.pathname === "/register"
          ) {
            navigate("/", { replace: true });
          }
        } else {
          localStorage.clear();
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Invalid token on load:", err);
        localStorage.clear();
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  }, [location.pathname, navigate]);

  return (
    <SocketProvider isAuthenticated={isAuthenticated}>
      <div className="app">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </SocketProvider>
  );
};

function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;
