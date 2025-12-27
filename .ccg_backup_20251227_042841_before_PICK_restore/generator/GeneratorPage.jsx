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
