import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

function defaultSerialize(value) {
  // ✅ nicer URL values (avoid quoted strings)
  if (value === null || value === undefined) return "";
  const t = typeof value;
  if (t === "string") return value;
  if (t === "number" || t === "boolean") return String(value);
  return JSON.stringify(value);
}

function defaultDeserialize(str) {
  // ✅ backward compatible:
  // - if old values were JSON.stringified strings => '"command"'
  // - if plain strings => 'command'
  if (str === null || str === undefined) return str;

  const s = String(str);

  // try JSON parse first (covers old behavior)
  try {
    return JSON.parse(s);
  } catch {
    // fall back to raw string
    return s;
  }
}

/**
 * هوک برای ذخیره state در URL و localStorage
 * @param {string} key - کلید ذخیره‌سازی
 * @param {any} defaultValue - مقدار پیش‌فرض
 * @param {Object} options - تنظیمات
 * @param {boolean} options.useURL - ذخیره در URL
 * @param {boolean} options.useLocalStorage - ذخیره در localStorage
 * @param {Function} options.serialize - تابع سریالایز
 * @param {Function} options.deserialize - تابع دی‌سریالایز
 */
export function usePersistState(key, defaultValue, options = {}) {
  const {
    useURL = true,
    useLocalStorage = true,
    serialize = defaultSerialize,
    deserialize = defaultDeserialize,
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const [value, setValue] = useState(() => {
    // اول از URL بخوان
    if (useURL) {
      const urlValue = searchParams.get(key);
      if (urlValue !== null) {
        try {
          return deserialize(urlValue);
        } catch {
          // ignore
        }
      }
    }

    // سپس از localStorage بخوان
    if (useLocalStorage) {
      try {
        const stored = localStorage.getItem(`ccg_${key}`);
        if (stored !== null) {
          return deserialize(stored);
        }
      } catch {
        // ignore
      }
    }

    return defaultValue;
  });

  // ذخیره در URL هنگام تغییر
  useEffect(() => {
    if (!useURL) return;

    const newSearchParams = new URLSearchParams(searchParams);

    const shouldClear =
      value === defaultValue || value === "" || value === null || value === undefined;

    if (shouldClear) {
      newSearchParams.delete(key);
    } else {
      try {
        newSearchParams.set(key, serialize(value));
      } catch {
        // ignore
      }
    }

    // فقط اگر تغییری وجود داشت update کن
    if (newSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [key, value, useURL, serialize, searchParams, setSearchParams, defaultValue]);

  // ذخیره در localStorage هنگام تغییر
  useEffect(() => {
    if (!useLocalStorage) return;

    try {
      const shouldClear =
        value === defaultValue || value === "" || value === null || value === undefined;

      if (shouldClear) {
        localStorage.removeItem(`ccg_${key}`);
      } else {
        localStorage.setItem(`ccg_${key}`, serialize(value));
      }
    } catch {
      // ignore
    }
  }, [key, value, useLocalStorage, serialize, defaultValue]);

  const setPersistedValue = useCallback((newValue) => {
    setValue((prev) => {
      if (typeof newValue === "function") return newValue(prev);
      return newValue;
    });
  }, []);

  return [value, setPersistedValue];
}

// هوک برای ذخیره state کامپلکس
export function usePersistComplexState(key, defaultValue = {}) {
  return usePersistState(key, defaultValue, {
    serialize: (value) => encodeURIComponent(JSON.stringify(value)),
    deserialize: (str) => JSON.parse(decodeURIComponent(str)),
  });
}

// هوک برای ذخیره آرایه
export function usePersistArrayState(key, defaultValue = []) {
  return usePersistState(key, defaultValue);
}

// هوک برای ذخیره رشته ساده
export function usePersistStringState(key, defaultValue = "") {
  return usePersistState(key, defaultValue, {
    serialize: (value) => String(value ?? ""),
    deserialize: (value) => String(value ?? ""),
  });
}
