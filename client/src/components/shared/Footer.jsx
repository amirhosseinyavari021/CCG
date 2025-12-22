// client/src/components/shared/Footer.jsx
export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--border)] bg-[var(--bg-panel)]/70 backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2 px-4 py-3 text-xs text-[var(--muted)]">
        <div>Powered by Cando Academy</div>
        <div className="text-center">Created & Developed by Amirhossein Yavari</div>
        <div className="text-end">CCG © 2025</div>
      </div>
    </footer>
  );
}
