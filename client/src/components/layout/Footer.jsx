// client/src/components/layout/Footer.jsx
export default function Footer({ lang }) {
  return (
    <footer className="border-t border-gray-800/70 bg-black/70">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-1 text-center md:text-left">
          <span>© {new Date().getFullYear()} CCG.</span>
          <span>
            {lang === "fa"
              ? "تمامی حقوق برای Cando Academy و Amirhossein Yavari محفوظ است."
              : "All rights reserved by Cando Academy & Amirhossein Yavari."}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {lang === "fa"
            ? "محصول مشترک AY-Tech و آموزشگاه Cando"
            : "A joint product of AY-Tech and Cando Academy"}
        </div>
      </div>
    </footer>
  );
}
