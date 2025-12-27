export default function CodeCompareBox({ data }) {
  return (
    <div className="space-y-4 text-sm">
      {data.summary && (
        <section>
          <h3 className="mb-2 font-semibold">Summary</h3>
          <p className="text-slate-300">{data.summary}</p>
        </section>
      )}

      {data.diff && (
        <section>
          <h3 className="mb-2 font-semibold">Diff</h3>
          <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
            {data.diff}
          </pre>
        </section>
      )}

      {data.merged && (
        <section>
          <h3 className="mb-2 font-semibold">Merged Output</h3>
          <pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-green-200">
            {data.merged}
          </pre>
        </section>
      )}

      {data.warnings?.length > 0 && (
        <section className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3">
          <h3 className="mb-1 font-semibold text-yellow-300">Warnings</h3>
          <ul className="list-disc ps-5">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
