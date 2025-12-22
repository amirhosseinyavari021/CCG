// client/src/components/ui/WarningBox.jsx
export default function WarningBox({ title = "Warnings", items = [] }) {
  if (!items?.length) return null;

  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
      <div className="mb-2 text-sm font-semibold text-red-200">{title}</div>
      <ul className="list-disc pl-5 text-sm text-red-100 space-y-1">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}
