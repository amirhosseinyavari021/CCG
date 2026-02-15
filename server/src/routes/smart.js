// server/src/routes/smart.js
const express = require("express");
const router = express.Router();

class AppError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST", details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function errorResponse(err, req) {
  return {
    ok: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "Something went wrong",
      details: err.details || {},
      debug: {
        method: req.method,
        path: req.originalUrl,
        contentType: req.headers["content-type"] || null,
        bodyType: typeof req.body,
        // show a small preview to debug (safe)
        bodyPreview:
          typeof req.body === "string"
            ? req.body.slice(0, 300)
            : JSON.stringify(req.body || {}).slice(0, 300),
      },
    },
  };
}

function normalizeInput(body) {
  // If body is missing or wrong type
  if (body == null) return { kind: "unknown" };

  // If still a string here, accept it as "command"
  if (typeof body === "string") {
    const cmd = body.trim();
    if (cmd) return { kind: "single", command: cmd };
    return { kind: "unknown" };
  }

  // If urlencoded, body may be an object with string fields
  const getStr = (v) => (typeof v === "string" ? v : "");

  const b = body || {};
  const compare = b.compare && typeof b.compare === "object" ? b.compare : {};

  const command =
    getStr(b.command) ||
    getStr(b.input) ||
    getStr(b.code) ||
    getStr(b.text);

  const left =
    getStr(b.left) ||
    getStr(b.a) ||
    getStr(b.source) ||
    getStr(b.old) ||
    getStr(compare.left) ||
    getStr(compare.a) ||
    getStr(compare.source) ||
    getStr(compare.old);

  const right =
    getStr(b.right) ||
    getStr(b.b) ||
    getStr(b.target) ||
    getStr(b.new) ||
    getStr(compare.right) ||
    getStr(compare.b) ||
    getStr(compare.target) ||
    getStr(compare.new);

  if (command && command.trim()) {
    return { kind: "single", command: command.trim() };
  }

  if ((left && left.trim()) || (right && right.trim())) {
    return { kind: "compare", left: (left || "").trim(), right: (right || "").trim() };
  }

  return { kind: "unknown" };
}

function validateNormalizedInput(x, req) {
  // Smart error: explain *why* it is invalid
  if (x.kind === "unknown") {
    const ct = req.headers["content-type"] || "";
    const hint = [];

    if (!ct) hint.push("No Content-Type header detected.");
    if (ct.includes("multipart/form-data")) {
      hint.push("You are sending FormData (multipart). This endpoint expects JSON/text/urlencoded.");
      hint.push("Fix frontend to send JSON: Content-Type: application/json");
    }
    if (typeof req.body === "undefined") {
      hint.push("req.body is undefined → express parser not applied or request not reaching this server.");
    }
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length === 0) {
      hint.push("req.body is {} → likely empty JSON or wrong endpoint.");
    }

    throw new AppError(
      "Invalid input payload. Expected {command} OR {left,right}.",
      400,
      "INVALID_INPUT",
      {
        acceptedShapes: [
          { command: "string" },
          { input: "string" },
          { code: "string" },
          { text: "string" },
          { left: "string", right: "string" },
          { a: "string", b: "string" },
          { source: "string", target: "string" },
          { old: "string", new: "string" },
          { compare: { left: "string", right: "string" } },
        ],
        hints: hint,
      }
    );
  }

  if (x.kind === "single") {
    if (!x.command) throw new AppError("Command is empty.", 400, "EMPTY_COMMAND");
    if (x.command.length > 20000) {
      throw new AppError("Command too long.", 413, "PAYLOAD_TOO_LARGE", { maxLen: 20000 });
    }
    return;
  }

  const total = (x.left?.length || 0) + (x.right?.length || 0);
  if (total === 0) throw new AppError("Both sides are empty.", 400, "EMPTY_COMPARE");
  if (total > 500000) {
    throw new AppError("Compare payload too large.", 413, "PAYLOAD_TOO_LARGE", { maxTotalLen: 500000 });
  }
}

function computeCompareSummary(left, right) {
  const leftLines = left ? left.split("\n").length : 0;
  const rightLines = right ? right.split("\n").length : 0;
  return {
    same: left === right,
    leftLen: left.length,
    rightLen: right.length,
    leftLines,
    rightLines,
  };
}

// POST /api/smart
router.post("/smart", (req, res, next) => {
  try {
    const normalized = normalizeInput(req.body);
    validateNormalizedInput(normalized, req);

    if (normalized.kind === "single") {
      return res.status(200).json({
        ok: true,
        data: { kind: "single", command: normalized.command },
      });
    }

    const summary = computeCompareSummary(normalized.left, normalized.right);
    return res.status(200).json({
      ok: true,
      data: { kind: "compare", summary, left: normalized.left, right: normalized.right },
    });
  } catch (err) {
    next(err);
  }
});

function jsonSyntaxErrorHandler(err, req, res, next) {
  if (err instanceof SyntaxError && "body" in err) {
    const e = new AppError("Invalid JSON body.", 400, "INVALID_JSON", {
      hint: "Send valid JSON + Content-Type: application/json",
    });
    return res.status(e.status).json(errorResponse(e, req));
  }
  next(err);
}

function globalErrorHandler(err, req, res, next) {
  const e =
    err instanceof AppError
      ? err
      : new AppError("Internal server error.", 500, "INTERNAL_ERROR");

  console.error("[API_ERROR]", e.code, e.message, e.details);

  return res.status(e.status).json(errorResponse(e, req));
}

module.exports = {
  smartRouter: router,
  jsonSyntaxErrorHandler,
  globalErrorHandler,
};
