// server/middleware/guestIdentity.js
import crypto from "crypto";

function s(v) {
  return v === null || v === undefined ? "" : String(v);
}

function parseCookies(headerValue = "") {
  const out = {};
  const raw = s(headerValue);
  if (!raw) return out;

  raw.split(";").forEach((part) => {
    const p = part.trim();
    if (!p) return;
    const idx = p.indexOf("=");
    if (idx < 0) return;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (!k) return;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  });
  return out;
}

function makeGuestId() {
  return crypto.randomBytes(16).toString("hex");
}

export function guestIdentity(req, res, next) {
  try {
    // اگر لاگین است، نیاز به guest نیست
    if (req.session?.userId) {
      req.guestId = null;
      return next();
    }

    const cookieName = process.env.GUEST_COOKIE_NAME || "ccg_gid";
    const cookies = parseCookies(req.headers?.cookie || "");
    let gid = s(cookies[cookieName]).trim();

    if (!gid || gid.length < 16) {
      gid = makeGuestId();
      const maxAgeSec = Number(process.env.GUEST_COOKIE_MAX_AGE_SEC || 60 * 60 * 24 * 30);

      // express has res.cookie built-in
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
    req.guestId = null;
  }
  next();
}
