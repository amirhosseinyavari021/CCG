// client/src/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="w-full h-screen bg-gray-900 text-white flex flex-col justify-center items-center">

      <h1 className="text-4xl font-bold mb-4">Cando Command Generator</h1>
      <p className="text-gray-400 mb-8 text-center">
        نسخه 3.2.0 — نسل جدید تولید، مقایسه و تحلیل دستورات CLI
      </p>

      <div className="flex gap-4">
        <Link
          to="/login"
          className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
        >
          ورود
        </Link>

        <Link
          to="/signup"
          className="bg-green-600 px-6 py-2 rounded hover:bg-green-700"
        >
          ثبت‌نام
        </Link>
      </div>

    </div>
  );
}
