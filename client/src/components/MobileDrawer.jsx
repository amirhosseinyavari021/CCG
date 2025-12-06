// client/src/components/MobileDrawer.jsx
import { useContext } from "react";
import { X, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../LanguageContext";
import { AuthContext } from "../AuthContext";

export default function MobileDrawer({ isOpen, onClose }) {
  const { lang, t } = useContext(LanguageContext);
  const { isAuthenticated, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const isRTL = lang === "fa";

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate("/");
  };

  return (
    <div
      className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition
      ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
    >
      <div
        className={`fixed top-0 ${isRTL ? "right-0" : "left-0"} h-full w-72 bg-gray-900
                    ${isRTL ? "border-l" : "border-r"} border-gray-700 p-4 transform transition
                    ${isOpen ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {lang === "fa" ? "منو" : "Menu"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-gray-200 text-sm">
          <button
            onClick={() => go("/")}
            className="text-right hover:text-white"
          >
            {lang === "fa" ? "خانه" : "Home"}
          </button>

          <button
            onClick={() => go("/about")}
            className="text-right hover:text-white"
          >
            {t?.about || (lang === "fa" ? "درباره" : "About")}
          </button>

          {/* Telegram */}
          <a
            href="https://t.me/+KOknn1yVxlM1OWI0"
            target="_blank"
            rel="noreferrer"
            className="mt-2 text-right text-xs underline text-sky-400"
          >
            {lang === "fa" ? "عضویت در کانال تلگرام CCG" : "Join CCG Telegram"}
          </a>

          <div className="border-t border-gray-700 mt-4 pt-4">
            {!isAuthenticated ? (
              <button
                onClick={() => go("/auth")}
                className="w-full flex items-center justify-center gap-2
                           px-3 py-2 rounded-xl bg-amber-500 text-black font-semibold"
              >
                <User size={16} />
                <span>{lang === "fa" ? "ورود / ثبت‌نام" : "Login / Sign up"}</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <User size={16} />
                  <span className="truncate">
                    {user?.name || user?.email || "User"}
                  </span>
                </div>
                <button
                  onClick={() => go("/dashboard")}
                  className="w-full text-right px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  {lang === "fa" ? "داشبورد" : "Dashboard"}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-right px-3 py-2 rounded-lg text-red-400 hover:bg-gray-800"
                >
                  {lang === "fa" ? "خروج" : "Logout"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
