// client/src/pages/compare/CodeComparatorPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { useLanguage } from "../../context/LanguageContext";
import { compareCode, analyzeError } from "../../services/aiService";

import Modal from "../../components/ui/Modal";
import HelpTip from "../../components/ui/HelpTip";
import CopyButton from "../../components/ui/CopyButton";

function s(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}
function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function OutputCard({ title, right, children }) {
  return (
    <div className="ccg-card">
      <div className="ccg-card__head">
        <div className="ccg-card__title">{title}</div>
        <div className="ccg-card__right">{right}</div>
      </div>
      <div className="ccg-card__body">{children}</div>
    </div>
  );
}

function ErrorAnalyzerModal({ open, onClose, lang, defaultText, context }) {
  const [text, setText] = useState(defaultText || "");
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setErr("");
      setOut("");
      setText(defaultText || "");
    }
  }, [open, defaultText]);

  async function run() {
    setErr("");
    setOut("");
    const input = text.trim();
    if (!input) return;

    setLoading(true);
    try {
      const payload = { lang, error_text: input, context: context || {} };
      const res = await analyzeError(payload);
      const md = s(res?.outputMarkdown || res?.output || res);
      setOut(md);
    } catch (e) {
      setErr(lang === "fa" ? "خطا در ارتباط با API" : "API error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Error Analyzer"
      subtitle={
        lang === "fa"
          ? "لاگ/ارور را بده تا علت + راه‌حل + گام‌های تست بگیری."
          : "Paste logs/errors to get cause + fix + verification steps."
      }
      widthClass="max-w-3xl"
    >
      <div className="space-y-4">
        <div className="ccg-field">
          <label className="ccg-label">{lang === "fa" ? "ارور / لاگ" : "Error / Log"}</label>
          <textarea
            className="ccg-textarea min-h-[160px]"
            value={text}
            onChange={(e) => setText(e.target.value)}
            dir="ltr"
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="ccg-btn ccg-btn--primary" type="button" onClick={run} disabled={loading}>
            {loading ? (lang === "fa" ? "در حال تحلیل..." : "Analyzing...") : (lang === "fa" ? "تحلیل کن" : "Analyze")}
          </button>
          <button className="ccg-btn" type="button" onClick={onClose}>
            {lang === "fa" ? "بستن" : "Close"}
          </button>
        </div>

        {err ? <div className="ccg-alert ccg-alert--error">{err}</div> : null}

        {out ? (
          <div className="ccg-card">
            <div className="ccg-card__head">
              <div className="ccg-card__title">{lang === "fa" ? "خروجی تحلیل" : "Analysis Output"}</div>
              <CopyButton text={out} lang={lang} />
            </div>
            <div className="ccg-card__body">
              <div className="ccg-markdown" dir={lang === "fa" ? "rtl" : "ltr"}>
                {out}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default function CodeComparatorPage({ onSwitchPage }) {
  const { isRTL, lang } = useLanguage();

  const [knowledgeLevel, setKnowledgeLevel] = useState("intermediate"); // default
  const [codeLang, setCodeLang] = useState("bash"); // bash | powershell | python | ios | routeros | fortios
  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  const [swapCols, setSwapCols] = useState(false); // output columns swap (rtl aware)
  const [swapAB, setSwapAB] = useState(false); // swap input A/B
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [out, setOut] = useState("");

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalDefault, setErrorModalDefault] = useState("");

  const outputRef = useRef(null);

  const labels = useMemo(() => {
    const fa = {
      inputs: "ورودی‌ها",
      output: "خروجی",
      pageGen: "Generator",
      pageCmp: "Code Comparator",
      swapCols: "جابجایی ستون‌ها",
      swapAB: "تعویض A ↔ B",
      level: "سطح دانش",
      lang: "زبان کد",
      codeA: "کد A",
      codeB: "کد B",
      run: "تحلیل و مقایسه",
      hint: "Markdown + Diff + Best Version",
      empty: "اینجا نتیجه مقایسه نمایش داده می‌شود.",
      analyzer: "Error Analyzer",
    };
    const en = {
      inputs: "Inputs",
      output: "Output",
      pageGen: "Generator",
      pageCmp: "Code Comparator",
      swapCols: "Swap columns",
      swapAB: "Swap A ↔ B",
      level: "Knowledge Level",
      lang: "Code Language",
      codeA: "Code A",
      codeB: "Code B",
      run: "Compare & Analyze",
      hint: "Markdown + Diff + Best Version",
      empty: "Comparison output will appear here.",
      analyzer: "Error Analyzer",
    };
    return lang === "fa" ? fa : en;
  }, [lang]);

  function doSwapAB() {
    setSwapAB((p) => !p);
    setCodeA((prevA) => {
      const a = prevA;
      setCodeB(a);
      return codeB;
    });
  }

  async function runCompare() {
    setApiError("");
    setOut("");

    if (!codeA.trim() || !codeB.trim()) return;

    setLoading(true);
    try {
      // Backend expects os/cli sometimes؛ ما اینجا زبان کد رو به cli می‌دیم و os رو عمومی می‌ذاریم
      const payload = {
        mode: "compare",
        input_a: codeA,
        input_b: codeB,
        lang,
        knowledgeLevel,
        cli: codeLang,
        os: codeLang === "python" ? "Python" : "Linux",
      };

      const res = await compareCode(payload);
      const md = s(res?.outputMarkdown || res?.output || res);
      setOut(md);

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      const msg = lang === "fa" ? "خطا در ارتباط با API (Compare)." : "API error (Compare).";
      setApiError(msg);
      setErrorModalDefault(
        ["Compare API error:", s(e?.message), "", `cli=${codeLang}, knowledge=${knowledgeLevel}`].join("\n")
      );
    } finally {
      setLoading(false);
    }
  }

  const leftCol = (
    <section className="ccg-panel">
      <div className="ccg-toolbar">
        <div className="ccg-toolbar__title">{labels.inputs}</div>

        <div className="ccg-toolbar__right">
          <button className="ccg-btn" type="button" onClick={() => setSwapCols((p) => !p)}>
            ⇄ {labels.swapCols}
          </button>

          <button
            className="ccg-btn"
            type="button"
            onClick={() => {
              setErrorModalDefault("");
              setErrorModalOpen(true);
            }}
          >
            {labels.analyzer}
          </button>

          <div className="ccg-seg">
            <button type="button" className="ccg-seg__btn" onClick={() => onSwitchPage?.("generator")}>
              {labels.pageGen}
            </button>
            <button type="button" className="ccg-seg__btn ccg-seg__btn--active" onClick={() => onSwitchPage?.("comparator")}>
              {labels.pageCmp}
            </button>
          </div>
        </div>
      </div>

      <div className="ccg-fields">
        <div className="ccg-field">
          <label className="ccg-label">
            {labels.lang}
            <HelpTip
              text={
                lang === "fa"
                  ? "برای اینکه در خروجی مشخص باشد کدها چه زبانی هستند (bash/powershell/python/...)"
                  : "So output knows language (bash/powershell/python/...)"
              }
            />
          </label>
          <select className="ccg-select" value={codeLang} onChange={(e) => setCodeLang(e.target.value)}>
            <option value="bash">bash</option>
            <option value="powershell">powershell</option>
            <option value="python">python</option>
            <option value="ios">ios</option>
            <option value="routeros">routeros</option>
            <option value="fortios">fortios</option>
          </select>
        </div>

        <div className="ccg-field">
          <label className="ccg-label">
            {labels.level}
            <HelpTip text={lang === "fa" ? "روی عمق تحلیل اثر دارد." : "Affects analysis depth."} />
          </label>
          <select className="ccg-select" value={knowledgeLevel} onChange={(e) => setKnowledgeLevel(e.target.value)}>
            <option value="beginner">{lang === "fa" ? "Beginner" : "Beginner"}</option>
            <option value="intermediate">{lang === "fa" ? "Intermediate" : "Intermediate"}</option>
            <option value="expert">{lang === "fa" ? "Expert" : "Expert"}</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="ccg-btn" type="button" onClick={doSwapAB}>
            ↔ {labels.swapAB}
          </button>
        </div>

        <div className="ccg-two">
          <div className="ccg-field">
            <label className="ccg-label">{labels.codeA}</label>
            <textarea
              className="ccg-textarea min-h-[220px]"
              value={codeA}
              onChange={(e) => setCodeA(e.target.value)}
              dir="ltr"
              placeholder="# code A"
            />
          </div>

          <div className="ccg-field">
            <label className="ccg-label">{labels.codeB}</label>
            <textarea
              className="ccg-textarea min-h-[220px]"
              value={codeB}
              onChange={(e) => setCodeB(e.target.value)}
              dir="ltr"
              placeholder="# code B"
            />
          </div>
        </div>

        <button className="ccg-btn ccg-btn--primary w-full" type="button" onClick={runCompare} disabled={loading}>
          {loading ? (lang === "fa" ? "در حال پردازش..." : "Working...") : labels.run}
        </button>

        {apiError ? (
          <div className="ccg-alert ccg-alert--error">
            {apiError}
            <div className="mt-2">
              <button className="ccg-btn" type="button" onClick={() => setErrorModalOpen(true)}>
                {labels.analyzer}
              </button>
            </div>
          </div>
        ) : null}

        <ErrorAnalyzerModal
          open={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          lang={lang}
          defaultText={errorModalDefault}
          context={{ codeLang, knowledgeLevel }}
        />
      </div>
    </section>
  );

  const rightCol = (
    <section className="ccg-panel" ref={outputRef}>
      <div className="ccg-toolbar">
        <div className="ccg-toolbar__title">{labels.output}</div>
        <div className="ccg-toolbar__right">
          <div className="text-xs opacity-70">{labels.hint}</div>
          <CopyButton text={out} lang={lang} />
        </div>
      </div>

      <div className="ccg-card">
        <div className="ccg-card__body">
          {out ? (
            <div className="ccg-markdown" dir={lang === "fa" ? "rtl" : "ltr"}>
              {out}
            </div>
          ) : (
            <div className="ccg-muted">{labels.empty}</div>
          )}
        </div>
      </div>
    </section>
  );

  const first = isRTL ? rightCol : leftCol;
  const second = isRTL ? leftCol : rightCol;
  const colA = swapCols ? second : first;
  const colB = swapCols ? first : second;

  return (
    <MainLayout>
      <div className="ccg-grid">
        {colA}
        {colB}
      </div>
    </MainLayout>
  );
}
