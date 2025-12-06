// src/pages/Dashboard.jsx
import { useContext, useEffect } from "react";
import { AuthContext } from "../AuthContext";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user, logout, isAuthenticated, loading } = useContext(AuthContext);

  // اگر کاربر لاگین نبود → بفرست صفحه لاگین
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/auth";
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8" dir="rtl">
      <div className="max-w-3xl mx-auto bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-800">
        
        <h1 className="text-3xl font-bold mb-4">
          داشبورد
        </h1>

        <p className="text-gray-300 mb-6">
          خوش اومدی <span className="text-amber-400 font-semibold">{user?.name}</span>
        </p>

        <div className="flex flex-col gap-4">
          <Link
            to="/"
            className="px-4 py-3 bg-amber-500 text-black rounded-xl text-center font-semibold hover:bg-amber-400 transition"
          >
            رفتن به ابزار CCG
          </Link>

          <button
            onClick={logout}
            className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition"
          >
            خروج از حساب
          </button>
        </div>
      </div>
    </div>
  );
}
