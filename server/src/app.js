// server/src/app.js
const express = require("express");
const cors = require("cors");

const {
  smartRouter,
  jsonSyntaxErrorHandler,
  globalErrorHandler,
} = require("./routes/smart");

const app = express();

// --- Middlewares ---
app.use(cors());

// 1) Request logger (very helpful for "always invalid" bugs)
app.use((req, res, next) => {
  const ct = req.headers["content-type"] || "";
  console.log(`[REQ] ${req.method} ${req.originalUrl}  ct="${ct}"`);
  next();
});

// 2) Accept JSON + URL-encoded + Text
// If frontend sends FormData -> it often becomes multipart/form-data (not parsed here)
app.use(express.json({ limit: "2mb" }));
app.use(jsonSyntaxErrorHandler);
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.text({ type: "*/*", limit: "2mb" })); // accepts text/plain and even unknown types

// 3) Normalize body if it's plain text JSON (common when Content-Type is wrong)
app.use((req, res, next) => {
  // If body is a string, try parse JSON
  if (typeof req.body === "string") {
    const s = req.body.trim();
    if (s.startsWith("{") && s.endsWith("}")) {
      try {
        req.body = JSON.parse(s);
      } catch {
        // keep as string; route will return a helpful error
      }
    }
  }
  next();
});

// --- Routes ---
app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", smartRouter);

// --- Error handler (last) ---
app.use(globalErrorHandler);

module.exports = app;
