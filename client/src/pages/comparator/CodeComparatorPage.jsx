// client/src/pages/comparator/CodeComparatorPage.jsx
import { useMemo, useRef, useState } from "react";
import MainLayout from "../../components/layout/MainLayout";
import { useLanguage } from "../../context/LanguageContext";
import { compareCode } from "../../services/aiService";
import MarkdownBox from "../../components/ui/MarkdownBox";
import { createPortal } from "react-dom";

function Help({ text }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  function onEnter() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: r.left + r.width + 8, y: r.top - 6 });
    setOpen(true);
  }
  function onLeave() {
    setOpen(false);
  }

  return (
    <>
      <span
        ref={ref}
        className="ccg-help"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </span>

      {open
        ? createPortal(
            <div
              className="ccg-help-pop"
              style={{ left: pos.x, top: pos.y }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={onLeave}
            >
              {text}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function Pill({ active, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`ccg-pill ${active ? "active" : ""}`}>
      {children}
    </button>
  );
}

function CopyBtn({ text, lang }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    } catch {}
  }
  return (
    <button type="button" className="ccg-copybtn" onClick={onCopy}>
      {copied ? (lang === "fa" ? "کپی شد" : "Copied") : (lang === "fa" ? "کپی" : "Copy")}
    </button>
  );
}

function Card({ title, right, children }) {
  return (
    <section className="ccg-card">
      <div className="ccg-card-head">
        <h3>{title}</h3>
        {right}
      </div>
      <div className="ccg-card-body">{children}</div>
    </section>
  );
}

function normalizeWarnings(w) {
  if (!w) return [];
  if (typeof w === "string") return w.trim() ? [w.trim()] : [];
  if (Array.isArray(w)) return w.map((x) => String(x).trim()).filter(Boolean);
  return [];
}

export default function CodeComparatorPage({ onGoGenerator }) {
  const { lang, isRTL } = useLanguage();

  const [swapCols, setSwapCols] = useState(false);
  const [knowledgeLevel, setKnowledgeLevel] = useState("intermediate");

  const [codeA, setCodeA] = useState("");
  const [codeB, setCodeB] = useState("");

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [res, setRes] = useState(null);

  const t = useMemo(() => {
    return {
      goGenerator: "Generator",
      swap: "جابجایی ستون‌ها",
      swapCodes: "تعویض A و B",
      inputs: "ورودی‌ها",
      output: "خروجی",
      hint: "Markdown + Diff + Best Version",
      knowledge: "سطح دانش",
      helpKnowledge: "روی عمق تحلیل، باگ‌یابی، و پیشنهاد نسخه بهتر اثر می‌گذارد.",
      beginner: "Beginner / تازه‌کار",
      intermediate: "Intermediate / متوسط",
      expert: "Expert / حرفه‌ای",
      a: "کد A",
      b: "کد B",
      placeholderA: "# کد نسخه A",
      placeholderB: "# کد نسخه B",
      submit: "تحلیل و مقایسه",
      working: "در حال پردازش...",
      out: "خروجی تحلیل",
      warnings: "Warnings",
      empty: "اینجا نتیجه مقایسه نمایش داده می‌شود.",
      apiError: "API Error",
    };
  }, [lang]);

  function swapAB() {
    setCodeA(codeB);
    setCodeB(codeA);
  }

  async function onSubmit() {
    setApiError("");
    setRes(null);

    if (!codeA.trim() || !codeB.trim()) return;

    setLoading(true);
    try {
      // اگر بک‌اند شما os/cli می‌خواهد، اینجا ثابت و hidden می‌فرستیم
      const payload = {
        mode: "compare",
        input_a: codeA,
        input_b: codeB,
        os: "Linux",
        cli: "bash",
        deviceType: "general",
        lang,
        knowledgeLevel,
      };

      const data = await compareCode(payload);

      setRes({
        ok: !!data?.ok,
        warnings: normalizeWarnings(data?.warnings),
        outputMarkdown: String(data?.outputMarkdown || data?.output || "").trim(),
      });
    } catch {
      setApiError(t.apiError);
    } finally {
      setLoading(false);
    }
  }

  const Inputs = (
    <div className="ccg-panel">
      <div className="ccg-panel-head">
        <div>
          <div className="ccg-panel-title">{t.inputs}</div>
          <div className="ccg-panel-sub">{t.hint}</div>
        </div>

        <div className="ccg-panel-actions">
          <button type="button" className="ccg-btn" onClick={onGoGenerator}>
            {t.goGenerator}
          </button>
          <button type="button" className="ccg-btn" onClick={() => setSwapCols((v) => !v)}>
            ⇄ {t.swap}
          </button>
          <button type="button" className="ccg-btn" onClick={swapAB}>
            ⟷ {t.swapCodes}
          </button>
        </div>
      </div>

      <div className="ccg-form">
        <label className="ccg-label">
          {t.knowledge} <Help text={t.helpKnowledge} />
        </label>

        <select className="ccg-select" value={knowledgeLevel} onChange={(e) => setKnowledgeLevel(e.target.value)}>
          <option value="beginner">{t.beginner}</option>
          <option value="intermediate">{t.intermediate}</option>
          <option value="expert">{t.expert}</option>
        </select>

        <div className="ccg-compare-grid">
          <div>
            <label className="ccg-label">{t.a}</label>
            <textarea className="ccg-textarea mono" dir="ltr" value={codeA} onChange={(e) => setCodeA(e.target.value)} placeholder={t.placeholderA} />
          </div>
          <div>
            <label className="ccg-label">{t.b}</label>
            <textarea className="ccg-textarea mono" dir="ltr" value={codeB} onChange={(e) => setCodeB(e.target.value)} placeholder={t.placeholderB} />
          </div>
        </div>

        <button type="button" className="ccg-btn primary big" onClick={onSubmit} disabled={loading}>
          {loading ? t.working : t.submit}
        </button>

        {apiError ? <div className="ccg-error">{apiError}</div> : null}
      </div>
    </div>
  );

  const Output = (
    <div className="ccg-panel">
      <div className="ccg-panel-head">
        <div>
          <div className="ccg-panel-title">{t.output}</div>
          <div className="ccg-panel-sub">{t.hint}</div>
        </div>
      </div>

      <div className="ccg-out">
        {Array.isArray(res?.warnings) && res.warnings.length ? (
          <div className="ccg-warn">
            <div className="ccg-warn-title">{t.warnings}</div>
            <ul className="ccg-warn-list">
              {res.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <Card title={t.out} right={res?.outputMarkdown ? <CopyBtn text={res.outputMarkdown} lang={lang} /> : null}>
          {res?.outputMarkdown ? <MarkdownBox markdown={res.outputMarkdown} /> : <div className="ccg-muted">{t.empty}</div>}
        </Card>
      </div>
    </div>
  );

  const left = isRTL ? Output : Inputs;
  const right = isRTL ? Inputs : Output;

  const colA = swapCols ? right : left;
  const colB = swapCols ? left : right;

  return (
    <MainLayout>
      <div className="ccg-grid">
        <div>{colA}</div>
        <div>{colB}</div>
      </div>
    </MainLayout>
  );
}
