import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    const token = header.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
