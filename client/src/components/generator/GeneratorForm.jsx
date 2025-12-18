import { useState } from "react";
import { generateCommand } from "../../services/aiService";
import CodeBlock from "../ui/CodeBlock";
import MarkdownRenderer from "../ui/MarkdownRenderer";
import WarningBox from "../ui/WarningBox";
import { useLanguage } from "../../context/LanguageContext";

export default function GeneratorForm() {
  const { lang, isRTL } = useLanguage();
  const [request, setRequest] = useState("");
  const [os, setOs] = useState("linux");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await generateCommand({
        user_request: request,
        os,
        lang,
      });
      setResult(res);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* FORM */}
      <div className="space-y-4">
        <textarea
          dir={isRTL ? "rtl" : "ltr"}
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={isRTL ? "درخواست خود را بنویسید…" : "Describe your request…"}
          className="w-full min-h-[160px] rounded-lg bg-slate-900 border border-slate-800 p-4"
        />

        <select
          value={os}
          onChange={(e) => setOs(e.target.value)}
          className="w-full rounded-lg bg-slate-900 border border-slate-800 p-3"
        >
          <option value="linux">Linux</option>
          <option value="windows">Windows</option>
          <option value="windows-server">Windows Server</option>
          <option value="mac">macOS</option>
          <option value="cisco">Cisco</option>
          <option value="mikrotik">MikroTik</option>
          <option value="fortigate">FortiGate</option>
        </select>

        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-lg bg-blue-500 py-3 font-semibold text-black"
        >
          {loading ? (isRTL ? "در حال پردازش…" : "Generating…") : (isRTL ? "تولید خروجی" : "Generate")}
        </button>
      </div>

      {/* OUTPUT */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
        {!result && (
          <div className="text-slate-500 text-sm">
            {isRTL ? "خروجی اینجا نمایش داده می‌شود." : "Output will appear here."}
          </div>
        )}

        {result?.output && (
          <MarkdownRenderer content={result.output} />
        )}

        {result?.error && (
          <WarningBox warnings={[result.error]} />
        )}
      </div>
    </div>
  );
}
