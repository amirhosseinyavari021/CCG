/**
 * server.js (CCG_MIN_SERVER_V1)
 * هدف: فقط API را پایدار بالا بیاورد تا 502/No-LISTEN تمام شود.
 */
import express from "express";
import ccgRoutes from "./server/routes/ccgRoutes.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

// basic health
app.get("/api/health", (req, res) => res.json({ ok: true, service: "ccg", ts: Date.now() }));

// main api
app.use("/api/ccg", ccgRoutes);

// fallback for unknown api routes
app.use("/api", (req, res) => res.status(404).json({ ok: false, error: "API route not found" }));

const port = Number(process.env.PORT || process.env.CCG_PORT || 50000);
const host = "0.0.0.0";

const server = app.listen(port, host, () => {
  console.log(`[CCG] listening on ${host}:${port}`);
});

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("unhandledRejection", (e) => console.error("[CCG] unhandledRejection", e));
process.on("uncaughtException", (e) => console.error("[CCG] uncaughtException", e));
