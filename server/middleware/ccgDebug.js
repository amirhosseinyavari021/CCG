import fs from "fs";
import path from "path";

function safeJson(x) {
  try { return JSON.stringify(x); } catch { return '"<unserializable>"'; }
}

function nowIso() {
  return new Date().toISOString();
}

export function ccgDebug(req, res, next) {
  const start = Date.now();
  const logFile = path.join(process.cwd(), "server", "logs", "ccg_debug.log");

  // capture response body
  const _json = res.json?.bind(res);
  const _send = res.send?.bind(res);

  if (_json) {
    res.json = (body) => {
      try {
        const ms = Date.now() - start;
        const line =
          `[${nowIso()}] RES JSON ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms} body=${safeJson(body)}\n`;
        fs.appendFileSync(logFile, line);
      } catch {}
      return _json(body);
    };
  }

  if (_send) {
    res.send = (body) => {
      try {
        const ms = Date.now() - start;
        const preview = (typeof body === "string")
          ? body.slice(0, 2000)
          : safeJson(body).slice(0, 2000);
        const line =
          `[${nowIso()}] RES SEND ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms} bodyPreview=${preview}\n`;
        fs.appendFileSync(logFile, line);
      } catch {}
      return _send(body);
    };
  }

  // log request
  try {
    const reqLine =
      `[${nowIso()}] REQ ${req.method} ${req.originalUrl} ip=${req.ip} ct=${req.headers["content-type"] || ""} body=${safeJson(req.body)}\n`;
    fs.appendFileSync(logFile, reqLine);
  } catch {}

  // also log when finished (even if route doesn't send body)
  res.on("finish", () => {
    try {
      const ms = Date.now() - start;
      const line =
        `[${nowIso()}] DONE ${req.method} ${req.originalUrl} status=${res.statusCode} ms=${ms}\n`;
      fs.appendFileSync(logFile, line);
    } catch {}
  });

  next();
}

export default ccgDebug;
