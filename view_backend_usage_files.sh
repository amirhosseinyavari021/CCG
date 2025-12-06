#!/bin/bash

echo "🔍 Scanning CCG project files..."
echo "-----------------------------------------"

print_file() {
  local path="$1"
  local label="$2"

  echo ""
  echo "-----------------------------------------"
  echo "📄 $label"
  echo "-----------------------------------------"

  if [ -f "$path" ]; then
    echo "➡️ File Found: $path"
    echo "-----------------------------------------"
    cat "$path"
  else
    echo "❌ File NOT FOUND: $path"
  fi
}

# === BACKEND FILES ===
print_file "server/routes/ccgRoutes.js"         "ccgRoutes.js"
print_file "server/routes/authRoutes.js"        "authRoutes.js"
print_file "server/models/User.js"              "User.js"

# === FRONTEND FILES ===
print_file "client/src/pages/Dashboard.jsx"     "Dashboard.jsx"
print_file "client/src/components/Header.jsx"   "Header.jsx"
print_file "client/src/pages/CCGAuthPage.jsx"   "CCGAuthPage.jsx"

# === API SERVICES ===
print_file "client/src/api/apiService.jsx"      "apiService.jsx"
print_file "client/src/api/promptService.jsx"   "promptService.jsx"
print_file "client/src/api/authService.jsx"     "authService.jsx"

echo ""
echo "-----------------------------------------"
echo "✅ Done. All detected files printed."
echo "-----------------------------------------"
