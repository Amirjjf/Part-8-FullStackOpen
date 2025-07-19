import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Authors from "./components/Authors";
import Books from "./components/Books";
import NewBook from "./components/NewBook";

const App = () => {
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
          <Link to="/add">add book</Link>
        </nav>
        <Routes>
          <Route path="/authors" element={<Authors show = {true}/>} />
          <Route path="/books" element={<Books />} />
          <Route path="/add" element={<NewBook />} />
          <Route path="*" element={<Authors />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
