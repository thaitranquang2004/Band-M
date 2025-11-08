import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
// Import ChatPage, FriendsPage sau

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Login />} />
          {/* <Route path="/chat/:id" element={<ChatPage />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
