import { appConfig } from "../../config/app";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-3 text-center text-xs text-slate-500 md:flex-row md:justify-between md:text-left">
          
          {/* Left */}
          <div>
            {appConfig.shortName} © {new Date().getFullYear()}
          </div>

          {/* Center */}
          <div>
            Created & Developed by{" "}
            <a
              href="mailto:amirhosseinyavari61@gmail.com"
              className="text-slate-300 hover:underline"
            >
              Amirhossein Yavari
            </a>
          </div>

          {/* Right */}
          <div>
            Powered by{" "}
            <a
              href="https://cando.ac"
              target="_blank"
              rel="noreferrer"
              className="text-slate-300 hover:underline"
            >
              Cando Academy
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
