import { useLanguage } from "../../context/LanguageContext";

export default function WarningBox({ warnings = [] }) {
  const { isRTL } = useLanguage();
  if (!warnings.length) return null;

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
      <div className="mb-2 font-semibold text-red-400">
        {isRTL ? "هشدار عملیاتی" : "Operational Warning"}
      </div>
      <ul className="list-disc ps-5 text-sm text-red-300">
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
