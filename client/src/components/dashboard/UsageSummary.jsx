// client/src/components/dashboard/UsageSummary.jsx
import { useEffect, useState } from "react";
import { getMe } from "../../api/authService";

export default function UsageSummary() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data))
      .catch((err) => {
        console.error("خطا در دریافت اطلاعات کاربر:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto bg-gray-800/80 text-white rounded-xl p-4 mt-4 text-center">
        در حال بارگذاری اطلاعات پلن...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto bg-red-800/80 text-white rounded-xl p-4 mt-4 text-center">
        دریافت اطلاعات کاربر با خطا مواجه شد.
      </div>
    );
  }

  const isPro = user.plan === "pro";
  const dailyLimit = isPro ? 9999 : 50; // اینو بعداً طبق پلن واقعی‌ات تنظیم می‌کنیم
  const used = user.usage?.dailyUsed || 0;
  const percent = Math.min(100, Math.round((used / dailyLimit) * 100));

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800/90 text-white rounded-2xl p-4 mt-4 shadow-lg">

      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-300">پلن فعلی</span>
          <span className="text-lg font-bold">
            {isPro ? "CCG Pro" : "CCG Free"}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs ${
            isPro ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {isPro ? "نامحدود (تقریباً)" : "محدود روزانه"}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-gray-300">
        <span>مصرف امروز</span>
        <span>
          {used} / {dailyLimit} درخواست
        </span>
      </div>

      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            percent < 70 ? "bg-emerald-500" : percent < 100 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-3 text-xs text-gray-400 text-right">
        هر شب مصرف روزانه صفر می‌شود. اگر به سقف نزدیک شدی و هنوز کار داری،
        وقت ارتقا به پلن حرفه‌ای است 😉
      </p>
    </div>
  );
}
