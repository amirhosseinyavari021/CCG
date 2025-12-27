#!/usr/bin/env bash
set -euo pipefail

echo "== CCG FULL FIX v2 START =="

ROOT="$HOME/CCG"
echo "ROOT=$ROOT"

[ -d "$ROOT/client" ] || { echo "❌ client/ not found"; exit 1; }
[ -d "$ROOT/server" ] || { echo "❌ server/ not found"; exit 1; }

echo "== Backup =="
BACKUP="$ROOT/.ccg_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP"
cp -r "$ROOT/client/src/pages/generator" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/pages" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/components" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/client/src/index.css" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/middleware" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server/routes" "$BACKUP/" 2>/dev/null || true
cp -r "$ROOT/server.js" "$BACKUP/" 2>/dev/null || true
echo "✅ Backup at: $BACKUP"

echo "== Fix CSS (remove invalid // comments) =="
CSS_FILE="$ROOT/client/src/index.css"
if [ -f "$CSS_FILE" ]; then
  cp "$CSS_FILE" "$CSS_FILE.bak_$(date +%s)" || true
  # remove Windows CRLF just in case
  sed -i -E 's/\r$//' "$CSS_FILE"
  # remove JS-style comments in CSS (root cause of 'Unknown word patched')
  sed -i -E '/^[[:space:]]*\/\//d' "$CSS_FILE"
  # remove any leftover single word 'patched' lines if any
  sed -i -E '/^[[:space:]]*patched[[:space:]]*$/d' "$CSS_FILE"
  echo "✅ CSS cleaned: $CSS_FILE"
else
  echo "🟡 CSS file not found: $CSS_FILE (skipping)"
fi

echo "== Backend: safe domainGuard (prevent crashes) =="
mkdir -p "$ROOT/server/middleware"
cat > "$ROOT/server/middleware/domainGuard.js" <<'JS'
export default function domainGuard(req, res, next) {
  // Safe no-op guard: never crash even if called oddly.
  try {
    return next();
  } catch (e) {
    return next();
  }
}
JS
echo "✅ server/middleware/domainGuard.js written"

echo "== Backend: ccgNormalize middleware (keep frontend/backend fields in sync) =="
cat > "$ROOT/server/middleware/ccgNormalize.js" <<'JS'
export default function ccgNormalize(req, res, next) {
  try {
    const b = (req && req.body && typeof req.body === "object") ? req.body : {};

    const modeRaw =
      b.mode ?? b.action ?? b.taskType ?? b.type ?? "generate";

    const mode =
      (String(modeRaw).toLowerCase() === "learn") ? "learn" : "generate";

    const lang =
      (b.lang ?? b.language ?? "fa");

    const osRaw =
      b.os ?? b.platform ?? b.system ?? "linux";
    const os = String(osRaw).toLowerCase();

    const outputStyle =
      b.outputStyle ?? b.style ?? b.output_style ?? (mode === "learn" ? "detailed" : "clean");

    const userRequest =
      b.userRequest ??
      b.user_request ??
      b.user_request_text ??
      b.prompt ??
      b.input ??
      b.text ??
      b.command ??
      "";

    // keep both camelCase and snake_case so nothing breaks
    req.body = {
      ...b,
      mode,
      lang,
      os,
      outputStyle,
      userRequest,
      user_request: userRequest
    };

    return next();
  } catch (e) {
    // even normalization must never crash
    return next();
  }
}
JS
echo "✅ server/middleware/ccgNormalize.js written"

echo "== Backend: patch /api/ccg route to use normalize + accept learn/generate =="
ROUTE_FILE="$ROOT/server/routes/ccgRoutes.js"
if [ ! -f "$ROUTE_FILE" ]; then
  echo "❌ Expected route file not found: $ROUTE_FILE"
  exit 1
fi

cat > "$ROUTE_FILE" <<'JS'
import express from "express";
import ccgNormalize from "../middleware/ccgNormalize.js";

// Try to import existing AI client in a compatible way.
import * as aiClient from "../utils/aiClient.js";

const router = express.Router();

function extractText(ai) {
  if (!ai) return "";
  if (typeof ai === "string") return ai;
  if (typeof ai.output_text === "string") return ai.output_text;
  if (typeof ai.text === "string") return ai.text;

  // OpenAI Responses-like format: ai.output -> [{type:"message", content:[...]}]
  try {
    if (Array.isArray(ai.output)) {
      const msg = ai.output.find(x => x && x.type === "message" && Array.isArray(x.content));
      if (msg) {
        const texts = msg.content
          .map(c => (c && (c.text || c.output_text)) ? (c.text || c.output_text) : "")
          .filter(Boolean);
        return texts.join("\n").trim();
      }
    }
  } catch {}

  // Fallback: try common shapes
  try {
    if (ai.data && typeof ai.data === "string") return ai.data;
    if (ai.result && typeof ai.result === "string") return ai.result;
    if (ai.result && typeof ai.result.text === "string") return ai.result.text;
  } catch {}

  return "";
}

router.post("/", ccgNormalize, async (req, res) => {
  try {
    const { mode, lang, os, outputStyle, userRequest } = req.body || {};

    if (!userRequest || String(userRequest).trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "userRequest is required",
        hint: "Send { mode: 'generate'|'learn', lang: 'fa', os: 'windows|linux|macos', userRequest: '...' }"
      });
    }

    const runAI = aiClient.runAI || aiClient.default || aiClient.callOpenAI;
    if (!runAI) {
      return res.status(500).json({ ok: false, error: "AI client not available (runAI not found)" });
    }

    // Pass a superset for maximum backward-compatibility
    const payload = {
      mode,
      lang,
      os,
      outputStyle,
      userRequest,
      user_request: userRequest
    };

    const ai = await runAI(payload);
    const text = extractText(ai);

    return res.json({
      ok: true,
      mode,
      lang,
      os,
      outputStyle,
      text: text || "",
      raw: (!text ? ai : undefined) // only include raw if extraction failed
    });
  } catch (e) {
    console.error("CCG route error:", e);
    return res.status(500).json({ ok: false, error: "Internal error", details: String(e?.message || e) });
  }
});

export default router;
JS

echo "✅ server/routes/ccgRoutes.js overwritten with normalized route"

echo "== Frontend: find generator page file and rewrite compact UI =="
GEN_FILE=""
if [ -d "$ROOT/client/src/pages/generator" ]; then
  GEN_FILE="$(find "$ROOT/client/src/pages/generator" -maxdepth 2 -type f \( -name "*.jsx" -o -name "*.tsx" \) | head -n 1 || true)"
fi

if [ -z "$GEN_FILE" ]; then
  GEN_FILE="$(find "$ROOT/client/src/pages" -maxdepth 2 -type f \( -name "*generator*.jsx" -o -name "*generator*.tsx" \) | head -n 1 || true)"
fi

if [ -z "$GEN_FILE" ]; then
  echo "❌ Could not locate generator page file under client/src/pages. Aborting to avoid breaking structure."
  exit 1
fi

cat > "$GEN_FILE" <<'JSX'
import React, { useMemo, useState } from "react";

function joinUrl(base, path) {
  const b = String(base || "").trim();
  const p = String(path || "").trim();
  if (!b) return p || "";
  if (!p) return b;
  const b1 = b.endsWith("/") ? b.slice(0, -1) : b;
  const p1 = p.startsWith("/") ? p : `/${p}`;
  // avoid /api/api/ccg
  if (b1.endsWith("/api") && p1.startsWith("/api/")) return `${b1}${p1.slice(4)}`;
  return `${b1}${p1}`;
}

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function GeneratorPage() {
  const [tab, setTab] = useState("generate"); // generate | learn
  const [lang, setLang] = useState("fa");
  const [os, setOs] = useState("windows");
  const [outputStyle, setOutputStyle] = useState(tab === "learn" ? "detailed" : "clean");

  const [userRequest, setUserRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState("");

  const apiBase = useMemo(() => import.meta.env.VITE_API_BASE || "", []);
  const apiUrl = useMemo(() => joinUrl(apiBase, "/api/ccg"), [apiBase]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOut("");

    const trimmed = userRequest.trim();
    if (!trimmed) {
      setErr(tab === "learn" ? "کد/کامند را وارد کن." : "درخواست را وارد کن.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        mode: tab,
        lang,
        os,
        outputStyle,
        userRequest: trimmed
      };

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }

      const text = data?.text ?? data?.result ?? data?.output ?? "";
      setOut(String(text || "").trim());
      if (!String(text || "").trim()) {
        setOut("خروجی خالی برگشت. (ممکن است مشکل شبکه/مدل باشد)");
      }
    } catch (e2) {
      setErr(String(e2?.message || e2 || "خطا"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        {/* Tabs */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setTab("generate"); setOutputStyle("clean"); }}
            className={cx(
              "rounded-xl px-3 py-2 text-sm transition border",
              tab === "generate"
                ? "border-white/20 bg-white/10"
                : "border-white/10 hover:bg-white/5"
            )}
          >
            تولید
          </button>
          <button
            type="button"
            onClick={() => { setTab("learn"); setOutputStyle("detailed"); }}
            className={cx(
              "rounded-xl px-3 py-2 text-sm transition border",
              tab === "learn"
                ? "border-white/20 bg-white/10"
                : "border-white/10 hover:bg-white/5"
            )}
          >
            Learn (توضیح)
          </button>
          <div className="ml-auto text-xs text-slate-400">
            API: <span className="select-all">{apiUrl}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[360px_1fr]">
          {/* Left: controls */}
          <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <div className="grid gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs text-slate-400">ورودی</div>
                <textarea
                  value={userRequest}
                  onChange={(e) => setUserRequest(e.target.value)}
                  rows={tab === "learn" ? 6 : 8}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-white/20"
                  placeholder={tab === "learn" ? "کامند/کد را وارد کن تا توضیح کامل و واضح بگیری..." : "چه کاری میخوای انجام بدی؟ (مثلاً: لیست فایل‌ها با جزئیات)"}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs text-slate-400">سیستم‌عامل</div>
                  <select
                    value={os}
                    onChange={(e) => setOs(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none focus:border-white/20"
                  >
                    <option value="windows">Windows</option>
                    <option value="linux">Linux</option>
                    <option value="macos">macOS</option>
                  </select>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 text-xs text-slate-400">زبان پاسخ</div>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 p-2 text-sm outline-none focus:border-white/20"
                  >
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-xs text-slate-400">سبک خروجی</div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOutputStyle("clean")}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs",
                      outputStyle === "clean" ? "border-white/20 bg-white/10" : "border-white/10 hover:bg-white/5"
                    )}
                  >
                    تمیز/کوتاه
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputStyle("detailed")}
                    className={cx(
                      "rounded-xl border px-3 py-2 text-xs",
                      outputStyle === "detailed" ? "border-white/20 bg-white/10" : "border-white/10 hover:bg-white/5"
                    )}
                  >
                    کامل/آموزشی
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 leading-5">
                  در حالت Learn، بک‌اند موظف است توضیح را مطابق OS انتخابی بدهد و اگر ورودی برای OS دیگری بود، معادل درست را پیشنهاد بدهد.
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cx(
                  "rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm transition",
                  loading ? "opacity-60" : "hover:bg-white/15"
                )}
              >
                {loading ? "در حال پردازش..." : (tab === "learn" ? "توضیح بده" : "تولید کن")}
              </button>

              {err ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {err}
                </div>
              ) : null}
            </div>
          </form>

          {/* Right: output */}
          <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="text-sm">خروجی</div>
              <div className="ml-auto text-xs text-slate-400">
                {out ? "قابل اسکرول" : "خالی"}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-slate-100">
                {out || "خروجی اینجا نمایش داده می‌شود."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
JSX

echo "✅ Frontend generator page written: $GEN_FILE"

echo "== Install deps (safe) =="
cd "$ROOT/client"
npm i

echo "== Build frontend =="
npm run build

echo "== Restart PM2 =="
cd "$ROOT"
pm2 restart ccg

echo "== DONE =="
echo "✅ Backup folder: $BACKUP"
