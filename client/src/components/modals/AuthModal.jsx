// client/src/components/modals/AuthModal.jsx
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (existing) return resolve();

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
}

export default function AuthModal({ open, onClose }) {
  const { loginWithGoogleCredential } = useAuth();
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [ready, setReady] = useState(false);
  const googleEnabled = useMemo(() => Boolean(clientId), [clientId]);

  useEffect(() => {
    let cancelled = false;

    async function initGoogle() {
      if (!open || !googleEnabled) return;

      try {
        await loadGoogleScript();
        if (cancelled) return;

        if (!window.google?.accounts?.id) {
          throw new Error("Google Identity Services not available");
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              await loginWithGoogleCredential(response.credential);
              toast.success("Signed in successfully");
              onClose?.();
            } catch (err) {
              toast.error(err?.message || "Google login failed");
            }
          },
        });

        const container = document.getElementById("ccg-google-button");
        if (container) {
          container.innerHTML = "";
          window.google.accounts.id.renderButton(container, {
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
          });
        }

        setReady(true);
      } catch (err) {
        console.error(err);
        toast.error("Failed to initialize Google login");
      }
    }

    initGoogle();

    return () => {
      cancelled = true;
}
  }, [open, googleEnabled, clientId, loginWithGoogleCredential, onClose]);

  const comingSoon = () => {
    toast("به‌زودی فعال می‌شود", { icon: "⏳" });
}

  return (
    <Modal open={open} title="Sign in to CCG" onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        {/* Google Login */}
        <div className="ccg-panel" style={{ padding: 14 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            Continue with Google
          </div>

          {!googleEnabled ? (
            <div className="ccg-error">
              Google Client ID تنظیم نشده است (VITE_GOOGLE_CLIENT_ID).
            </div>
          ) : (
            <div
              id="ccg-google-button"
              style={{
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
            >
              {!ready && <span>Loading…</span>}
            </div>
          )}
        </div>

        {/* Coming soon options */}
        <button type="button" className="ccg-btn" onClick={comingSoon}>
          Continue with Email (Coming Soon)
        </button>

        <button type="button" className="ccg-btn" onClick={comingSoon}>
          Continue with Phone (Coming Soon)
        </button>

        <button
          type="button"
          className="ccg-btn ccg-btn-primary"
          onClick={comingSoon}
        >
          Upgrade to Pro (Coming Soon)
        </button>
      </div>
    </Modal>
  );
}
