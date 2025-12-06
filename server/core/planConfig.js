// server/core/planConfig.js

export const PLANS = {
  FREE: {
    name: "Free",
    linuxDaily: 30,
    windowsDaily: 50,
    macDaily: 50,
    otherDaily: 10,
    compareDaily: 5,
    maxSaved: 10,
    allowAdvancedCompare: false,
    allowAIReview: false,
  },

  PRO: {
    name: "Pro",
    linuxDaily: 1000,
    windowsDaily: 1000,
    macDaily: 1000,
    otherDaily: 1000,
    compareDaily: 100,
    maxSaved: 1000,
    allowAdvancedCompare: true,
    allowAIReview: true,
  }
};
