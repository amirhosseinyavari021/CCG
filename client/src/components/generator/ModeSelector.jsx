import Tooltip from "../ui/Tooltip";

export default function ModeSelector({ mode, setMode }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        Mode
        <Tooltip text="Learn برای یادگیری و توضیح کامل، Professional برای محیط عملیاتی با هشدار" />
      </label>

      <div className="flex gap-2">
        {["learn", "professional"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium
              ${
                mode === m
                  ? "bg-blue-500 text-slate-950"
                  : "border border-slate-700 text-slate-300"
              }`}
          >
            {m === "learn" ? "Learn" : "Professional"}
          </button>
        ))}
      </div>
    </div>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
