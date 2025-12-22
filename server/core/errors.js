// server/core/errors.js
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: {
    fa: "ورودی نامعتبره. لطفاً فیلدها رو بررسی کن و دوباره تلاش کن.",
    en: "Invalid input. Please check the fields and try again.",
  },
  UNAUTHORIZED: {
    fa: "دسترسی غیرمجاز. لطفاً دوباره وارد حساب بشو.",
    en: "Unauthorized. Please sign in again.",
  },
  FORBIDDEN: {
    fa: "این قابلیت برای پلن فعلی شما فعال نیست.",
    en: "This feature is not available on your current plan.",
  },
  RATE_LIMITED: {
    fa: "تعداد درخواست‌ها زیاد شده. چند لحظه بعد دوباره امتحان کن.",
    en: "Too many requests. Please try again in a moment.",
  },
  OPENAI_ERROR: {
    fa: "سرویس هوش مصنوعی فعلاً مشکل دارد. کمی بعد دوباره تلاش کن.",
    en: "AI service is currently having issues. Please try again later.",
  },
  AI_EMPTY_RESPONSE: {
    fa: "پاسخ معتبری دریافت نشد. لطفاً درخواست را کمی واضح‌تر بنویس.",
    en: "No valid response received. Please rephrase your request.",
  },
  INTERNAL_ERROR: {
    fa: "خطای داخلی رخ داد. لطفاً کمی بعد دوباره تلاش کن.",
    en: "Internal error. Please try again later.",
  },
};
