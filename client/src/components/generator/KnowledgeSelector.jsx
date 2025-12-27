import Tooltip from "../ui/Tooltip";

export default function KnowledgeSelector({ level, setLevel }) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">
        Knowledge Level
        <Tooltip text="سطح دانش شما روی میزان توضیح و عمق فنی خروجی تأثیر می‌گذارد" />
      </label>

      <select
        value={level}
        onChange={(e) => setLevel(e.target.value)}
        className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      >
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="expert">Expert</option>
      </select>
    </div>
  );
}

document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
