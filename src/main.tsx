import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
//import Cookies from "./components/Cookies";
import "./index.css"; // ← Tailwind CSS

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
