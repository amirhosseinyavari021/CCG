// client/src/components/common/CustomSelect.jsx
import React from "react";

export default function CustomSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = "",
  error,
  lang = "fa",
}) {
  const isRTL = lang === "fa";

  // React ERROR #31 دقیقا از اینجا میاد اگر value = object باشد
  // بنابراین اینجا *فقط* string قبول می‌کنیم
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue); // همیشه string می‌فرستیم
  };

  return (
    <div className="flex flex-col gap-1" dir={isRTL ? "rtl" : "ltr"}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {label}
        </label>
      )}

      <select
        className="w-full rounded-xl border border-gray-300 dark:border-gray-700
                   bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-sm md:text-base
                   focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
        value={value || ""}
        onChange={handleChange}
      >
        {/* Placeholder */}
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}

        {/* Options */}
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Error */}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
