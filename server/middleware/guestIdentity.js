// server/middleware/guestIdentity.js
import crypto from "crypto";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function makeGuestId() {
  return crypto.randomBytes(16).toString("hex");
}

export function guestIdentity(req, res, next) {
  try {
    // اگر لاگین است، نیاز به guest نیست
    if (req.session?.userId) return next();

    const cookieName = process.env.GUEST_COOKIE_NAME || "ccg_gid";
    const rawCookie = req.cookies?.[cookieName];

    let gid = s(rawCookie).trim();
    if (!gid || gid.length < 16) {
      gid = makeGuestId();
      const maxAgeSec = Number(process.env.GUEST_COOKIE_MAX_AGE_SEC || 60 * 60 * 24 * 30);

      res.cookie(cookieName, gid, {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        maxAge: maxAgeSec * 1000,
      });
    }

    req.guestId = gid;
  } catch {
    // حتی اگر cookie fail شد، باز next
    req.guestId = null;
  }
  next();
}
