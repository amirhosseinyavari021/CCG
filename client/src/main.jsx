import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AppViewProvider } from "./hooks/useAppView";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AppViewProvider>
          <App />
        </AppViewProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
