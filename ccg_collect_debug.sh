#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
OUT="${ROOT}/ccg_debug_${TS}.txt"

{
  echo "===== CCG DEBUG DUMP @ ${TS} ====="
  echo "PWD: ${ROOT}"
  echo

  echo "----- PM2 status -----"
  pm2 status || true
  echo

  echo "----- PM2 logs (last 200 lines, no stream) -----"
  # --nostream باعث میشه استریم نشه و فقط همون تعداد خط رو بده
  pm2 logs ccg --lines 200 --nostream 2>/dev/null || pm2 logs ccg --lines 200 2>/dev/null || true
  echo

  echo "----- Grep /api/ccg in backend (exclude client/node_modules) -----"
  grep -Rsn --exclude-dir=node_modules --exclude-dir=client "/api/ccg" -n . || true
  echo

  echo "----- Grep 'ccgNormalize' (to see if middleware is wired) -----"
  grep -Rsn --exclude-dir=node_modules --exclude-dir=client "ccgNormalize" -n . || true
  echo

  echo "----- Grep '400' / 'validation' keywords in backend (quick scan) -----"
  grep -Rsn --exclude-dir=node_modules --exclude-dir=client -E "status\\s*\\(?400\\)?|\\b400\\b|validation|zod|joi|yup|required|schema" -n . || true
  echo

  echo "----- Environment (API base) -----"
  (cd client && node -p "process.env.VITE_API_BASE || ''" 2>/dev/null) || true
  echo

  echo "===== END ====="
} | tee "$OUT"

echo
echo "✅ Saved: $OUT"
echo "Send me the content of that file (or paste the important parts)."
	

