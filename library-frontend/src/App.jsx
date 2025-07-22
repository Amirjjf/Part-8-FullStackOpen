import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";
import LoginForm from "./components/LoginForm";
import Recommended from "./components/Recommended";

const App = () => {
  const [token, setToken] = useState(null);

  const logout = () => {
    setToken(null);
    localStorage.clear();
  };

  // Check for existing token on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem("library-user-token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  return (
    <Router>
      <div>
        <nav>
          <Link to="/authors" style={{ marginRight: 8 }}>
            authors
          </Link>
          <Link to="/books" style={{ marginRight: 8 }}>
            books
          </Link>
          {token ? (
            <>
              <Link to="/add" style={{ marginRight: 8 }}>
                add book
              </Link>
              <Link to="/recommend" style={{ marginRight: 8 }}>
                recommend
              </Link>
              <button onClick={logout}>logout</button>
            </>
          ) : (
            <Link to="/login">login</Link>
          )}
        </nav>
        <Routes>
          <Route path="/authors" element={<Authors />} />
          <Route path="/books" element={<Books />} />
          {token && <Route path="/add" element={<NewBook />} />}
          {token && <Route path="/recommend" element={<Recommended />} />}
          {!token && (
            <Route path="/login" element={<LoginForm setToken={setToken} />} />
          )}
          <Route path="*" element={<Authors />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
