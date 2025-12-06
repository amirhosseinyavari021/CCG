// client/src/components/output/ErrorAnalysis.jsx
export default function ErrorAnalysis({ lang, t, response }) {
  const {
    explanation,
    cause,
    solution,
    steps,
  } = response || {};

  return (
    <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 md:p-5 space-y-3">
      <h2 className="text-sm md:text-base font-semibold text-gray-100">
        {t.errorAnalysis}
      </h2>

      {explanation && (
        <section>
          <h3 className="text-xs font-semibold text-gray-300 mb-1">
            {t.explanation}
          </h3>
          <p className="text-xs md:text-sm text-gray-200 whitespace-pre-wrap">
            {explanation}
          </p>
        </section>
      )}

      {cause && (
        <section>
          <h3 className="text-xs font-semibold text-gray-300 mb-1">
            {t.cause}
          </h3>
          <p className="text-xs md:text-sm text-gray-200 whitespace-pre-wrap">
            {cause}
          </p>
        </section>
      )}

      {solution && (
        <section>
          <h3 className="text-xs font-semibold text-gray-300 mb-1">
            {t.solution}
          </h3>
          <p className="text-xs md:text-sm text-gray-200 whitespace-pre-wrap">
            {solution}
          </p>
        </section>
      )}

      {Array.isArray(steps) && steps.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-300 mb-1">
            {lang === "fa" ? "گام‌ها" : "Steps"}
          </h3>
          <ul className="list-disc list-inside text-xs md:text-sm text-gray-200 space-y-0.5">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
