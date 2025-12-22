// client/src/components/ui/HelpTip.jsx
export default function HelpTip({ text }) {
  return (
    <span className="ccg-help">
      <span className="ccg-help__dot">?</span>
      <span className="ccg-help__bubble">{text}</span>
    </span>
  );
}
