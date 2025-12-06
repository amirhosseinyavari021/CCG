// server/config/planConfig.js
// ===========================
// Plan configuration system for CCG v3.2.0
// ===========================
//
// Free  → محدودیت روزانه 30 درخواست
// Pro   → بدون محدودیت (Infinity)
//

export const getPlanConfig = (plan) => {
  switch (plan) {
    case "pro":
      return {
        dailyLimit: Infinity,
      };

    case "free":
    default:
      return {
        dailyLimit: 30,
      };
  }
};
