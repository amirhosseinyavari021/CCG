export default function Footer() {
  return (
    <footer className="mt-10 pb-10">
      <div className="ccg-container">
        <div className="border-t pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-500 dark:text-slate-300/70 items-center">
            <div className="md:text-left text-center">
              <a href="https://cando.ac" target="_blank" rel="noreferrer">
                Powered by Cando IT Academy
              </a>
            </div>

            <div className="text-center">© 2025 CCG — Cando Command Generator</div>

            <div className="md:text-right text-center">
              <a href="mailto:amirhosseinyavari61@gmail.com">Created by Amirhossein Yavari</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
document.body.classList.add("night-mode");
document.body.classList.add("day-mode");
