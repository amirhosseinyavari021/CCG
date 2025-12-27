// server/middleware/saveLimit.js
import User from "../models/User.js";
import SavedScript from "../models/SavedScript.js";

export function saveLimit() {
  return async function (req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await User.findById(userId).select("plan");
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      if ((user.plan || "free") === "pro") return next();

      const count = await SavedScript.countDocuments({ userId });
      if (count >= 10) {
        return res.status(403).json({
          message: "محدودیت ذخیره در پلن رایگان (10 مورد) تکمیل شده است.",
        });
      }

      next();
    } catch (err) {
      console.error("saveLimit error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  };
}
