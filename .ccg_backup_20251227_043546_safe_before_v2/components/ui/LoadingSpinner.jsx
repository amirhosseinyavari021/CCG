// client/src/components/ui/LoadingSpinner.jsx
export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
      <span className="ml-3 text-slate-400">در حال پردازش...</span>
    </div>
  );
}
